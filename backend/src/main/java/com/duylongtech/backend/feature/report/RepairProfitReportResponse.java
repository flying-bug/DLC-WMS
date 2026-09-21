package com.duylongtech.backend.feature.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepairProfitReportResponse {
    private Long repairId;
    private String repairCode;
    private LocalDate completedDate;
    private String partnerName;
    private BigDecimal partsRevenue;
    private BigDecimal serviceRevenue;
    private BigDecimal vatAmount;
    private BigDecimal costAmount;
    private BigDecimal grossProfit;
    private BigDecimal profitMarginPercent;
}
