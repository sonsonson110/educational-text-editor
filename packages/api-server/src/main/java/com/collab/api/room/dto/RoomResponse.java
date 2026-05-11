package com.collab.api.room.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Read-only projection of a {@link com.collab.api.room.entity.Room} returned
 * by the API. Using a dedicated DTO ensures that internal entity fields (e.g.,
 * future audit columns) are never accidentally exposed.
 *
 * @param id        The room's unique identifier.
 * @param name      The room's display name.
 * @param ownerId   The UUID of the user who created the room.
 * @param createdAt When the room was created.
 */
public record RoomResponse(
        UUID id,
        String name,
        UUID ownerId,
        Instant createdAt
) {}
