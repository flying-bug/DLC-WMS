package com.fsa.roomdesk.service;

import com.fsa.roomdesk.domain.Role;
import com.fsa.roomdesk.dto.LoginRequest;
import com.fsa.roomdesk.dto.TokenResponse;
import com.fsa.roomdesk.security.TokenService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final TokenService tokenService;

    public AuthService(AuthenticationManager authenticationManager, TokenService tokenService) {
        this.authenticationManager = authenticationManager;
        this.tokenService = tokenService;
    }

    /**
     * Checks the credentials and issues a token. An unknown email and a wrong password both raise
     * the same {@code BadCredentialsException}, so the caller cannot tell them apart.
     */
    public TokenResponse login(LoginRequest request) {
        var authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));
        var role = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())) ? Role.ADMIN : Role.EMPLOYEE;
        return TokenResponse.bearer(tokenService.issue(authentication.getName(), role), tokenService.ttlSeconds());
    }
}
