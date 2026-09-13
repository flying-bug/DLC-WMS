package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.feature.system.AiChatMessageDto;
import com.duylongtech.backend.feature.system.AiChatResponse;

import java.util.List;

public interface AiModelClient {
    AiChatResponse enhanceAnswer(String userQuestion, AiChatResponse groundedResponse);
    AiChatResponse enhanceAnswer(String userQuestion, List<AiChatMessageDto> history, AiChatResponse groundedResponse);
}
