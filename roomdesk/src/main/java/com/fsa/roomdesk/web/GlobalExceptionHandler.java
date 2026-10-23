package com.fsa.roomdesk.web;

import com.fsa.roomdesk.exception.ApiException;
import com.fsa.roomdesk.exception.FieldValidationException;
import com.fsa.roomdesk.exception.ProblemType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.core.MethodParameter;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Turns every error into an RFC 9457 {@code application/problem+json} body with
 * {@code type}, {@code title}, {@code status}, {@code detail} and {@code instance}.
 * Security errors (401/403) are routed here too, by {@code ProblemSecurityHandler}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Database constraints that map to a specific business conflict. */
    private static final Map<String, ProblemType> CONSTRAINTS = Map.of(
            "bookings_no_overlap", ProblemType.BOOKING_OVERLAP,
            "rooms_code_key", ProblemType.ROOM_CODE_TAKEN);

    public record FieldErrorItem(String field, String message) {
    }

    // ---- business errors -------------------------------------------------------------------

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemDetail> handleApi(ApiException ex, HttpServletRequest request) {
        return problem(ex.getType(), ex.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> handleIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        var type = constraintType(ex);
        if (type == null) {
            return handleUnexpected(ex, request);
        }
        var detail = type == ProblemType.BOOKING_OVERLAP
                ? "The room already has a booking in this time range"
                : "The room code is already taken";
        return problem(type, detail, request);
    }

    // ---- 400 validation ----------------------------------------------------------------------

    @ExceptionHandler(FieldValidationException.class)
    ResponseEntity<ProblemDetail> handleFieldValidation(FieldValidationException ex, HttpServletRequest request) {
        return validation(ex.getErrors().stream().map(e -> new FieldErrorItem(e.field(), e.message())).toList(),
                request);
    }

    /** Request body ({@code @RequestBody @Valid}) and query objects ({@code @ModelAttribute @Valid}). */
    @ExceptionHandler(BindException.class)
    ResponseEntity<ProblemDetail> handleBind(BindException ex, HttpServletRequest request) {
        var bindingFailure = ex.getFieldErrors().stream().filter(FieldError::isBindingFailure).findFirst();
        if (bindingFailure.isPresent()) {
            return problem(ProblemType.MALFORMED_REQUEST,
                    "Parameter '" + bindingFailure.get().getField() + "' has a value of the wrong type", request);
        }
        List<FieldErrorItem> errors = new ArrayList<>();
        ex.getFieldErrors().forEach(e -> errors.add(new FieldErrorItem(e.getField(), e.getDefaultMessage())));
        ex.getGlobalErrors().forEach(e -> errors.add(new FieldErrorItem(e.getObjectName(), e.getDefaultMessage())));
        return validation(errors, request);
    }

    /** Constraints on {@code @PathVariable} and {@code @RequestParam} parameters. */
    @ExceptionHandler(HandlerMethodValidationException.class)
    ResponseEntity<ProblemDetail> handleMethodValidation(HandlerMethodValidationException ex,
                                                         HttpServletRequest request) {
        List<FieldErrorItem> errors = new ArrayList<>();
        for (var result : ex.getParameterValidationResults()) {
            var name = parameterName(result.getMethodParameter());
            if (result instanceof org.springframework.validation.method.ParameterErrors parameterErrors) {
                parameterErrors.getFieldErrors()
                        .forEach(e -> errors.add(new FieldErrorItem(e.getField(), e.getDefaultMessage())));
            } else {
                result.getResolvableErrors()
                        .forEach(e -> errors.add(new FieldErrorItem(name, e.getDefaultMessage())));
            }
        }
        return validation(errors, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ProblemDetail> handleConstraintViolation(ConstraintViolationException ex,
                                                            HttpServletRequest request) {
        var errors = ex.getConstraintViolations().stream()
                .map(v -> {
                    String field = null;
                    for (var node : v.getPropertyPath()) {
                        field = node.getName();
                    }
                    return new FieldErrorItem(field, v.getMessage());
                })
                .toList();
        return validation(errors, request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ProblemDetail> handleMissingParameter(MissingServletRequestParameterException ex,
                                                         HttpServletRequest request) {
        return validation(List.of(new FieldErrorItem(ex.getParameterName(), "must not be null")), request);
    }

    // ---- 400 malformed ----------------------------------------------------------------------

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> handleUnreadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return problem(ProblemType.MALFORMED_REQUEST,
                "Request body is not valid JSON or has a value of the wrong type", request);
    }

    @ExceptionHandler(TypeMismatchException.class)
    ResponseEntity<ProblemDetail> handleTypeMismatch(TypeMismatchException ex, HttpServletRequest request) {
        var name = ex.getPropertyName() != null ? ex.getPropertyName() : "parameter";
        return problem(ProblemType.MALFORMED_REQUEST,
                "Parameter '" + name + "' has a value of the wrong type", request);
    }

    // ---- 401 / 403 -----------------------------------------------------------------------

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ProblemDetail> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        String detail;
        if (ex instanceof BadCredentialsException) {
            detail = "Invalid email or password";
        } else if (ex instanceof InvalidBearerTokenException) {
            detail = "Access token is invalid or expired";
        } else {
            detail = "Authentication is required to access this resource";
        }
        var response = problem(ProblemType.UNAUTHORIZED, detail, request);
        return ResponseEntity.status(response.getStatusCode())
                .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .contentType(MediaType.APPLICATION_PROBLEM_JSON)
                .body(response.getBody());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ProblemDetail> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return problem(ProblemType.FORBIDDEN, "You do not have permission to perform this action", request);
    }

    // ---- framework errors --------------------------------------------------------------------

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ProblemDetail> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return problem(ProblemType.NOT_FOUND, "No resource at " + request.getRequestURI(), request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ProblemDetail> handleMethod(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return problem(ProblemType.METHOD_NOT_ALLOWED, "Method " + ex.getMethod() + " is not supported here", request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ProblemDetail> handleMediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return problem(ProblemType.UNSUPPORTED_MEDIA_TYPE, "Content type must be application/json", request);
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    ResponseEntity<ProblemDetail> handleNotAcceptable(HttpMediaTypeNotAcceptableException ex,
                                                      HttpServletRequest request) {
        return problem(ProblemType.NOT_ACCEPTABLE, "The requested media type is not supported", request);
    }

    // ---- 500 -----------------------------------------------------------------------------

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        // Never expose the exception message, class name, stack trace or SQL.
        return problem(ProblemType.INTERNAL, "An unexpected error occurred", request);
    }

    // ---- helpers -------------------------------------------------------------------------

    private ResponseEntity<ProblemDetail> validation(List<FieldErrorItem> errors, HttpServletRequest request) {
        var sorted = errors.stream()
                .sorted(Comparator.comparing(FieldErrorItem::field, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(FieldErrorItem::message, Comparator.nullsFirst(Comparator.naturalOrder())))
                .toList();
        var detail = "Request has " + sorted.size() + " invalid field" + (sorted.size() == 1 ? "" : "s");
        var response = problem(ProblemType.VALIDATION, detail, request);
        response.getBody().setProperty("errors", sorted);
        return response;
    }

    static ResponseEntity<ProblemDetail> problem(ProblemType type, String detail, HttpServletRequest request) {
        HttpStatus status = type.status();
        var body = ProblemDetail.forStatusAndDetail(status, detail);
        body.setType(type.uri());
        body.setTitle(type.title());
        body.setInstance(URI.create(request.getRequestURI()));
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body);
    }

    private static String parameterName(MethodParameter parameter) {
        var requestParam = parameter.getParameterAnnotation(RequestParam.class);
        if (requestParam != null && !requestParam.name().isEmpty()) {
            return requestParam.name();
        }
        var pathVariable = parameter.getParameterAnnotation(PathVariable.class);
        if (pathVariable != null && !pathVariable.name().isEmpty()) {
            return pathVariable.name();
        }
        return parameter.getParameterName();
    }

    private static ProblemType constraintType(Throwable ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t instanceof org.hibernate.exception.ConstraintViolationException cve
                    && cve.getConstraintName() != null) {
                var type = CONSTRAINTS.get(cve.getConstraintName());
                if (type != null) {
                    return type;
                }
            }
            var message = t.getMessage();
            if (message != null) {
                for (var entry : CONSTRAINTS.entrySet()) {
                    if (message.contains("\"" + entry.getKey() + "\"")) {
                        return entry.getValue();
                    }
                }
            }
            if (t.getCause() == t) {
                break;
            }
        }
        return null;
    }
}
