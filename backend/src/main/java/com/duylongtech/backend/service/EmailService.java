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

    public void sendSalesOrderQuoteEmail(String toEmail, com.duylongtech.backend.dto.response.SalesOrderResponse so, String customMessage) {
        if (toEmail == null || toEmail.trim().isEmpty()) {
            throw new BusinessException("Email người nhận không được để trống");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "DLC-WMS Báo Giá");
            helper.setTo(toEmail.trim());
            helper.setSubject("[BÁO GIÁ] Đơn hàng " + (so.getSoCode() != null ? so.getSoCode() : "") + " - DLC WMS");

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
                    + "<h2 style='color: #2563eb; margin: 0;'>BẢNG BÁO GIÁ SẢN PHẨM</h2>"
                    + "<p style='color: #64748b; margin-top: 5px; font-size: 14px;'>Mã báo giá: <strong>" + (so.getSoCode() != null ? so.getSoCode() : "") + "</strong></p>"
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
                    + "<p>Trân trọng,<br/><strong>Hệ thống Quản lý Bán hàng DLC-WMS</strong></p>"
                    + "</div>"
                    + "</div>";

            helper.setText(htmlMsg, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send quote email: " + e.getMessage());
            throw new BusinessException("Lỗi khi gửi email báo giá: " + e.getMessage());
        }
    }
}
