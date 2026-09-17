package com.duylongtech.backend.feature.payment;

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
public class PaymentResponse {
    private Long id;
    private String code;
    private Long partnerId;
    private String partnerName;
    private BigDecimal amount;
    private String status;
    private String paymentMethod;
    private String type; // RECEIPT / VOUCHER
    private String note;
    private LocalDateTime createdAt;
    private BigDecimal partnerDebtBalance;
    private String referenceType;
    private Long referenceId;
    private String idempotencyKey;
}
