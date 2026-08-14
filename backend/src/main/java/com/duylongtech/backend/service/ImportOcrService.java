package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.response.OcrImportResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.dto.response.OcrImportResponse.OcrItemLine;
import com.duylongtech.backend.dto.response.OcrImportResponse.VariantSuggestion;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.ProductVariant;
import com.duylongtech.backend.entity.VendorProductMapping;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.ProductVariantRepository;
import com.duylongtech.backend.repository.VendorProductMappingRepository;
import com.duylongtech.backend.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service xử lý OCR trích xuất chứng từ nhập kho bằng Vision AI.
 * Luồng: Upload ảnh -> Vision AI trích xuất JSON -> Smart Match với DB -> Trả DTO xem trước.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportOcrService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.builder().build();

    private final PartnerRepository partnerRepository;
    private final ProductVariantRepository productVariantRepository;
    private final VendorProductMappingRepository vendorProductMappingRepository;

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

    private static final String VISION_SYSTEM_PROMPT = """
            Bạn là chuyên gia trích xuất dữ liệu chứng từ kho hàng Việt Nam.
            Hãy đọc ảnh phiếu giao hàng/hóa đơn này và trích xuất dữ liệu dưới dạng JSON chính xác theo cấu trúc sau.
            QUAN TRỌNG: Không trích xuất bất kỳ thông tin cá nhân nào (tên người giao/nhận, số CMND/CCCD, chữ ký).
            Chỉ trích xuất thông tin doanh nghiệp và sản phẩm.
            - Tên sản phẩm (raw_product_name): Gộp thông tin ở cột "Mã hàng" (Loại hàng) và "Diễn giải" (Tên hàng) một cách THÔNG MINH. TUYỆT ĐỐI KHÔNG lặp từ nếu thông tin đã trùng lặp. Ví dụ: Nếu "Mã hàng" là "VGA" và "Diễn giải" là "VGA M200" thì kết quả chỉ là "VGA M200" chứ KHÔNG được ghép thành "VGA VGA M200". Nếu "Mã hàng" là "VGA" và "Diễn giải" là "M200" thì kết quả là "VGA M200".
            - Số Serial/IMEI thường nằm ở cột diễn giải hoặc ngay dưới tên sản phẩm, có thể viết liền nhau phân cách bởi dấu phẩy, dấu chấm (.) hoặc khoảng trắng (VD: 1877.3227.3588...). Hãy phân tách chúng thành mảng. Tên sản phẩm KHÔNG bao gồm các chuỗi serial này.

            Cấu trúc JSON (Nếu thông tin nào không thấy, để null. Chỉ trả về JSON, không giải thích gì thêm):
            {
              "supplier_name": "Tên công ty nhà cung cấp",
              "supplier_tax_code": "Mã số thuế nếu có",
              "supplier_code": "Mã nhà cung cấp/khách hàng nếu có ghi trên chứng từ",
              "invoice_code": "Số hóa đơn/phiếu giao hàng",
              "invoice_date": "YYYY-MM-DD",
              "items": [
                {
                  "raw_product_name": "Tên sản phẩm đúng như trên chứng từ",
                  "raw_sku": "Mã SKU hoặc mã hàng nếu có",
                  "category": "Danh mục sản phẩm dự đoán (VD: Điện thoại, Linh kiện, Bánh kẹo...)",
                  "warranty": "Thời gian bảo hành nếu có (VD: '12 tháng', '1 năm', '24T', '3 năm' ...)",
                  "vat_percent": "Phần trăm thuế VAT nếu có (VD: 8, 10, 0, 5 ... Nếu không thấy thì null)",
                  "quantity": 10,
                  "unit_price": 1500000,
                  "unit": "Cái",
                  "serial_numbers": ["SN123", "SN124"] // Danh sách số serial (đã được tách từ chuỗi)
                }
              ]
            }
            """;

    /**
     * Trạng thái và kết quả của một phiên OCR từ Mobile
     */
    @Getter
    @Setter
    public static class OcrSessionData {
        private String status; // PENDING, PROCESSING, SUCCESS, ERROR
        private OcrImportResponse result;
        private String errorMessage;
    }

    private final Map<String, OcrSessionData> ocrSessions = new ConcurrentHashMap<>();

    /**
     * Khởi tạo session quét từ Desktop
     */
    public String initSession() {
        String sessionId = UUID.randomUUID().toString();
        OcrSessionData data = new OcrSessionData();
        data.setStatus("PENDING");
        ocrSessions.put(sessionId, data);
        return sessionId;
    }

    /**
     * Lấy trạng thái session (dùng cho Polling)
     */
    public OcrSessionData getSessionState(String sessionId) {
        return ocrSessions.get(sessionId);
    }

    /**
     * Xử lý OCR từ điện thoại qua sessionId
     */
    public void scanDocumentForSession(String sessionId, MultipartFile file) {
        OcrSessionData session = ocrSessions.get(sessionId);
        if (session == null) {
            throw new RuntimeException(SystemMessage.OCR_ERR_003.getMessage());
        }
        
        session.setStatus("PROCESSING");
        
        // Gọi bất đồng bộ (chạy nền) để trả response nhanh cho Mobile
        new Thread(() -> {
            try {
                OcrImportResponse result = scanDocument(file);
                session.setResult(result);
                session.setStatus("SUCCESS");
            } catch (Exception e) {
                log.error("OCR scan for session failed", e);
                session.setStatus("ERROR");
                session.setErrorMessage(e.getMessage());
            }
        }).start();
    }

    /**
     * Xử lý OCR: Upload ảnh -> Gọi Vision AI -> Smart Match -> Trả DTO
     */
    @Transactional(readOnly = true)
    public OcrImportResponse scanDocument(MultipartFile file) {
        try {
            // 1. Convert file thành Base64
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";

            // 2. Gọi Vision AI
            String rawJson = callVisionAi(base64Image, mimeType);

            // 3. Parse JSON response
            JsonNode ocrResult = objectMapper.readTree(rawJson);

            // 4. Match Supplier
            SupplierMatch supplierMatch = matchSupplier(ocrResult);

            // 5. Match Items
            List<OcrItemLine> itemLines = matchItems(ocrResult, supplierMatch.matchedId);

            // 6. Build response
            return OcrImportResponse.builder()
                    .invoiceCode(textOrNull(ocrResult, "invoice_code"))
                    .invoiceDate(dateOrNull(ocrResult, "invoice_date"))
                    .rawSupplierName(textOrNull(ocrResult, "supplier_name"))
                    .supplierTaxCode(textOrNull(ocrResult, "supplier_tax_code"))
                    .matchedSupplierId(supplierMatch.matchedId)
                    .matchedSupplierName(supplierMatch.matchedName)
                    .matchedSupplierCode(supplierMatch.matchedCode)
                    .supplierConfidence(supplierMatch.confidence)
                    .items(itemLines)
                    .build();
        } catch (Exception e) {
            log.error("OCR scan failed", e);
            throw new RuntimeException(String.format(SystemMessage.OCR_ERR_002.getMessage(), e.getMessage()));
        }
    }

    /**
     * Lưu mapping khi user xác nhận khớp SKU đúng (OCR learning).
     */
    @Transactional
    public void confirmMapping(Long partnerId, String vendorProductName, Long variantId) {
        if (partnerId == null || vendorProductName == null || variantId == null) return;

        String normalized = normalize(vendorProductName);
        Optional<VendorProductMapping> existing =
                vendorProductMappingRepository.findByPartnerIdAndVendorProductName(partnerId, normalized);

        if (existing.isPresent()) {
            VendorProductMapping mapping = existing.get();
            mapping.setProductVariantId(variantId);
            mapping.setConfirmCount(mapping.getConfirmCount() + 1);
            mapping.setUpdatedAt(LocalDateTime.now());
            vendorProductMappingRepository.save(mapping);
        } else {
            vendorProductMappingRepository.save(VendorProductMapping.builder()
                    .partnerId(partnerId)
                    .vendorProductName(normalized)
                    .productVariantId(variantId)
                    .confirmCount(1)
                    .build());
        }
    }

    // =========================================================================
    // Vision AI Call
    // =========================================================================

    private String callVisionAi(String base64Image, String mimeType) throws Exception {
        String selectedProvider = provider == null ? "openai" : provider.trim().toLowerCase(Locale.ROOT);
        if ("gemini".equals(selectedProvider) && geminiEnabled) {
            return callGeminiVision(base64Image, mimeType);
        }
        if (openAiEnabled) {
            return callOpenAiVision(base64Image, mimeType);
        }
        throw new RuntimeException(SystemMessage.OCR_ERR_001.getMessage());
    }

    private String callOpenAiVision(String base64Image, String mimeType) throws Exception {
        Map<String, Object> textContent = new LinkedHashMap<>();
        textContent.put("type", "input_text");
        textContent.put("text", VISION_SYSTEM_PROMPT);

        Map<String, Object> imageContent = new LinkedHashMap<>();
        imageContent.put("type", "input_image");
        imageContent.put("image_url", "data:" + mimeType + ";base64," + base64Image);

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", openAiModel);
        request.put("input", List.of(textContent, imageContent));
        request.put("max_tokens", 4096);

        String rawResponse = restClient.post()
                .uri(openAiBaseUrl + "/responses")
                .header("Authorization", "Bearer " + openAiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(String.class);

        return extractOpenAiText(rawResponse);
    }

    private String callGeminiVision(String base64Image, String mimeType) throws Exception {
        Map<String, Object> textPart = Map.of("text", VISION_SYSTEM_PROMPT);

        Map<String, Object> inlineData = new LinkedHashMap<>();
        inlineData.put("mime_type", mimeType);
        inlineData.put("data", base64Image);
        Map<String, Object> imagePart = Map.of("inline_data", inlineData);

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("role", "user");
        content.put("parts", List.of(textPart, imagePart));

        Map<String, Object> generationConfig = Map.of("maxOutputTokens", 8192);

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

        return extractGeminiText(rawResponse);
    }

    private String extractOpenAiText(String rawResponse) throws Exception {
        JsonNode root = objectMapper.readTree(rawResponse);
        String outputText = root.path("output_text").asText();
        if (outputText != null && !outputText.isBlank()) {
            return cleanJsonBlock(outputText.trim());
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode outputItem : root.path("output")) {
            for (JsonNode contentItem : outputItem.path("content")) {
                String t = contentItem.path("text").asText();
                if (t != null && !t.isBlank()) text.append(t);
            }
        }
        return cleanJsonBlock(text.toString().trim());
    }

    private String extractGeminiText(String rawResponse) throws Exception {
        JsonNode root = objectMapper.readTree(rawResponse);
        StringBuilder text = new StringBuilder();
        for (JsonNode candidate : root.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                String t = part.path("text").asText();
                if (t != null && !t.isBlank()) text.append(t);
            }
        }
        return cleanJsonBlock(text.toString().trim());
    }

    /** Loại bỏ markdown code fence nếu AI trả về ```json...``` */
    private String cleanJsonBlock(String text) {
        if (text.startsWith("```")) {
            text = text.replaceFirst("```[a-zA-Z]*\\s*", "");
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
        }
        return text.trim();
    }

    // =========================================================================
    // Smart Matching - Supplier
    // =========================================================================

    private record SupplierMatch(Long matchedId, String matchedCode, String matchedName, double confidence) {}

    private SupplierMatch matchSupplier(JsonNode ocrResult) {
        String taxCode = textOrNull(ocrResult, "supplier_tax_code");
        String rawName = textOrNull(ocrResult, "supplier_name");
        String supplierCode = textOrNull(ocrResult, "supplier_code");

        // Priority 1: Match by Code (exact)
        if (supplierCode != null && !supplierCode.isBlank()) {
            Optional<Partner> match = partnerRepository.findByCode(supplierCode.trim());
            if (match.isPresent()) {
                return new SupplierMatch(match.get().getId(), match.get().getCode(), match.get().getName(), 1.0);
            }
        }

        // Priority 2: Match by Tax Code (exact)
        if (taxCode != null && !taxCode.isBlank()) {
            List<Partner> allSuppliers = partnerRepository.findAllSuppliers(null);
            Optional<Partner> match = allSuppliers.stream()
                    .filter(p -> taxCode.equals(p.getTaxCode()))
                    .findFirst();
            if (match.isPresent()) {
                return new SupplierMatch(match.get().getId(), match.get().getCode(), match.get().getName(), 1.0);
            }
        }

        // Priority 3: Match by name (fuzzy)
        if (rawName != null && !rawName.isBlank()) {
            List<Partner> suppliers = partnerRepository.searchSuppliers(null, null);
            String normalizedRaw = normalize(rawName);

            Partner bestMatch = null;
            double bestScore = 0;

            for (Partner supplier : suppliers) {
                double score = similarity(normalizedRaw, normalize(supplier.getName()));
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = supplier;
                }
            }

            if (bestMatch != null && bestScore >= 0.5) {
                return new SupplierMatch(bestMatch.getId(), bestMatch.getCode(), bestMatch.getName(), bestScore);
            }
        }

        return new SupplierMatch(null, null, null, 0.0);
    }

    // =========================================================================
    // Smart Matching - Product Items
    // =========================================================================

    private List<OcrItemLine> matchItems(JsonNode ocrResult, Long matchedSupplierId) {
        JsonNode items = ocrResult.path("items");
        if (!items.isArray()) return List.of();

        List<OcrItemLine> result = new ArrayList<>();

        for (JsonNode item : items) {
            String rawName = textOrNull(item, "raw_product_name");
            String rawSku = textOrNull(item, "raw_sku");
            BigDecimal qty = decimalOrNull(item, "quantity");
            BigDecimal unitPrice = decimalOrNull(item, "unit_price");
            String unit = textOrNull(item, "unit");
            String category = textOrNull(item, "category");
            String warrantyStr = textOrNull(item, "warranty");
            Integer warrantyMonths = parseWarrantyToMonths(warrantyStr);
            BigDecimal vatPercent = decimalOrNull(item, "vat_percent");

            List<String> serials = new ArrayList<>();
            JsonNode serialsNode = item.path("serial_numbers");
            if (serialsNode.isArray()) {
                for (JsonNode sn : serialsNode) {
                    if (sn.isTextual() && !sn.asText().isBlank()) {
                        serials.add(sn.asText().trim());
                    }
                }
            }

            VariantMatch match = matchVariant(rawName, rawSku, matchedSupplierId);

            result.add(OcrItemLine.builder()
                    .rawProductName(rawName)
                    .rawSku(rawSku)
                    .matchedVariantId(match.variantId)
                    .matchedSku(match.sku)
                    .matchedVariantName(match.variantName)
                    .matchedProductName(match.productName)
                    .matchConfidence(match.confidence)
                    .quantity(qty)
                    .unitPrice(unitPrice)
                    .unit(unit)
                    .category(category)
                    .warrantyMonths(warrantyMonths)
                    .vatPercent(vatPercent)
                    .serialNumbers(serials)
                    .alternativeSuggestions(match.suggestions)
                    .build());
        }

        return result;
    }

    private Integer parseWarrantyToMonths(String warranty) {
        if (warranty == null || warranty.isBlank()) return null;
        String w = warranty.toLowerCase().trim();
        try {
            // Lọc ra số
            String numStr = w.replaceAll("[^0-9]", "");
            if (numStr.isEmpty()) return null;
            int num = Integer.parseInt(numStr);
            if (w.contains("năm") || w.contains("nam") || w.contains("year") || w.contains("y")) {
                return num * 12;
            }
            return num;
        } catch (Exception e) {
            return null;
        }
    }

    private record VariantMatch(Long variantId, String sku, String variantName, String productName,
                                double confidence, List<VariantSuggestion> suggestions) {}

    private VariantMatch matchVariant(String rawName, String rawSku, Long supplierId) {
        // Step 1: Exact SKU/Barcode match
        if (rawSku != null && !rawSku.isBlank()) {
            Optional<ProductVariant> bySku = productVariantRepository.findBySku(rawSku.trim());
            if (bySku.isPresent()) {
                ProductVariant v = bySku.get();
                return new VariantMatch(v.getId(), v.getSku(), v.getVariantName(),
                        v.getProduct().getProductName(), 1.0, List.of());
            }
            Optional<ProductVariant> byBarcode = productVariantRepository.findByBarcode(rawSku.trim());
            if (byBarcode.isPresent()) {
                ProductVariant v = byBarcode.get();
                return new VariantMatch(v.getId(), v.getSku(), v.getVariantName(),
                        v.getProduct().getProductName(), 1.0, List.of());
            }
        }

        // Step 2: Vendor mapping history (learning from past confirmations)
        if (supplierId != null && rawName != null) {
            String normalizedName = normalize(rawName);
            Optional<VendorProductMapping> mapping =
                    vendorProductMappingRepository.findByPartnerIdAndVendorProductName(supplierId, normalizedName);
            if (mapping.isPresent()) {
                Optional<ProductVariant> v = productVariantRepository.findById(mapping.get().getProductVariantId());
                if (v.isPresent()) {
                    ProductVariant variant = v.get();
                    return new VariantMatch(variant.getId(), variant.getSku(), variant.getVariantName(),
                            variant.getProduct().getProductName(), 0.95, List.of());
                }
            }
        }

        // Step 3: Fuzzy search by product name
        if (rawName != null && !rawName.isBlank()) {
            Page<ProductVariant> candidates = productVariantRepository.searchVariants(rawName.trim(), PageRequest.of(0, 20));
            String normalizedRaw = normalize(rawName);

            List<ScoredVariant> scored = candidates.getContent().stream()
                    .map(v -> {
                        String combinedName = normalize(v.getProduct().getProductName() + " " + v.getVariantName());
                        double score = similarity(normalizedRaw, combinedName);
                        return new ScoredVariant(v, score);
                    })
                    .sorted(Comparator.comparingDouble(ScoredVariant::score).reversed())
                    .toList();

            if (!scored.isEmpty() && scored.get(0).score >= 0.6) {
                ScoredVariant best = scored.get(0);
                ProductVariant v = best.variant;

                List<VariantSuggestion> suggestions = scored.stream()
                        .skip(1)
                        .limit(3)
                        .filter(s -> s.score >= 0.4)
                        .map(s -> VariantSuggestion.builder()
                                .variantId(s.variant.getId())
                                .sku(s.variant.getSku())
                                .variantName(s.variant.getVariantName())
                                .productName(s.variant.getProduct().getProductName())
                                .similarity(Math.round(s.score * 100.0) / 100.0)
                                .build())
                        .toList();

                return new VariantMatch(v.getId(), v.getSku(), v.getVariantName(),
                        v.getProduct().getProductName(), Math.round(best.score * 100.0) / 100.0, suggestions);
            }

            // Có kết quả nhưng confidence thấp -> chỉ trả suggestions
            if (!scored.isEmpty()) {
                List<VariantSuggestion> suggestions = scored.stream()
                        .limit(5)
                        .map(s -> VariantSuggestion.builder()
                                .variantId(s.variant.getId())
                                .sku(s.variant.getSku())
                                .variantName(s.variant.getVariantName())
                                .productName(s.variant.getProduct().getProductName())
                                .similarity(Math.round(s.score * 100.0) / 100.0)
                                .build())
                        .toList();
                return new VariantMatch(null, null, null, null, 0.0, suggestions);
            }
        }

        // No match found
        return new VariantMatch(null, null, null, null, 0.0, List.of());
    }

    private record ScoredVariant(ProductVariant variant, double score) {}

    // =========================================================================
    // String Similarity (Jaro-Winkler based)
    // =========================================================================

    private double similarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        if (s1.equals(s2)) return 1.0;

        // Simple containment boost
        if (s1.contains(s2) || s2.contains(s1)) {
            double lenRatio = (double) Math.min(s1.length(), s2.length()) / Math.max(s1.length(), s2.length());
            return Math.max(0.7, lenRatio);
        }

        // Token-based Jaccard similarity
        Set<String> tokens1 = new HashSet<>(Arrays.asList(s1.split("\\s+")));
        Set<String> tokens2 = new HashSet<>(Arrays.asList(s2.split("\\s+")));
        Set<String> intersection = new HashSet<>(tokens1);
        intersection.retainAll(tokens2);
        Set<String> union = new HashSet<>(tokens1);
        union.addAll(tokens2);

        if (union.isEmpty()) return 0.0;
        return (double) intersection.size() / union.size();
    }

    private String normalize(String value) {
        if (value == null) return "";
        String noAccent = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccent.toLowerCase(Locale.ROOT).trim();
    }

    // =========================================================================
    // JSON Helpers
    // =========================================================================

    private String textOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        String text = value.asText();
        return (text == null || text.isBlank() || "null".equals(text)) ? null : text.trim();
    }

    private BigDecimal decimalOrNull(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        try {
            return new BigDecimal(value.asText());
        } catch (Exception e) {
            return value.isNumber() ? BigDecimal.valueOf(value.asDouble()) : null;
        }
    }

    private LocalDate dateOrNull(JsonNode node, String field) {
        String text = textOrNull(node, field);
        if (text == null) return null;
        try {
            return LocalDate.parse(text);
        } catch (Exception e) {
            return null;
        }
    }
}
