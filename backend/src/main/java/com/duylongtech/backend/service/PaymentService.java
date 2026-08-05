package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {

    PaymentResponse createPaymentReceipt(PaymentRequest request);

    PaymentResponse createPaymentVoucher(PaymentRequest request);

    List<PaymentResponse> getPartnerPaymentHistory(Long partnerId);
}
