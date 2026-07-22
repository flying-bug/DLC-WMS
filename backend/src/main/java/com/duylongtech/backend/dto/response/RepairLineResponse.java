package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepairLineResponse {
    private Long id;
    private Long componentVariantId;
    private String sku;
    private String variantName;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private Boolean isWarrantyCovered;
    private String note;
}
