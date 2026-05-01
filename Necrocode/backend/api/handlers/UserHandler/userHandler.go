package userhandler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"Necrocode/api/middlewares"

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

type UserReview struct {
	ID        int64  `json:"id"`
	Text      string `json:"text"`
	Rating    int    `json:"rating"`
	Author    string `json:"author"`
	Date      string `json:"date"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type ReviewRequest struct {
	Text   string `json:"text"`
	Rating int    `json:"rating"`
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

func (h Handler) ListReviewsByLogin(w http.ResponseWriter, r *http.Request) {
	login := strings.TrimSpace(chi.URLParam(r, "login"))
	if login == "" {
		writeJSONError(w, http.StatusBadRequest, "login is required")
		return
	}

	var userID int64
	if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, login).Scan(&userID); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	const query = `
		SELECT r.id, r.body, r.rating, r.created_at, r.updated_at, u.login
		FROM user_reviews r
		JOIN users u ON u.id = r.reviewer_id
		WHERE r.target_user_id = $1
		ORDER BY r.updated_at DESC
	`

	rows, err := h.DB.Query(query, userID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to load reviews")
		return
	}
	defer rows.Close()

	reviews := make([]UserReview, 0)
	for rows.Next() {
		var (
			item UserReview
			createdAt time.Time
			updatedAt time.Time
			author string
		)
		if err := rows.Scan(&item.ID, &item.Text, &item.Rating, &createdAt, &updatedAt, &author); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "failed to read reviews")
			return
		}
		item.Author = author
		item.CreatedAt = createdAt.UTC().Format(time.RFC3339)
		item.UpdatedAt = updatedAt.UTC().Format(time.RFC3339)
		item.Date = item.UpdatedAt
		reviews = append(reviews, item)
	}

	if err := rows.Err(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to read reviews")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"reviews": reviews})
}

func (h Handler) CreateReview(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	reviewerLogin, _ := r.Context().Value(middlewares.ContextLoginKey).(string)
	if userID == 0 || reviewerLogin == "" {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	targetLogin := strings.TrimSpace(chi.URLParam(r, "login"))
	if targetLogin == "" {
		writeJSONError(w, http.StatusBadRequest, "login is required")
		return
	}

	var targetID int64
	if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, targetLogin).Scan(&targetID); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	if targetID == userID {
		writeJSONError(w, http.StatusBadRequest, "cannot review yourself")
		return
	}

	var req ReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	text := strings.TrimSpace(req.Text)
	if text == "" {
		writeJSONError(w, http.StatusBadRequest, "text is required")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		writeJSONError(w, http.StatusBadRequest, "rating must be 1..5")
		return
	}

	var existingID int64
	if err := h.DB.QueryRow(
		`SELECT id FROM user_reviews WHERE reviewer_id = $1 AND target_user_id = $2`,
		userID,
		targetID,
	).Scan(&existingID); err == nil {
		writeJSONError(w, http.StatusConflict, "review already exists")
		return
	}

	createdAt := time.Now().UTC()
	updatedAt := createdAt
	var reviewID int64
	if err := h.DB.QueryRow(
		`INSERT INTO user_reviews (reviewer_id, target_user_id, rating, body, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id`,
		userID,
		targetID,
		req.Rating,
		text,
		createdAt,
		updatedAt,
	).Scan(&reviewID); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to save review")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"review": UserReview{
			ID:        reviewID,
			Text:      text,
			Rating:    req.Rating,
			Author:    reviewerLogin,
			Date:      updatedAt.Format(time.RFC3339),
			CreatedAt: createdAt.Format(time.RFC3339),
			UpdatedAt: updatedAt.Format(time.RFC3339),
		},
	})
}

func (h Handler) UpdateReview(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	reviewerLogin, _ := r.Context().Value(middlewares.ContextLoginKey).(string)
	if userID == 0 || reviewerLogin == "" {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	targetLogin := strings.TrimSpace(chi.URLParam(r, "login"))
	if targetLogin == "" {
		writeJSONError(w, http.StatusBadRequest, "login is required")
		return
	}

	var targetID int64
	if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, targetLogin).Scan(&targetID); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	var req ReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid payload")
		return
	}

	text := strings.TrimSpace(req.Text)
	if text == "" {
		writeJSONError(w, http.StatusBadRequest, "text is required")
		return
	}
	if req.Rating < 1 || req.Rating > 5 {
		writeJSONError(w, http.StatusBadRequest, "rating must be 1..5")
		return
	}

	updatedAt := time.Now().UTC()
	var reviewID int64
	var createdAt time.Time
	if err := h.DB.QueryRow(
		`UPDATE user_reviews
		 SET rating = $1, body = $2, updated_at = $3
		 WHERE reviewer_id = $4 AND target_user_id = $5
		 RETURNING id, created_at`,
		req.Rating,
		text,
		updatedAt,
		userID,
		targetID,
	).Scan(&reviewID, &createdAt); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "review not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to update review")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"review": UserReview{
			ID:        reviewID,
			Text:      text,
			Rating:    req.Rating,
			Author:    reviewerLogin,
			Date:      updatedAt.Format(time.RFC3339),
			CreatedAt: createdAt.UTC().Format(time.RFC3339),
			UpdatedAt: updatedAt.UTC().Format(time.RFC3339),
		},
	})
}

func (h Handler) DeleteReview(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)
	if userID == 0 {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	targetLogin := strings.TrimSpace(chi.URLParam(r, "login"))
	if targetLogin == "" {
		writeJSONError(w, http.StatusBadRequest, "login is required")
		return
	}

	var targetID int64
	if err := h.DB.QueryRow(`SELECT id FROM users WHERE login = $1`, targetLogin).Scan(&targetID); err != nil {
		if err == sql.ErrNoRows {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	res, err := h.DB.Exec(`DELETE FROM user_reviews WHERE reviewer_id = $1 AND target_user_id = $2`, userID, targetID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to delete review")
		return
	}
	rows, _ := res.RowsAffected()
	if rows == 0 {
		writeJSONError(w, http.StatusNotFound, "review not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
