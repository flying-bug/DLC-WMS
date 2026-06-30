package com.duylongtech.backend.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockLedgerReportResponse {
    private String warehouseName;
    private String productCode;
    private String productName;
    private String description;
    private LocalDateTime movementAt;
    private String documentNumber;
    private String documentType;
    private String reference;
    private String unitName;
    private BigDecimal unitPrice;
    private BigDecimal quantityIn;
    private BigDecimal quantityOut;
    private BigDecimal balanceAfter;
}
