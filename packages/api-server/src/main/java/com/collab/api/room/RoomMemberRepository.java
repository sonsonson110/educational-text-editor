package com.collab.api.room;

import com.collab.api.room.entity.RoomMember;
import com.collab.api.room.entity.RoomRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port for {@link RoomMember} entities.
 */
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {

    /** Returns the membership record for a specific user in a specific room, if it exists. */
    Optional<RoomMember> findByRoomIdAndUserId(UUID roomId, UUID userId);

    /** Returns all membership records for a given room. */
    List<RoomMember> findAllByRoomId(UUID roomId);

    /** Returns true if the user already has any role in the room. */
    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    /** Returns true if the user holds the given role in the room. */
    boolean existsByRoomIdAndUserIdAndRole(UUID roomId, UUID userId, RoomRole role);
}
