package com.duylongtech.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class InventoryDocumentLineResponse {
    private Long id;
    private Long variantId;
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
}
