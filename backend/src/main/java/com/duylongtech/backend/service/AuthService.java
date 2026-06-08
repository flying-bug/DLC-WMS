package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.request.LoginRequest;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public String login(LoginRequest request) {
        // TODO: Implement JWT generation logic
        return "mock-jwt-token";
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
