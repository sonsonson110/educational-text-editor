package com.collab.api.auth.event;

import java.util.UUID;

/**
 * Domain event published after a new user successfully registers.
 *
 * <p>Listeners (e.g. a future {@code NotificationEventListener}) subscribe to
 * this event independently — {@code AuthService} has no knowledge of them.
 * Using a Java record keeps the event immutable and removes boilerplate.
 *
 * @param userId The ID of the newly created user.
 * @param email  The email address to which welcome/confirmation messages should be sent.
 */
public record UserRegisteredEvent(UUID userId, String email) {}
