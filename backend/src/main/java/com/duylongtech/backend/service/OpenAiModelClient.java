package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.AiChatResponse;
import com.duylongtech.backend.dto.response.AiSourceResponse;
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

@Service
@RequiredArgsConstructor
public class OpenAiModelClient implements AiModelClient {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.builder().build();

    @Value("${ai.provider:openai}")
    private String provider;

    @Value("${ai.openai.enabled:false}")
    private boolean openAiEnabled;

    @Value("${ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String openAiModel;

    @Value("${ai.openai.base-url:https://api.openai.com/v1}")
    private String openAiBaseUrl;

    @Value("${ai.gemini.enabled:false}")
    private boolean geminiEnabled;

    @Value("${ai.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${ai.gemini.model:gemini-2.0-flash}")
    private String geminiModel;

    @Value("${ai.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiBaseUrl;

    @Override
    public AiChatResponse enhanceAnswer(String userQuestion, AiChatResponse groundedResponse) {
        String selectedProvider = provider == null ? "openai" : provider.trim().toLowerCase(Locale.ROOT);
        if ("gemini".equals(selectedProvider)) {
            return enhanceWithGemini(userQuestion, groundedResponse);
        }
        return enhanceWithOpenAi(userQuestion, groundedResponse);
    }

    private AiChatResponse enhanceWithOpenAi(String userQuestion, AiChatResponse groundedResponse) {
        if (!openAiEnabled) {
            return withModelStatusSource(groundedResponse, "AI_MODEL_DISABLED", "OPENAI_ENABLED chưa bật");
        }

        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            return withModelStatusSource(groundedResponse, "AI_MODEL_MISSING_KEY", "OPENAI_API_KEY chưa được cấu hình");
        }

        try {
            String modelAnswer = callOpenAiModel(userQuestion, groundedResponse);
            if (modelAnswer == null || modelAnswer.isBlank()) {
                return withModelStatusSource(groundedResponse, "AI_MODEL_EMPTY_RESPONSE", "OpenAI không trả về nội dung");
            }

            return withModelAnswer(groundedResponse, modelAnswer, openAiModel, "OpenAI Responses API");
        } catch (Exception ex) {
            return withModelErrorSource(groundedResponse, ex);
        }
    }

    private AiChatResponse enhanceWithGemini(String userQuestion, AiChatResponse groundedResponse) {
        if (!geminiEnabled) {
            return withModelStatusSource(groundedResponse, "AI_MODEL_DISABLED", "GEMINI_ENABLED chưa bật");
        }

        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return withModelStatusSource(groundedResponse, "AI_MODEL_MISSING_KEY", "GEMINI_API_KEY chưa được cấu hình");
        }

        try {
            String modelAnswer = callGeminiModel(userQuestion, groundedResponse);
            if (modelAnswer == null || modelAnswer.isBlank()) {
                return withModelStatusSource(groundedResponse, "AI_MODEL_EMPTY_RESPONSE", "Gemini không trả về nội dung");
            }

            return withModelAnswer(groundedResponse, modelAnswer, geminiModel, "Gemini generateContent API");
        } catch (Exception ex) {
            return withModelErrorSource(groundedResponse, ex);
        }
    }

