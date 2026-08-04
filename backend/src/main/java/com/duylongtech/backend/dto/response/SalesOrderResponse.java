package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class SalesOrderResponse {
    private Long id;
    private String soCode;
    private String publicToken;
    private LocalDate soDate;
    private String status;

    // Partner info
    private Long partnerId;
    private String partnerCode;
    private String partnerName;
    private String partnerPhone;

    // Warehouse info
    private Long warehouseId;
    private String warehouseCode;
    private String warehouseName;

    private BigDecimal subTotalAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private String paymentStatus;
    private LocalDate paymentDueDate;
    private String deliveryAddress;
    private String note;

    // Audit
    private Long createdBy;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Lines
    private List<SalesOrderLineResponse> lines;

    // Reservations
    private List<StockReservationResponse> reservations;

    @Data
    @Builder
    public static class SalesOrderLineResponse {
        private Long id;
        private Long variantId;
        private String sku;
        private String variantName;
        private String productCode;
        private String unitName;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal vatRate;
        private BigDecimal vatAmount;
        private Integer warrantyMonths;
        private BigDecimal lineAmount;
        private String note;
        // Tồn kho khả dụng — dùng để hiển thị cảnh báo trên UI
        private BigDecimal availableQuantity;
    }

    @Data
    @Builder
    public static class StockReservationResponse {
        private Long id;
        private Long variantId;
        private String variantName;
        private String sku;
        private Long warehouseId;
        private String warehouseName;
        private BigDecimal quantityReserved;
        private String status;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
    }
}
