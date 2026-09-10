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

public interface EmailService {
    void sendEmail(String toEmail, String subject, String htmlMsg, String senderDisplayName);
    void sendResetPasswordEmail(String toEmail, String newPassword);
    void sendNewEmployeeCredentialsEmail(String toEmail, String fullName, String username, String password);
    void sendBackupNotificationEmail(String toEmail, String filename, String fileSizeFormatted, boolean isSuccess, String errorDetails);
    void sendSalesOrderQuoteEmail(String toEmail, com.duylongtech.backend.dto.response.SalesOrderResponse so, String customMessage);
    void sendDailySnapshotNotificationEmail(String toEmail, java.time.LocalDate snapshotDate, long recordCount, double totalQuantity, java.math.BigDecimal totalValue, boolean isSuccess, String errorDetails);
}
