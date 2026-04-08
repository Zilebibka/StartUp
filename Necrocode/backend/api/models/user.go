package models

import (
	"errors"
	"net/mail"
	"strings"
	"time"
)

type User struct {
	ID           int64  `json:"id"`
	Login        string `json:"login"`
	Email        string `json:"email,omitempty"`
	DisplayName  string `json:"displayName,omitempty"`
	CreatedAt    time.Time `json:"createdAt,omitempty"`
	PasswordHash string `json:"-"`
}

type AuthResponse struct {
	AccessToken string `json:"accessToken"`
	User        User   `json:"user"`
}

type RegisterRequest struct {
	Login       string `json:"login"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
}

type LoginRequest struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

func (r RegisterRequest) Validate() error {
	login := strings.TrimSpace(r.Login)
	if len(login) < 3 || len(login) > 64 {
		return errors.New("login must be between 3 and 64 characters")
	}
	email := strings.TrimSpace(r.Email)
	if email == "" {
		return errors.New("email is required")
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return errors.New("invalid email")
	}
	displayName := strings.TrimSpace(r.DisplayName)
	if len(displayName) > 100 {
		return errors.New("displayName must be up to 100 characters")
	}
	if len(r.Password) < 8 || len(r.Password) > 128 {
		return errors.New("password must be between 8 and 128 characters")
	}
	return nil
}

func (r LoginRequest) Validate() error {
	if strings.TrimSpace(r.Login) == "" {
		return errors.New("login is required")
	}
	if r.Password == "" {
		return errors.New("password is required")
	}
	return nil
}
