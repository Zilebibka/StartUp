package authhandler

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"Necrocode/api/middlewares"
	"Necrocode/api/models"
	"Necrocode/api/services"

	"golang.org/x/crypto/bcrypt"
)

const (
	codePurposeVerifyEmail   = "verify_email"
	codePurposeResetPassword = "reset_password"
	codePurposeChangeEmail   = "change_email"
	verificationCodeTTL      = 15 * time.Minute
	maxCodeAttempts          = 5
	resendCodeCooldown       = 60 * time.Second
)

type verifyRegisterRequest struct {
	Login string `json:"login"`
	Code  string `json:"code"`
}

type resendRegisterCodeRequest struct {
	Login string `json:"login"`
}

type forgotPasswordRequest struct {
	Identifier string `json:"identifier"`
}

type resetPasswordRequest struct {
	Identifier  string `json:"identifier"`
	Code        string `json:"code"`
	NewPassword string `json:"newPassword"`
}

type verifyResetCodeRequest struct {
	Identifier string `json:"identifier"`
	Code       string `json:"code"`
}

type requestEmailChangeCodeRequest struct {
	NewEmail string `json:"newEmail"`
}

type confirmEmailChangeRequest struct {
	NewEmail string `json:"newEmail"`
	Code     string `json:"code"`
}

func (h Handler) VerifyRegisterCode(w http.ResponseWriter, r *http.Request) {
	var req verifyRegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.Login = strings.TrimSpace(req.Login)
	req.Code = strings.TrimSpace(req.Code)
	if req.Login == "" || !isValidSixDigitCode(req.Code) {
		writeJSONError(w, http.StatusBadRequest, "login and 6-digit code are required")
		return
	}

	hasPending, err := h.hasPendingRegistration(req.Login)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to verify code")
		return
	}
	if hasPending {
		user, err := h.completePendingRegistration(req.Login, req.Code)
		if err != nil {
			writePendingRegistrationError(w, err, "failed to verify code")
			return
		}

		if err := h.issueSession(w, user); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to create session")
			return
		}
		return
	}

	const query = `
		SELECT id, COALESCE(public_id, ''), login, COALESCE(email, ''), display_name, COALESCE(avatar_data_url, ''), birth_date, created_at, email_verified
		FROM users
		WHERE login = $1
	`

	var (
		user          models.User
		birthDate     sql.NullTime
		emailVerified bool
	)
	if err := h.DB.QueryRow(query, req.Login).Scan(
		&user.ID,
		&user.PublicID,
		&user.Login,
		&user.Email,
		&user.DisplayName,
		&user.AvatarDataURL,
		&birthDate,
		&user.CreatedAt,
		&emailVerified,
	); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to verify code")
		return
	}

	if emailVerified {
		writeJSONError(w, http.StatusBadRequest, "email is already verified")
		return
	}

	if err := h.consumeCode(user.ID, user.Email, codePurposeVerifyEmail, req.Code); err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if _, err := h.DB.Exec(`UPDATE users SET email_verified = TRUE WHERE id = $1`, user.ID); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to verify email")
		return
	}

	if birthDate.Valid {
		user.BirthDate = birthDate.Time.In(time.UTC).Format("2006-01-02")
	}

	if err := h.issueSession(w, user); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
}

func (h Handler) ResendRegisterCode(w http.ResponseWriter, r *http.Request) {
	var req resendRegisterCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.Login = strings.TrimSpace(req.Login)
	if req.Login == "" {
		writeJSONError(w, http.StatusBadRequest, "login is required")
		return
	}

	if err := h.resendPendingRegistrationCode(req.Login); err == nil {
		writeJSON(w, http.StatusOK, map[string]string{"message": "verification code sent"})
		return
	} else if !errors.Is(err, errPendingRegistrationNotFound) {
		writePendingRegistrationError(w, err, "failed to resend code")
		return
	}

	const query = `SELECT id, COALESCE(email, ''), email_verified FROM users WHERE login = $1`
	var (
		userID        int64
		email         string
		emailVerified bool
	)
	if err := h.DB.QueryRow(query, req.Login).Scan(&userID, &email, &emailVerified); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to resend code")
		return
	}

	if emailVerified {
		writeJSONError(w, http.StatusBadRequest, "email is already verified")
		return
	}

	if err := h.createAndSendEmailCode(userID, email, codePurposeVerifyEmail); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to send verification code")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "verification code sent"})
}

