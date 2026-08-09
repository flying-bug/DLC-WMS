package com.duylongtech.backend.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryBalanceReportResponse {
    private String itemCode;
    private String itemName;
    private String unitName;
    private BigDecimal totalQuantity;
    private BigDecimal availableQuantity;
    private BigDecimal totalValue;
    private String warehouseCode;
    private String warehouseName;
    private BigDecimal totalReserved;
    private Long variantId;
    private String sku;
    private Boolean trackSerial;
}
