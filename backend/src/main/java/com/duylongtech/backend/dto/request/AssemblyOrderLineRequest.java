package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AssemblyOrderLineRequest {
    private Long componentVariantId;
    private BigDecimal quantityRequired;
    private BigDecimal quantityActual;
    private String note;
}
