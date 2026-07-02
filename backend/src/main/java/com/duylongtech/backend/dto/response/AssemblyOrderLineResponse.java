package com.duylongtech.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class AssemblyOrderLineResponse {
    private Long id;
    private Long componentVariantId;
    private String componentSku;
    private String componentName;
    private String unitName;
    private BigDecimal quantityRequired;
    private BigDecimal quantityActual;
    private BigDecimal unitCost;
    private String note;
}
