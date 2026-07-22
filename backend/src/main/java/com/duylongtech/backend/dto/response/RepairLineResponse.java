package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO cho dòng linh kiện trong Lệnh Sửa Chữa.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepairLineResponse {
    private Long id;
    private Long repairId;
    private Long componentVariantId;
    private String sku;
    private String variantName;
    private String componentName;
    private String componentSku;
    private String actionType;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineAmount;
    private Boolean isFreeWarranty;
    private Long serialNumberId;
    private String serialNumber;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
