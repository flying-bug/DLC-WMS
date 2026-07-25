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
    private BigDecimal totalValue;
    // We can add a map for warehouse-specific quantities if needed, but standard is just total per warehouse for the flat list.
    private String warehouseCode;
    private String warehouseName;
    private Long variantId;
    private String sku;
}
