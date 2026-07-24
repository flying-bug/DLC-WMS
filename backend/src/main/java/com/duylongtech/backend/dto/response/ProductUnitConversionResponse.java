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
public class ProductUnitConversionResponse {
    private Long id;
    private Long unitId;
    private String unitName;
    private String operator;
    private BigDecimal ratio;
    private String note;
}
