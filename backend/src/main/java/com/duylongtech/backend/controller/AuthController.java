package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 1. Login
    @PostMapping("/login")
    public ApiResponse<?> login(@RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    // 2. Login with Google
    @PostMapping("/login-google")
    public ApiResponse<?> loginWithGoogle(@RequestParam String token) {
        return ApiResponse.success(authService.loginWithGoogle(token));
    }

    // 3. Forgot Password
    @PostMapping("/forgot-password")
    public ApiResponse<?> forgotPassword(@RequestParam String email) {
        authService.forgotPassword(email);
        return ApiResponse.success(null);
    }

    // 4. Change Password
    @PostMapping("/change-password")
    public ApiResponse<?> changePassword(@RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ApiResponse.success(null);
    }
}
