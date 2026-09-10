package com.duylongtech.backend.controller;

import com.duylongtech.backend.annotation.Auditable;
import com.duylongtech.backend.enums.AuditAction;
import com.duylongtech.backend.dto.request.LoginRequest;
import com.duylongtech.backend.dto.request.ChangePasswordRequest;
import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.service.AuthService;
import com.duylongtech.backend.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
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
        var response = authService.login(request);
        try {
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
        } catch (Exception e) {
            log.error("Failed to save login audit log: ", e);
        }
        return ApiResponse.success(response);
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
    @Auditable(action = AuditAction.UPDATE, entityName = "Auth", actionDescription = "Đổi mật khẩu tài khoản thành công")
    public ApiResponse<?> changePassword(@RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ApiResponse.success(null);
    }
}
