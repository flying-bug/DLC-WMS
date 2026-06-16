package com.duylongtech.backend.service;

import com.duylongtech.backend.entity.AuditLog;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.AuditLogRepository;
import com.duylongtech.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private static final int MAX_DESCRIPTION_LENGTH = 240;
    private static final Pattern SQL_BLOCK_PATTERN = Pattern.compile("\\[(?:update|insert|delete|select)\\s+[^\\]]+\\]", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.searchLogs(searchTerm, pageable);
    }

    @Transactional
    public void logEvent(String username, String action, String entityName, Long entityId, 
                         String status, String description, String ipAddress, String detailJson) {
        try {
            User user = null;
            if (username != null && !username.trim().isEmpty() && !"anonymous_user".equalsIgnoreCase(username)) {
                Optional<User> userOpt = userRepository.findByUsername(username);
                if (userOpt.isEmpty()) {
                    userOpt = userRepository.findByEmail(username);
                }
                user = userOpt.orElse(null);
            }

            AuditLog logEntity = AuditLog.builder()
                    .user(user)
                    .action(action)
                    .entityName(entityName)
                    .entityId(entityId)
                    .detail(detailJson)
                    .ipAddress(ipAddress)
                    .status(status)
                    .description(sanitizeDescription(description))
                    .createdAt(Instant.now())
                    .build();

            auditLogRepository.save(logEntity);
        } catch (Exception e) {
            // We log the exception but don't rethrow to avoid breaking the core business transactions
            log.error("Failed to save audit log: ", e);
        }
    }

    public String sanitizeDescription(String description) {
        if (description == null || description.trim().isEmpty()) {
            return "";
        }

        String normalized = WHITESPACE_PATTERN.matcher(description.trim()).replaceAll(" ");
        String lower = normalized.toLowerCase(Locale.ROOT);
        String prefix = extractAuditPrefix(normalized);

        if (lower.contains("could not execute statement")
                || lower.contains("duplicate entry")
                || lower.contains("constraint")
                || lower.contains("sql [")
                || lower.contains("password_hash")) {
            return prefix + inferFriendlyDatabaseError(lower);
        }

        normalized = SQL_BLOCK_PATTERN.matcher(normalized).replaceAll("[chi tiết SQL đã được ẩn]");
        if (normalized.length() > MAX_DESCRIPTION_LENGTH) {
            return normalized.substring(0, MAX_DESCRIPTION_LENGTH - 3).trim() + "...";
        }

        return normalized;
    }

    private String extractAuditPrefix(String description) {
        int failedIndex = description.toLowerCase(Locale.ROOT).indexOf(" thất bại");
        if (failedIndex >= 0) {
            return description.substring(0, failedIndex + " thất bại".length()) + ": ";
        }
        return "";
    }

    private String inferFriendlyDatabaseError(String lowerDescription) {
        if (lowerDescription.contains("duplicate entry")) {
            return "Dữ liệu đã tồn tại trên hệ thống.";
        }

        if (lowerDescription.contains("constraint")) {
            return "Dữ liệu không hợp lệ hoặc vi phạm ràng buộc hệ thống.";
        }

        return "Lỗi hệ thống, vui lòng liên hệ quản trị viên.";
    }
}
