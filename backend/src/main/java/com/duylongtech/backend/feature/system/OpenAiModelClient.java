package com.duylongtech.backend.feature.system;

import com.duylongtech.backend.feature.system.AiChatMessageDto;
import com.duylongtech.backend.feature.system.AiChatResponse;
import com.duylongtech.backend.feature.system.AiSourceResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public interface OpenAiModelClient {
    AiChatResponse enhanceAnswer(String userQuestion, AiChatResponse groundedResponse);
    AiChatResponse enhanceAnswer(String userQuestion, List<AiChatMessageDto> history, AiChatResponse groundedResponse);
}
