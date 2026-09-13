package com.duylongtech.backend.feature.system;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.duylongtech.backend.feature.auth.User;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatMessageDto {
    private String role; // "user" or "assistant"
    private String content;
}
