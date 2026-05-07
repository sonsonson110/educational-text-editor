package com.collab.api.room.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Join table between {@link Room} and {@link com.collab.api.user.User} that
 * carries extra data — specifically the member's {@link RoomRole}.
 *
 * <p>A surrogate UUID primary key is used instead of a composite key so that
 * JPA tooling and audit logging remain straightforward. The {@code (room_id,
 * user_id)} pair is enforced as a unique constraint at the database level.
 */
@Entity
@Table(
        name = "room_members",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_room_members_room_user",
                columnNames = {"room_id", "user_id"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    /**
     * Stored as a VARCHAR string so that reordering or renaming enum constants
     * never silently corrupts existing data (as ordinal storage would).
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomRole role;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant joinedAt;
}