func (h Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	identifier := strings.TrimSpace(req.Identifier)
	if identifier == "" {
		writeJSONError(w, http.StatusBadRequest, "identifier is required")
		return
	}

	const query = `
		SELECT id, COALESCE(email, '')
		FROM users
		WHERE LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($1)
		LIMIT 1
	`
	var (
		userID int64
		email  string
	)
	if err := h.DB.QueryRow(query, identifier).Scan(&userID, &email); err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusOK, map[string]string{"message": "if the account exists, the code has been sent"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "if the account exists, the code has been sent"})
		return
	}

	_ = h.createAndSendEmailCode(userID, email, codePurposeResetPassword)

	writeJSON(w, http.StatusOK, map[string]string{"message": "if the account exists, the code has been sent"})
}

func (h Handler) VerifyResetPasswordCode(w http.ResponseWriter, r *http.Request) {
	var req verifyResetCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	identifier := strings.TrimSpace(req.Identifier)
	req.Code = strings.TrimSpace(req.Code)
	if identifier == "" || !isValidSixDigitCode(req.Code) {
		writeJSONError(w, http.StatusBadRequest, "identifier and 6-digit code are required")
		return
	}

	const query = `
		SELECT id, COALESCE(email, '')
		FROM users
		WHERE LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($1)
		LIMIT 1
	`
	var (
		userID int64
		email  string
	)
	if err := h.DB.QueryRow(query, identifier).Scan(&userID, &email); err != nil {
		writeJSONError(w, http.StatusUnauthorized, "verification code is invalid")
		return
	}

	if err := h.verifyCode(userID, email, codePurposeResetPassword, req.Code, false); err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "verification code is valid"})
}

func (h Handler) ResetPasswordByCode(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	identifier := strings.TrimSpace(req.Identifier)
	req.Code = strings.TrimSpace(req.Code)
	if identifier == "" || !isValidSixDigitCode(req.Code) {
		writeJSONError(w, http.StatusBadRequest, "identifier and 6-digit code are required")
		return
	}
	if len(req.NewPassword) < 8 || len(req.NewPassword) > 128 {
		writeJSONError(w, http.StatusBadRequest, "password must be between 8 and 128 characters")
		return
	}

	const query = `
		SELECT id, COALESCE(email, '')
		FROM users
		WHERE LOWER(login) = LOWER($1) OR LOWER(email) = LOWER($1)
		LIMIT 1
	`
	var (
		userID int64
		email  string
	)
	if err := h.DB.QueryRow(query, identifier).Scan(&userID, &email); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to reset password")
		return
	}

	if err := h.verifyCode(userID, email, codePurposeResetPassword, req.Code, true); err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to reset password")
		return
	}

	if _, err := h.DB.Exec(`UPDATE users SET password_hash = $1 WHERE id = $2`, string(hash), userID); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to reset password")
		return
	}

	_, _ = h.DB.Exec(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	clearRefreshCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"message": "password has been updated"})
}

