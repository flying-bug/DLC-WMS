package com.duylongtech.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductBomLineRequest {
    @NotNull(message = "FIELD_REQUIRED")
    private Long componentVariantId;

    @NotNull(message = "FIELD_REQUIRED")
    private BigDecimal quantity;

    private String componentRole; // e.g. "Main", "CPU"

    private String note;
}
