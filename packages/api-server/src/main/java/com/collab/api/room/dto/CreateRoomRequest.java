package com.collab.api.room.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for {@code POST /api/rooms}.
 *
 * @param name The display name for the new collaborative room.
 */
public record CreateRoomRequest(

        @NotBlank(message = "Room name must not be blank")
        String name
) {}
