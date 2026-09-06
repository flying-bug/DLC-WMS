package com.duylongtech.backend.service;

import com.duylongtech.backend.entity.AuditLog;
import com.duylongtech.backend.entity.User;
import com.duylongtech.backend.repository.AuditLogRepository;
import com.duylongtech.backend.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(String searchTerm, String module, Instant fromDate, Instant toDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return auditLogRepository.searchLogs(searchTerm, module, fromDate, toDate, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<AuditLog> getAuditLogById(Long id) {
        return auditLogRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsForEntity(String entityName, Long entityId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size); // Repository method already has OrderByCreatedAtDesc in name if we rely on method name, but let's be safe
        return auditLogRepository.findByEntityNameAndEntityIdOrderByCreatedAtDesc(entityName, entityId, pageable);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
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

    public String buildChangeDetail(Object before, Object after, String note) {
        Map<String, Object> beforeMap = toDetailMap(before);
        Map<String, Object> afterMap = toDetailMap(after);
        List<Map<String, Object>> changes = buildChanges(beforeMap, afterMap);

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("before", beforeMap);
        detail.put("after", afterMap);
        detail.put("changes", changes);
        detail.put("changeCount", changes.size());
        if (note != null && !note.trim().isEmpty()) {
            detail.put("note", note);
        }

        try {
            return objectMapper.writeValueAsString(detail);
        } catch (Exception e) {
            log.warn("Failed to serialize audit detail", e);
            return null;
        }
    }

    public Map<String, Object> parseDetail(String detailJson) {
        if (detailJson == null || detailJson.trim().isEmpty()) {
            return null;
        }

        try {
            return objectMapper.readValue(detailJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse audit detail for response", e);
            return null;
        }
    }

    private Map<String, Object> toDetailMap(Object value) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (value == null) {
            return map;
        }

        Map<String, Object> raw = objectMapper.convertValue(value, new TypeReference<Map<String, Object>>() {});
        raw.forEach((key, fieldValue) -> {
            if (!"createdAt".equals(key) && !"updatedAt".equals(key) && fieldValue != null) {
                map.put(key, fieldValue);
            }
        });
        return map;
    }

    private List<Map<String, Object>> buildChanges(Map<String, Object> before, Map<String, Object> after) {
        List<Map<String, Object>> changes = new ArrayList<>();
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.putAll(before);
        fields.putAll(after);

        for (String field : fields.keySet()) {
            Object beforeValue = before.get(field);
            Object afterValue = after.get(field);
            if (!java.util.Objects.equals(beforeValue, afterValue)) {
                Map<String, Object> change = new LinkedHashMap<>();
                change.put("field", field);
                change.put("before", beforeValue);
                change.put("after", afterValue);
                changes.add(change);
            }
        }

        return changes;
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