func (h Handler) RequestEmailChangeCode(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if !ok || userID == 0 {
		writeJSONError(w, http.StatusUnauthorized, "invalid user session")
		return
	}

	var req requestEmailChangeCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.NewEmail = strings.TrimSpace(req.NewEmail)
	if req.NewEmail == "" {
		writeJSONError(w, http.StatusBadRequest, "newEmail is required")
		return
	}
	if _, err := mail.ParseAddress(req.NewEmail); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid email")
		return
	}

	const query = `SELECT COALESCE(email, '') FROM users WHERE id = $1`
	var currentEmail string
	if err := h.DB.QueryRow(query, userID).Scan(&currentEmail); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusUnauthorized, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to process request")
		return
	}

	if strings.EqualFold(currentEmail, req.NewEmail) {
		writeJSONError(w, http.StatusBadRequest, "new email must be different")
		return
	}

	var existingUserID int64
	if err := h.DB.QueryRow(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, req.NewEmail).Scan(&existingUserID); err == nil {
		writeJSONError(w, http.StatusConflict, "email already exists")
		return
	} else if err != sql.ErrNoRows {
		writeJSONError(w, http.StatusInternalServerError, "failed to process request")
		return
	}

	if err := h.createAndSendEmailCode(userID, req.NewEmail, codePurposeChangeEmail); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "email change code sent"})
}

