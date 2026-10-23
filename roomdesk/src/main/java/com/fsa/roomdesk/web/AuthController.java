package com.fsa.roomdesk.web;

import static com.fsa.roomdesk.exception.ProblemType.MALFORMED_REQUEST;
import static com.fsa.roomdesk.exception.ProblemType.UNAUTHORIZED;
import static com.fsa.roomdesk.exception.ProblemType.VALIDATION;

import com.fsa.roomdesk.dto.LoginRequest;
import com.fsa.roomdesk.dto.TokenResponse;
import com.fsa.roomdesk.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @SecurityRequirements
    @Operation(summary = "Log in and receive a 30-minute bearer token")
    @ApiProblems({VALIDATION, MALFORMED_REQUEST, UNAUTHORIZED})
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
