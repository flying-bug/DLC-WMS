package com.duylongtech.backend.dto.response;

import com.duylongtech.backend.dto.request.UserDto;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RealtimeUserEvent {
    private String reason;
    private UserDto user;
}
