package com.duylongtech.backend.feature.report;

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
public class CashFlowTransactionResponse {
    private Long id;
    private String code;
    private String type;
    private String paymentMethod;
    private String partnerName;
    private BigDecimal amount;
    private String note;
    private LocalDateTime postedAt;
}
