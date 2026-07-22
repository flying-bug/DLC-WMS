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
    private String componentName;        // ✅ Add this
    private String componentSku;         // ✅ Add this
    private String actionType;           // ✅ Add this
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal lineAmount;       // ✅ Add this
    private Boolean isFreeWarranty;      // ✅ Add this (matches the service usage)
    private Long serialNumberId;         // ✅ Add this
    private String serialNumber;         // ✅ Add this
    private String note;
    private LocalDateTime createdAt;     // ✅ Add this
    private LocalDateTime updatedAt;     // ✅ Add this
}
