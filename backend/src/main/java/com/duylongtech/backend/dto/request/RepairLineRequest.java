package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RepairLineRequest {
    @NotNull(message = "componentVariantId is required")
    private Long componentVariantId;

    @NotBlank(message = "actionType is required")
    private String actionType;

    @NotNull(message = "quantity is required")
    private BigDecimal quantity;

    @NotNull(message = "unitPrice is required")
    private BigDecimal unitPrice;

    @NotNull(message = "isFreeWarranty is required")
    private Boolean isFreeWarranty;

    private Long serialNumberId;

    private String note;
}
