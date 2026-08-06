package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class AssemblyBomLineResponse {
    private Long id;
    private Long componentVariantId;
    private String componentSku;
    private String componentName;
    private String unitName;
    private BigDecimal quantity;
    private String componentRole;
    private String note;
    private BigDecimal unitPrice;
    private Integer warrantyMonths;
}
