package com.duylongtech.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class InventoryDocumentLineResponse {
    private Long id;
    private Long variantId;
    private String sku;
    private String productName;
    private String variantName;
    private String barcode;
    private BigDecimal quantityIn;
    private BigDecimal quantityOut;
    private BigDecimal unitCost;
    private BigDecimal unitPrice;
    private BigDecimal vatRate;
    private BigDecimal lineAmount;
    private Long lotBatchId;
    private Long serialNumberId;
    private List<String> serialNumbers;
    private Integer warrantyMonths;
    private String note;
    private BigDecimal vatPercent;
    private Long warehouseId;
    private String warehouseName;
    private String warehouseCode;
    private Long targetWarehouseId;
    private String targetWarehouseName;
    private BigDecimal expectedQuantity;
    private BigDecimal rejectedQuantity;
    private String discrepancyReason;

    private Long unitId;
    private String unitName;
    private Long baseUnitId;
    private String baseUnitName;
    private String conversionOperator;
    private BigDecimal conversionRatio;
    private BigDecimal baseQuantity;
}
