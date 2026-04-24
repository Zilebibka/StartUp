package authhandler

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"Necrocode/api/models"
	"Necrocode/api/services"

	"golang.org/x/crypto/bcrypt"
)

var (
	errPendingRegistrationNotFound = errors.New("registration request not found")
	errRegistrationAlreadyExists   = errors.New("login or email already exists")
)

type pendingRegistration struct {
	Login       string
	Email       string
	DisplayName string
	PasswordHash string
	CodeHash    string
	AttemptCount int
	ExpiresAt   time.Time
	UpdatedAt   time.Time
}

func (h Handler) createOrRefreshPendingRegistration(req models.RegisterRequest) (string, string, error) {
	if err := h.removeLegacyUnverifiedConflicts(req.Login, req.Email); err != nil {
		if errors.Is(err, errRegistrationAlreadyExists) {
			return "", "", err
		}
		return "", "", err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", "", err
	}

	code, err := generateSixDigitCode()
	if err != nil {
		return "", "", err
	}

	codeHash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return "", "", err
	}

	expiresAt := time.Now().Add(verificationCodeTTL)

	tx, err := h.DB.Begin()
	if err != nil {
		return "", "", err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM pending_registrations WHERE expires_at < NOW()`); err != nil {
		return "", "", err
	}

	var existing pendingRegistration
	err = tx.QueryRow(`
		SELECT login, email, updated_at
		FROM pending_registrations
		WHERE login = $1 OR LOWER(email) = LOWER($2)
		LIMIT 1
	`, req.Login, req.Email).Scan(&existing.Login, &existing.Email, &existing.UpdatedAt)
	if err != nil && err != sql.ErrNoRows {
		return "", "", err
	}

	if err == nil {
		if existing.Login != req.Login || !strings.EqualFold(existing.Email, req.Email) {
			return "", "", errRegistrationAlreadyExists
		}

		nextAllowedAt := existing.UpdatedAt.Add(resendCodeCooldown)
		if time.Now().Before(nextAllowedAt) {
			wait := int(time.Until(nextAllowedAt).Seconds())
			if wait < 1 {
				wait = 1
			}
			return "", "", fmt.Errorf("please wait %d seconds before requesting a new code", wait)
		}

		if _, err := tx.Exec(`
			UPDATE pending_registrations
			SET display_name = $1, password_hash = $2, code_hash = $3, attempt_count = 0, expires_at = $4, updated_at = NOW()
			WHERE login = $5
		`, req.DisplayName, string(passwordHash), string(codeHash), expiresAt, req.Login); err != nil {
			return "", "", err
		}
	} else {
		if _, err := tx.Exec(`
			INSERT INTO pending_registrations (login, email, display_name, password_hash, code_hash, expires_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, req.Login, req.Email, req.DisplayName, string(passwordHash), string(codeHash), expiresAt); err != nil {
			return "", "", err
		}
	}

	if err := tx.Commit(); err != nil {
		return "", "", err
	}

	subject, title, subtitle := emailTemplateMetaByPurpose(codePurposeVerifyEmail)
	plainBody := buildCodeEmailPlain(title, subtitle, code)
	htmlBody := buildCodeEmailHTML(title, subtitle, code)
	if err := services.SendEmail(h.SMTPConfig, req.Email, subject, plainBody, htmlBody); err != nil {
		_, _ = h.DB.Exec(`DELETE FROM pending_registrations WHERE login = $1`, req.Login)
		return "", "", fmt.Errorf("failed to send verification code: %w", err)
	}

	return req.Login, req.Email, nil
}

func (h Handler) completePendingRegistration(login, code string) (models.User, error) {
	var pending pendingRegistration
	err := h.DB.QueryRow(`
		SELECT login, email, display_name, password_hash, code_hash, attempt_count, expires_at
		FROM pending_registrations
		WHERE login = $1
	`, login).Scan(
		&pending.Login,
		&pending.Email,
		&pending.DisplayName,
		&pending.PasswordHash,
		&pending.CodeHash,
		&pending.AttemptCount,
		&pending.ExpiresAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return models.User{}, errPendingRegistrationNotFound
		}
		return models.User{}, err
	}

	if time.Now().After(pending.ExpiresAt) {
		_, _ = h.DB.Exec(`DELETE FROM pending_registrations WHERE login = $1`, login)
		return models.User{}, fmt.Errorf("verification code has expired")
	}

	if pending.AttemptCount >= maxCodeAttempts {
		_, _ = h.DB.Exec(`DELETE FROM pending_registrations WHERE login = $1`, login)
		return models.User{}, fmt.Errorf("verification code has expired")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(pending.CodeHash), []byte(code)); err != nil {
		_, _ = h.DB.Exec(`UPDATE pending_registrations SET attempt_count = attempt_count + 1, updated_at = NOW() WHERE login = $1`, login)
		return models.User{}, fmt.Errorf("verification code is invalid")
	}

	tx, err := h.DB.Begin()
	if err != nil {
		return models.User{}, err
	}
	defer tx.Rollback()

	const insertQuery = `
		INSERT INTO users (public_id, login, email, display_name, password_hash, email_verified)
		VALUES ($1, $2, $3, $4, $5, TRUE)
		RETURNING id, created_at
	`

	var user models.User
	user.Login = pending.Login
	user.Email = pending.Email
	user.DisplayName = pending.DisplayName

	for range 5 {
		user.PublicID, err = generatePublicID()
		if err != nil {
			return models.User{}, err
		}

		err = tx.QueryRow(insertQuery, user.PublicID, user.Login, user.Email, user.DisplayName, pending.PasswordHash).Scan(&user.ID, &user.CreatedAt)
		if err == nil {
			break
		}
		if isConstraintViolation(err, "users_public_id_unique_idx") {
			continue
		}
		if isUniqueViolation(err) {
			return models.User{}, errRegistrationAlreadyExists
		}
		return models.User{}, err
	}

	if user.ID == 0 {
		return models.User{}, fmt.Errorf("failed to create user")
	}

	if _, err := tx.Exec(`DELETE FROM pending_registrations WHERE login = $1`, pending.Login); err != nil {
		return models.User{}, err
	}

	if err := tx.Commit(); err != nil {
		return models.User{}, err
	}

	return user, nil
}

