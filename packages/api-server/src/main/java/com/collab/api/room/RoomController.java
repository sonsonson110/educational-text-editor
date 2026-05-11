package com.collab.api.room;

import com.collab.api.room.dto.CreateRoomRequest;
import com.collab.api.room.dto.RoomResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for room management endpoints.
 *
 * <p>This controller is intentionally thin — it resolves the authenticated
 * user's ID from the {@link Authentication} object (populated by
 * {@link com.collab.api.shared.security.BearerTokenFilter}), delegates all
 * business logic to {@link RoomService}, and maps the result to HTTP responses.
 */
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    /**
     * Creates a new room. The authenticated user becomes the {@code OWNER} member.
     *
     * @return {@code 201 Created} with the new room's details.
     */
    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        RoomResponse response = roomService.createRoom(request.name(), userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Lists all rooms where the authenticated user is a member (any role).
     *
     * @return {@code 200 OK} with the list of rooms.
     */
    @GetMapping
    public List<RoomResponse> listRooms(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return roomService.getRoomsForUser(userId);
    }

    /**
     * Returns a single room by ID, only if the authenticated user is a member.
     *
     * @return {@code 200 OK} with the room details.
     */
    @GetMapping("/{id}")
    public RoomResponse getRoomById(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return roomService.getRoomById(id, userId);
    }
}
