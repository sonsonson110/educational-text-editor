-- V3__remove_session_token_from_users.sql
-- Drops the Phase-1 session token column and its index from the users table.
-- The column is no longer needed because authentication is now handled
-- entirely by a stateless JWT validated in JwtAuthenticationFilter — no
-- per-request database lookup is required.

DROP INDEX IF EXISTS idx_users_session_token;

ALTER TABLE users DROP COLUMN IF EXISTS session_token;
