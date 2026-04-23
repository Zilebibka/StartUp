package authhandler

import (
	"database/sql"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"Necrocode/api/models"
	"Necrocode/api/services"
)

const (
	refreshCookieName = "refresh_token"
	refreshTokenTTL   = 30 * 24 * time.Hour
)

func (h Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err != nil || cookie.Value == "" {
		writeJSONError(w, http.StatusUnauthorized, "missing refresh token")
		return
	}

	hashedToken := services.HashOpaqueToken(cookie.Value)

	const findQuery = `
		SELECT rt.id, u.id, COALESCE(u.public_id, ''), u.login, COALESCE(u.email, ''), u.display_name, COALESCE(u.avatar_data_url, ''), u.birth_date, u.created_at
		FROM refresh_tokens rt
		JOIN users u ON u.id = rt.user_id
		WHERE rt.token_hash = $1
		  AND rt.revoked_at IS NULL
		  AND rt.expires_at > NOW()
	`

	var (
		refreshTokenID int64
		user           models.User
		birthDate      sql.NullTime
	)
	if err := h.DB.QueryRow(findQuery, hashedToken).Scan(
		&refreshTokenID,
		&user.ID,
		&user.PublicID,
		&user.Login,
		&user.Email,
		&user.DisplayName,
		&user.AvatarDataURL,
		&birthDate,
		&user.CreatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			clearRefreshCookie(w)
			writeJSONError(w, http.StatusUnauthorized, "invalid refresh token")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "failed to refresh session")
		return
	}

	if birthDate.Valid {
		user.BirthDate = birthDate.Time.In(time.UTC).Format("2006-01-02")
	}

	tx, err := h.DB.Begin()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to refresh session")
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, refreshTokenID); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to refresh session")
		return
	}

	refreshToken, err := services.GenerateOpaqueToken(32)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to refresh session")
		return
	}

	newHash := services.HashOpaqueToken(refreshToken)
	if _, err := tx.Exec(
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		user.ID,
		newHash,
		time.Now().Add(refreshTokenTTL),
	); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to refresh session")
		return
	}

	if err := tx.Commit(); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to refresh session")
		return
	}

	accessToken, err := services.GenerateToken(user.ID, user.Login)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	setRefreshCookie(w, refreshToken)
	writeJSON(w, http.StatusOK, models.AuthResponse{AccessToken: accessToken, User: user})
}

func (h Handler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(refreshCookieName)
	if err == nil && cookie.Value != "" {
		hashedToken := services.HashOpaqueToken(cookie.Value)
		_, _ = h.DB.Exec(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`, hashedToken)
	}

	clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (h Handler) issueSession(w http.ResponseWriter, user models.User) error {
	accessToken, err := services.GenerateToken(user.ID, user.Login)
	if err != nil {
		return err
	}

	refreshToken, err := services.GenerateOpaqueToken(32)
	if err != nil {
		return err
	}

	hashedToken := services.HashOpaqueToken(refreshToken)
	if _, err := h.DB.Exec(
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		user.ID,
		hashedToken,
		time.Now().Add(refreshTokenTTL),
	); err != nil {
		return err
	}

	setRefreshCookie(w, refreshToken)
	writeJSON(w, http.StatusOK, models.AuthResponse{AccessToken: accessToken, User: user})
	return nil
}

func setRefreshCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/api/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   cookieSecure(),
		MaxAge:   int(refreshTokenTTL.Seconds()),
		Expires:  time.Now().Add(refreshTokenTTL),
	})
}

func clearRefreshCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/api/auth",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   cookieSecure(),
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func cookieSecure() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SECURE")))
	return v == "1" || v == "true" || v == "yes"
}
