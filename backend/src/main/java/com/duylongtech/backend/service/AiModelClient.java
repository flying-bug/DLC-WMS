package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.AiChatMessageDto;
import com.duylongtech.backend.dto.response.AiChatResponse;

import java.util.List;

public interface AiModelClient {
    AiChatResponse enhanceAnswer(String userQuestion, AiChatResponse groundedResponse);
    AiChatResponse enhanceAnswer(String userQuestion, List<AiChatMessageDto> history, AiChatResponse groundedResponse);
}
