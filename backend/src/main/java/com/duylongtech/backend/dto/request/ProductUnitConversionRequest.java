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
public class ProductUnitConversionRequest {
    @NotNull(message = "FIELD_REQUIRED")
    private Long unitId;

    @NotNull(message = "FIELD_REQUIRED")
    private String operator; // MULTIPLY, DIVIDE

    @NotNull(message = "FIELD_REQUIRED")
    private BigDecimal ratio;

    private String note;
}
