package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PaymentResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.PaymentReceipt;
import com.duylongtech.backend.entity.PaymentVoucher;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerRepository;
import com.duylongtech.backend.repository.PaymentReceiptRepository;
import com.duylongtech.backend.repository.PaymentVoucherRepository;
import com.duylongtech.backend.service.CodeGeneratorService;
import com.duylongtech.backend.service.PartnerLedgerService;
import com.duylongtech.backend.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceImpl implements PaymentService {

    private final PaymentReceiptRepository paymentReceiptRepository;
    private final PaymentVoucherRepository paymentVoucherRepository;
    private final PartnerRepository partnerRepository;
    private final PartnerLedgerService partnerLedgerService;
    private final CodeGeneratorService codeGeneratorService;

    @Override
    @Transactional
    public PaymentResponse createPaymentReceipt(PaymentRequest request) {
        Partner partner = partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + request.getPartnerId()));

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Số tiền thu phải lớn hơn 0");
        }

        String code = codeGeneratorService.generateCode("PAYMENT_RECEIPTS", "receipt_code", "PT", 5);

        PaymentReceipt receipt = PaymentReceipt.builder()
                .receiptCode(code)
                .partnerId(partner.getId())
                .amount(request.getAmount())
                .status("POSTED")
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "BANK_TRANSFER")
                .createdAt(LocalDateTime.now())
                .build();

        PaymentReceipt saved = paymentReceiptRepository.save(receipt);

        // Ghi nhận vào Partner Ledger (Thu tiền = Giảm nợ)
        partnerLedgerService.recordLedger(
                partner.getId(),
                "PAYMENT_RECEIPT",
                saved.getId(),
                saved.getReceiptCode(),
                BigDecimal.ZERO,
                request.getAmount(),
                request.getNote() != null ? request.getNote() : "Lập phiếu thu tiền " + saved.getReceiptCode()
        );

        return PaymentResponse.builder()
                .id(saved.getId())
                .code(saved.getReceiptCode())
                .partnerId(partner.getId())
                .partnerName(partner.getName())
                .amount(saved.getAmount())
                .status(saved.getStatus())
                .paymentMethod(saved.getPaymentMethod())
                .type("RECEIPT")
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public PaymentResponse createPaymentVoucher(PaymentRequest request) {
        Partner partner = partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + request.getPartnerId()));

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Số tiền chi phải lớn hơn 0");
        }

        String code = codeGeneratorService.generateCode("PAYMENT_VOUCHERS", "voucher_code", "PC", 5);

        PaymentVoucher voucher = PaymentVoucher.builder()
                .voucherCode(code)
                .partnerId(partner.getId())
                .amount(request.getAmount())
                .status("POSTED")
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "BANK_TRANSFER")
                .createdAt(LocalDateTime.now())
                .build();

        PaymentVoucher saved = paymentVoucherRepository.save(voucher);

        // Ghi nhận vào Partner Ledger (Chi tiền trả NCC = Giảm nợ phải trả)
        partnerLedgerService.recordLedger(
                partner.getId(),
                "PAYMENT_VOUCHER",
                saved.getId(),
                saved.getVoucherCode(),
                BigDecimal.ZERO,
                request.getAmount(),
                request.getNote() != null ? request.getNote() : "Lập phiếu chi tiền " + saved.getVoucherCode()
        );

        return PaymentResponse.builder()
                .id(saved.getId())
                .code(saved.getVoucherCode())
                .partnerId(partner.getId())
                .partnerName(partner.getName())
                .amount(saved.getAmount())
                .status(saved.getStatus())
                .paymentMethod(saved.getPaymentMethod())
                .type("VOUCHER")
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPartnerPaymentHistory(Long partnerId) {
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + partnerId));

        List<PaymentResponse> list = new ArrayList<>();

        paymentReceiptRepository.findByPartnerIdOrderByCreatedAtDesc(partnerId).forEach(r -> 
            list.add(PaymentResponse.builder()
                    .id(r.getId())
                    .code(r.getReceiptCode())
                    .partnerId(partner.getId())
                    .partnerName(partner.getName())
                    .amount(r.getAmount())
                    .status(r.getStatus())
                    .paymentMethod(r.getPaymentMethod())
                    .type("RECEIPT")
                    .createdAt(r.getCreatedAt())
                    .build())
        );

        paymentVoucherRepository.findByPartnerIdOrderByCreatedAtDesc(partnerId).forEach(v -> 
            list.add(PaymentResponse.builder()
                    .id(v.getId())
                    .code(v.getVoucherCode())
                    .partnerId(partner.getId())
                    .partnerName(partner.getName())
                    .amount(v.getAmount())
                    .status(v.getStatus())
                    .paymentMethod(v.getPaymentMethod())
                    .type("VOUCHER")
                    .createdAt(v.getCreatedAt())
                    .build())
        );

        list.sort(Comparator.comparing(PaymentResponse::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return list;
    }
}
