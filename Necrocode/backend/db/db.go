package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const defaultDatabaseURL = "postgres://postgres:postgres@localhost:5432/necrocode?sslmode=disable"

func Connect() (*sql.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = defaultDatabaseURL
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return db, nil
}

func InitSchema(db *sql.DB) error {
	const usersTableQuery = `
CREATE TABLE IF NOT EXISTS users (
	id BIGSERIAL PRIMARY KEY,
	login VARCHAR(64) UNIQUE NOT NULL,
	email VARCHAR(255),
	display_name VARCHAR(100) NOT NULL DEFAULT '',
	password_hash TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`

	if _, err := db.Exec(usersTableQuery); err != nil {
		return fmt.Errorf("create users table: %w", err)
	}

	const usersMigrationQuery = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users(email) WHERE email IS NOT NULL;
`

	if _, err := db.Exec(usersMigrationQuery); err != nil {
		return fmt.Errorf("migrate users table: %w", err)
	}

	const refreshTokensTableQuery = `
CREATE TABLE IF NOT EXISTS refresh_tokens (
	id BIGSERIAL PRIMARY KEY,
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash TEXT UNIQUE NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	revoked_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);
`

	if _, err := db.Exec(refreshTokensTableQuery); err != nil {
		return fmt.Errorf("create refresh_tokens table: %w", err)
	}

	const listingsTableQuery = `
CREATE TABLE IF NOT EXISTS listings (
	id BIGSERIAL PRIMARY KEY,
	seller_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	title VARCHAR(200) NOT NULL,
	description TEXT NOT NULL,
	price BIGINT NOT NULL CHECK (price > 0),
	delivery_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
	project_url TEXT,
	code_file_name VARCHAR(255),
	image_data_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
	category VARCHAR(50) NOT NULL DEFAULT '',
	tech_stack VARCHAR(255) NOT NULL DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listings_seller_user_id_idx ON listings(seller_user_id);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);
`

	if _, err := db.Exec(listingsTableQuery); err != nil {
		return fmt.Errorf("create listings table: %w", err)
	}

	const listingsMigrationQuery = `
ALTER TABLE listings ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS tech_stack VARCHAR(255) NOT NULL DEFAULT '';
`
	if _, err := db.Exec(listingsMigrationQuery); err != nil {
		return fmt.Errorf("migrate listings table: %w", err)
	}

	const cartItemsTableQuery = `
CREATE TABLE IF NOT EXISTS cart_items (
	user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	qty INTEGER NOT NULL CHECK (qty > 0 AND qty <= 99),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON cart_items(user_id);
`

	if _, err := db.Exec(cartItemsTableQuery); err != nil {
		return fmt.Errorf("create cart_items table: %w", err)
	}

	return nil
}
