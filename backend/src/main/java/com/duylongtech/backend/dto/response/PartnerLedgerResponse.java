package com.duylongtech.backend.dto.response;

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
public class PartnerLedgerResponse {
    private Long id;
    private Long partnerId;
    private String entityType;
    private Long entityId;
    private String referenceCode;
    private BigDecimal amountDebt;
    private BigDecimal amountReceipt;
    private BigDecimal balanceAfter;
    private String note;
    private LocalDateTime createdAt;
}
