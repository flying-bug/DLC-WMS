package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.dto.response.JwtResponse;
import com.duylongtech.backend.security.JwtUtils;
import com.duylongtech.backend.security.UserDetailsImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    public AuthService(AuthenticationManager authenticationManager, JwtUtils jwtUtils) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
    }

    public JwtResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(item -> item.getAuthority())
                .orElse("ROLE_USER");

        String jwt = jwtUtils.generateJwtToken(userDetails.getUsername(), role);

        return JwtResponse.builder()
                .token(jwt)
                .id(userDetails.getId())
                .username(userDetails.getUsername())
                .role(role)
                .build();
    }

    public String loginWithGoogle(String token) {
        // TODO: Verify Google Token and generate JWT
        return "mock-google-jwt-token";
    }

    public void forgotPassword(String email) {
        // TODO: Send reset password email logic
    }

    public void changePassword(ChangePasswordRequest request) {
        // TODO: Verify old password and hash new password
    }
}
