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

public interface AuditLogService {
    Page<AuditLog> getAuditLogs(String searchTerm, String module, Instant fromDate, Instant toDate, int page, int size);
    Optional<AuditLog> getAuditLogById(Long id);
    Page<AuditLog> getLogsForEntity(String entityName, Long entityId, int page, int size);
    void logEvent(String username, String action, String entityName, Long entityId,
                         String status, String description, String ipAddress, String detailJson);
    String sanitizeDescription(String description);
    String buildChangeDetail(Object before, Object after, String note);
    Map<String, Object> parseDetail(String detailJson);
}
