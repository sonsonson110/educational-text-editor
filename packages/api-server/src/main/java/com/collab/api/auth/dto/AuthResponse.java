package com.collab.api.auth.dto;

import java.util.UUID;

/**
 * Response body for both {@code POST /api/auth/register} and
 * {@code POST /api/auth/login}.
 *
 * <p>In Phase 1 the token is a plain UUID stored in the database.
 * Phase 2 will replace it with a signed JWT without changing this record's
 * shape, so clients remain unaffected.
 *
 * @param token       The session/auth token the client must send on subsequent requests.
 * @param userId      The authenticated user's identifier.
 * @param displayName The name shown inside the collaborative editor.
 */
public record AuthResponse(
        String token,
        UUID userId,
        String displayName
) {}
