package com.collab.api.shared.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Uniform JSON error body returned by {@link GlobalExceptionHandler} for all
 * error responses.
 *
 * <p>The {@code fieldErrors} list is only present when Bean Validation fails —
 * {@link JsonInclude} suppresses it from the JSON output when null, keeping
 * simple error responses clean.
 *
 * <p>Example — single error:
 * <pre>{@code
 * { "status": 409, "error": "CONFLICT", "message": "Email already in use" }
 * }</pre>
 *
 * <p>Example — validation failure:
 * <pre>{@code
 * {
 *   "status": 400,
 *   "error": "BAD_REQUEST",
 *   "message": "Validation failed",
 *   "fieldErrors": [
 *     { "field": "email", "message": "must not be blank" }
 *   ]
 * }
 * }</pre>
 *
 * @param status      The numeric HTTP status code.
 * @param error       The HTTP status name (e.g. {@code "NOT_FOUND"}).
 * @param message     A short human-readable description of the error.
 * @param fieldErrors Per-field validation errors; null when not a validation failure.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        int status,
        String error,
        String message,
        List<FieldError> fieldErrors
) {

    /**
     * Convenience factory for non-validation errors where no field breakdown is needed.
     */
    public static ErrorResponse of(int status, String error, String message) {
        return new ErrorResponse(status, error, message, null);
    }

    /**
     * A single field-level validation error within an {@link ErrorResponse}.
     *
     * @param field   The request field that failed validation (e.g. {@code "email"}).
     * @param message The constraint message (e.g. {@code "must not be blank"}).
     */
    public record FieldError(String field, String message) {}
}
