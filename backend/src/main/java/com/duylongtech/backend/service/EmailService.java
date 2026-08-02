package com.duylongtech.backend.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import com.duylongtech.backend.exception.BusinessException;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendResetPasswordEmail(String toEmail, String newPassword) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "DLC-WMS System");
            helper.setTo(toEmail);
            helper.setSubject("Yêu cầu khôi phục mật khẩu - DLC-WMS");
            
            String htmlMsg = "<div style='font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;'>"
                    + "<h2 style='color: #007bff; text-align: center;'>Khôi phục mật khẩu</h2>"
                    + "<p>Chào bạn,</p>"
                    + "<p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản DLC-WMS của bạn.</p>"
                    + "<p>Mã OTP của bạn là: <strong style='font-size: 24px; letter-spacing: 4px; color: #d9534f; display: block; text-align: center; margin: 20px 0;'>" + newPassword + "</strong></p>"
                    + "<p>Mã OTP này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>"
                    + "<p>Trân trọng,<br/>Đội ngũ Hỗ trợ DLC-WMS</p>"
                    + "</div>";

            helper.setText(htmlMsg, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
            throw new BusinessException("Lỗi khi gửi email: " + e.getMessage());
        }
    }

    public void sendBackupNotificationEmail(String toEmail, String filename, String fileSizeFormatted, boolean isSuccess, String errorDetails) {
        if (toEmail == null || toEmail.trim().isEmpty()) return;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "DLC-WMS Backup System");
            helper.setTo(toEmail.trim());

            String statusText = isSuccess ? "THÀNH CÔNG" : "THẤT BẠI";
            String statusColor = isSuccess ? "#28a745" : "#dc3545";

            helper.setSubject("[DLC-WMS] Báo cáo Sao lưu Cơ sở dữ liệu - " + statusText);

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
                    + "<p style='margin-top: 20px;'>Trân trọng,<br/>Đội ngũ Quản trị DLC-WMS</p>"
                    + "</div>";

            helper.setText(htmlMsg, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send backup notification email: " + e.getMessage());
        }
    }
}
