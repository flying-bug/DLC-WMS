package com.fsa.roomdesk.security;

import com.fsa.roomdesk.exception.ProblemType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.DefaultCorsProcessor;

/** Rejects CORS requests from origins that are not allowed with a 403 problem+json body. */
class ProblemCorsProcessor extends DefaultCorsProcessor {

    @Override
    public boolean processRequest(CorsConfiguration config, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        boolean allowed = super.processRequest(config, request, response);
        if (!allowed) {
            var type = ProblemType.FORBIDDEN;
            var body = """
                    {"type":"%s","title":"%s","status":%d,"detail":"%s","instance":"%s"}"""
                    .formatted(type.uri(), type.title(), type.status().value(),
                            "Cross-origin request from this origin is not allowed",
                            escape(request.getRequestURI()));
            response.setStatus(type.status().value());
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
        }
        return allowed;
    }

    @Override
    protected void rejectRequest(ServerHttpResponse response) {
        // The body is written by processRequest.
        response.setStatusCode(HttpStatus.FORBIDDEN);
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
