package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class PurchaseOrderResponse {

    private Long id;
    private String poCode;
    private LocalDate poDate;
    private String status;

    // Supplier (Partner) info
    private Long partnerId;
    private String partnerCode;
    private String partnerName;
    private String partnerPhone;

    // Financials
    private BigDecimal subTotalAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private String paymentStatus;
    private LocalDate paymentDueDate;
    private LocalDate expectedDeliveryDate;
    private String note;

    // Audit
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Lines
    private List<PurchaseOrderLineResponse> lines;

    @Data
    @Builder
    public static class PurchaseOrderLineResponse {
        private Long id;
        private Long variantId;
        private String productName;
        private String sku;
        private String variantName;
        private String productCode;
        private String unitName;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal vatRate;
        private BigDecimal vatAmount;
        private BigDecimal lineAmount;
        private String note;
    }
}
