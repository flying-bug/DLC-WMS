package com.fsa.roomdesk.exception;

import java.net.URI;
import org.springframework.http.HttpStatus;

/** The error catalogue of the API (RFC 9457 problem types). */
public enum ProblemType {

    VALIDATION(HttpStatus.BAD_REQUEST, "validation", "Validation failed"),
    MALFORMED_REQUEST(HttpStatus.BAD_REQUEST, "malformed-request", "Malformed request"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "unauthorized", "Unauthorized"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "forbidden", "Forbidden"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "not-found", "Resource not found"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "method-not-allowed", "Method not allowed"),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "unsupported-media-type", "Unsupported media type"),
    NOT_ACCEPTABLE(HttpStatus.NOT_ACCEPTABLE, "not-acceptable", "Not acceptable"),
    ROOM_CODE_TAKEN(HttpStatus.CONFLICT, "room-code-taken", "Room code already taken"),
    BOOKING_OVERLAP(HttpStatus.CONFLICT, "booking-overlap", "Booking overlaps another booking"),
    CAPACITY_EXCEEDED(HttpStatus.CONFLICT, "capacity-exceeded", "Room capacity exceeded"),
    ROOM_INACTIVE(HttpStatus.CONFLICT, "room-inactive", "Room is inactive"),
    INVALID_STATE(HttpStatus.CONFLICT, "invalid-state", "Invalid state"),
    INTERNAL(HttpStatus.INTERNAL_SERVER_ERROR, "internal", "Internal server error");

    public static final String BASE_URI = "https://roomdesk.example/problems/";

    private final HttpStatus status;
    private final String slug;
    private final String title;

    ProblemType(HttpStatus status, String slug, String title) {
        this.status = status;
        this.slug = slug;
        this.title = title;
    }

    public HttpStatus status() {
        return status;
    }

    public String slug() {
        return slug;
    }

    public String title() {
        return title;
    }

    public URI uri() {
        return URI.create(BASE_URI + slug);
    }
}
