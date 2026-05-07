package com.collab.api.room;

import com.collab.api.room.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Persistence port for {@link Room} entities.
 */
public interface RoomRepository extends JpaRepository<Room, UUID> {

    /**
     * Returns all rooms where the given user is a member (any role).
     * Joins through {@code room_members} to avoid loading membership data
     * for rooms the user cannot access.
     */
    @Query("""
            SELECT r FROM Room r
            WHERE EXISTS (
                SELECT 1 FROM RoomMember rm
                WHERE rm.roomId = r.id AND rm.userId = :userId
            )
            """)
    List<Room> findAllByMemberUserId(@Param("userId") UUID userId);
}
