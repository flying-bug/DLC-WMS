package com.duylongtech.backend.feature.ai.client;

import com.duylongtech.backend.feature.ai.dto.AiChatMessageDto;
import com.duylongtech.backend.feature.ai.dto.AiChatResponse;

import java.util.List;

public interface AiModelClient {
    AiChatResponse enhanceAnswer(String userQuestion, AiChatResponse groundedResponse);
    AiChatResponse enhanceAnswer(String userQuestion, List<AiChatMessageDto> history, AiChatResponse groundedResponse);
}


