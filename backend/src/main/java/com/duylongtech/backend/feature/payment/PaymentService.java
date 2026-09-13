package com.duylongtech.backend.feature.payment;

import com.duylongtech.backend.feature.payment.PaymentRequest;
import com.duylongtech.backend.feature.partner.PartnerLedgerResponse;
import com.duylongtech.backend.feature.payment.PaymentResponse;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentService {

    PaymentResponse createPaymentReceipt(PaymentRequest request);

    PaymentResponse createPaymentVoucher(PaymentRequest request);

    PaymentResponse updatePayment(Long id, PaymentRequest request);

    PaymentResponse postPayment(Long id);

    PaymentResponse unpostPayment(Long id, String reason);

    void deletePayment(Long id);

    BigDecimal getPartnerDebtBalance(Long partnerId);

    List<PaymentResponse> getPartnerPaymentHistory(Long partnerId);

    List<PartnerLedgerResponse> getPartnerLedgerDetails(Long partnerId);

    List<PaymentResponse> getAllPayments(String type, String status);
}

