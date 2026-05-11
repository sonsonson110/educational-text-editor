-- V2__add_session_token_to_users.sql
-- Adds a Phase-1 session token column to the users table.
-- The token is a plain UUID stored after register/login and read by
-- BearerTokenFilter to authenticate requests until Phase 2 introduces JWTs.
-- A partial unique index is used so multiple NULL values are allowed
-- (users who have never logged in don't have a token yet).

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_session_token
    ON users (session_token)
    WHERE session_token IS NOT NULL;
