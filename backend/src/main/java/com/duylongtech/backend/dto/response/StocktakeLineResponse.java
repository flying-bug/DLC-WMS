package com.duylongtech.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeLineResponse {
    private Long id;
    private Long variantId;
    private String itemCode;
    private String sku;
    private String itemName;
    private String unit;
    private Boolean trackSerial;
    private BigDecimal bookQty;
    private BigDecimal countQty;
    private BigDecimal diffQty;
    private BigDecimal goodQty;
    private BigDecimal badQty;
    private BigDecimal lostQty;
    private String action;
    private List<StocktakeLineSerialResponse> serials;
}

