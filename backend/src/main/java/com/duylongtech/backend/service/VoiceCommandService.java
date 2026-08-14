package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.VoiceCommandResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Parses voice command transcripts using AI models (OpenAI / Gemini)
 * to extract structured intent + data for frontend navigation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("deprecation")
public class VoiceCommandService {
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

    private static final String SYSTEM_PROMPT = """
            Bạn là module nhận diện lệnh giọng nói cho hệ thống quản lý kho DLC WMS.
            Nhiệm vụ: Phân tích câu nói của người dùng và trả về JSON duy nhất, không markdown, không giải thích.

            Các intent hỗ trợ:
            1. CREATE_IMPORT - Tạo phiếu nhập kho. Route: /import-history/create
               Keywords: nhập kho, tạo phiếu nhập, phiếu nhập
               Data: supplierKeyword (tên NCC), productKeyword (tên SP), quantity (số lượng)

            2. CREATE_EXPORT - Tạo phiếu xuất kho. Route: /export-slips/create
               Keywords: xuất kho, tạo phiếu xuất, phiếu xuất, bán hàng
               Data: customerKeyword (tên KH), productKeyword (tên SP), quantity (số lượng)

            3. CREATE_TRANSFER - Tạo phiếu chuyển kho. Route: /transfer-history/create
               Keywords: chuyển kho, chuyển hàng, điều chuyển
               Data: fromWarehouseKeyword (kho nguồn), toWarehouseKeyword (kho đích), productKeyword (tên SP), quantity (số lượng)

            4. VIEW_INVENTORY - Xem tồn kho/dashboard. Route: /dashboard
               Keywords: tồn kho, xem kho, tổng quan, dashboard
               Data: warehouseKeyword (tên kho)

            5. VIEW_PRODUCTS - Xem sản phẩm. Route: /products
               Keywords: sản phẩm, hàng hóa, danh sách hàng
               Data: searchKeyword (từ khóa tìm)

            6. VIEW_WARRANTIES - Xem bảo hành. Route: /warranties
               Keywords: bảo hành, warranty, serial
               Data: searchKeyword (serial hoặc mã BH)

            7. VIEW_REPAIRS - Xem sửa chữa. Route: /repairs
               Keywords: sửa chữa, repair
               Data: searchKeyword (từ khóa)

            8. VIEW_CUSTOMERS - Xem khách hàng. Route: /customers
               Keywords: khách hàng, customer
               Data: searchKeyword (từ khóa)

            9. VIEW_SUPPLIERS - Xem nhà cung cấp. Route: /suppliers
               Keywords: nhà cung cấp, supplier
               Data: searchKeyword (từ khóa)

            10. VIEW_IMPORT_HISTORY - Xem lịch sử nhập kho. Route: /import-history
                Keywords: lịch sử nhập, phiếu nhập, danh sách nhập kho
                Data: searchKeyword (từ khóa)

            11. VIEW_EXPORT_HISTORY - Xem lịch sử xuất kho. Route: /export-slips
                Keywords: lịch sử xuất, phiếu xuất, danh sách xuất kho
                Data: searchKeyword (từ khóa)

            12. VIEW_TRANSFER_HISTORY - Xem lịch sử chuyển kho. Route: /transfer-history
                Keywords: lịch sử chuyển kho, phiếu chuyển
                Data: searchKeyword (từ khóa)

            13. CREATE_STOCKTAKE - Tạo phiếu kiểm kê. Route: /stocktakes/create
                Keywords: kiểm kê, kiểm kho, stocktake
                Data: warehouseKeyword (tên kho)

            14. VIEW_STOCKTAKES - Xem danh sách kiểm kê. Route: /stocktakes
                Keywords: danh sách kiểm kê, lịch sử kiểm kê
                Data: (none)

            15. OPEN_AI_CHAT - Mở AI chat. Route: /ai-chat
                Keywords: chat ai, hỏi ai, trợ lý
                Data: (none)

            16. VIEW_BRANDS - Xem thương hiệu. Route: /brands
                Keywords: thương hiệu, brand, nhãn hàng
                Data: searchKeyword (từ khóa)

            17. VIEW_REPORTS - Xem báo cáo. Route: /reports
                Keywords: báo cáo, report, thống kê
                Data: (none)

            18. VIEW_WAREHOUSES - Quản lý kho. Route: /warehouses
                Keywords: quản lý kho, danh sách kho
                Data: (none)

            19. UNKNOWN - Không nhận diện được. Route: null
                Data: (none)

            Format trả về (chỉ JSON, không có text nào khác):
            {
              "intent": "...",
              "route": "...",
              "data": { ... },
              "confirmMessage": "Đang chuyển đến trang ... với ..."
            }

            Quy tắc:
            - confirmMessage phải bằng tiếng Việt có dấu, ngắn gọn mô tả hành động
            - Nếu không trích xuất được data field nào thì bỏ qua, không để null
            - Quantity phải là số nguyên dương, nếu người dùng nói "mười" thì chuyển thành 10
            - Nếu không nhận diện được intent, trả intent = "UNKNOWN", route = null, confirmMessage mô tả lý do
            """;

