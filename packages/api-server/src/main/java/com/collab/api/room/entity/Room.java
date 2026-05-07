package com.collab.api.room.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * A collaborative editing room that maps 1-to-1 with a Yjs document on the
 * sync-server side.
 *
 * <p>The {@code ownerId} stores a plain FK instead of a {@code @ManyToOne}
 * association so that loading a Room never triggers an implicit join to the
 * users table. The full {@link com.collab.api.user.User} object can be fetched
 * on demand through {@link com.collab.api.user.UserRepository} when needed.
 */
@Entity
@Table(name = "rooms")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private String name;

    /** FK to the user who created and owns this room. */
    @Column(nullable = false, updatable = false)
    private UUID ownerId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
}
