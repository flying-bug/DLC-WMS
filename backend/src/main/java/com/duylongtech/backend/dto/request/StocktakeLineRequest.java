package com.duylongtech.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeLineRequest {
    private Long variantId;
    private BigDecimal bookQty;
    private BigDecimal countQty;
    private BigDecimal diffQty;
    private BigDecimal goodQty;
    private BigDecimal badQty;
    private BigDecimal lostQty;
    private String action;
}
