package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PaymentResponse;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentService {

    PaymentResponse createPaymentReceipt(PaymentRequest request);

    PaymentResponse createPaymentVoucher(PaymentRequest request);

    PaymentResponse postPayment(Long id);

    BigDecimal getPartnerDebtBalance(Long partnerId);

    List<PaymentResponse> getPartnerPaymentHistory(Long partnerId);
}
