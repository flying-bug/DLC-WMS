package com.duylongtech.backend.feature.notification;

import com.duylongtech.backend.feature.auth.UserDto;
import lombok.Builder;
import lombok.Data;
import com.duylongtech.backend.feature.auth.User;

@Data
@Builder
public class RealtimeUserEvent {
    private String reason;
    private UserDto user;
}
