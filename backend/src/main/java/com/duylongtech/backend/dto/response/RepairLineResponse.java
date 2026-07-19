package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class RepairLineResponse {
    private Long id;
    private Long repairId;
    private Long componentVariantId;
    private String actionType;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private Boolean isFreeWarranty;
    private Long serialNumberId;
    private String note;
}
