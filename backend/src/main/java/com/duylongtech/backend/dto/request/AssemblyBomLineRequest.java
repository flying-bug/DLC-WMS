package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class AssemblyBomLineRequest {
    private Long componentVariantId;
    private BigDecimal quantity;
    private String note;
}
