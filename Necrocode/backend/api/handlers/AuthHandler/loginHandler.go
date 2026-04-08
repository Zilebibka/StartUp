package authhandler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

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
		SELECT id, login, COALESCE(email, ''), display_name, created_at, password_hash
		FROM users
		WHERE login = $1
	`

	var user models.User
	if err := h.DB.QueryRow(query, req.Login).Scan(
		&user.ID,
		&user.Login,
		&user.Email,
		&user.DisplayName,
		&user.CreatedAt,
		&user.PasswordHash,
	); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusUnauthorized, "invalid login or password")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		writeJSONError(w, http.StatusUnauthorized, "invalid login or password")
		return
	}

	user.PasswordHash = ""
	if err := h.issueSession(w, user); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
}
