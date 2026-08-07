package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {
    private Long partnerId;
    private BigDecimal amount;
    private String paymentMethod; // CASH or BANK_TRANSFER
    private String note;
    private String type; // RECEIPT or VOUCHER
    private String status; // DRAFT or POSTED. Defaults to POSTED.
}
