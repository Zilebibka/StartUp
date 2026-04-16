package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	authhandler "Necrocode/api/handlers/AuthHandler"
	marketplacehandler "Necrocode/api/handlers/MarketplaceHandler"
	"Necrocode/api/middlewares"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func NewRouter(db *sql.DB) http.Handler {
	r := chi.NewRouter()
	r.Use(middlewares.CORSMiddleware)
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	authHandler := authhandler.Handler{DB: db}
	marketHandler := marketplacehandler.Handler{DB: db}

	r.Route("/api", func(r chi.Router) {
		r.Get("/listings", marketHandler.ListListings)
		r.Get("/listings/{listingID}", marketHandler.GetListingByID)

		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		})

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
		})

		r.Group(func(r chi.Router) {
			r.Use(middlewares.AuthMiddleware)
			r.Post("/listings", marketHandler.CreateListing)
			r.Put("/listings/{listingID}", marketHandler.UpdateListing)
			r.Delete("/listings/{listingID}", marketHandler.DeleteListing)
			r.Get("/cart", marketHandler.GetCart)
			r.Post("/cart/items", marketHandler.SetCartItem)
			r.Delete("/cart/items/{listingID}", marketHandler.RemoveCartItem)

			r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
				userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)

				const profileQuery = `
					SELECT login, COALESCE(email, ''), display_name
					FROM users
					WHERE id = $1
				`

				var (
					login       string
					email       string
					displayName string
				)
				if err := db.QueryRow(profileQuery, userID).Scan(&login, &email, &displayName); err != nil {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load profile"})
					return
				}

				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]any{
					"id":          userID,
					"login":       login,
					"email":       email,
					"displayName": displayName,
				})
			})
		})
	})

	return r
}
