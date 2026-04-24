package authhandler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"Necrocode/api/models"

	"golang.org/x/crypto/bcrypt"
)

func (h Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.Login = strings.TrimSpace(req.Login)
	if err := req.Validate(); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	const query = `
		SELECT id, COALESCE(public_id, ''), login, COALESCE(email, ''), display_name, COALESCE(avatar_data_url, ''), birth_date, created_at, password_hash, email_verified
		FROM users
		WHERE login = $1
	`

	var user models.User
	var birthDate sql.NullTime
	var emailVerified bool
	if err := h.DB.QueryRow(query, req.Login).Scan(
		&user.ID,
		&user.PublicID,
		&user.Login,
		&user.Email,
		&user.DisplayName,
		&user.AvatarDataURL,
		&birthDate,
		&user.CreatedAt,
		&user.PasswordHash,
		&emailVerified,
	); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusUnauthorized, "invalid login or password")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	if birthDate.Valid {
		user.BirthDate = birthDate.Time.In(time.UTC).Format("2006-01-02")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeJSONError(w, http.StatusUnauthorized, "invalid login or password")
		return
	}

	if !emailVerified {
		writeJSONError(w, http.StatusForbidden, "email is not verified")
		return
	}

	user.PasswordHash = ""
	if err := h.issueSession(w, user); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
}