func (h Handler) resendPendingRegistrationCode(login string) error {
	var pending pendingRegistration
	err := h.DB.QueryRow(`
		SELECT login, email, display_name, password_hash, attempt_count, expires_at, updated_at
		FROM pending_registrations
		WHERE login = $1
	`, login).Scan(
		&pending.Login,
		&pending.Email,
		&pending.DisplayName,
		&pending.PasswordHash,
		&pending.AttemptCount,
		&pending.ExpiresAt,
		&pending.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return errPendingRegistrationNotFound
		}
		return err
	}

	if time.Now().After(pending.ExpiresAt) {
		_, _ = h.DB.Exec(`DELETE FROM pending_registrations WHERE login = $1`, login)
		return fmt.Errorf("registration request has expired, please register again")
	}

	nextAllowedAt := pending.UpdatedAt.Add(resendCodeCooldown)
	if time.Now().Before(nextAllowedAt) {
		wait := int(time.Until(nextAllowedAt).Seconds())
		if wait < 1 {
			wait = 1
		}
		return fmt.Errorf("please wait %d seconds before requesting a new code", wait)
	}

	code, err := generateSixDigitCode()
	if err != nil {
		return err
	}
	codeHash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	expiresAt := time.Now().Add(verificationCodeTTL)
	if _, err := h.DB.Exec(`
		UPDATE pending_registrations
		SET code_hash = $1, attempt_count = 0, expires_at = $2, updated_at = NOW()
		WHERE login = $3
	`, string(codeHash), expiresAt, login); err != nil {
		return err
	}

	subject, title, subtitle := emailTemplateMetaByPurpose(codePurposeVerifyEmail)
	plainBody := buildCodeEmailPlain(title, subtitle, code)
	htmlBody := buildCodeEmailHTML(title, subtitle, code)
	return services.SendEmail(h.SMTPConfig, pending.Email, subject, plainBody, htmlBody)
}

func (h Handler) hasPendingRegistration(login string) (bool, error) {
	var exists bool
	err := h.DB.QueryRow(`SELECT EXISTS(SELECT 1 FROM pending_registrations WHERE login = $1)`, login).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

func (h Handler) removeLegacyUnverifiedConflicts(login, email string) error {
	type existingUser struct {
		ID            int64
		Login         string
		Email         string
		EmailVerified bool
	}

	rows, err := h.DB.Query(`
		SELECT id, login, COALESCE(email, ''), email_verified
		FROM users
		WHERE login = $1 OR LOWER(email) = LOWER($2)
	`, login, email)
	if err != nil {
		return err
	}
	defer rows.Close()

	toDelete := make([]int64, 0)
	for rows.Next() {
		var u existingUser
		if err := rows.Scan(&u.ID, &u.Login, &u.Email, &u.EmailVerified); err != nil {
			return err
		}

		if u.EmailVerified {
			return errRegistrationAlreadyExists
		}

		if u.Login != login || !strings.EqualFold(u.Email, email) {
			return errRegistrationAlreadyExists
		}

		toDelete = append(toDelete, u.ID)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	for _, id := range toDelete {
		if _, err := h.DB.Exec(`DELETE FROM users WHERE id = $1`, id); err != nil {
			return err
		}
	}

	return nil
}

func writePendingRegistrationError(w http.ResponseWriter, err error, fallback string) {
	if err == nil {
		return
	}

	if errors.Is(err, errRegistrationAlreadyExists) {
		writeJSONError(w, http.StatusConflict, err.Error())
		return
	}
	if strings.HasPrefix(err.Error(), "please wait ") || strings.Contains(err.Error(), "expired") {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	if strings.Contains(err.Error(), "failed to send verification code") || strings.Contains(err.Error(), "smtp") {
		writeJSONError(w, http.StatusBadGateway, err.Error())
		return
	}
	if strings.Contains(err.Error(), "verification code") {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}

	writeJSONError(w, http.StatusInternalServerError, fallback)
}
