package userhandler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type Handler struct {
	DB *sql.DB
}

type UserLookupResponse struct {
	ID          int64     `json:"id"`
	PublicID    string    `json:"publicId"`
	Login       string    `json:"login"`
	DisplayName string    `json:"displayName"`
	AvatarDataURL string  `json:"avatarDataUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

func (h Handler) GetByPublicID(w http.ResponseWriter, r *http.Request) {
	publicID := strings.TrimSpace(chi.URLParam(r, "publicID"))
	if publicID == "" {
		writeJSONError(w, http.StatusBadRequest, "publicId is required")
		return
	}

	const query = `
		SELECT id, COALESCE(public_id, ''), login, display_name, COALESCE(avatar_data_url, ''), created_at
		FROM users
		WHERE public_id = $1
	`

	var user UserLookupResponse
	if err := h.DB.QueryRow(query, publicID).Scan(
		&user.ID,
		&user.PublicID,
		&user.Login,
		&user.DisplayName,
		&user.AvatarDataURL,
		&user.CreatedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

func (h Handler) Search(w http.ResponseWriter, r *http.Request) {
	queryText := strings.TrimSpace(r.URL.Query().Get("q"))
	if queryText == "" {
		writeJSONError(w, http.StatusBadRequest, "query parameter q is required")
		return
	}

	const query = `
		SELECT id, COALESCE(public_id, ''), login, display_name, COALESCE(avatar_data_url, ''), created_at
		FROM users
		WHERE public_id = $1
		   OR LOWER(login) = LOWER($1)
		   OR LOWER(display_name) LIKE '%' || LOWER($1) || '%'
		ORDER BY CASE
			WHEN public_id = $1 THEN 0
			WHEN LOWER(login) = LOWER($1) THEN 1
			ELSE 2
		END, created_at DESC
		LIMIT 20
	`

	rows, err := h.DB.Query(query, queryText)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to search users")
		return
	}
	defer rows.Close()

	users := make([]UserLookupResponse, 0)
	for rows.Next() {
		var user UserLookupResponse
		if err := rows.Scan(&user.ID, &user.PublicID, &user.Login, &user.DisplayName, &user.AvatarDataURL, &user.CreatedAt); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to read users")
			return
		}
		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to read users")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
