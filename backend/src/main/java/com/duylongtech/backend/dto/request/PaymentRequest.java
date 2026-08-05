package com.duylongtech.backend.dto.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequest {
    private Long partnerId;
    private BigDecimal amount;
    private String paymentMethod;
    private String note;
    private String type; // RECEIPT (Thu tiền), VOUCHER (Chi tiền)
}
