package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.feature.system.SendTestEmailRequest;
import com.duylongtech.backend.common.ApiResponse;
import com.duylongtech.backend.feature.system.GmailOAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import com.duylongtech.backend.feature.auth.User;

@Slf4j
@RestController
@RequestMapping("/api/v1/email")
@RequiredArgsConstructor
@Tag(name = "Email Settings", description = "Cấu hình kết nối Gmail OAuth cho hệ thống")
public class EmailSettingsController {

    private final GmailOAuthService gmailOAuthService;

    @Value("${app.frontend-url:${FRONTEND_URL:https://dlc-wms.vercel.app}}")
    private String frontendUrl;

    /**
     * Redirect user đến Google consent screen để kết nối Gmail.
     */
    @GetMapping("/google/connect")
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Lấy URL để redirect đến Google OAuth consent screen")
    public ApiResponse<Map<String, String>> getConnectUrl() {
        String state = UUID.randomUUID().toString();
        String authUrl = gmailOAuthService.buildAuthorizationUrl(state);
        return ApiResponse.success(Map.of("authUrl", authUrl));
    }

    /**
     * Google callback — nhận authorization code, đổi token, lưu DB.
     * Redirect về frontend sau khi hoàn tất.
     */
    @GetMapping("/google/callback")
    @Operation(summary = "Google OAuth callback — xử lý authorization code")
    public void handleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "error", required = false) String error,
            HttpServletResponse response) throws IOException {

        if (error != null) {
            log.warn("Gmail OAuth callback error: {}", error);
            response.sendRedirect(frontendUrl + "/operations?tab=email&error=" + error);
            return;
        }

        if (code == null || code.isBlank()) {
            log.warn("Gmail OAuth callback: no code received");
            response.sendRedirect(frontendUrl + "/operations?tab=email&error=no_code");
            return;
        }

        try {
            gmailOAuthService.handleCallback(code);
            response.sendRedirect(frontendUrl + "/operations?tab=email&success=true");
        } catch (Exception e) {
            log.error("Gmail OAuth callback processing error: {}", e.getMessage());
            response.sendRedirect(frontendUrl + "/operations?tab=email&error=callback_failed");
        }
    }

    /**
     * Trả về trạng thái kết nối Gmail hiện tại.
     */
    @GetMapping("/status")
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Lấy trạng thái kết nối Gmail")
    public ApiResponse<GmailConnectionStatusDto> getStatus() {
        return ApiResponse.success(gmailOAuthService.getConnectionStatus());
    }

    /**
     * Gửi email test qua Gmail API đã kết nối.
     */
    @PostMapping("/test")
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Gửi email test qua Gmail đã kết nối")
    public ApiResponse<Map<String, String>> sendTestEmail(@RequestBody SendTestEmailRequest request) {
        gmailOAuthService.sendTestEmail(request.getToEmail());
        return ApiResponse.success(Map.of("message", "Email test đã được gửi thành công!"));
    }

    /**
     * Ngắt kết nối Gmail, xóa credentials khỏi hệ thống.
     */
    @PostMapping("/google/disconnect")
    @PreAuthorize("hasRole('MANAGER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Ngắt kết nối Gmail OAuth")
    public ApiResponse<Map<String, String>> disconnectGmail() {
        gmailOAuthService.disconnect();
        return ApiResponse.success(Map.of("message", "Đã ngắt kết nối Gmail thành công."));
    }
}
