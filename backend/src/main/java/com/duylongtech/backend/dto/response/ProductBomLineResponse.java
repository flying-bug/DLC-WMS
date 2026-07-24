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
public class ProductBomLineResponse {
    private Long id;
    private Long componentVariantId;
    private String componentVariantName;
    private String componentVariantSku;
    private BigDecimal quantity;
    private String componentRole;
    private String note;
}
