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
public class InventorySummaryReportResponse {
    private String warehouseName;
    private String productCode;
    private String productName;
    private String unitName;
    private BigDecimal openingQuantity;
    private BigDecimal openingValue;
    private BigDecimal receiptQuantity;
    private BigDecimal receiptValue;
    private BigDecimal issueQuantity;
    private BigDecimal issueValue;
    private BigDecimal endingQuantity;
    private BigDecimal endingValue;
}
