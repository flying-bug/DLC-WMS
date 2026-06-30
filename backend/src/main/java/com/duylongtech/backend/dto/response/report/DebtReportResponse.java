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
public class DebtReportResponse {
    private String customerCode;
    private String customerName;
    private BigDecimal openingBalance;
    private BigDecimal debitIncrease;
    private BigDecimal creditDecrease;
    private BigDecimal closingBalance;
    private String debtStatus;
}
