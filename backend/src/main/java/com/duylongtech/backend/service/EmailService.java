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
}
