package com.duylongtech.backend.feature.stocktake;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import com.duylongtech.backend.feature.product.Unit;

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
    private String skipReason;
    private List<StocktakeLineSerialResponse> serials;
}

