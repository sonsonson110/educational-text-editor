package com.collab.api.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Persistence port for {@link User} entities.
 *
 * <p>Spring Data JPA generates the implementation at runtime. Custom queries
 * should be added here as derived query methods or {@code @Query} annotations
 * rather than in the service layer.
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    /** Returns the user with the given email address, if one exists. */
    Optional<User> findByEmail(String email);

    /** Returns true if any user record already uses the given email. */
    boolean existsByEmail(String email);
}
