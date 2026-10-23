package com.fsa.roomdesk.exception;

import java.util.List;

/** A 400 validation error detected by reading the request only, reported field by field. */
public class FieldValidationException extends RuntimeException {

    public record FieldError(String field, String message) {
    }

    private final List<FieldError> errors;

    public FieldValidationException(List<FieldError> errors) {
        super("Request has invalid fields");
        this.errors = List.copyOf(errors);
    }

    public FieldValidationException(String field, String message) {
        this(List.of(new FieldError(field, message)));
    }

    public List<FieldError> getErrors() {
        return errors;
    }
}
