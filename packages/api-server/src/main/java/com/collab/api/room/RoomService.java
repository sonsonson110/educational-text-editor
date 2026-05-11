package com.collab.api.room;

import com.collab.api.room.dto.RoomResponse;
import com.collab.api.room.entity.Room;
import com.collab.api.room.entity.RoomMember;
import com.collab.api.room.entity.RoomRole;
import com.collab.api.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Business logic for room creation and membership queries.
 *
 * <p>The class-level {@code @Transactional(readOnly = true)} sets the default
 * for all methods. Individual write methods override it with plain
 * {@code @Transactional} to allow DB mutations.
 */
@Service
@Transactional(readOnly = true)
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomMemberRepository roomMemberRepository;

    public RoomService(RoomRepository roomRepository, RoomMemberRepository roomMemberRepository) {
        this.roomRepository = roomRepository;
        this.roomMemberRepository = roomMemberRepository;
    }

    /**
     * Creates a new room and registers the creator as an {@code OWNER} member.
     *
     * @param name    The display name for the room.
     * @param ownerId The authenticated user who is creating the room.
     * @return The created room as a {@link RoomResponse}.
     */
    @Transactional
    public RoomResponse createRoom(String name, UUID ownerId) {
        Room room = Room.builder()
                .name(name)
                .ownerId(ownerId)
                .build();
        roomRepository.save(room);

        RoomMember ownerMembership = RoomMember.builder()
                .roomId(room.getId())
                .userId(ownerId)
                .role(RoomRole.OWNER)
                .build();
        roomMemberRepository.save(ownerMembership);

        return toResponse(room);
    }

    /**
     * Returns all rooms where the given user holds any membership role.
     *
     * @param userId The authenticated user's ID.
     */
    public List<RoomResponse> getRoomsForUser(UUID userId) {
        return roomRepository.findAllByMemberUserId(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Returns a single room by ID, enforcing that the requester is a member.
     *
     * @param roomId      The room to fetch.
     * @param requesterId The authenticated user requesting access.
     * @throws ApiException {@code 404 NOT_FOUND} if the room does not exist.
     * @throws ApiException {@code 403 FORBIDDEN} if the user is not a member.
     */
    public RoomResponse getRoomById(UUID roomId, UUID requesterId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Room not found"));

        if (!roomMemberRepository.existsByRoomIdAndUserId(roomId, requesterId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not a member of this room");
        }

        return toResponse(room);
    }

    /** Maps a {@link Room} entity to its API projection. */
    private RoomResponse toResponse(Room room) {
        return new RoomResponse(room.getId(), room.getName(), room.getOwnerId(), room.getCreatedAt());
    }
}
