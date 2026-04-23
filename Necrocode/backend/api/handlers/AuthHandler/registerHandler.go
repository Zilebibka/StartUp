package authhandler

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"Necrocode/api/models"

	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	DB *sql.DB
}

func (h Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	req.Login = strings.TrimSpace(req.Login)
	req.Email = strings.TrimSpace(req.Email)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	if err := req.Validate(); err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	const query = `
		INSERT INTO users (public_id, login, email, display_name, password_hash)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`

	var user models.User
	user.Login = req.Login
	user.Email = req.Email
	user.DisplayName = req.DisplayName

	for range 5 {
		user.PublicID, err = generatePublicID()
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to create user")
			return
		}

		err = h.DB.QueryRow(query, user.PublicID, user.Login, user.Email, user.DisplayName, string(hash)).Scan(&user.ID, &user.CreatedAt)
		if err == nil {
			break
		}

		if isConstraintViolation(err, "users_public_id_unique_idx") {
			continue
		}

		if isUniqueViolation(err) {
			writeJSONError(w, http.StatusConflict, "login or email already exists")
			return
		}

		writeJSONError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	if user.ID == 0 {
		writeJSONError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	if err := h.issueSession(w, user); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505"
	}
	return false
}

func isConstraintViolation(err error, constraintName string) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "23505" && pgErr.ConstraintName == constraintName
	}
	return false
}

func generatePublicID() (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "nc_" + hex.EncodeToString(b), nil
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
