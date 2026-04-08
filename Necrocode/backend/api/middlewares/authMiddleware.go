package middlewares

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"Necrocode/api/services"
)

type contextKey string

const (
	ContextUserIDKey contextKey = "userID"
	ContextLoginKey  contextKey = "login"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			writeAuthError(w, "missing or invalid authorization header")
			return
		}

		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		claims, err := services.ParseToken(tokenString)
		if err != nil {
			writeAuthError(w, "invalid token")
			return
		}

		ctx := context.WithValue(r.Context(), ContextUserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, ContextLoginKey, claims.Login)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func writeAuthError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
