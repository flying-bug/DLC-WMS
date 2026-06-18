package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {
    private Long id;
    private String timestamp;
    private String user;
    private String action;
    private String module;
    private Long entityId;
    private String ip;
    private String status;
    private String actionType;
    private String description;
    private Map<String, Object> detail;
}
