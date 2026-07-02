package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RealtimeForceLogoutEvent {
    private String reason;
    private String message;
}
