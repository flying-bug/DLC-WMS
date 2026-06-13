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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @GetMapping
    @Operation(summary = "Get audit logs with search and pagination")
    @PreAuthorize("hasAuthority('audit:view') or hasRole('SUPER_ADMIN')")
    public ApiResponse<Map<String, Object>> getAuditLogs(
            @RequestParam(required = false) String searchTerm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<AuditLog> logPage = auditLogService.getAuditLogs(searchTerm, page, size);
        
        List<AuditLogResponse> content = logPage.getContent().stream().map(log -> {
            String userDisplay = "anonymous_user";
            if (log.getUser() != null) {
                userDisplay = log.getUser().getEmail() != null ? log.getUser().getEmail() : log.getUser().getUsername();
            }
            
            // Format status to matches Vietnamese display
            String displayStatus = "Thành công";
            if ("FAILED".equalsIgnoreCase(log.getStatus())) {
                displayStatus = "Thất bại";
            }
            
            return AuditLogResponse.builder()
                    .id(log.getId())
                    .timestamp(log.getCreatedAt() != null ? log.getCreatedAt().format(DATE_FORMATTER) : "")
                    .user(userDisplay)
                    .action(log.getDescription())
                    .module(log.getEntityName())
                    .ip(log.getIpAddress() != null ? log.getIpAddress() : "")
                    .status(displayStatus)
                    .actionType(log.getAction())
                    .build();
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("logs", content);
        response.put("currentPage", logPage.getNumber());
        response.put("totalItems", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());

        return ApiResponse.success(response);
    }
}
