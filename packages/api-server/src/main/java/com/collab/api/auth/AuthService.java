package com.collab.api.auth;

import com.collab.api.auth.dto.AuthResponse;
import com.collab.api.auth.dto.LoginRequest;
import com.collab.api.auth.dto.RegisterRequest;
import com.collab.api.auth.event.UserRegisteredEvent;
import com.collab.api.shared.exception.ApiException;
import com.collab.api.user.User;
import com.collab.api.user.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Handles user registration and login for the password-based auth flow.
 *
 * <p>This service is deliberately narrow: it only knows about credentials and
 * identity. Cross-cutting concerns (e.g., sending a welcome email) are handled
 * by separate listeners that subscribe to {@link UserRegisteredEvent} — this
 * service never imports or calls them directly.
 *
 * <p><b>Phase 2 note:</b> The temporary UUID token returned here will be
 * replaced by a signed JWT. Only this service and {@link AuthController} need
 * to change; all other layers remain unaffected.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ApplicationEventPublisher eventPublisher
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Registers a new user with a BCrypt-hashed password.
     *
     * <p>Publishes {@link UserRegisteredEvent} after the user is persisted so
     * that the database write and any side effects (email, audit) are decoupled.
     *
     * @throws ApiException {@code 409 CONFLICT} if the email is already in use.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already in use");
        }

        // Phase 1: generate a plain UUID token stored in the DB.
        // Phase 2: replace with JwtService.generateToken(user) — stateless, no DB column needed.
        String token = UUID.randomUUID().toString();

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .displayName(request.displayName())
                .sessionToken(token)
                .build();

        userRepository.save(user);

        // Publish the event AFTER the entity is saved but still within the
        // transaction. Listeners using @TransactionalEventListener(AFTER_COMMIT)
        // will fire once the commit succeeds, avoiding side effects on rollback.
        eventPublisher.publishEvent(new UserRegisteredEvent(user.getId(), user.getEmail()));

        return new AuthResponse(token, user.getId(), user.getDisplayName());
    }

    /**
     * Authenticates a user by verifying their BCrypt password hash.
     *
     * @throws ApiException {@code 401 UNAUTHORIZED} if credentials are invalid.
     *                      A generic message is used intentionally to avoid
     *                      leaking whether the email exists in the system.
     */
    // login now writes (updates session token), so readOnly = false
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // Phase 1: rotate the session token on each login.
        // Phase 2: replace with JwtService.generateToken(user) — no DB write needed.
        String token = UUID.randomUUID().toString();
        user.setSessionToken(token);
        userRepository.save(user);

        return new AuthResponse(token, user.getId(), user.getDisplayName());
    }
}
