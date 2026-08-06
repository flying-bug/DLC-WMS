package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PaymentResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.PaymentTransaction;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.PaymentTransactionRepository;
import com.duylongtech.backend.service.CodeGeneratorService;
import com.duylongtech.backend.service.PartnerLedgerService;
import com.duylongtech.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PartnerRepository partnerRepository;
    private final PartnerLedgerService partnerLedgerService;
    private final CodeGeneratorService codeGeneratorService;

    @Override
    @Transactional
    public PaymentResponse createPaymentReceipt(PaymentRequest request) {
        return processPayment(request, "RECEIPT", "PAYMENT_TRANSACTIONS", "transaction_code", "PT");
    }

    @Override
    @Transactional
    public PaymentResponse createPaymentVoucher(PaymentRequest request) {
        return processPayment(request, "VOUCHER", "PAYMENT_TRANSACTIONS", "transaction_code", "PC");
    }

    private PaymentResponse processPayment(PaymentRequest request, String type, String tableName, String codeCol, String prefix) {
        Partner partner = partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + request.getPartnerId()));

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Số tiền giao dịch phải lớn hơn 0");
        }

        String code = codeGeneratorService.generateCode(tableName, codeCol, prefix, 5);

        PaymentTransaction transaction = PaymentTransaction.builder()
                .transactionCode(code)
                .type(type)
                .partnerId(partner.getId())
                .amount(request.getAmount())
                .status("POSTED")
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "BANK_TRANSFER")
                .createdAt(LocalDateTime.now())
                .build();

        PaymentTransaction saved = paymentTransactionRepository.save(transaction);

        String ledgerRefType = type.equals("RECEIPT") ? "PAYMENT_RECEIPT" : "PAYMENT_VOUCHER";
        BigDecimal amountIn = type.equals("RECEIPT") ? BigDecimal.ZERO : request.getAmount();
        BigDecimal amountOut = type.equals("RECEIPT") ? request.getAmount() : BigDecimal.ZERO;
        
        String defaultNote = (type.equals("RECEIPT") ? "Lập phiếu thu tiền " : "Lập phiếu chi tiền ") + saved.getTransactionCode();

        // Ghi nhận vào Partner Ledger
        partnerLedgerService.recordLedger(
                partner.getId(),
                ledgerRefType,
                saved.getId(),
                saved.getTransactionCode(),
                amountIn,
                amountOut,
                request.getNote() != null ? request.getNote() : defaultNote
        );

        return PaymentResponse.builder()
                .id(saved.getId())
                .code(saved.getTransactionCode())
                .partnerId(partner.getId())
                .partnerName(partner.getName())
                .amount(saved.getAmount())
                .status(saved.getStatus())
                .paymentMethod(saved.getPaymentMethod())
                .type(saved.getType())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPartnerPaymentHistory(Long partnerId) {
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + partnerId));

        return paymentTransactionRepository.findByPartnerIdOrderByCreatedAtDesc(partnerId)
                .stream()
                .map(txn -> PaymentResponse.builder()
                        .id(txn.getId())
                        .code(txn.getTransactionCode())
                        .partnerId(partner.getId())
                        .partnerName(partner.getName())
                        .amount(txn.getAmount())
                        .status(txn.getStatus())
                        .paymentMethod(txn.getPaymentMethod())
                        .type(txn.getType())
                        .createdAt(txn.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }
}
