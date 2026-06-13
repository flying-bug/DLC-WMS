package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.AuthService;
import com.duylongtech.backend.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuditLogService auditLogService;

    private String getClientIp(jakarta.servlet.http.HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }

    // 1. Login
    @PostMapping("/login")
    public ApiResponse<?> login(@Valid @RequestBody LoginRequest request, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        try {
            var response = authService.login(request);
            auditLogService.logEvent(
                request.getUsername(),
                "POST",
                "Auth",
                null,
                "SUCCESS",
                "Đăng nhập hệ thống",
                ip,
                null
            );
            return ApiResponse.success(response);
        } catch (Exception e) {
            auditLogService.logEvent(
                request.getUsername(),
                "POST",
                "Auth",
                null,
                "FAILED",
                "Thử đăng nhập sai mật khẩu",
                ip,
                null
            );
            throw e;
        }
    }

    // 2. Login with Google
    @PostMapping("/login-google")
    public ApiResponse<?> loginWithGoogle(@RequestParam String token, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        try {
            var response = authService.loginWithGoogle(token);
            auditLogService.logEvent(
                response.getUsername(),
                "POST",
                "Auth",
                null,
                "SUCCESS",
                "Đăng nhập hệ thống bằng Google",
                ip,
                null
            );
            return ApiResponse.success(response);
        } catch (Exception e) {
            auditLogService.logEvent(
                null,
                "POST",
                "Auth",
                null,
                "FAILED",
                "Đăng nhập hệ thống bằng Google thất bại",
                ip,
                null
            );
            throw e;
        }
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

    // 6. Change Password
    @PostMapping("/change-password")
    public ApiResponse<?> changePassword(@RequestBody ChangePasswordRequest request, jakarta.servlet.http.HttpServletRequest servletRequest) {
        String ip = getClientIp(servletRequest);
        String currentUser = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        try {
            authService.changePassword(request);
            auditLogService.logEvent(
                currentUser,
                "UPDATE",
                "Auth",
                null,
                "SUCCESS",
                "Đổi mật khẩu tài khoản thành công",
                ip,
                null
            );
            return ApiResponse.success(null);
        } catch (Exception e) {
            auditLogService.logEvent(
                currentUser,
                "UPDATE",
                "Auth",
                null,
                "FAILED",
                "Đổi mật khẩu tài khoản thất bại: " + e.getMessage(),
                ip,
                null
            );
            throw e;
        }
    }
}
