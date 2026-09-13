package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.dto.GmailConnectionStatusDto;
import com.duylongtech.backend.feature.system.SystemSetting;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.feature.system.SystemSettingRepository;
import com.duylongtech.backend.feature.system.GmailOAuthService;
import com.duylongtech.backend.feature.auth.TokenEncryptionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;
import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
public class GmailOAuthService {

    private final SystemSettingRepository settingRepo;
    private final TokenEncryptionService encryptionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // Volatile cache cho access token (in-memory only, không lưu DB)
    private volatile String cachedAccessToken = null;
    private volatile Instant tokenExpiry = Instant.MIN;

    @Value("${google.client-id:${GMAIL_CLIENT_ID:}}")
    private String clientId;

    @Value("${google.client-secret:${GMAIL_CLIENT_SECRET:}}")
    private String clientSecret;

    @Value("${google.oauth.redirect-uri:${GOOGLE_OAUTH_REDIRECT_URI:http://localhost:8080/api/v1/email/google/callback}}")
    private String redirectUri;

    @Value("${google.oauth.scopes:https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/userinfo.email}")
    private String scopes;

    // ── Keys trong system_settings ──
    private static final String KEY_CONNECTED_EMAIL = "gmail.oauth.connected_email";
    private static final String KEY_REFRESH_TOKEN = "gmail.oauth.refresh_token";
    private static final String KEY_CONNECTED_AT = "gmail.oauth.connected_at";
    public String buildAuthorizationUrl(String state) {
        if (clientId == null || clientId.isBlank()) {
            throw new BusinessException("Google OAuth Client ID chưa được cấu hình. Vui lòng kiểm tra biến môi trường GMAIL_CLIENT_ID.");
        }

        StringBuilder url = new StringBuilder("https://accounts.google.com/o/oauth2/v2/auth?");
        url.append("client_id=").append(URLEncoder.encode(clientId.trim(), StandardCharsets.UTF_8));
        url.append("&redirect_uri=").append(URLEncoder.encode(redirectUri.trim(), StandardCharsets.UTF_8));
        url.append("&response_type=code");
        url.append("&scope=").append(URLEncoder.encode(scopes.replace(",", " ").trim(), StandardCharsets.UTF_8));
        url.append("&access_type=offline");
        url.append("&prompt=consent"); // Force re-consent để luôn nhận refresh_token
        if (state != null && !state.isBlank()) {
            url.append("&state=").append(URLEncoder.encode(state, StandardCharsets.UTF_8));
        }

        return url.toString();
    }
    public GmailConnectionStatusDto handleCallback(String authorizationCode) {
        try {
            // 1. Đổi authorization code → tokens
            String formBody = "code=" + URLEncoder.encode(authorizationCode, StandardCharsets.UTF_8)
                    + "&client_id=" + URLEncoder.encode(clientId.trim(), StandardCharsets.UTF_8)
                    + "&client_secret=" + URLEncoder.encode(clientSecret.trim(), StandardCharsets.UTF_8)
                    + "&redirect_uri=" + URLEncoder.encode(redirectUri.trim(), StandardCharsets.UTF_8)
                    + "&grant_type=authorization_code";

            HttpRequest tokenRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> tokenResponse = httpClient.send(tokenRequest, HttpResponse.BodyHandlers.ofString());
            if (tokenResponse.statusCode() < 200 || tokenResponse.statusCode() >= 300) {
                log.error("Google token exchange failed (HTTP {}): {}", tokenResponse.statusCode(), tokenResponse.body());
                throw new BusinessException("Không thể lấy token từ Google. Vui lòng thử lại.");
            }

            JsonNode tokenJson = objectMapper.readTree(tokenResponse.body());
            String accessToken = tokenJson.path("access_token").asText();
            String refreshToken = tokenJson.path("refresh_token").asText();

            if (refreshToken == null || refreshToken.isBlank()) {
                throw new BusinessException("Google không trả về refresh token. Vui lòng thử kết nối lại.");
            }

            // 2. Lấy email người dùng từ Google UserInfo
            HttpRequest userInfoRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v2/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> userInfoResponse = httpClient.send(userInfoRequest, HttpResponse.BodyHandlers.ofString());
            String connectedEmail = "unknown@gmail.com";
            if (userInfoResponse.statusCode() >= 200 && userInfoResponse.statusCode() < 300) {
                JsonNode userInfo = objectMapper.readTree(userInfoResponse.body());
                connectedEmail = userInfo.path("email").asText(connectedEmail);
            }

            // 3. Mã hóa refresh token và lưu vào system_settings
            String encryptedToken = encryptionService.encrypt(refreshToken);
            String connectedAt = LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);

            saveSetting(KEY_REFRESH_TOKEN, encryptedToken);
            saveSetting(KEY_CONNECTED_EMAIL, connectedEmail);
            saveSetting(KEY_CONNECTED_AT, connectedAt);

            // 4. Cache access token
            this.cachedAccessToken = accessToken;
            int expiresIn = tokenJson.path("expires_in").asInt(3600);
            this.tokenExpiry = Instant.now().plusSeconds(expiresIn);

            log.info("Gmail OAuth connected successfully for email: {}", connectedEmail);

            return GmailConnectionStatusDto.builder()
                    .connected(true)
                    .connectedEmail(connectedEmail)
                    .connectedAt(connectedAt)
                    .build();

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Gmail OAuth callback error: {}", e.getMessage(), e);
            throw new BusinessException("Lỗi khi kết nối Gmail: " + e.getMessage());
        }
    }
    public void disconnect() {
        try {
            // Revoke token on Google
            String encryptedToken = settingRepo.findBySettingKey(KEY_REFRESH_TOKEN)
                    .map(SystemSetting::getSettingValue)
                    .orElse(null);

            if (encryptedToken != null && !encryptedToken.isBlank()) {
                try {
                    String refreshToken = encryptionService.decrypt(encryptedToken);
                    HttpRequest revokeRequest = HttpRequest.newBuilder()
                            .uri(URI.create("https://oauth2.googleapis.com/revoke?token="
                                    + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8)))
                            .header("Content-Type", "application/x-www-form-urlencoded")
                            .timeout(Duration.ofSeconds(10))
                            .POST(HttpRequest.BodyPublishers.noBody())
                            .build();
                    httpClient.send(revokeRequest, HttpResponse.BodyHandlers.ofString());
                    log.info("Gmail OAuth token revoked on Google");
                } catch (Exception e) {
                    log.warn("Failed to revoke Google token (non-critical): {}", e.getMessage());
                }
            }
        } finally {
            // Xóa khỏi DB bất kể revoke thành công hay không
            settingRepo.findBySettingKey(KEY_REFRESH_TOKEN).ifPresent(settingRepo::delete);
            settingRepo.findBySettingKey(KEY_CONNECTED_EMAIL).ifPresent(settingRepo::delete);
            settingRepo.findBySettingKey(KEY_CONNECTED_AT).ifPresent(settingRepo::delete);

            // Clear cache
            this.cachedAccessToken = null;
            this.tokenExpiry = Instant.MIN;

            log.info("Gmail OAuth disconnected and credentials removed from DB");
        }
    }
    public GmailConnectionStatusDto getConnectionStatus() {
        String email = settingRepo.findBySettingKey(KEY_CONNECTED_EMAIL)
                .map(SystemSetting::getSettingValue)
                .filter(v -> !v.isBlank())
                .orElse(null);

        if (email == null) {
            return GmailConnectionStatusDto.builder()
                    .connected(false)
                    .build();
        }

        String connectedAt = settingRepo.findBySettingKey(KEY_CONNECTED_AT)
                .map(SystemSetting::getSettingValue)
                .orElse(null);

        return GmailConnectionStatusDto.builder()
                .connected(true)
                .connectedEmail(email)
                .connectedAt(connectedAt)
                .build();
    }
    public void sendTestEmail(String toEmail) {
        if (toEmail == null || toEmail.isBlank()) {
            throw new BusinessException("Vui lòng nhập địa chỉ email nhận.");
        }

        try {
            String accessToken = getValidAccessToken();

            Session session = Session.getDefaultInstance(new Properties(), null);
            MimeMessage message = new MimeMessage(session);
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String connectedEmail = settingRepo.findBySettingKey(KEY_CONNECTED_EMAIL)
                    .map(SystemSetting::getSettingValue)
                    .orElse("noreply@dlc-wms.com");

            helper.setFrom(connectedEmail, "DLC-WMS System");
            helper.setTo(toEmail.trim());
            helper.setSubject("[DLC-WMS] Email test - Kết nối Gmail thành công");
            helper.setText(buildTestEmailHtml(connectedEmail), true);

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            message.writeTo(buffer);
            String encodedRaw = Base64.getUrlEncoder().withoutPadding().encodeToString(buffer.toByteArray());

            String jsonPayload = objectMapper.writeValueAsString(Map.of("raw", encodedRaw));

            HttpRequest sendRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(sendRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new RuntimeException("Gmail API send failed (HTTP " + response.statusCode() + "): " + response.body());
            }

            log.info("Test email sent successfully to {} via Gmail API", toEmail);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send test email: {}", e.getMessage(), e);
            throw new BusinessException("Gửi email test thất bại: " + e.getMessage());
        }
    }

    // ── Internal helpers ──

    /**
     * Lấy access token hợp lệ (từ cache hoặc refresh).
     * Public để EmailService có thể tái sử dụng.
     */
    public synchronized String getValidAccessToken() throws Exception {
        if (cachedAccessToken != null && Instant.now().isBefore(tokenExpiry.minusSeconds(60))) {
            return cachedAccessToken;
        }

        // Đọc refresh token từ DB
        String encryptedToken = settingRepo.findBySettingKey(KEY_REFRESH_TOKEN)
                .map(SystemSetting::getSettingValue)
                .filter(v -> !v.isBlank())
                .orElseThrow(() -> new BusinessException("Gmail chưa được kết nối. Vui lòng kết nối Gmail trước."));

        String refreshToken = encryptionService.decrypt(encryptedToken);

        String formBody = "client_id=" + URLEncoder.encode(clientId.trim(), StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret.trim(), StandardCharsets.UTF_8)
                + "&refresh_token=" + URLEncoder.encode(refreshToken.trim(), StandardCharsets.UTF_8)
                + "&grant_type=refresh_token";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(formBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Failed to refresh Gmail access token (HTTP " + response.statusCode() + "): " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String accessToken = root.path("access_token").asText();
        int expiresIn = root.path("expires_in").asInt(3600);

        if (accessToken == null || accessToken.isBlank()) {
            throw new RuntimeException("No access_token returned by Google: " + response.body());
        }

        this.cachedAccessToken = accessToken;
        this.tokenExpiry = Instant.now().plusSeconds(expiresIn);
        return accessToken;
    }

    /**
     * Kiểm tra xem đã có kết nối Gmail OAuth qua UI chưa.
     */
    public boolean isConnectedViaUI() {
        return settingRepo.findBySettingKey(KEY_REFRESH_TOKEN)
                .map(SystemSetting::getSettingValue)
                .filter(v -> !v.isBlank())
                .isPresent();
    }

    private void saveSetting(String key, String value) {
        SystemSetting setting = settingRepo.findBySettingKey(key)
                .orElse(SystemSetting.builder().settingKey(key).build());
        setting.setSettingValue(value);
        settingRepo.save(setting);
    }

    private String buildTestEmailHtml(String fromEmail) {
        String timeNow = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));

        return "<div style='font-family: Arial, sans-serif; padding: 24px; color: #334155; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;'>"
                + "<div style='text-align: center; margin-bottom: 20px; border-bottom: 2px solid #16a34a; padding-bottom: 15px;'>"
                + "<h2 style='color: #16a34a; margin-top: 0;'>✅ Kết nối Gmail thành công!</h2>"
                + "</div>"
                + "<p>Chào bạn,</p>"
                + "<p>Đây là email test từ hệ thống <strong>DLC-WMS</strong> để xác nhận rằng kết nối Gmail OAuth đã hoạt động chính xác.</p>"
                + "<div style='background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;'>"
                + "<p style='margin: 4px 0;'><strong>Gmail đã kết nối:</strong> " + fromEmail + "</p>"
                + "<p style='margin: 4px 0;'><strong>Thời gian gửi:</strong> " + timeNow + "</p>"
                + "<p style='margin: 4px 0;'><strong>Phương thức:</strong> Gmail REST API (OAuth 2.0)</p>"
                + "</div>"
                + "<p style='color: #64748b; font-size: 13px;'>Từ giờ, tất cả email từ hệ thống (báo giá, reset mật khẩu, backup, v.v.) sẽ được gửi qua Gmail này.</p>"
                + "<div style='border-top: 1px solid #e2e8f0; margin-top: 20px; padding-top: 15px; font-size: 13px; color: #94a3b8; text-align: center;'>"
                + "<p style='margin: 0;'>Hệ thống Quản lý Kho — Duy Long Computer (DLC-WMS)</p>"
                + "</div>"
                + "</div>";
    }
}
