package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.GmailConnectionStatusDto;

public interface GmailOAuthService {

    /**
     * Tạo URL redirect đến Google consent screen.
     * @param state CSRF state token
     * @return Authorization URL
     */
    String buildAuthorizationUrl(String state);

    /**
     * Xử lý callback từ Google: đổi authorization code thành tokens,
     * mã hóa refresh token, lưu vào system_settings.
     * @param authorizationCode code từ Google
     * @return Thông tin kết nối (email, thời gian)
     */
    GmailConnectionStatusDto handleCallback(String authorizationCode);

    /**
     * Ngắt kết nối Gmail: xóa tokens, revoke trên Google.
     */
    void disconnect();

    /**
     * Lấy trạng thái kết nối Gmail hiện tại.
     */
    GmailConnectionStatusDto getConnectionStatus();

    /**
     * Gửi email test qua Gmail API với token đã lưu.
     */
    void sendTestEmail(String toEmail);
}
