package com.duylongtech.backend.feature.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashFlowReportResponse {
    private BigDecimal openingCash;
    private BigDecimal cashReceipts;
    private BigDecimal cashVouchers;
    private BigDecimal closingCash;
    private BigDecimal openingBank;
    private BigDecimal bankReceipts;
    private BigDecimal bankVouchers;
    private BigDecimal closingBank;
    private BigDecimal openingTotal;
    private BigDecimal totalReceipts;
    private BigDecimal totalVouchers;
    private BigDecimal closingTotal;
    private List<CashFlowTransactionResponse> transactions;
}
