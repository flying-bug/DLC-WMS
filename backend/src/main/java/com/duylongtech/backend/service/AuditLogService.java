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

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

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
                    .description(description)
                    .createdAt(LocalDateTime.now())
                    .build();

            auditLogRepository.save(logEntity);
        } catch (Exception e) {
            // We log the exception but don't rethrow to avoid breaking the core business transactions
            log.error("Failed to save audit log: ", e);
        }
    }
}
