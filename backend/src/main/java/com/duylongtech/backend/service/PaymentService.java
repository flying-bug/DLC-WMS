package com.duylongtech.backend.service;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PartnerLedgerResponse;
import com.duylongtech.backend.dto.response.PaymentResponse;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentService {

    PaymentResponse createPaymentReceipt(PaymentRequest request);

    PaymentResponse createPaymentVoucher(PaymentRequest request);

    PaymentResponse updatePayment(Long id, PaymentRequest request);

    PaymentResponse postPayment(Long id);

    void deletePayment(Long id);

    BigDecimal getPartnerDebtBalance(Long partnerId);

    List<PaymentResponse> getPartnerPaymentHistory(Long partnerId);

    List<PartnerLedgerResponse> getPartnerLedgerDetails(Long partnerId);

    List<PaymentResponse> getAllPayments(String type, String status);
}

