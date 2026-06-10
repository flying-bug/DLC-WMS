package com.duylongtech.backend.dto.response;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class InventoryDocumentLineResponse {
    private Long id;
    private Long variantId;
    private BigDecimal quantityIn;
    private BigDecimal quantityOut;
    private BigDecimal unitCost;
    private BigDecimal unitPrice;
    private BigDecimal lineAmount;
    private Long lotBatchId;
    private Long serialNumberId;
    private String note;
}
