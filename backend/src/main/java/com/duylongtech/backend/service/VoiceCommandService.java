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
            Bạn là module nhận diện và phân tích lệnh giọng nói thông minh cho hệ thống quản lý kho DLC WMS.
            Nhiệm vụ: Phân tích câu nói của người dùng tiếng Việt, trích xuất ý định (intent) và dữ liệu (data), trả về duy nhất 1 JSON hợp lệ, KHÔNG markdown, KHÔNG giải thích.

            Danh sách các intent hỗ trợ:
            1. CREATE_IMPORT - Tạo phiếu nhập kho
               - Route: /import-history/create
               - Keywords: nhập kho, tạo phiếu nhập, phiếu nhập kho, nhập hàng vào kho
               - Data fields:
                 * supplierKeyword: Tên/mã nhà cung cấp (nếu có)
                 * warehouseKeyword: Tên/mã kho nhập (nếu có)
                 * productKeyword: Tên/mã sản phẩm cần nhập (nếu có)
                 * quantity: Số lượng nhập (số nguyên > 0)
                 * unitPrice: Đơn giá nhập nếu có (chuyển về dạng số nguyên VNĐ, vd: 500k -> 500000, 2tr -> 2000000)
                 * note: Ghi chú phiếu nhập nếu có

            2. CREATE_EXPORT - Tạo phiếu xuất kho
               - Route: /export-slips/create
               - Keywords: xuất kho, tạo phiếu xuất, phiếu xuất kho, xuất hàng
               - Data fields:
                 * customerKeyword: Tên/mã khách hàng (nếu có)
                 * warehouseKeyword: Tên/mã kho xuất (nếu có)
                 * productKeyword: Tên/mã sản phẩm xuất (nếu có)
                 * quantity: Số lượng xuất (số nguyên > 0)
                 * unitPrice: Đơn giá xuất nếu có (số nguyên VNĐ)
                 * note: Ghi chú phiếu xuất nếu có
                 * exportMode: 'SALE' (mặc định), 'USAGE' (sử dụng/nội bộ), 'ASSEMBLY' (lắp ráp), 'OTHER' (khác)

            3. CREATE_SALES_ORDER - Tạo đơn bán hàng / bán hàng trực tiếp
               - Route: /sales-orders/create
               - Keywords: đơn bán hàng, tạo đơn bán, bán hàng, bán hàng trực tiếp, bán tại quầy, tạo đơn hàng, bán trực tiếp
               - Data fields:
                 * mode: "direct"
                 * customerKeyword: Tên khách hàng (nếu có)
                 * customerPhone: Số điện thoại khách hàng nếu có
                 * warehouseKeyword: Tên/mã kho xuất bán (nếu có)
                 * productKeyword: Tên/mã sản phẩm bán (nếu có)
                 * quantity: Số lượng (số nguyên > 0)
                 * unitPrice: Đơn giá bán nếu có (số nguyên VNĐ)
                 * note: Ghi chú đơn bán nếu có

            4. CREATE_SALES_QUOTE - Tạo đơn báo giá / báo giá khách hàng
               - Route: /sales-orders/create
               - Keywords: báo giá, tạo báo giá, đơn báo giá, lập báo giá, báo giá khách hàng, gửi báo giá, báo giá sản phẩm
               - Data fields:
                 * mode: "quote"
                 * customerKeyword: Tên khách hàng cần báo giá (nếu có)
                 * customerPhone: Số điện thoại khách hàng nếu có
                 * warehouseKeyword: Tên/mã kho (nếu có)
                 * productKeyword: Tên/mã sản phẩm báo giá (nếu có)
                 * quantity: Số lượng (số nguyên > 0)
                 * unitPrice: Đơn giá báo giá nếu có (số nguyên VNĐ)
                 * note: Ghi chú báo giá nếu có

            5. CREATE_PURCHASE_ORDER - Tạo đơn mua hàng / đơn mua hàng trực tiếp / đặt hàng NCC
               - Route: /purchase-orders/create
               - Keywords: đơn mua hàng, tạo đơn mua, đơn mua, mua hàng trực tiếp, đặt hàng nhà cung cấp, đặt mua hàng, phiếu mua hàng, tạo PO
               - Data fields:
                 * supplierKeyword: Tên/mã nhà cung cấp cần mua (nếu có)
                 * productKeyword: Tên/mã sản phẩm cần mua (nếu có)
                 * quantity: Số lượng mua (số nguyên > 0)
                 * unitPrice: Đơn giá mua nếu có (số nguyên VNĐ)
                 * note: Ghi chú đơn mua nếu có

            6. CREATE_TRANSFER - Tạo phiếu chuyển kho
               - Route: /transfer-history/create
               - Keywords: chuyển kho, chuyển hàng, điều chuyển kho
               - Data fields:
                 * fromWarehouseKeyword: Tên kho nguồn xuất chuyển
                 * toWarehouseKeyword: Tên kho đích nhập chuyển
                 * productKeyword: Tên/mã sản phẩm chuyển
                 * quantity: Số lượng (số nguyên > 0)
                 * note: Ghi chú chuyển kho nếu có

            7. CREATE_STOCKTAKE - Tạo phiếu kiểm kê
               - Route: /stocktakes/create
               - Keywords: kiểm kê, kiểm kho, tạo phiếu kiểm kê, kiểm kê kho
               - Data fields:
                 * warehouseKeyword: Tên/mã kho cần kiểm kê

            8. VIEW_SALES_ORDERS - Xem danh sách đơn bán hàng. Route: /sales-orders
               - Keywords: danh sách đơn bán, lịch sử bán hàng, xem đơn bán, danh sách đơn hàng
               - Data fields: searchKeyword

            9. VIEW_PURCHASE_ORDERS - Xem danh sách đơn mua hàng. Route: /purchase-orders
               - Keywords: danh sách đơn mua, lịch sử mua hàng, xem đơn mua, danh sách PO
               - Data fields: searchKeyword

            10. VIEW_INVENTORY - Xem tồn kho / Dashboard. Route: /dashboard
                - Keywords: tồn kho, xem kho, tổng quan, dashboard, báo cáo tồn kho
                - Data fields: warehouseKeyword

            11. VIEW_PRODUCTS - Xem danh mục sản phẩm. Route: /products
                - Keywords: sản phẩm, hàng hóa, danh sách hàng, xem sản phẩm
                - Data fields: searchKeyword

            12. VIEW_WARRANTIES - Xem danh sách bảo hành. Route: /warranties
                - Keywords: bảo hành, warranty, tra cứu bảo hành, serial
                - Data fields: searchKeyword

            13. VIEW_REPAIRS - Xem phiếu sửa chữa. Route: /repairs
                - Keywords: sửa chữa, repair, phiếu sửa chữa, bảo hành sửa chữa
                - Data fields: searchKeyword

            14. VIEW_CUSTOMERS - Xem danh sách khách hàng. Route: /customers
                - Keywords: khách hàng, customer, danh sách khách
                - Data fields: searchKeyword

            15. VIEW_SUPPLIERS - Xem danh sách nhà cung cấp. Route: /suppliers
                - Keywords: nhà cung cấp, supplier, danh sách ncc
                - Data fields: searchKeyword

            16. VIEW_IMPORT_HISTORY - Xem lịch sử nhập kho. Route: /import-history
                - Keywords: lịch sử nhập, danh sách nhập kho, xem phiếu nhập
                - Data fields: searchKeyword

            17. VIEW_EXPORT_HISTORY - Xem lịch sử xuất kho. Route: /export-slips
                - Keywords: lịch sử xuất, danh sách xuất kho, xem phiếu xuất
                - Data fields: searchKeyword

            18. VIEW_TRANSFER_HISTORY - Xem lịch sử chuyển kho. Route: /transfer-history
                - Keywords: lịch sử chuyển kho, phiếu chuyển, danh sách chuyển kho
                - Data fields: searchKeyword

            19. VIEW_STOCKTAKES - Xem danh sách kiểm kê. Route: /stocktakes
                - Keywords: danh sách kiểm kê, lịch sử kiểm kê
                - Data fields: (none)

            20. OPEN_AI_CHAT - Mở trợ lý AI. Route: /ai-chat
                - Keywords: chat ai, hỏi ai, trợ lý ai, mở chat
                - Data fields: (none)

            21. VIEW_BRANDS - Xem thương hiệu. Route: /brands
                - Keywords: thương hiệu, brand, nhãn hàng
                - Data fields: searchKeyword

            22. VIEW_REPORTS - Xem báo cáo thống kê. Route: /reports
                - Keywords: báo cáo, report, thống kê doanh thu, báo cáo tài chính
                - Data fields: (none)

            23. VIEW_WAREHOUSES - Quản lý danh sách kho. Route: /warehouses
                - Keywords: quản lý kho, danh sách kho
                - Data fields: (none)

            24. UNKNOWN - Không nhận diện được câu lệnh. Route: null
                - Data fields: (none)

            Format JSON trả về:
            {
              "intent": "...",
              "route": "...",
              "data": { ... },
              "confirmMessage": "Đang chuyển đến trang ... để ..."
            }

            Quy tắc:
            - confirmMessage phải viết bằng tiếng Việt có dấu tự nhiên, ngắn gọn, thân thiện mô tả hành động.
            - Chỉ trả về các trường có dữ liệu trong object data (bỏ qua các trường null/trống).
            - Số lượng quantity: Luôn là số nguyên dương (vd: "năm cái" -> 5, "mười" -> 10, "15" -> 15).
            - Đơn giá unitPrice: Chuyển đổi linh hoạt (vd: "500k" hoặc "năm trăm nghìn" -> 500000, "2 triệu" hoặc "2tr" -> 2000000, "1tr5" hoặc "1 triệu rưỡi" -> 1500000).
            - Nếu không nhận diện được intent, trả intent = "UNKNOWN", route = null, confirmMessage hướng dẫn người dùng thử lại.
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
