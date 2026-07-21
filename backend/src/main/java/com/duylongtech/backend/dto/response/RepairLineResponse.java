package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO cho dòng linh kiện trong Lệnh Sửa Chữa.
 */
@Data
@Builder
public class RepairLineResponse {

    private Long id;
    private Long repairId;

    private Long componentVariantId;
    private String componentName;
    private String componentSku;

    private String actionType;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineAmount; // quantity * unitPrice

    private Boolean isFreeWarranty;
    private Long serialNumberId;
    private String serialNumber;
    private String note;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
