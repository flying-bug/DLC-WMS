package com.duylongtech.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepairLineRequest {
    private Long id; // Optional, for updates
    private Long componentVariantId;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private Boolean isWarrantyCovered;
    private String note;
}