    private String callOpenAiModel(String userQuestion, AiChatResponse groundedResponse) throws Exception {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", openAiModel);
        request.put("input", buildPrompt(userQuestion, groundedResponse));
        request.put("max_output_tokens", 2048);

        String rawResponse = restClient.post()
                .uri(openAiBaseUrl + "/responses")
                .header("Authorization", "Bearer " + openAiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(rawResponse);
        String outputText = root.path("output_text").asText();
        if (outputText != null && !outputText.isBlank()) {
            return outputText.trim();
        }

        StringBuilder text = new StringBuilder();
        for (JsonNode outputItem : root.path("output")) {
            for (JsonNode contentItem : outputItem.path("content")) {
                String contentText = contentItem.path("text").asText();
                if (contentText != null && !contentText.isBlank()) {
                    appendText(text, contentText);
                }
            }
        }
        return text.toString().trim();
    }

    private String callGeminiModel(String userQuestion, AiChatResponse groundedResponse) throws Exception {
        Map<String, Object> textPart = new LinkedHashMap<>();
        textPart.put("text", buildPrompt(userQuestion, groundedResponse));

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("role", "user");
        content.put("parts", List.of(textPart));

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("maxOutputTokens", 2048);

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contents", List.of(content));
        request.put("generationConfig", generationConfig);

        String modelPath = geminiModel.startsWith("models/") ? geminiModel : "models/" + geminiModel;
        String rawResponse = restClient.post()
                .uri(geminiBaseUrl + "/" + modelPath + ":generateContent?key=" + geminiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(rawResponse);
        StringBuilder text = new StringBuilder();
        for (JsonNode candidate : root.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                String contentText = part.path("text").asText();
                if (contentText != null && !contentText.isBlank()) {
                    appendText(text, contentText);
                }
            }
        }
        return text.toString().trim();
    }

    private AiChatResponse withModelAnswer(
            AiChatResponse groundedResponse,
            String modelAnswer,
            String modelName,
            String description
    ) {
        List<AiSourceResponse> sources = new ArrayList<>();
        if (groundedResponse.getSources() != null) {
            sources.addAll(groundedResponse.getSources());
        }
        sources.add(AiSourceResponse.builder()
                .type("model")
                .name(modelName)
                .description(description)
                .build());

        return AiChatResponse.builder()
                .answer(modelAnswer)
                .intent(groundedResponse.getIntent())
                .sources(sources)
                .suggestions(groundedResponse.getSuggestions())
                .build();
    }

    private AiChatResponse withModelStatusSource(AiChatResponse groundedResponse, String status, String description) {
        List<AiSourceResponse> sources = new ArrayList<>();
        if (groundedResponse.getSources() != null) {
            sources.addAll(groundedResponse.getSources());
        }
        sources.add(AiSourceResponse.builder()
                .type("model_status")
                .name(status)
                .description(description)
                .build());

        return AiChatResponse.builder()
                .answer(groundedResponse.getAnswer())
                .intent(groundedResponse.getIntent())
                .sources(sources)
                .suggestions(groundedResponse.getSuggestions())
                .build();
    }

    private AiChatResponse withModelErrorSource(AiChatResponse groundedResponse, Exception ex) {
        String errorMessage = ex.getMessage();
        if (isQuotaError(errorMessage)) {
            return withModelStatusSource(
                    groundedResponse,
                    "AI_MODEL_QUOTA_EXCEEDED",
                    "Model AI đã được gọi nhưng quota/rate limit của API key đã hết. Hãy đổi API key, bật billing hoặc thử lại sau."
            );
        }
        return withModelStatusSource(groundedResponse, "AI_MODEL_ERROR", sanitizeError(ex));
    }

    private void appendText(StringBuilder text, String contentText) {
        if (!text.isEmpty()) {
            text.append("\n");
        }
        text.append(contentText.trim());
    }

    private boolean isQuotaError(String message) {
        if (message == null) {
            return false;
        }
        String normalized = message.toLowerCase(Locale.ROOT);
        return normalized.contains("insufficient_quota")
                || normalized.contains("resource_exhausted")
                || normalized.contains("quota exceeded")
                || normalized.contains("too many requests")
                || normalized.contains("rate limit");
    }

    private String sanitizeError(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return "Không gọi được model AI";
        }
        String sanitized = message
                .replaceAll("sk-[A-Za-z0-9_-]+", "sk-***")
                .replaceAll("AIza[A-Za-z0-9_-]+", "AIza***")
                .replaceAll("\\s+", " ")
                .trim();
        return sanitized.length() <= 350 ? sanitized : sanitized.substring(0, 347) + "...";
    }

    private String buildPrompt(String userQuestion, AiChatResponse groundedResponse) {
        StringBuilder sources = new StringBuilder();
        if (groundedResponse.getSources() != null) {
            for (AiSourceResponse source : groundedResponse.getSources()) {
                sources.append("- ")
                        .append(source.getName())
                        .append(": ")
                        .append(source.getDescription())
                        .append("\n");
            }
        }

        return """
                Bạn là trợ lý AI của hệ thống DLC WMS.
                Hãy trả lời đầy đủ, chi tiết, danh sách rõ ràng và tuyệt đối không cắt dở câu hay bỏ dở nội dung.
                Chỉ được trả lời dựa trên dữ liệu hệ thống đã cung cấp bên dưới.
                Không bịa số liệu, không tự tạo bản ghi, không nói chắc nếu dữ liệu không có.
                Nếu dữ liệu chưa đủ, hãy nói rõ cần thêm thông tin nào.
                Trả lời bằng tiếng Việt có dấu, dễ hiểu cho nhân viên vận hành kho.

                Câu hỏi người dùng:
                %s

                Intent backend đã nhận diện:
                %s

                Dữ liệu/câu trả lời có căn cứ từ backend:
                %s

                Nguồn dữ liệu:
                %s
                """.formatted(
                userQuestion,
                groundedResponse.getIntent(),
                groundedResponse.getAnswer(),
                sources
        );
    }
}
