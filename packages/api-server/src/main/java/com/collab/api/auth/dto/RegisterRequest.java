package com.collab.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/auth/register}.
 *
 * <p>Bean Validation annotations are declared here so that
 * {@link GlobalExceptionHandler} catches failures before they
 * ever reach {@code AuthService}.
 *
 * @param email       Must be a valid email format and not blank.
 * @param password    Minimum 8 characters — enforced here so the raw value
 *                    is validated before being hashed.
 * @param displayName The name shown to other collaborators in the editor.
 */
public record RegisterRequest(

        @NotBlank(message = "Email must not be blank")
        @Email(message = "Email must be a valid email address")
        String email,

        @NotBlank(message = "Password must not be blank")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        @NotBlank(message = "Display name must not be blank")
        String displayName
) {}
