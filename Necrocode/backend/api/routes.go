package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	authhandler "Necrocode/api/handlers/AuthHandler"
	chathandler "Necrocode/api/handlers/ChatHandler"
	marketplacehandler "Necrocode/api/handlers/MarketplaceHandler"
	userhandler "Necrocode/api/handlers/UserHandler"
	"Necrocode/api/middlewares"
	"Necrocode/api/services"

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

	authHandler := authhandler.Handler{DB: db, SMTPConfig: services.LoadSMTPConfigFromEnv()}
	chatHub := chathandler.NewHub()
	chatHandler := chathandler.Handler{Hub: chatHub, DB: db}
	marketHandler := marketplacehandler.Handler{DB: db}
	userHandler := userhandler.Handler{DB: db}

	r.Route("/api", func(r chi.Router) {
		r.Get("/listings", marketHandler.ListListings)
		r.Get("/listings/{listingID}", marketHandler.GetListingByID)

		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		})

		r.Get("/users/search", userHandler.Search)
		r.Get("/users/{publicID}", userHandler.GetByPublicID)
		r.Get("/users/{login}/reviews", userHandler.ListReviewsByLogin)
		r.Get("/ws/chat", chatHandler.HandleWS)
		r.Get("/chats/attachments/{id}", chatHandler.DownloadAttachment)

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authHandler.Register)
			r.Post("/register/verify", authHandler.VerifyRegisterCode)
			r.Post("/register/resend", authHandler.ResendRegisterCode)
			r.Post("/login", authHandler.Login)
			r.Post("/password/forgot", authHandler.ForgotPassword)
			r.Post("/password/verify-code", authHandler.VerifyResetPasswordCode)
			r.Post("/password/reset", authHandler.ResetPasswordByCode)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
		})

		r.Group(func(r chi.Router) {
			r.Use(middlewares.AuthMiddleware)
			r.Get("/chats", chatHandler.ListChats)
			r.Get("/chats/{login}", chatHandler.GetChatHistory)
			r.Post("/chats/{login}/attachments", chatHandler.UploadAttachment)
			r.Patch("/chats/messages/{id}", chatHandler.EditMessage)
			r.Post("/chats/messages/delete", chatHandler.DeleteMessages)
			r.Post("/users/{login}/reviews", userHandler.CreateReview)
			r.Patch("/users/{login}/reviews", userHandler.UpdateReview)
			r.Delete("/users/{login}/reviews", userHandler.DeleteReview)
			r.Post("/listings", marketHandler.CreateListing)
			r.Put("/listings/{listingID}", marketHandler.UpdateListing)
			r.Delete("/listings/{listingID}", marketHandler.DeleteListing)
			r.Get("/cart", marketHandler.GetCart)
			r.Post("/cart/items", marketHandler.SetCartItem)
			r.Delete("/cart/items/{listingID}", marketHandler.RemoveCartItem)
			r.Put("/me/settings", authHandler.UpdateSettings)
			r.Post("/me/email/change/request", authHandler.RequestEmailChangeCode)
			r.Post("/me/email/change/confirm", authHandler.ConfirmEmailChange)

			r.Get("/me", func(w http.ResponseWriter, r *http.Request) {
				userID, _ := r.Context().Value(middlewares.ContextUserIDKey).(int64)

				const profileQuery = `
					SELECT COALESCE(public_id, ''), login, COALESCE(email, ''), display_name, COALESCE(avatar_data_url, ''), birth_date
					FROM users
					WHERE id = $1
				`

				var (
					publicID      string
					login         string
					email         string
					displayName   string
					avatarDataURL string
					birthDate     sql.NullTime
				)
				if err := db.QueryRow(profileQuery, userID).Scan(&publicID, &login, &email, &displayName, &avatarDataURL, &birthDate); err != nil {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load profile"})
					return
				}

				birthDateStr := ""
				if birthDate.Valid {
					birthDateStr = birthDate.Time.In(time.UTC).Format("2006-01-02")
				}

				w.Header().Set("Content-Type", "application/json")
				_ = json.NewEncoder(w).Encode(map[string]any{
					"id":            userID,
					"publicId":      publicID,
					"login":         login,
					"email":         email,
					"displayName":   displayName,
					"avatarDataUrl": avatarDataURL,
					"birthDate":     birthDateStr,
				})
			})
		})
	})

	return r
}
