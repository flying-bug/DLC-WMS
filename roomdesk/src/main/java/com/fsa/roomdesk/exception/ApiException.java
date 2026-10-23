package com.fsa.roomdesk.exception;

/** A business error that maps directly to one {@link ProblemType}. */
public class ApiException extends RuntimeException {

    private final ProblemType type;

    public ApiException(ProblemType type, String detail) {
        super(detail);
        this.type = type;
    }

    public ProblemType getType() {
        return type;
    }

    public static ApiException notFound(String detail) {
        return new ApiException(ProblemType.NOT_FOUND, detail);
    }

    public static ApiException conflict(ProblemType type, String detail) {
        return new ApiException(type, detail);
    }
}
