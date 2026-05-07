-- V1__create_initial_schema.sql
-- Creates the three foundational tables that map to the User, Room, and
-- RoomMember JPA entities. Flyway runs this exactly once on first startup.

CREATE TABLE IF NOT EXISTS users
(
    id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    display_name  VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS rooms
(
    id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    owner_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members
(
    id        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id   UUID        NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role      VARCHAR(50) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_room_members_room_user UNIQUE (room_id, user_id),
    CONSTRAINT chk_room_members_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER'))
);

CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms (owner_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members (room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members (user_id);
