package com.duylongtech.backend.feature.ocr.service;

import com.duylongtech.backend.feature.inventory.OcrImportResponse.OcrItemLine;
import com.duylongtech.backend.feature.partner.PartnerRepository;
import com.duylongtech.backend.feature.product.Product;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.product.ProductVariantRepository;
import com.duylongtech.backend.feature.product.VendorProductMapping;
import com.duylongtech.backend.feature.product.VendorProductMappingRepository;
import com.duylongtech.backend.feature.system.SystemSettingsService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Khớp dòng hàng trên chứng từ với danh mục kho. Trước đây bước so khớp tên dùng LIKE '%trọn tên trên chứng từ%'
 * nên tên trong kho phải chứa nguyên chuỗi mới ra ứng viên; giờ so theo từ khóa trên toàn danh mục.
 */
class ImportOcrServiceMatchingTest {

    private final ObjectMapper json = new ObjectMapper();
    private ProductVariantRepository variantRepository;
    private VendorProductMappingRepository mappingRepository;
    private ImportOcrService service;

    @BeforeEach
    void setUp() {
        variantRepository = mock(ProductVariantRepository.class);
        mappingRepository = mock(VendorProductMappingRepository.class);
        when(mappingRepository.findByPartnerIdAndVendorProductName(anyLong(), any())).thenReturn(Optional.empty());
        service = new ImportOcrService(mock(PartnerRepository.class), variantRepository, mappingRepository,
                mock(SystemSettingsService.class), mock(PlatformTransactionManager.class));
        List<ProductVariant> catalog = List.of(
                variant(1L, "SP00069", "CPU-I5-13400F", "CPU-I5-13400F"),
                variant(2L, "SP00068", "CPU-I5-12400F", "CPU-I5-12400F"),
                variant(3L, "SP00070", "RAM-16GB-DDR5", "RAM-16GB-DDR5"),
                variant(4L, "SP00071", "RAM-16GB-DDR4", "RAM-16GB-DDR4"),
                variant(5L, "SP00072", "SSD-500GB-NVME", "SSD-500GB-NVME"));
        when(variantRepository.findAllActiveWithProduct()).thenReturn(catalog);
    }

    private static ProductVariant variant(Long id, String sku, String productName, String variantName) {
        Product product = mock(Product.class);
        when(product.getProductName()).thenReturn(productName);
        ProductVariant v = mock(ProductVariant.class);
        when(v.getId()).thenReturn(id);
        when(v.getSku()).thenReturn(sku);
        when(v.getVariantName()).thenReturn(variantName);
        when(v.getProduct()).thenReturn(product);
        return v;
    }

    private List<OcrItemLine> match(String itemsJson) throws Exception {
        JsonNode ocr = json.readTree("{\"items\": " + itemsJson + "}");
        return service.matchItems(ocr, null);
    }

    @Test
    void invoiceNameMatchesTheRightModelEvenWhenCatalogNameIsShorter() throws Exception {
        OcrItemLine line = match("[{\"raw_product_name\": \"Intel Core i5-13400F Box\"}]").get(0);

        assertEquals(1L, line.getMatchedVariantId());
        assertTrue(line.getMatchConfidence() >= 0.6);
        assertTrue(line.getAlternativeSuggestions().stream().noneMatch(s -> s.getVariantId() == 1L));
    }

    @Test
    void memoryGenerationDecidesTheMatch() throws Exception {
        OcrItemLine line = match("[{\"raw_product_name\": \"RAM Kingston Fury 16 GB DDR5\"}]").get(0);

        assertEquals(3L, line.getMatchedVariantId(), "16 GB được gộp thành 16gb, DDR5 thắng DDR4");
    }

    @Test
    void ssdWithBrandInTheNameStillMatches() throws Exception {
        OcrItemLine line = match("[{\"raw_product_name\": \"SSD Samsung 980 500GB NVMe\"}]").get(0);

        assertEquals(5L, line.getMatchedVariantId());
    }

    @Test
    void skuMatchIgnoresCase() throws Exception {
        OcrItemLine line = match("[{\"raw_product_name\": \"Ổ cứng\", \"raw_sku\": \" sp00072 \"}]").get(0);

        assertEquals(5L, line.getMatchedVariantId());
        assertEquals(1.0, line.getMatchConfidence());
    }

    @Test
    void unrelatedItemGetsNoMatchAndNoNoiseSuggestions() throws Exception {
        OcrItemLine line = match("[{\"raw_product_name\": \"Chuột Logitech G102\"}]").get(0);

        assertNull(line.getMatchedVariantId());
        assertTrue(line.getAlternativeSuggestions().isEmpty());
    }

    @Test
    void vendorMappingFromPreviousConfirmationWins() throws Exception {
        VendorProductMapping mapping = mock(VendorProductMapping.class);
        when(mapping.getProductVariantId()).thenReturn(4L);
        when(mappingRepository.findByPartnerIdAndVendorProductName(9L, "ram kingston 16g")).thenReturn(Optional.of(mapping));

        JsonNode ocr = json.readTree("{\"items\": [{\"raw_product_name\": \"RAM Kingston 16G\"}]}");
        OcrItemLine line = service.matchItems(ocr, 9L).get(0);

        assertEquals(4L, line.getMatchedVariantId());
        assertEquals(0.95, line.getMatchConfidence());
    }

    @Test
    void warrantyComesFromMonthsFieldOrLegacyText() throws Exception {
        List<OcrItemLine> lines = match("[{\"raw_product_name\": \"A\", \"warranty_months\": 36},"
                + " {\"raw_product_name\": \"B\", \"warranty\": \"3 năm\"}]");

        assertEquals(36, lines.get(0).getWarrantyMonths());
        assertEquals(36, lines.get(1).getWarrantyMonths());
    }

    @Test
    void overloadAndQuotaErrorsMoveOnButKeyErrorsStop() {
        ImportOcrService.VisionAiException overloaded = ImportOcrService.classifyHttpError("m", 503, "{}", null);
        ImportOcrService.VisionAiException quota = ImportOcrService.classifyHttpError("m", 429, "{}", null);
        ImportOcrService.VisionAiException badKey = ImportOcrService.classifyHttpError("m", 400,
                "{\"error\": {\"message\": \"API key not valid\", \"details\": [{\"reason\": \"API_KEY_INVALID\"}]}}", null);

        assertTrue(overloaded.tryNextModel() && overloaded.retrySameModel(), "503: gọi lại model này rồi mới chuyển dự phòng");
        assertTrue(quota.tryNextModel() && !quota.retrySameModel(), "429: hết lượt model này, chuyển thẳng dự phòng");
        assertFalse(badKey.tryNextModel(), "sai API key: đổi model cũng vô ích");
    }
}
