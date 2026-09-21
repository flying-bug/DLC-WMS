package com.duylongtech.backend.feature.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalesProfitReportResponse {
    private String sku;
    private String variantName;
    private String unitName;
    private BigDecimal quantitySold;
    private BigDecimal salesAmount;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
    private BigDecimal costAmount;
    private BigDecimal grossProfit;
    private BigDecimal profitMarginPercent;
}