    public VoiceCommandResponse parseVoiceCommand(String transcript) {
        if (transcript == null || transcript.isBlank()) {
            return VoiceCommandResponse.builder()
                    .intent("UNKNOWN")
                    .route(null)
                    .data(Map.of())
                    .confirmMessage("Không nhận được nội dung giọng nói.")
                    .transcript("")
                    .build();
        }

        try {
            String selectedProvider = provider == null ? "openai" : provider.trim().toLowerCase(Locale.ROOT);
            String aiResponse;
            if ("gemini".equals(selectedProvider)) {
                aiResponse = callGemini(transcript);
            } else {
                aiResponse = callOpenAi(transcript);
            }

            return parseAiResponse(aiResponse, transcript);
        } catch (Exception ex) {
            log.error("Voice command AI parsing failed for transcript: {}", transcript, ex);
            return VoiceCommandResponse.builder()
                    .intent("UNKNOWN")
                    .route(null)
                    .data(Map.of())
                    .confirmMessage("Không thể xử lý lệnh giọng nói: " + sanitizeError(ex))
                    .transcript(transcript)
                    .build();
        }
    }

    private VoiceCommandResponse parseAiResponse(String rawResponse, String transcript) {
        try {
            // Strip markdown code fences if AI returns them
            String cleaned = rawResponse.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-z]*\\n?", "").replaceAll("\\n?```$", "").trim();
            }

            JsonNode root = objectMapper.readTree(cleaned);

            String intent = root.path("intent").asText("UNKNOWN");
            String route = root.path("route").isNull() ? null : root.path("route").asText(null);
            String confirmMessage = root.path("confirmMessage").asText("Đã nhận lệnh giọng nói.");

            Map<String, Object> data = new HashMap<>();
            JsonNode dataNode = root.path("data");
            if (dataNode.isObject()) {
                var fields = dataNode.fields();
                while (fields.hasNext()) {
                    var entry = fields.next();
                    JsonNode value = entry.getValue();
                    if (!value.isNull()) {
                        if (value.isInt() || value.isLong()) {
                            data.put(entry.getKey(), value.asInt());
                        } else if (value.isDouble()) {
                            data.put(entry.getKey(), value.asDouble());
                        } else {
                            data.put(entry.getKey(), value.asText());
                        }
                    }
                }
            }

            return VoiceCommandResponse.builder()
                    .intent(intent)
                    .route(route)
                    .data(data)
                    .confirmMessage(confirmMessage)
                    .transcript(transcript)
                    .build();
        } catch (Exception ex) {
            log.warn("Failed to parse AI response as JSON: {}", rawResponse, ex);
            return VoiceCommandResponse.builder()
                    .intent("UNKNOWN")
                    .route(null)
                    .data(Map.of())
                    .confirmMessage("AI phản hồi không đúng định dạng. Vui lòng thử lại.")
                    .transcript(transcript)
                    .build();
        }
    }

    private String callOpenAi(String transcript) throws Exception {
        if (!openAiEnabled || openAiApiKey == null || openAiApiKey.isBlank()) {
            throw new IllegalStateException(SystemMessage.VOICE_ERR_002.getMessage());
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", openAiModel);
        request.put("input", SYSTEM_PROMPT + "\n\nCâu nói của người dùng:\n" + transcript);
        request.put("max_output_tokens", 500);

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
                    if (!text.isEmpty()) text.append("\n");
                    text.append(contentText.trim());
                }
            }
        }
        return text.toString().trim();
    }

    private String callGemini(String transcript) throws Exception {
        if (!geminiEnabled || geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new IllegalStateException(SystemMessage.VOICE_ERR_001.getMessage());
        }

        Map<String, Object> textPart = new LinkedHashMap<>();
        textPart.put("text", SYSTEM_PROMPT + "\n\nCâu nói của người dùng:\n" + transcript);

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("role", "user");
        content.put("parts", List.of(textPart));

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("maxOutputTokens", 500);
        generationConfig.put("responseMimeType", "application/json");

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
                    if (!text.isEmpty()) text.append("\n");
                    text.append(contentText.trim());
                }
            }
        }
        return text.toString().trim();
    }

    private String sanitizeError(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return "Lỗi không xác định";
        }
        String sanitized = message
                .replaceAll("sk-[A-Za-z0-9_-]+", "sk-***")
                .replaceAll("AIza[A-Za-z0-9_-]+", "AIza***")
                .replaceAll("\\s+", " ")
                .trim();
        return sanitized.length() <= 200 ? sanitized : sanitized.substring(0, 197) + "...";
    }
}
