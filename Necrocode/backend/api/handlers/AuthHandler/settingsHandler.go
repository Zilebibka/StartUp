package authhandler

import (
	"encoding/base64"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"Necrocode/api/middlewares"
	"Necrocode/api/models"

	"golang.org/x/crypto/bcrypt"
)

type UpdateSettingsRequest struct {
	CurrentPassword string `json:"currentPassword"`
	Email           string `json:"email"`
	NewPassword     string `json:"newPassword"`
	DisplayName     string `json:"displayName"`
	AvatarDataURL   string `json:"avatarDataUrl"`
	BirthDate       string `json:"birthDate"`
}

const maxAvatarBytes = 2 * 1024 * 1024

func (h Handler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if !ok || userID == 0 {
		writeJSONError(w, http.StatusUnauthorized, "invalid user session")
		return
	}

	var req UpdateSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.CurrentPassword = strings.TrimSpace(req.CurrentPassword)
	req.Email = strings.TrimSpace(req.Email)
	req.NewPassword = strings.TrimSpace(req.NewPassword)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.AvatarDataURL = strings.TrimSpace(req.AvatarDataURL)
	req.BirthDate = strings.TrimSpace(req.BirthDate)

	if req.Email == "" && req.NewPassword == "" && req.DisplayName == "" && req.AvatarDataURL == "" && req.BirthDate == "" {
		writeJSONError(w, http.StatusBadRequest, "nothing to update")
		return
	}

	if req.Email != "" {
		if _, err := mail.ParseAddress(req.Email); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid email")
			return
		}
	}

	if req.NewPassword != "" {
		if len(req.NewPassword) < 8 || len(req.NewPassword) > 128 {
			writeJSONError(w, http.StatusBadRequest, "newPassword must be between 8 and 128 characters")
			return
		}
	}

	if req.DisplayName != "" && len(req.DisplayName) > 100 {
		writeJSONError(w, http.StatusBadRequest, "displayName must be up to 100 characters")
		return
	}

	if req.AvatarDataURL != "" {
		if err := validateAvatarDataURL(req.AvatarDataURL); err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	var parsedBirthDate sql.NullTime
	if req.BirthDate != "" {
		dateValue, err := time.Parse("2006-01-02", req.BirthDate)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, "birthDate must be in YYYY-MM-DD format")
			return
		}
		if dateValue.After(time.Now()) {
			writeJSONError(w, http.StatusBadRequest, "birthDate cannot be in the future")
			return
		}
		parsedBirthDate = sql.NullTime{Time: dateValue, Valid: true}
	}

	const getUserQuery = `
		SELECT id, COALESCE(public_id, ''), login, COALESCE(email, ''), display_name, COALESCE(avatar_data_url, ''), birth_date, created_at, password_hash
		FROM users
		WHERE id = $1
	`

	var user models.User
	var currentBirthDate sql.NullTime
	if err := h.DB.QueryRow(getUserQuery, userID).Scan(
		&user.ID,
		&user.PublicID,
		&user.Login,
		&user.Email,
		&user.DisplayName,
		&user.AvatarDataURL,
		&currentBirthDate,
		&user.CreatedAt,
		&user.PasswordHash,
	); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusUnauthorized, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	if currentBirthDate.Valid {
		user.BirthDate = currentBirthDate.Time.In(time.UTC).Format("2006-01-02")
	}

	requiresPassword := req.Email != "" || req.NewPassword != ""
	if requiresPassword {
		if req.CurrentPassword == "" {
			writeJSONError(w, http.StatusBadRequest, "currentPassword is required")
			return
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
			writeJSONError(w, http.StatusUnauthorized, "invalid current password")
			return
		}
	}

	nextEmail := user.Email
	if req.Email != "" {
		nextEmail = req.Email
	}

	nextHash := user.PasswordHash
	if req.NewPassword != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to hash password")
			return
		}
		nextHash = string(hash)
	}

	nextDisplayName := user.DisplayName
	if req.DisplayName != "" {
		nextDisplayName = req.DisplayName
	}

	nextAvatarDataURL := user.AvatarDataURL
	if req.AvatarDataURL != "" {
		nextAvatarDataURL = req.AvatarDataURL
	}

	nextBirthDate := currentBirthDate
	if parsedBirthDate.Valid {
		nextBirthDate = parsedBirthDate
	}

	const updateQuery = `
		UPDATE users
		SET email = $1, password_hash = $2, display_name = $3, avatar_data_url = $4, birth_date = $5
		WHERE id = $6
	`

	if _, err := h.DB.Exec(updateQuery, nextEmail, nextHash, nextDisplayName, nextAvatarDataURL, nextBirthDate, userID); err != nil {
		if isUniqueViolation(err) {
			writeJSONError(w, http.StatusConflict, "email already exists")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to update settings")
		return
	}

	user.Email = nextEmail
	user.DisplayName = nextDisplayName
	user.AvatarDataURL = nextAvatarDataURL
	if nextBirthDate.Valid {
		user.BirthDate = nextBirthDate.Time.In(time.UTC).Format("2006-01-02")
	} else {
		user.BirthDate = ""
	}
	user.PasswordHash = ""
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func validateAvatarDataURL(value string) error {
	if !strings.HasPrefix(value, "data:image/") {
		return fmt.Errorf("avatarDataUrl must contain image data URL")
	}

	parts := strings.SplitN(value, ",", 2)
	if len(parts) != 2 {
		return fmt.Errorf("avatarDataUrl is malformed")
	}

	meta := parts[0]
	if !strings.Contains(meta, ";base64") {
		return fmt.Errorf("avatarDataUrl must be base64 encoded")
	}

	decoded, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return fmt.Errorf("avatarDataUrl is not valid base64")
	}

	if len(decoded) > maxAvatarBytes {
		return fmt.Errorf("avatar file size must be <= 2 MB")
	}

	return nil
}
