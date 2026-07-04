package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.AiChatResponse;

public interface AiModelClient {
    AiChatResponse enhanceAnswer(String userQuestion, AiChatResponse groundedResponse);
}
