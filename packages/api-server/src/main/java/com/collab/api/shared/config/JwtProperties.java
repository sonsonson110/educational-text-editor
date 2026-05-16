package com.collab.api.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Typed binding for the {@code app.jwt.*} block in {@code application.yaml}.
 *
 * <p>Using {@code @ConfigurationProperties} instead of injecting raw
 * {@code @Value} strings keeps all JWT-related config in one place and makes
 * it trivial to validate (e.g. with {@code @Validated} + JSR-303 constraints)
 * or swap in tests.
 *
 * <p><b>ASP.NET Core equivalent:</b> {@code IOptions<JwtSettings>} bound from
 * {@code appsettings.json} via {@code services.Configure<JwtSettings>(...)}.
 *
 * @param secret            Base64-encoded HMAC-SHA256 signing key (min 32 bytes / 256 bits).
 *                          Override in production via {@code APP_JWT_SECRET} env variable.
 * @param expirationMs      Token lifetime in milliseconds for authenticated users (default 1 h).
 * @param guestExpirationMs Token lifetime in milliseconds for guest tokens (default 24 h).
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        String secret,
        long expirationMs,
        long guestExpirationMs
) {}
