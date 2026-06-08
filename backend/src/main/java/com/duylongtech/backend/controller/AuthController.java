package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 1. Login
    @PostMapping("/login")
    public ApiResponse<?> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    // 2. Login with Google
    @PostMapping("/login-google")
    public ApiResponse<?> loginWithGoogle(@RequestParam String token) {
        return ApiResponse.success(authService.loginWithGoogle(token));
    }

    // 3. Forgot Password - Request OTP
    @PostMapping("/forgot-password/request-otp")
    public ApiResponse<?> requestOtp(@RequestParam String email) {
        authService.requestOtp(email);
        return ApiResponse.success(null);
    }

    // 4. Forgot Password - Verify OTP
    @PostMapping("/forgot-password/verify-otp")
    public ApiResponse<?> verifyOtp(@RequestParam String email, @RequestParam String otp) {
        authService.verifyOtp(email, otp);
        return ApiResponse.success(null);
    }

    // 5. Forgot Password - Reset Password
    @PostMapping("/forgot-password/reset")
    public ApiResponse<?> resetPasswordWithOtp(@RequestParam String email, @RequestParam String otp, @RequestParam String newPassword) {
        authService.resetPasswordWithOtp(email, otp, newPassword);
        return ApiResponse.success(null);
    }

    // 4. Change Password
    @PostMapping("/change-password")
    public ApiResponse<?> changePassword(@RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ApiResponse.success(null);
    }
}
