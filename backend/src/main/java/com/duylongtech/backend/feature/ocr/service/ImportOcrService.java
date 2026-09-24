package com.duylongtech.backend.feature.ocr.service;

import com.duylongtech.backend.feature.inventory.OcrImportResponse;
import com.duylongtech.backend.constant.SystemMessage;
import com.duylongtech.backend.feature.inventory.OcrImportResponse.OcrItemLine;
import com.duylongtech.backend.feature.inventory.OcrImportResponse.VariantSuggestion;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.VendorProductMapping;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.VendorProductMappingRepository;
import com.duylongtech.backend.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.inventory.OcrImportResponse;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.Unit;
import com.duylongtech.backend.feature.product.VendorProductMapping;
import com.duylongtech.backend.feature.product.VendorProductMappingRepository;
import com.duylongtech.backend.feature.ocr.service.ImportOcrService;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import com.duylongtech.backend.feature.warranty.Warranty;

/**
 * Service xử lý OCR trích xuất chứng từ nhập kho bằng Vision AI.
 * Luồng: Upload ảnh -> Vision AI trích xuất JSON -> Smart Match với DB -> Trả DTO xem trước.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImportOcrService {

    /** Một trang chứng từ do điện thoại chụp và gửi lên trong phiên quét. */
    @lombok.Getter
    @lombok.Setter
    public static class OcrPage {
        private final int index; // 1, 2, 3... theo thứ tự gửi lên
        private volatile String status; // PROCESSING, SUCCESS, ERROR
        private volatile String previewImage; // data URL ảnh thu nhỏ để Desktop hiển thị lại
        private volatile OcrImportResponse result;
        private volatile String errorMessage;

        OcrPage(int index) {
            this.index = index;
        }
    }

    @lombok.Getter
    @lombok.Setter
    public static class OcrSessionData {
        private volatile String status; // PENDING (chưa ai quét QR), CONNECTED (điện thoại đã mở liên kết)
        private final List<OcrPage> pages = new java.util.concurrent.CopyOnWriteArrayList<>();
        private final long createdAt = System.currentTimeMillis();
    }

    private static final int MAX_PAGES_PER_SESSION = 20;
    private static final int PREVIEW_MAX_DIMENSION = 900;
    private static final int PREVIEW_MAX_BYTES = 400 * 1024;
    private static final long MAX_UPLOAD_BYTES = 15L * 1024 * 1024;


    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = createRestClient();

    // Với hàng đợi có đệm, ThreadPoolExecutor không bao giờ tăng quá corePoolSize (maximumPoolSize vô nghĩa),
    // nên phải đặt core = số luồng thật sự cần; nếu không, nhiều trang gửi cùng lúc sẽ xếp hàng sau 2 luồng.
    private final java.util.concurrent.ExecutorService ocrExecutor = createOcrExecutor();

    private static java.util.concurrent.ExecutorService createOcrExecutor() {
        java.util.concurrent.ThreadPoolExecutor executor = new java.util.concurrent.ThreadPoolExecutor(
                6, 6, 60L, java.util.concurrent.TimeUnit.SECONDS,
                new java.util.concurrent.LinkedBlockingQueue<>(50),
                new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.allowCoreThreadTimeOut(true);
        return executor;
    }

    private RestClient createRestClient() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000);
        factory.setReadTimeout(45000); // Vision AI thường trả lời trong vài giây; treo quá 45s thì báo lỗi để chụp lại
        return RestClient.builder().requestFactory(factory).build();
    }

    private final PartnerRepository partnerRepository;
    private final ProductVariantRepository productVariantRepository;
    private final VendorProductMappingRepository vendorProductMappingRepository;
    private final SystemSettingsService systemSettingsService;
    private final org.springframework.transaction.PlatformTransactionManager transactionManager;

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

    @Value("${ai.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    /** Model dự phòng khi model chính quá tải (503), hết lượt (429), lỗi mạng hoặc trả JSON hỏng. Để trống = tắt. */
    @Value("${ai.gemini.fallback-model:gemini-2.5-flash-lite}")
    private String geminiFallbackModel;

    @Value("${ai.gemini.thinking-budget:0}")
    private int geminiThinkingBudget;

    @Value("${ai.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
    private String geminiBaseUrl;

    /**
     * Giới hạn token đầu ra. Thinking đã tắt nên toàn bộ dành cho JSON: đủ cho phiếu vài chục dòng kèm serial.
     * Không đặt quá cao: khi model lặp chữ vô hạn, giới hạn này quyết định phải chờ bao lâu mới bị cắt.
     */
    private static final int MAX_OUTPUT_TOKENS = 4096;

    /** Không bắt đầu lần gọi AI mới khi đã chờ quá mốc này (tính từ lần gọi đầu), tránh treo phiên quét quá lâu. */
    private static final long VISION_TOTAL_BUDGET_MS = 60_000L;

    // Cấu trúc JSON do responseSchema của Gemini quy định (structured output), nên prompt chỉ mô tả ý nghĩa trường.
    private static final String VISION_SYSTEM_PROMPT = """
            Bạn là chuyên gia trích xuất dữ liệu chứng từ kho hàng Việt Nam. Đọc ảnh phiếu giao hàng / hóa đơn và trả về JSON.
            QUAN TRỌNG: Không trích xuất thông tin cá nhân (tên người giao/nhận, số CMND/CCCD, chữ ký). Chỉ lấy thông tin doanh nghiệp và sản phẩm.
            - Nếu ảnh KHÔNG phải hóa đơn / phiếu giao hàng / phiếu nhập-xuất kho (ảnh chụp màn hình, tin nhắn, bài hát, phong cảnh...), không đọc nội dung, trả về {"items": []}.
            - supplier_name, supplier_tax_code, supplier_code: tên công ty nhà cung cấp, mã số thuế, mã nhà cung cấp/khách hàng ghi trên chứng từ.
            - invoice_code: số hóa đơn / số phiếu. invoice_date: ngày chứng từ dạng YYYY-MM-DD.
            - raw_product_name: gộp cột "Mã hàng" (loại hàng) và "Diễn giải" (tên hàng) một cách thông minh, KHÔNG lặp từ. Ví dụ "VGA" + "VGA M200" -> "VGA M200"; "VGA" + "M200" -> "VGA M200". Không đưa serial vào tên.
            - raw_sku: mã SKU / mã hàng nếu có. category: danh mục dự đoán ngắn gọn (VD: Linh kiện, Điện thoại). unit: đơn vị tính.
            - quantity, unit_price, vat_percent: số thuần (không dấu phân cách nghìn, không ký hiệu tiền tệ).
            - warranty_months: số tháng bảo hành (36T -> 36, 3 năm -> 36, 1 năm -> 12).
            - serial_numbers: các số Serial/IMEI, thường nằm ở cột diễn giải hoặc ngay dưới tên sản phẩm, có thể viết liền nhau phân cách bởi dấu phẩy, dấu chấm hoặc khoảng trắng (VD: 1877.3227.3588) - tách thành từng phần tử.
            - Không thấy thông tin thì để null. Giá trị ngắn gọn đúng như trên chứng từ, không giải thích, không lặp lại.
            """;

    /** Schema structured output của Gemini: bắt buộc JSON đúng cấu trúc, tránh JSON hỏng / thừa chữ. */
    private static final Map<String, Object> VISION_RESPONSE_SCHEMA = buildVisionResponseSchema();

    private static Map<String, Object> buildVisionResponseSchema() {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("type", "OBJECT");
        Map<String, Object> itemProps = new LinkedHashMap<>();
        itemProps.put("raw_product_name", Map.of("type", "STRING"));
        itemProps.put("raw_sku", Map.of("type", "STRING", "nullable", true));
        itemProps.put("category", Map.of("type", "STRING", "nullable", true));
        itemProps.put("unit", Map.of("type", "STRING", "nullable", true));
        itemProps.put("quantity", Map.of("type", "NUMBER", "nullable", true));
        itemProps.put("unit_price", Map.of("type", "NUMBER", "nullable", true));
        itemProps.put("vat_percent", Map.of("type", "NUMBER", "nullable", true));
        itemProps.put("warranty_months", Map.of("type", "INTEGER", "nullable", true));
        itemProps.put("serial_numbers", Map.of("type", "ARRAY", "items", Map.of("type", "STRING")));
        item.put("properties", itemProps);
        item.put("required", List.of("raw_product_name"));

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("type", "OBJECT");
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("supplier_name", Map.of("type", "STRING", "nullable", true));
        props.put("supplier_tax_code", Map.of("type", "STRING", "nullable", true));
        props.put("supplier_code", Map.of("type", "STRING", "nullable", true));
        props.put("invoice_code", Map.of("type", "STRING", "nullable", true));
        props.put("invoice_date", Map.of("type", "STRING", "nullable", true));
        props.put("items", Map.of("type", "ARRAY", "items", item));
        root.put("properties", props);
        root.put("required", List.of("items"));
        return root;
    }

    private final Map<String, OcrSessionData> ocrSessions = new ConcurrentHashMap<>();
    private final Map<String, SseEmitter> ocrSessionEmitters = new ConcurrentHashMap<>();

    /**
     * Tự động dọn dẹp các session quét QR đã hết hạn (> 15 phút) mỗi 5 phút một lần.
     */
    @Scheduled(fixedRate = 300000)
    public void cleanupExpiredSessions() {
        long now = System.currentTimeMillis();
        long maxAgeMillis = 15 * 60 * 1000L; // 15 phút
        int initialSize = ocrSessions.size();
        Set<String> expiredIds = new HashSet<>();
        ocrSessions.forEach((id, data) -> {
            if ((now - data.getCreatedAt()) > maxAgeMillis) {
                expiredIds.add(id);
            }
        });
        expiredIds.forEach(id -> {
            ocrSessions.remove(id);
            SseEmitter emitter = ocrSessionEmitters.remove(id);
            if (emitter != null) {
                emitter.complete();
            }
        });
        int removedCount = initialSize - ocrSessions.size();
        if (removedCount > 0) {
            log.info("Cleaned up {} expired OCR sessions. Active sessions remaining: {}", removedCount, ocrSessions.size());
        }
    }

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
     * Lấy trạng thái session (dùng cho Polling - giữ lại cho client cũ / fallback)
     */
    public OcrSessionData getSessionState(String sessionId) {
        return ocrSessions.get(sessionId);
    }

    /**
     * Mở kết nối SSE để Desktop nhận trạng thái phiên quét OCR theo thời gian
     * thực (thay vì polling mỗi 2s). Không yêu cầu đăng nhập vì Mobile quét QR
     * là một trình duyệt ẩn danh - sessionId ngẫu nhiên đóng vai trò capability token.
     *
     * Khi (re)connect, server phát lại trạng thái phiên và toàn bộ các trang đã có; Desktop định danh
     * mỗi trang theo {@code index} nên việc phát lại không bao giờ làm nhân đôi dữ liệu.
     */
    public SseEmitter streamSession(String sessionId) {
        OcrSessionData existing = ocrSessions.get(sessionId);
        if (existing == null) {
            throw new RuntimeException(SystemMessage.OCR_ERR_003.getMessage());
        }

        SseEmitter emitter = new SseEmitter(180_000L);
        ocrSessionEmitters.put(sessionId, emitter);
        emitter.onCompletion(() -> ocrSessionEmitters.remove(sessionId, emitter));
        emitter.onTimeout(() -> ocrSessionEmitters.remove(sessionId, emitter));
        emitter.onError(ex -> ocrSessionEmitters.remove(sessionId, emitter));

        pushSessionStatus(sessionId, existing);
        existing.getPages().forEach(page -> pushPage(sessionId, page));
        return emitter;
    }

    /** Điện thoại đã mở liên kết QR: Desktop sẽ ẩn mã QR và chuyển sang chờ ảnh. */
    public void joinSession(String sessionId) {
        OcrSessionData session = ocrSessions.get(sessionId);
        if (session == null) {
            throw new RuntimeException(SystemMessage.OCR_ERR_003.getMessage());
        }
        markConnected(sessionId, session);
    }

    private void markConnected(String sessionId, OcrSessionData session) {
        boolean changed;
        synchronized (session) {
            changed = "PENDING".equals(session.getStatus());
            if (changed) {
                session.setStatus("CONNECTED");
            }
        }
        if (changed) {
            pushSessionStatus(sessionId, session);
        }
    }

    private void pushSessionStatus(String sessionId, OcrSessionData session) {
        pushEvent(sessionId, "ocr-status", Map.of(
                "status", session.getStatus(),
                "pageCount", session.getPages().size()));
    }

    private void pushPage(String sessionId, OcrPage page) {
        pushEvent(sessionId, "ocr-page", page);
    }

    private void pushEvent(String sessionId, String eventName, Object payload) {
        SseEmitter emitter = ocrSessionEmitters.get(sessionId);
        if (emitter == null) {
            return;
        }
        try {
            // SseEmitter không an toàn khi nhiều luồng cùng gửi (luồng OCR nền + request upload).
            synchronized (emitter) {
                emitter.send(SseEmitter.event().name(eventName).data(payload));
            }
        } catch (Exception e) {
            emitter.completeWithError(e);
            ocrSessionEmitters.remove(sessionId, emitter);
        }
    }

    /**
     * Xử lý OCR từ điện thoại qua sessionId. Mỗi lần gọi là một "trang" mới của phiên:
     * Desktop nhận ngay ảnh thu nhỏ (trạng thái PROCESSING), sau đó nhận kết quả (SUCCESS/ERROR).
     *
     * @param preview ảnh thu nhỏ do điện thoại tự tạo (tùy chọn); thiếu thì server tự thu nhỏ.
     */
    public void scanDocumentForSession(String sessionId, MultipartFile file, MultipartFile preview) {
        OcrSessionData session = ocrSessions.get(sessionId);
        if (session == null) {
            throw new RuntimeException(SystemMessage.OCR_ERR_003.getMessage());
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Không nhận được ảnh. Vui lòng chụp lại.");
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new BusinessException("Ảnh quá lớn (tối đa 15MB).");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.startsWith("image/") && !"application/pdf".equals(contentType)) {
            throw new BusinessException("Chỉ hỗ trợ file ảnh hoặc PDF.");
        }

        final byte[] imageBytes;
        final String mimeType = contentType != null ? contentType : "image/jpeg";
        try {
            imageBytes = file.getBytes();
        } catch (Exception e) {
            log.error("Failed to read uploaded file for OCR session", e);
            throw new BusinessException("Không thể đọc file ảnh: " + e.getMessage());
        }

        final OcrPage page;
        synchronized (session) {
            if (session.getPages().size() >= MAX_PAGES_PER_SESSION) {
                throw new BusinessException("Đã đạt tối đa " + MAX_PAGES_PER_SESSION + " trang cho một phiên quét.");
            }
            page = new OcrPage(session.getPages().size() + 1);
            page.setStatus("PROCESSING");
            session.getPages().add(page);
        }
        // Gửi ảnh lên mà chưa "join" (vd. mở link trực tiếp) vẫn được coi là đã kết nối.
        markConnected(sessionId, session);
        page.setPreviewImage(resolvePreview(preview, imageBytes, mimeType));
        pushSessionStatus(sessionId, session);
        pushPage(sessionId, page);

        // Gọi bất đồng bộ (chạy nền) để trả response nhanh cho Mobile
        ocrExecutor.execute(() -> {
            try {
                OcrImportResponse result = scanDocumentBytes(imageBytes, mimeType);
                if (isEmptyScan(result)) {
                    page.setErrorMessage("Không nhận diện được hóa đơn / phiếu giao hàng trong ảnh này. Vui lòng chụp lại.");
                    page.setStatus("ERROR");
                } else {
                    page.setResult(result);
                    page.setStatus("SUCCESS");
                }
            } catch (Exception e) {
                log.error("OCR scan for session failed", e);
                page.setErrorMessage(e.getMessage());
                page.setStatus("ERROR");
            } finally {
                pushPage(sessionId, page);
            }
        });
    }

    /** Ảnh không phải chứng từ: AI không tìm thấy dòng hàng, số chứng từ hay nhà cung cấp nào. */
    static boolean isEmptyScan(OcrImportResponse result) {
        if (result == null) return true;
        boolean noItems = result.getItems() == null || result.getItems().isEmpty();
        boolean noInvoice = result.getInvoiceCode() == null || result.getInvoiceCode().isBlank();
        boolean noSupplier = (result.getRawSupplierName() == null || result.getRawSupplierName().isBlank())
                && result.getMatchedSupplierId() == null;
        return noItems && noInvoice && noSupplier;
    }

    /** Ưu tiên ảnh thu nhỏ do điện thoại gửi (đã xoay đúng chiều); không có thì tự tạo từ ảnh gốc. */
    private String resolvePreview(MultipartFile preview, byte[] imageBytes, String mimeType) {
        try {
            if (preview != null && !preview.isEmpty() && preview.getSize() <= PREVIEW_MAX_BYTES
                    && preview.getContentType() != null && preview.getContentType().startsWith("image/")) {
                return "data:" + preview.getContentType() + ";base64," + Base64.getEncoder().encodeToString(preview.getBytes());
            }
        } catch (Exception e) {
            log.warn("[OCR] Cannot read client preview, falling back to server thumbnail: {}", e.getMessage());
        }
        if (!mimeType.startsWith("image/")) {
            return null; // PDF: không có ảnh để hiển thị
        }
        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (original == null) return null;
            int width = original.getWidth();
            int height = original.getHeight();
            double scale = Math.min(1.0, (double) PREVIEW_MAX_DIMENSION / Math.max(width, height));
            int targetWidth = Math.max(1, (int) Math.round(width * scale));
            int targetHeight = Math.max(1, (int) Math.round(height * scale));
            BufferedImage thumb = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = thumb.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.drawImage(original, 0, 0, targetWidth, targetHeight, Color.WHITE, null);
            g2d.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(thumb, "jpg", baos);
            return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            log.warn("[OCR] Cannot build preview thumbnail: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Xử lý OCR từ MultipartFile
     */
    public OcrImportResponse scanDocument(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            String mimeType = file.getContentType() != null ? file.getContentType() : "image/jpeg";
            return scanDocumentBytes(bytes, mimeType);
        } catch (Exception e) {
            log.error("OCR scan failed", e);
            throw new RuntimeException(String.format(SystemMessage.OCR_ERR_002.getMessage(), e.getMessage()));
        }
    }

    /**
     * Xử lý OCR từ mảng byte ảnh: Convert Base64 -> Gọi Vision AI -> Smart Match -> Trả DTO
     */
    public OcrImportResponse scanDocumentBytes(byte[] imageBytes, String mimeType) {
        if (!systemSettingsService.isAiEnabled()) {
            throw new BusinessException("Tính năng quét AI OCR hiện đang tạm khóa bởi Quản trị viên.");
        }
        long startTime = System.currentTimeMillis();
        try {
            // 1. Tự động resize ảnh nếu dung lượng quá lớn (ví dụ chụp qua Mobile QR sync)
            byte[] processedBytes = downscaleImageIfNeeded(imageBytes, mimeType);

            // 2. Convert file thành Base64
            String base64Image = Base64.getEncoder().encodeToString(processedBytes);
            String effectiveMimeType = (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/jpeg";

            // 3. Gọi Vision AI (đã kiểm JSON hợp lệ, tự thử lại / chuyển model dự phòng khi lỗi tạm thời)
            long aiStart = System.currentTimeMillis();
            JsonNode ocrResult = callVisionAi(base64Image, effectiveMimeType);
            long aiDuration = System.currentTimeMillis() - aiStart;

            // 4-5. Khớp nhà cung cấp và sản phẩm. Chạy trong transaction chỉ đọc: hàm này chạy cả trên luồng nền
            // của phiên quét (không có transaction), mà ProductVariant.product là LAZY. Mở sau khi AI trả lời để
            // không giữ kết nối DB trong lúc chờ AI.
            org.springframework.transaction.support.TransactionTemplate readOnlyTx =
                    new org.springframework.transaction.support.TransactionTemplate(transactionManager);
            readOnlyTx.setReadOnly(true);
            MatchResult matched = readOnlyTx.execute(status -> {
                SupplierMatch supplier = matchSupplier(ocrResult);
                return new MatchResult(supplier, matchItems(ocrResult, supplier.matchedId));
            });
            SupplierMatch supplierMatch = matched.supplier();
            List<OcrItemLine> itemLines = matched.items();
            long totalDuration = System.currentTimeMillis() - startTime;

            log.info("[OCR] Completed scan in {} ms (Vision AI: {} ms, Matching: {} ms, Items: {})",
                    totalDuration, aiDuration, (totalDuration - aiDuration), itemLines.size());

            // 7. Build response
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
        } catch (BusinessException e) {
            throw e;
        } catch (VisionAiException e) {
            log.error("OCR scan failed after {} ms: {}", (System.currentTimeMillis() - startTime), e.getMessage());
            throw new BusinessException(e.userMessage());
        } catch (Exception e) {
            log.error("OCR scan failed after {} ms: {}", (System.currentTimeMillis() - startTime), e.getMessage(), e);
            throw new BusinessException(String.format(SystemMessage.OCR_ERR_002.getMessage(), e.getMessage()));
        }
    }

    private record MatchResult(SupplierMatch supplier, List<OcrItemLine> items) {}

    /**
     * Tự động nén và thu nhỏ ảnh ở Server nếu dung lượng vượt quá 1MB (bảo vệ khi upload qua Mobile QR hoặc API ngoài)
     */
    private byte[] downscaleImageIfNeeded(byte[] imageBytes, String mimeType) {
        if (imageBytes == null || imageBytes.length <= 1024 * 1024) {
            return imageBytes;
        }
        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (original == null) return imageBytes;

            int width = original.getWidth();
            int height = original.getHeight();
            int maxDim = 1800;

            if (width <= maxDim && height <= maxDim && imageBytes.length < 1.5 * 1024 * 1024) {
                return imageBytes;
            }

            int targetWidth = width;
            int targetHeight = height;
            if (width > height) {
                if (width > maxDim) {
                    targetHeight = (int) Math.round(((double) height * maxDim) / width);
                    targetWidth = maxDim;
                }
            } else {
                if (height > maxDim) {
                    targetWidth = (int) Math.round(((double) width * maxDim) / height);
                    targetHeight = maxDim;
                }
            }

            BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g2d = resized.createGraphics();
            g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g2d.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2d.drawImage(original, 0, 0, targetWidth, targetHeight, Color.WHITE, null);
            g2d.dispose();

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(resized, "jpg", baos);
            byte[] downscaled = baos.toByteArray();
            log.info("[OCR] Auto-downscaled image: {} KB -> {} KB ({}x{} -> {}x{})",
                    imageBytes.length / 1024, downscaled.length / 1024, width, height, targetWidth, targetHeight);
            return downscaled;
        } catch (Exception e) {
            log.warn("[OCR] Image downscale fallback error, using original bytes: {}", e.getMessage());
            return imageBytes;
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
            mapping.updateMapping(variantId);
            vendorProductMappingRepository.save(mapping);
        } else {
            VendorProductMapping m = new VendorProductMapping();
            m.initMapping(partnerId, normalized, variantId);
            vendorProductMappingRepository.save(m);
        }
    }

    // =========================================================================
    // Vision AI Call
    // =========================================================================

    /**
     * Lỗi khi gọi Vision AI. {@code tryNextModel}: lỗi tạm thời / riêng của model (quá tải, hết lượt, JSON hỏng...)
     * nên thử lại hoặc chuyển model dự phòng; false: lỗi cấu hình (sai API key...) - thử model khác cũng vô ích.
     */
    static final class VisionAiException extends Exception {
        private final boolean tryNextModel;
        private final boolean retrySameModel;
        private final String userMessage;

        VisionAiException(String message, String userMessage, boolean tryNextModel, boolean retrySameModel, Throwable cause) {
            super(message, cause);
            this.userMessage = userMessage;
            this.tryNextModel = tryNextModel;
            this.retrySameModel = retrySameModel;
        }

        String userMessage() {
            return userMessage;
        }

        boolean tryNextModel() {
            return tryNextModel;
        }

        boolean retrySameModel() {
            return retrySameModel;
        }
    }

    private static final String MSG_AI_BUSY =
            "Dịch vụ AI đang quá tải hoặc tạm hết lượt xử lý. Vui lòng chụp / gửi lại ảnh sau ít phút.";
    private static final String MSG_AI_UNREADABLE =
            "AI không đọc được chứng từ trong ảnh này. Vui lòng chụp lại rõ nét, đủ sáng, thẳng góc.";
    private static final String MSG_AI_CONFIG =
            "Chưa cấu hình đúng API Key hoặc model AI cho tính năng quét chứng từ. Vui lòng liên hệ quản trị viên.";

    private JsonNode callVisionAi(String base64Image, String mimeType) throws VisionAiException {
        boolean hasGeminiKey = (geminiApiKey != null && !geminiApiKey.isBlank());
        boolean hasOpenAiKey = (openAiApiKey != null && !openAiApiKey.isBlank());

        String selectedProvider = provider == null ? "gemini" : provider.trim().toLowerCase(Locale.ROOT);
        if ("gemini".equals(selectedProvider)) {
            if (!hasGeminiKey) {
                throw new BusinessException("Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm API Key vào biến môi trường GEMINI_API_KEY hoặc file cấu hình.");
            }
            return callGeminiWithFallback(base64Image, mimeType);
        }
        if ("openai".equals(selectedProvider)) {
            if (!hasOpenAiKey) {
                throw new BusinessException("Chưa cấu hình OPENAI_API_KEY. Vui lòng thêm API Key vào biến môi trường OPENAI_API_KEY hoặc file cấu hình.");
            }
            return callOpenAiVision(base64Image, mimeType);
        }
        if (hasGeminiKey) {
            return callGeminiWithFallback(base64Image, mimeType);
        }
        if (hasOpenAiKey) {
            return callOpenAiVision(base64Image, mimeType);
        }
        throw new BusinessException("Không tìm thấy API Key cho AI (GEMINI_API_KEY hoặc OPENAI_API_KEY). Vui lòng cấu hình API Key để sử dụng tính năng quét chứng từ.");
    }

    /**
     * Model chính: tối đa 2 lần (lần 2 chỉ khi lỗi tạm thời như 503 / lỗi 5xx, chờ ngắn trước khi gọi lại).
     * Sau đó chuyển model dự phòng 1 lần. 429 (hết lượt của model) và 404 (model không còn) chuyển thẳng sang
     * dự phòng vì hạn mức / tính sẵn có tính riêng theo từng model.
     */
    private JsonNode callGeminiWithFallback(String base64Image, String mimeType) throws VisionAiException {
        List<String> models = new ArrayList<>();
        models.add(geminiModel);
        if (geminiFallbackModel != null && !geminiFallbackModel.isBlank()
                && !geminiFallbackModel.trim().equalsIgnoreCase(geminiModel)) {
            models.add(geminiFallbackModel.trim());
        }

        long start = System.currentTimeMillis();
        VisionAiException last = null;
        for (int m = 0; m < models.size(); m++) {
            String model = models.get(m);
            int maxAttempts = m == 0 ? 2 : 1;
            for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                if (last != null && System.currentTimeMillis() - start > VISION_TOTAL_BUDGET_MS) {
                    throw last;
                }
                try {
                    return callGeminiVision(base64Image, mimeType, model);
                } catch (VisionAiException e) {
                    last = e;
                    if (!e.tryNextModel) {
                        throw e;
                    }
                    boolean retrySame = e.retrySameModel && attempt < maxAttempts;
                    log.warn("[OCR] Gemini {} attempt {} failed: {}{}", model, attempt, e.getMessage(),
                            retrySame ? " - retrying" : (m + 1 < models.size() ? " - switching to " + models.get(m + 1) : ""));
                    if (!retrySame) {
                        break;
                    }
                    sleepQuietly(1500L);
                }
            }
        }
        throw last;
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    /** Model 2.5 tắt được thinking bằng budget 0 (Pro thì tối thiểu 128). Thinking bật ăn mất token đầu ra -> JSON bị cắt. */
    private Integer thinkingBudgetFor(String model) {
        String lower = model.toLowerCase(Locale.ROOT);
        if (!lower.contains("2.5") && !lower.contains("thinking") && geminiThinkingBudget <= 0) {
            return null;
        }
        return lower.contains("pro") ? Math.max(128, geminiThinkingBudget) : Math.max(0, geminiThinkingBudget);
    }

    private JsonNode callGeminiVision(String base64Image, String mimeType, String model) throws VisionAiException {
        Map<String, Object> textPart = Map.of("text", VISION_SYSTEM_PROMPT);

        Map<String, Object> inlineData = new LinkedHashMap<>();
        inlineData.put("mime_type", mimeType != null && !mimeType.isBlank() ? mimeType : "image/jpeg");
        inlineData.put("data", base64Image);
        Map<String, Object> imagePart = Map.of("inline_data", inlineData);

        Map<String, Object> content = new LinkedHashMap<>();
        content.put("role", "user");
        content.put("parts", List.of(textPart, imagePart));

        Map<String, Object> generationConfig = new LinkedHashMap<>();
        generationConfig.put("maxOutputTokens", MAX_OUTPUT_TOKENS);
        generationConfig.put("temperature", 0.1);
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.put("responseSchema", VISION_RESPONSE_SCHEMA);
        Integer thinkingBudget = thinkingBudgetFor(model);
        if (thinkingBudget != null) {
            generationConfig.put("thinkingConfig", Map.of("thinkingBudget", thinkingBudget));
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("contents", List.of(content));
        request.put("generationConfig", generationConfig);

        String modelPath = model.startsWith("models/") ? model : "models/" + model;
        log.info("[OCR] Calling Gemini model: {} (thinkingBudget: {})", modelPath, thinkingBudget);

        String rawResponse;
        try {
            rawResponse = restClient.post()
                    .uri(geminiBaseUrl + "/" + modelPath + ":generateContent?key=" + geminiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(String.class);
        } catch (org.springframework.web.client.RestClientResponseException e) {
            throw classifyHttpError(model, e.getStatusCode().value(), e.getResponseBodyAsString(), e);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            // Timeout / mất kết nối: model khác có thể trả lời kịp, gọi lại chính model này thì lại chờ 45s.
            throw new VisionAiException("Gemini " + model + " network error: " + e.getMessage(), MSG_AI_BUSY, true, false, e);
        }
        return parseGeminiResponse(model, rawResponse);
    }

    static VisionAiException classifyHttpError(String model, int status, String body, Exception cause) {
        String brief = "Gemini " + model + " HTTP " + status + ": " + abbreviate(body, 300);
        if (status == 401 || status == 403) {
            return new VisionAiException(brief, MSG_AI_CONFIG, false, false, cause);
        }
        if (status == 400 && body != null && body.contains("API_KEY")) {
            return new VisionAiException(brief, MSG_AI_CONFIG, false, false, cause);
        }
        if (status == 429 || status == 404 || status == 400) {
            // Hết lượt / model không còn / model không nhận cấu hình: chuyển model dự phòng, không gọi lại model này.
            return new VisionAiException(brief, status == 429 ? MSG_AI_BUSY : MSG_AI_CONFIG, true, false, cause);
        }
        // 500 / 503 / 504: quá tải tạm thời, gọi lại sau chút là thường được.
        return new VisionAiException(brief, MSG_AI_BUSY, true, status >= 500, cause);
    }

    private JsonNode parseGeminiResponse(String model, String rawResponse) throws VisionAiException {
        JsonNode root;
        try {
            root = objectMapper.readTree(rawResponse);
        } catch (Exception e) {
            throw new VisionAiException("Gemini " + model + " returned non-JSON envelope", MSG_AI_UNREADABLE, true, true, e);
        }
        JsonNode candidate = root.path("candidates").path(0);
        String finishReason = candidate.path("finishReason").asText("");
        StringBuilder text = new StringBuilder();
        for (JsonNode part : candidate.path("content").path("parts")) {
            if (part.path("thought").asBoolean(false)) {
                continue;
            }
            String t = part.path("text").asText();
            if (t != null && !t.isBlank()) text.append(t);
        }
        if (text.length() == 0) {
            String blockReason = root.path("promptFeedback").path("blockReason").asText("");
            throw new VisionAiException("Gemini " + model + " returned no text (finishReason=" + finishReason
                    + (blockReason.isBlank() ? "" : ", blockReason=" + blockReason) + ")", MSG_AI_UNREADABLE, true, true, null);
        }
        return parseVisionJson("Gemini " + model, text.toString(), finishReason);
    }

    /**
     * JSON AI trả về phải là object. Bị cắt (MAX_TOKENS - thường do AI lặp chữ vô hạn) hoặc hỏng thì coi là lỗi tạm
     * thời để gọi lại / chuyển model; ghi một đoạn nội dung thô vào log để tra cứu.
     */
    private JsonNode parseVisionJson(String source, String text, String finishReason) throws VisionAiException {
        String cleaned = cleanJsonBlock(text.trim());
        try {
            JsonNode node = objectMapper.readTree(cleaned);
            if (node != null && node.isObject()) {
                return node;
            }
        } catch (Exception ignored) {
            // xử lý bên dưới
        }
        throw new VisionAiException(source + " returned invalid JSON (finishReason=" + finishReason + ", "
                + cleaned.length() + " chars): " + abbreviate(cleaned, 300), MSG_AI_UNREADABLE, true, true, null);
    }

    private static String abbreviate(String value, int max) {
        if (value == null) return "";
        String oneLine = value.replaceAll("\\s+", " ");
        return oneLine.length() <= max ? oneLine : oneLine.substring(0, max) + "...";
    }

    /** OpenAI Responses API: input là danh sách message, giới hạn là max_output_tokens, bật chế độ JSON. */
    private JsonNode callOpenAiVision(String base64Image, String mimeType) throws VisionAiException {
        Map<String, Object> textContent = new LinkedHashMap<>();
        textContent.put("type", "input_text");
        textContent.put("text", VISION_SYSTEM_PROMPT);

        Map<String, Object> imageContent = new LinkedHashMap<>();
        imageContent.put("type", "input_image");
        imageContent.put("image_url", "data:" + mimeType + ";base64," + base64Image);

        Map<String, Object> message = new LinkedHashMap<>();
        message.put("role", "user");
        message.put("content", List.of(textContent, imageContent));

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", openAiModel);
        request.put("input", List.of(message));
        request.put("max_output_tokens", MAX_OUTPUT_TOKENS);
        request.put("temperature", 0.1);
        request.put("text", Map.of("format", Map.of("type", "json_object")));

        String rawResponse;
        try {
            rawResponse = restClient.post()
                    .uri(openAiBaseUrl + "/responses")
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(String.class);
        } catch (org.springframework.web.client.RestClientResponseException e) {
            int status = e.getStatusCode().value();
            String brief = "OpenAI HTTP " + status + ": " + abbreviate(e.getResponseBodyAsString(), 300);
            throw new VisionAiException(brief, status == 401 || status == 403 ? MSG_AI_CONFIG : MSG_AI_BUSY, false, false, e);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            throw new VisionAiException("OpenAI network error: " + e.getMessage(), MSG_AI_BUSY, false, false, e);
        }
        return parseVisionJson("OpenAI", extractOpenAiText(rawResponse), "");
    }

    private String extractOpenAiText(String rawResponse) throws VisionAiException {
        JsonNode root;
        try {
            root = objectMapper.readTree(rawResponse);
        } catch (Exception e) {
            throw new VisionAiException("OpenAI returned non-JSON envelope", MSG_AI_UNREADABLE, false, false, e);
        }
        String outputText = root.path("output_text").asText();
        if (outputText != null && !outputText.isBlank()) {
            return outputText;
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode outputItem : root.path("output")) {
            for (JsonNode contentItem : outputItem.path("content")) {
                String t = contentItem.path("text").asText();
                if (t != null && !t.isBlank()) text.append(t);
            }
        }
        return text.toString();
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
            Optional<Partner> match = partnerRepository.findByTaxCode(taxCode.trim());
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

    /** Ngưỡng tự khớp và ngưỡng hiện gợi ý theo điểm tương đồng tên hàng (0..1). */
    private static final double AUTO_MATCH_SCORE = 0.6;
    private static final double SUGGESTION_SCORE = 0.25;

    /** Hàng hóa đang kinh doanh, chuẩn hóa sẵn để khớp tên hàng trên chứng từ (nạp một lần cho mỗi lần quét). */
    record CatalogEntry(ProductVariant variant, String productName, String text, Map<String, Integer> tokens,
                                String skuKey, String barcodeKey) {}

    private List<CatalogEntry> loadCatalog() {
        return productVariantRepository.findAllActiveWithProduct().stream()
                .map(v -> {
                    String productName = v.getProduct() != null ? v.getProduct().getProductName() : "";
                    // SKU không đưa vào từ khóa (làm loãng điểm); SKU được so riêng trong nameScore.
                    String combined = (productName == null ? "" : productName) + " "
                            + (v.getVariantName() == null ? "" : v.getVariantName());
                    return new CatalogEntry(v, productName, matchText(combined), weightedTokens(combined),
                            v.getSku() == null ? null : v.getSku().trim().toUpperCase(Locale.ROOT),
                            v.getBarcode() == null ? null : v.getBarcode().trim().toLowerCase(Locale.ROOT));
                })
                .toList();
    }

    List<OcrItemLine> matchItems(JsonNode ocrResult, Long matchedSupplierId) {
        JsonNode items = ocrResult.path("items");
        if (!items.isArray() || items.isEmpty()) return List.of();

        List<CatalogEntry> catalog = loadCatalog();
        List<OcrItemLine> result = new ArrayList<>();

        for (JsonNode item : items) {
            String rawName = textOrNull(item, "raw_product_name");
            String rawSku = textOrNull(item, "raw_sku");
            BigDecimal qty = decimalOrNull(item, "quantity");
            BigDecimal unitPrice = decimalOrNull(item, "unit_price");
            String unit = textOrNull(item, "unit");
            String category = textOrNull(item, "category");
            // Schema mới trả thẳng số tháng; "warranty" dạng chữ còn giữ cho câu trả lời không theo schema (OpenAI).
            BigDecimal warrantyNumber = decimalOrNull(item, "warranty_months");
            Integer warrantyMonths = warrantyNumber != null && warrantyNumber.signum() >= 0
                    ? Integer.valueOf(warrantyNumber.intValue()) // Integer, không int: nhánh kia có thể null
                    : parseWarrantyToMonths(textOrNull(item, "warranty"));
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

            VariantMatch match = matchVariant(rawName, rawSku, matchedSupplierId, catalog);

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

    private static VariantMatch exactMatch(CatalogEntry entry, double confidence) {
        ProductVariant v = entry.variant();
        return new VariantMatch(v.getId(), v.getSku(), v.getVariantName(), entry.productName(), confidence, List.of());
    }

    private VariantMatch matchVariant(String rawName, String rawSku, Long supplierId, List<CatalogEntry> catalog) {
        // Step 1: Khớp chính xác SKU / mã vạch (không phân biệt hoa thường, bỏ khoảng trắng thừa)
        if (rawSku != null && !rawSku.isBlank()) {
            String skuKey = rawSku.trim().toUpperCase(Locale.ROOT);
            String barcodeKey = rawSku.trim().toLowerCase(Locale.ROOT);
            for (CatalogEntry entry : catalog) {
                if (skuKey.equals(entry.skuKey()) || barcodeKey.equals(entry.barcodeKey())) {
                    return exactMatch(entry, 1.0);
                }
            }
        }

        // Step 2: Lịch sử khớp tay với nhà cung cấp này (học từ các lần người dùng xác nhận)
        if (supplierId != null && rawName != null) {
            Optional<VendorProductMapping> mapping =
                    vendorProductMappingRepository.findByPartnerIdAndVendorProductName(supplierId, normalize(rawName));
            if (mapping.isPresent()) {
                Long mappedId = mapping.get().getProductVariantId();
                for (CatalogEntry entry : catalog) {
                    if (entry.variant().getId().equals(mappedId)) {
                        return exactMatch(entry, 0.95);
                    }
                }
            }
        }

        // Step 3: So khớp tên theo từ khóa trên toàn bộ danh mục (không cần tên trong kho chứa trọn tên trên chứng từ)
        if (rawName == null || rawName.isBlank() || catalog.isEmpty()) {
            return new VariantMatch(null, null, null, null, 0.0, List.of());
        }
        String rawText = matchText(rawName);
        Map<String, Integer> rawTokens = weightedTokens(rawName);
        List<ScoredVariant> scored = catalog.stream()
                .map(entry -> new ScoredVariant(entry, nameScore(rawText, rawTokens, entry)))
                .filter(s -> s.score >= SUGGESTION_SCORE)
                .sorted(Comparator.comparingDouble(ScoredVariant::score).reversed())
                .limit(6)
                .toList();

        if (!scored.isEmpty() && scored.get(0).score >= AUTO_MATCH_SCORE) {
            ScoredVariant best = scored.get(0);
            VariantMatch bestMatch = exactMatch(best.entry, Math.round(best.score * 100.0) / 100.0);
            return new VariantMatch(bestMatch.variantId(), bestMatch.sku(), bestMatch.variantName(),
                    bestMatch.productName(), bestMatch.confidence(), toSuggestions(scored.stream().skip(1).limit(3)));
        }
        // Không đủ chắc để tự khớp: chỉ trả gợi ý cho người dùng chọn
        return new VariantMatch(null, null, null, null, 0.0, toSuggestions(scored.stream().limit(5)));
    }

    private static List<VariantSuggestion> toSuggestions(java.util.stream.Stream<ScoredVariant> stream) {
        return stream.map(s -> VariantSuggestion.builder()
                        .variantId(s.entry.variant().getId())
                        .sku(s.entry.variant().getSku())
                        .variantName(s.entry.variant().getVariantName())
                        .productName(s.entry.productName())
                        .similarity(Math.round(s.score * 100.0) / 100.0)
                        .build())
                .toList();
    }

    private record ScoredVariant(CatalogEntry entry, double score) {}

    /**
     * Điểm giống nhau giữa tên trên chứng từ và một hàng trong kho: Dice có trọng số trên từ khóa. Từ có chữ số
     * (mã model, dung lượng: 13400f, 16gb, ddr5...) nặng gấp 3 từ chung (ram, ssd, intel) vì phân biệt hàng tốt hơn.
     * Tên này chứa trọn tên kia vẫn được tối thiểu 0.7 như trước.
     */
    static double nameScore(String rawText, Map<String, Integer> rawTokens, CatalogEntry entry) {
        // Tên trên chứng từ có ghi đúng mã SKU của hàng trong kho
        if (entry.skuKey() != null && rawTokens.containsKey(entry.skuKey().toLowerCase(Locale.ROOT))) {
            return 0.95;
        }
        double best = 0;
        if (!rawText.isEmpty() && !entry.text().isEmpty()
                && (rawText.contains(entry.text()) || entry.text().contains(rawText))) {
            best = Math.max(0.7, (double) Math.min(rawText.length(), entry.text().length())
                    / Math.max(rawText.length(), entry.text().length()));
        }
        int rawWeight = rawTokens.values().stream().mapToInt(Integer::intValue).sum();
        int entryWeight = entry.tokens().values().stream().mapToInt(Integer::intValue).sum();
        if (rawWeight == 0 || entryWeight == 0) {
            return best;
        }
        int shared = 0;
        for (Map.Entry<String, Integer> token : rawTokens.entrySet()) {
            if (entry.tokens().containsKey(token.getKey())) {
                shared += token.getValue();
            }
        }
        return Math.max(best, 2.0 * shared / (rawWeight + entryWeight));
    }

    /** Chuỗi so khớp: bỏ dấu (kể cả đ), chữ thường, dính số với đơn vị (16 GB -> 16gb), ký tự đặc biệt thành khoảng trắng. */
    static String matchText(String value) {
        if (value == null) return "";
        String s = Normalizer.normalize(value.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        s = s.replaceAll("(\\d)\\s+(gb|tb|mb|ghz|mhz|hz|w|inch)\\b", "$1$2");
        return s.replaceAll("[^a-z0-9]+", " ").trim();
    }

    static Map<String, Integer> weightedTokens(String value) {
        Map<String, Integer> tokens = new HashMap<>();
        for (String token : matchText(value).split(" ")) {
            if (token.isEmpty()) continue;
            boolean distinctive = token.length() >= 3 && token.chars().anyMatch(Character::isDigit);
            tokens.put(token, distinctive ? 3 : 1);
        }
        return tokens;
    }

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


