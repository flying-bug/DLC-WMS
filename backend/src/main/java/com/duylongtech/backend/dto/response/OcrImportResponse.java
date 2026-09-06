package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Response trả về sau khi OCR trích xuất chứng từ nhập kho.
 * Chứa thông tin nhà cung cấp, hóa đơn, và danh sách sản phẩm đã được khớp với dữ liệu hệ thống.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrImportResponse {

    /** Mã hóa đơn trích xuất từ chứng từ */
    private String invoiceCode;

    /** Ngày hóa đơn trích xuất từ chứng từ */
    private LocalDate invoiceDate;

    // --- Matched Supplier ---
    /** ID nhà cung cấp khớp trong DB */
    private Long matchedSupplierId;

    /** Tên nhà cung cấp khớp trong DB */
    private String matchedSupplierName;

    /** Tên nhà cung cấp thô trích xuất từ chứng từ */
    private String rawSupplierName;

    /** Mã số thuế trích xuất từ chứng từ */
    private String supplierTaxCode;

    /** Độ tin cậy khớp nhà cung cấp (0.0 - 1.0) */
    private Double supplierConfidence;

    /** Mã nhà cung cấp khớp trong DB */
    private String matchedSupplierCode;

    // --- Extracted Items ---
    /** Danh sách các dòng sản phẩm trích xuất */
    private List<OcrItemLine> items;

    /**
     * Một dòng sản phẩm trích xuất từ chứng từ OCR, kèm thông tin khớp SKU trong hệ thống.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OcrItemLine {

        /** Tên sản phẩm thô (đúng như trên hóa đơn) */
        private String rawProductName;

        /** SKU/Barcode thô (đúng như trên hóa đơn) */
        private String rawSku;

        // --- Matched System Data ---
        /** Variant ID khớp trong DB */
        private Long matchedVariantId;

        /** SKU khớp trong DB */
        private String matchedSku;

        /** Tên biến thể khớp trong DB */
        private String matchedVariantName;

        /** Tên sản phẩm cha khớp trong DB */
        private String matchedProductName;

        /** Độ tin cậy khớp (0.0 - 1.0), 1.0 = exact match */
        private Double matchConfidence;

        /** Số lượng trích xuất */
        private BigDecimal quantity;

        /** Đơn giá trích xuất */
        private BigDecimal unitPrice;

        /** Đơn vị tính trích xuất */
        private String unit;

        /** Danh mục dự đoán */
        private String category;

        /** Thời hạn bảo hành (đã quy đổi ra tháng) */
        private Integer warrantyMonths;

        /** Thuế VAT (%) */
        private BigDecimal vatPercent;

        /** Danh sách số Serial (nếu có) trích xuất */
        private List<String> serialNumbers;

        /** Danh sách gợi ý SKU khác nếu confidence thấp */
        private List<VariantSuggestion> alternativeSuggestions;
    }

    /**
     * Gợi ý SKU thay thế khi AI không chắc chắn khớp đúng.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VariantSuggestion {
        private Long variantId;
        private String sku;
        private String variantName;
        private String productName;
        private Double similarity;
    }
}
