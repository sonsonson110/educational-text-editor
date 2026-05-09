package com.collab.api.shared.exception;

import org.springframework.http.HttpStatus;

/**
 * Domain exception that carries an HTTP status code and a user-facing message.
 *
 * <p>Throw this anywhere in the service layer to signal a known error condition.
 * {@link GlobalExceptionHandler} intercepts it and maps it to a structured
 * {@link ErrorResponse} JSON body — no boilerplate needed in individual
 * controllers.
 *
 * <p>Usage example:
 * <pre>{@code
 * throw new ApiException(HttpStatus.CONFLICT, "Email already in use");
 * throw new ApiException(HttpStatus.NOT_FOUND, "Room not found");
 * }</pre>
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    /** The HTTP status that should be returned to the client. */
    public HttpStatus getStatus() {
        return status;
    }
}
