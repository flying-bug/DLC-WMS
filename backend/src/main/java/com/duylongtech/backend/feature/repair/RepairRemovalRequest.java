package com.duylongtech.backend.feature.repair;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RepairRemovalRequest {
    @NotNull private Long lineId;
    @NotNull private Long variantId;
    @NotNull @DecimalMin("0.0001") private BigDecimal quantity;
    private Long serialNumberId;
    private String serialNumber;
    @NotNull private String scrapCondition;
}