func (h Handler) ConfirmEmailChange(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if !ok || userID == 0 {
		writeJSONError(w, http.StatusUnauthorized, "invalid user session")
		return
	}

	var req confirmEmailChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.NewEmail = strings.TrimSpace(req.NewEmail)
	req.Code = strings.TrimSpace(req.Code)
	if req.NewEmail == "" || !isValidSixDigitCode(req.Code) {
		writeJSONError(w, http.StatusBadRequest, "newEmail and 6-digit code are required")
		return
	}
	if _, err := mail.ParseAddress(req.NewEmail); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid email")
		return
	}

	if err := h.verifyCode(userID, req.NewEmail, codePurposeChangeEmail, req.Code, true); err != nil {
		writeJSONError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if _, err := h.DB.Exec(`UPDATE users SET email = $1, email_verified = TRUE WHERE id = $2`, req.NewEmail, userID); err != nil {
		if isUniqueViolation(err) {
			writeJSONError(w, http.StatusConflict, "email already exists")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to update email")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "email has been updated"})
}

func (h Handler) createAndSendEmailCode(userID int64, email, purpose string) error {
	if strings.TrimSpace(email) == "" {
		return fmt.Errorf("email is required")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("invalid email")
	}

	var lastCodeCreatedAt sql.NullTime
	if err := h.DB.QueryRow(
		`SELECT MAX(created_at) FROM email_codes WHERE user_id = $1 AND purpose = $2`,
		userID,
		purpose,
	).Scan(&lastCodeCreatedAt); err != nil {
		return err
	}
	if lastCodeCreatedAt.Valid {
		nextAllowedAt := lastCodeCreatedAt.Time.Add(resendCodeCooldown)
		if time.Now().Before(nextAllowedAt) {
			wait := int(time.Until(nextAllowedAt).Seconds())
			if wait < 1 {
				wait = 1
			}
			return fmt.Errorf("please wait %d seconds before requesting a new code", wait)
		}
	}

	code, err := generateSixDigitCode()
	if err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	expiresAt := time.Now().Add(verificationCodeTTL)
	tx, err := h.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
		UPDATE email_codes
		SET consumed_at = NOW()
		WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
	`, userID, purpose); err != nil {
		return err
	}

	if _, err := tx.Exec(`
		INSERT INTO email_codes (user_id, email, purpose, code_hash, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, email, purpose, string(hash), expiresAt); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	subject, title, subtitle := emailTemplateMetaByPurpose(purpose)
	plainBody := buildCodeEmailPlain(title, subtitle, code)
	htmlBody := buildCodeEmailHTML(title, subtitle, code)

	return services.SendEmail(h.SMTPConfig, email, subject, plainBody, htmlBody)
}

func emailTemplateMetaByPurpose(purpose string) (subject, title, subtitle string) {
	subject = "NecroCode: код подтверждения"
	title = "Подтверждение email"
	subtitle = "Используйте этот код, чтобы завершить подтверждение аккаунта."

	switch purpose {
	case codePurposeResetPassword:
		subject = "NecroCode: код для сброса пароля"
		title = "Сброс пароля"
		subtitle = "Используйте код, чтобы задать новый пароль."
	case codePurposeChangeEmail:
		subject = "NecroCode: код для смены email"
		title = "Смена email"
		subtitle = "Подтвердите новый email этим кодом."
	}

	return subject, title, subtitle
}

func buildCodeEmailPlain(title, subtitle, code string) string {
	return fmt.Sprintf(
		"NecroCode\n\n%s\n%s\n\nКод: %s\n\nКод действует 15 минут. Никому его не сообщайте.\n\nЕсли это были не вы, просто проигнорируйте это письмо.",
		title,
		subtitle,
		code,
	)
}

func buildCodeEmailHTML(title, subtitle, code string) string {
	return fmt.Sprintf(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NecroCode</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:22px 24px;background:linear-gradient(135deg,#111827,#1f2937);color:#ffffff;">
                <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">NecroCode</div>
                <div style="margin-top:8px;font-size:22px;font-weight:700;line-height:1.25;">%s</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#374151;">%s</p>
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#6b7280;">Код действует 15 минут и может быть использован только один раз.</p>
                <div style="margin:12px 0 18px;padding:14px 16px;border:1px dashed #d1d5db;border-radius:12px;background:#f9fafb;text-align:center;">
                  <span style="font-size:30px;font-weight:800;letter-spacing:0.28em;color:#111827;">%s</span>
                </div>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">Если это были не вы, просто проигнорируйте это письмо.</p>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:10px auto 0;font-size:12px;line-height:1.6;color:#9ca3af;">Это автоматическое сообщение, отвечать на него не нужно.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`, title, subtitle, code)
}

func (h Handler) consumeCode(userID int64, email, purpose, code string) error {
	return h.verifyCode(userID, email, purpose, code, true)
}

func (h Handler) verifyCode(userID int64, email, purpose, code string, consume bool) error {
	const query = `
		SELECT id, code_hash, attempt_count, expires_at
		FROM email_codes
		WHERE user_id = $1 AND email = $2 AND purpose = $3 AND consumed_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`

	var (
		codeID       int64
		codeHash     string
		attemptCount int
		expiresAt    time.Time
	)
	if err := h.DB.QueryRow(query, userID, email, purpose).Scan(&codeID, &codeHash, &attemptCount, &expiresAt); err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("verification code is invalid")
		}
		return fmt.Errorf("failed to verify code")
	}

	if time.Now().After(expiresAt) {
		_, _ = h.DB.Exec(`UPDATE email_codes SET consumed_at = NOW() WHERE id = $1`, codeID)
		return fmt.Errorf("verification code has expired")
	}

	if attemptCount >= maxCodeAttempts {
		_, _ = h.DB.Exec(`UPDATE email_codes SET consumed_at = NOW() WHERE id = $1`, codeID)
		return fmt.Errorf("verification code has expired")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(codeHash), []byte(code)); err != nil {
		_, _ = h.DB.Exec(`UPDATE email_codes SET attempt_count = attempt_count + 1 WHERE id = $1`, codeID)
		return fmt.Errorf("verification code is invalid")
	}

	if consume {
		if _, err := h.DB.Exec(`UPDATE email_codes SET consumed_at = NOW() WHERE id = $1`, codeID); err != nil {
			return fmt.Errorf("failed to verify code")
		}
	}

	return nil
}

func generateSixDigitCode() (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	n := (int(b[0])<<24 | int(b[1])<<16 | int(b[2])<<8 | int(b[3])) & 0x7fffffff
	return fmt.Sprintf("%06d", n%1000000), nil
}

func isValidSixDigitCode(code string) bool {
	if len(code) != 6 {
		return false
	}
	for _, ch := range code {
		if ch < '0' || ch > '9' {
			return false
		}
	}
	return true
}
