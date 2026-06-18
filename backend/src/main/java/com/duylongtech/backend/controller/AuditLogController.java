package com.duylongtech.backend.controller;

import com.duylongtech.backend.dto.response.ApiResponse;
import com.duylongtech.backend.dto.response.AuditLogResponse;
import com.duylongtech.backend.entity.AuditLog;
import com.duylongtech.backend.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @Operation(summary = "Get audit logs with search and pagination")
    @PreAuthorize("hasAuthority('audit:view') or hasRole('SUPER_ADMIN')")
    public ApiResponse<Map<String, Object>> getAuditLogs(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<AuditLog> logPage = auditLogService.getAuditLogs(
                searchTerm,
                module,
                parseInstant(fromDate),
                parseInstant(toDate),
                page,
                size
        );

        List<AuditLogResponse> content = logPage.getContent().stream()
                .map(log -> mapToResponse(log, false))
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("logs", content);
        response.put("currentPage", logPage.getNumber());
        response.put("totalItems", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());

        return ApiResponse.success(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get audit log detail")
    @PreAuthorize("hasAuthority('audit:view') or hasRole('SUPER_ADMIN')")
    public ApiResponse<AuditLogResponse> getAuditLogDetail(@PathVariable Long id) {
        AuditLog log = auditLogService.getAuditLogById(id)
                .orElseThrow(() -> new IllegalArgumentException("Audit log not found"));
        return ApiResponse.success(mapToResponse(log, true));
    }

    private AuditLogResponse mapToResponse(AuditLog log, boolean includeDetail) {
        String userDisplay = "anonymous_user";
        if (log.getUser() != null) {
            userDisplay = (log.getUser().getEmail() != null && !log.getUser().getEmail().trim().isEmpty())
                    ? log.getUser().getEmail()
                    : log.getUser().getUsername();
        }

        String displayStatus = "Thành công";
        if ("FAILED".equalsIgnoreCase(log.getStatus())) {
            displayStatus = "Thất bại";
        }

        String description = auditLogService.sanitizeDescription(log.getDescription());
        return AuditLogResponse.builder()
                .id(log.getId())
                .timestamp(log.getCreatedAt() != null ? log.getCreatedAt().toString() : "")
                .user(userDisplay)
                .action(description)
                .module(log.getEntityName())
                .entityId(log.getEntityId())
                .ip(log.getIpAddress() != null ? log.getIpAddress() : "")
                .status(displayStatus)
                .actionType(log.getAction())
                .description(description)
                .detail(includeDetail ? auditLogService.parseDetail(log.getDetail()) : null)
                .build();
    }

    private Instant parseInstant(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        try {
            return Instant.parse(value.trim());
        } catch (Exception ignored) {
            return null;
        }
    }
}
