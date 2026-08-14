package com.duylongtech.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.constant.SystemMessage;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Properties;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${spring.mail.username:computerduylong@gmail.com}")
    private String fromEmail;

    @Value("${google.client-id:${GMAIL_CLIENT_ID:889308816246-1sg2529hrhn6671gfcm2fae11eg9qque.apps.googleusercontent.com}}")
    private String gmailClientId;

    @Value("${google.client-secret:${GMAIL_CLIENT_SECRET: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}}")
    private String gmailClientSecret;

    @Value("${google.refresh-token:${GMAIL_REFRESH_TOKEN:1//04r_huLp3CGjLCgYIARAAGAQSNgF-L9IruxTRi1RfR3nF2bXEio5AOmicfwAEFudp6c5keNISsei6Tz_LAtAiTXP6b6NGaKRwDA}}")
    private String gmailRefreshToken;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private volatile String cachedAccessToken = null;
    private volatile Instant tokenExpiry = Instant.MIN;

    public void sendEmail(String toEmail, String subject, String htmlMsg, String senderDisplayName) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            return;
        }

        String displayName = (senderDisplayName != null && !senderDisplayName.isBlank())
                ? senderDisplayName : "DLC-WMS System";

        // 1. Try Google Gmail REST API (HTTPS - Port 443 - Không bao giờ bị DigitalOcean chặn)
        if (gmailRefreshToken != null && !gmailRefreshToken.isBlank()
                && gmailClientId != null && !gmailClientId.isBlank()
                && gmailClientSecret != null && !gmailClientSecret.isBlank()) {
            try {
                sendViaGmailApi(toEmail.trim(), subject, htmlMsg, displayName);
                log.info("Email sent successfully to {} via Google Gmail REST API (port 443)", toEmail);
                return;
            } catch (Exception e) {
                log.error("Google Gmail API send failed to {}: {}", toEmail, e.getMessage(), e);
            }
        } else {
            log.warn("Gmail OAuth credentials not configured, falling back to SMTP...");
        }

        // 2. Fallback to standard SMTP (JavaMailSender)
        try {
            sendViaSmtp(toEmail.trim(), subject, htmlMsg, displayName);
            log.info("Email sent successfully to {} via SMTP", toEmail);
        } catch (Exception e) {
            log.error("SMTP send failed to {}: {}", toEmail, e.getMessage());
            throw new BusinessException("Lỗi khi gửi email: " + e.getMessage());
        }
    }

    private synchronized String getValidAccessToken() throws Exception {
        if (cachedAccessToken != null && Instant.now().isBefore(tokenExpiry.minusSeconds(60))) {
            return cachedAccessToken;
        }

        String formBody = "client_id=" + URLEncoder.encode(gmailClientId.trim(), StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(gmailClientSecret.trim(), StandardCharsets.UTF_8)
                + "&refresh_token=" + URLEncoder.encode(gmailRefreshToken.trim(), StandardCharsets.UTF_8)
                + "&grant_type=refresh_token";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(formBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Failed to refresh Google OAuth token (HTTP " + response.statusCode() + "): " + response.body());
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

    private void sendViaGmailApi(String toEmail, String subject, String htmlMsg, String senderDisplayName) throws Exception {
        String accessToken = getValidAccessToken();

        Session session = Session.getDefaultInstance(new Properties(), null);
        MimeMessage message = new MimeMessage(session);
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail, senderDisplayName);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlMsg, true);

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        message.writeTo(buffer);
        byte[] bytes = buffer.toByteArray();
        String encodedRaw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        Map<String, String> payload = Map.of("raw", encodedRaw);
        String jsonPayload = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://gmail.googleapis.com/gmail/v1/users/me/messages/send"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Gmail API send failed (HTTP " + response.statusCode() + "): " + response.body());
        }
    }

    private void sendViaSmtp(String toEmail, String subject, String htmlMsg, String senderDisplayName) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail, senderDisplayName);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(htmlMsg, true);
        Thread.currentThread().setContextClassLoader(getClass().getClassLoader());
        mailSender.send(message);
    }

    @Async
    public void sendResetPasswordEmail(String toEmail, String newPassword) {
        String htmlMsg = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;'>"
                + "<h2 style='color: #007bff; text-align: center;'>Khôi phục mật khẩu</h2>"
                + "<p>Chào bạn,</p>"
                + "<p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản hệ thống Duy Long Computer Warehouse Management của bạn.</p>"
                + "<p>Mã OTP của bạn là: <strong style='font-size: 24px; letter-spacing: 4px; color: #d9534f; display: block; text-align: center; margin: 20px 0;'>" + newPassword + "</strong></p>"
                + "<p>Mã OTP này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>"
                + "<p>Trân trọng,<br/>Đội ngũ Hỗ trợ Duy Long Computer Warehouse Management</p>"
                + "</div>";

        sendEmail(toEmail, "Yêu cầu khôi phục mật khẩu - DLC-WMS", htmlMsg, "DLC-WMS System");
    }

    @Async
    public void sendNewEmployeeCredentialsEmail(String toEmail, String fullName, String username, String password) {
        String displayName = fullName == null || fullName.isBlank() ? "bạn" : fullName.trim();
        String htmlMsg = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;'>"
                + "<h2 style='color: #007bff; text-align: center;'>Tài khoản DLC-WMS của bạn</h2>"
                + "<p>Chào " + HtmlUtils.htmlEscape(displayName) + ",</p>"
                + "<p>Tài khoản của bạn đã được tạo trên hệ thống Duy Long Computer Warehouse Management.</p>"
                + "<div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;'>"
                + "<p><strong>Tên đăng nhập:</strong> " + HtmlUtils.htmlEscape(username) + "</p>"
                + "<p><strong>Mật khẩu tạm thời:</strong> <span style='font-size: 18px; letter-spacing: 2px; color: #d9534f; font-weight: bold;'>" + HtmlUtils.htmlEscape(password) + "</span></p>"
                + "</div>"
                + "<p>Vui lòng đăng nhập và đổi mật khẩu sau khi nhận được email này.</p>"
                + "<p>Trân trọng,<br/>Đội ngũ Hỗ trợ Duy Long Computer Warehouse Management</p>"
                + "</div>";

        sendEmail(toEmail, "Thông tin tài khoản DLC-WMS", htmlMsg, "DLC-WMS System");
    }

    @Async
    public void sendBackupNotificationEmail(String toEmail, String filename, String fileSizeFormatted, boolean isSuccess, String errorDetails) {
        if (toEmail == null || toEmail.trim().isEmpty()) return;
        try {
            String statusText = isSuccess ? "THÀNH CÔNG" : "THẤT BẠI";
            String statusColor = isSuccess ? "#28a745" : "#dc3545";
            String timeNow = java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                    .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));

            String htmlMsg = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;'>"
                    + "<h2 style='color: " + statusColor + "; text-align: center;'>Báo cáo Sao lưu Cơ sở dữ liệu</h2>"
                    + "<p>Chào Quản trị viên,</p>"
                    + "<p>Hệ thống vừa thực hiện sao lưu dữ liệu tự động với kết quả như sau:</p>"
                    + "<ul style='line-height: 1.8;'>"
                    + "<li><strong>Trạng thái:</strong> <span style='color: " + statusColor + "; font-weight: bold;'>" + statusText + "</span></li>"
                    + "<li><strong>Tên file:</strong> " + filename + "</li>"
                    + "<li><strong>Dung lượng:</strong> " + fileSizeFormatted + "</li>"
                    + "<li><strong>Thời gian:</strong> " + timeNow + "</li>"
                    + (isSuccess ? "" : "<li><strong>Chi tiết lỗi:</strong> " + errorDetails + "</li>")
                    + "</ul>"
                    + "<p style='margin-top: 20px;'>Trân trọng,<br/>Đội ngũ Quản trị Duy Long Computer Warehouse Management</p>"
                    + "</div>";

            sendEmail(toEmail, "[DLC-WMS] Báo cáo Sao lưu Cơ sở dữ liệu - " + statusText, htmlMsg, "DLC-WMS Backup System");
        } catch (Exception e) {
            log.error("Failed to send backup notification email: {}", e.getMessage());
        }
    }

    @Async
    public void sendSalesOrderQuoteEmail(String toEmail, com.duylongtech.backend.dto.response.SalesOrderResponse so, String customMessage) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            throw new BusinessException(SystemMessage.EMAIL_ERR_002.getMessage());
        }

        String typeName = "POSTED".equals(so.getStatus()) ? "Hóa Đơn" : "Báo Giá";
        java.text.NumberFormat nf = java.text.NumberFormat.getInstance(new java.util.Locale("vi", "VN"));

        StringBuilder tableRows = new StringBuilder();
        if (so.getLines() != null) {
            int stt = 1;
            for (com.duylongtech.backend.dto.response.SalesOrderResponse.SalesOrderLineResponse line : so.getLines()) {
                String name = line.getVariantName() != null ? line.getVariantName() : (line.getSku() != null ? line.getSku() : "-");
                String unit = line.getUnitName() != null ? line.getUnitName() : "";
                String qty = line.getQuantity() != null ? nf.format(line.getQuantity()) : "0";
                String price = line.getUnitPrice() != null ? nf.format(line.getUnitPrice()) + " ₫" : "0 ₫";
                String amount = line.getLineAmount() != null ? nf.format(line.getLineAmount()) + " ₫" : "0 ₫";

                tableRows.append("<tr style='border-bottom: 1px solid #eee;'>")
                        .append("<td style='padding: 10px; text-align: center;'>").append(stt++).append("</td>")
                        .append("<td style='padding: 10px;'><strong>").append(name).append("</strong><br/><small style='color:#666;'>SKU: ").append(line.getSku() != null ? line.getSku() : "").append("</small></td>")
                        .append("<td style='padding: 10px; text-align: center;'>").append(unit).append("</td>")
                        .append("<td style='padding: 10px; text-align: right;'>").append(qty).append("</td>")
                        .append("<td style='padding: 10px; text-align: right;'>").append(price).append("</td>")
                        .append("<td style='padding: 10px; text-align: right; font-weight: bold;'>").append(amount).append("</td>")
                        .append("</tr>");
            }
        }

        String subTotal = so.getSubTotalAmount() != null ? nf.format(so.getSubTotalAmount()) + " ₫" : "0 ₫";
        String tax = so.getTaxAmount() != null ? nf.format(so.getTaxAmount()) + " ₫" : "0 ₫";
        String total = so.getTotalAmount() != null ? nf.format(so.getTotalAmount()) + " ₫" : "0 ₫";

        String customMsgHtml = (customMessage != null && !customMessage.trim().isEmpty())
                ? "<div style='background: #f8fafc; border-left: 4px solid #007bff; padding: 12px; margin: 15px 0; font-style: italic; color: #475569;'>"
                + "<strong>Lời nhắn:</strong> " + customMessage.trim() + "</div>"
                : "";

        String htmlMsg = "<div style='font-family: Arial, sans-serif; padding: 24px; color: #334155; max-width: 700px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;'>"
                + "<div style='text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;'>"
                + "<h2 style='color: #0f172a; margin-top: 0;'>" + typeName.toUpperCase() + " BÁN HÀNG</h2>"
                + "<p style='color: #64748b; margin-top: 5px; font-size: 14px;'>Mã đơn hàng: <strong>" + (so.getSoCode() != null ? so.getSoCode() : "") + "</strong></p>"
                + "</div>"

                + "<div style='margin-bottom: 20px; font-size: 14px; line-height: 1.6;'>"
                + "<p>Kính gửi Quý khách hàng <strong>" + (so.getPartnerName() != null ? so.getPartnerName() : "") + "</strong>,</p>"
                + "<p>Chúng tôi xin gửi đến Quý khách chi tiết bảng báo giá đơn hàng với nội dung cụ thể như sau:</p>"
                + customMsgHtml
                + "</div>"

                + "<table style='width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;'>"
                + "<thead>"
                + "<tr style='background: #f1f5f9; color: #1e293b; text-align: left;'>"
                + "<th style='padding: 10px; text-align: center;'>#</th>"
                + "<th style='padding: 10px;'>Sản phẩm</th>"
                + "<th style='padding: 10px; text-align: center;'>ĐVT</th>"
                + "<th style='padding: 10px; text-align: right;'>SL</th>"
                + "<th style='padding: 10px; text-align: right;'>Đơn giá</th>"
                + "<th style='padding: 10px; text-align: right;'>Thành tiền</th>"
                + "</tr>"
                + "</thead>"
                + "<tbody>"
                + tableRows.toString()
                + "</tbody>"
                + "</table>"

                + "<div style='width: 100%; text-align: right; margin-bottom: 25px; font-size: 14px; line-height: 1.8;'>"
                + "<div>Tạm tính: <strong style='min-width: 120px; display: inline-block;'>" + subTotal + "</strong></div>"
                + "<div>Thuế VAT: <strong style='min-width: 120px; display: inline-block;'>" + tax + "</strong></div>"
                + "<div style='font-size: 18px; color: #dc2626; margin-top: 5px;'>Tổng cộng: <strong style='min-width: 120px; display: inline-block;'>" + total + "</strong></div>"
                + "</div>"

                + "<div style='border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 13px; color: #64748b; line-height: 1.5;'>"
                + "<p>Nếu Quý khách có bất kỳ thắc mắc nào, xin vui lòng liên hệ với chúng tôi để được hỗ trợ tốt nhất.</p>"
                + "<p>Trân trọng,<br/><strong>Hệ thống Quản lý Bán hàng Duy Long Computer Warehouse Management</strong></p>"
                + "</div>"
                + "</div>";

        sendEmail(toEmail, "[" + typeName.toUpperCase() + "] Đơn hàng " + (so.getSoCode() != null ? so.getSoCode() : "") + " - DLC WMS", htmlMsg, "DLC-WMS " + typeName);
    }
}
