package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.dto.response.PartnerLedgerResponse;
import com.duylongtech.backend.dto.response.PaymentResponse;
import com.duylongtech.backend.entity.Partner;
import com.duylongtech.backend.entity.PartnerLedger;
import com.duylongtech.backend.entity.PaymentTransaction;
import com.duylongtech.backend.exception.BusinessException;
import com.duylongtech.backend.repository.PartnerLedgerRepository;
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

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PartnerRepository partnerRepository;
    private final PartnerLedgerRepository partnerLedgerRepository;
    private final PartnerLedgerService partnerLedgerService;
    private final CodeGeneratorService codeGeneratorService;

    @Override
    @Transactional
    public PaymentResponse createPaymentReceipt(PaymentRequest request) {
        return processPayment(request, "RECEIPT", "PT");
    }

    @Override
    @Transactional
    public PaymentResponse createPaymentVoucher(PaymentRequest request) {
        return processPayment(request, "VOUCHER", "PC");
    }

    private PaymentResponse processPayment(PaymentRequest request, String type, String prefix) {
        if (request == null || request.getPartnerId() == null) {
            throw new BusinessException("Đối tác là bắt buộc");
        }
        Partner partner = partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + request.getPartnerId()));

        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(ZERO) <= 0) {
            throw new BusinessException("Số tiền giao dịch phải lớn hơn 0");
        }

        String status = normalizeStatus(request.getStatus());
        String paymentMethod = normalizePaymentMethod(request.getPaymentMethod());
        if ("POSTED".equals(status)) {
            ensurePaymentDoesNotExceedDebt(partner.getId(), amount);
        }

        PaymentTransaction transaction = PaymentTransaction.builder()
                .transactionCode(codeGeneratorService.generateCode("PAYMENT_TRANSACTIONS", "transaction_code", prefix, 5))
                .type(type)
                .partnerId(partner.getId())
                .amount(amount)
                .status(status)
                .paymentMethod(paymentMethod)
                .note(trimToNull(request.getNote()))
                .createdAt(LocalDateTime.now())
                .build();

        PaymentTransaction saved = paymentTransactionRepository.save(transaction);
        if ("POSTED".equals(saved.getStatus())) {
            recordPostedPaymentLedger(saved, saved.getNote());
        }
        return toResponse(saved, partner);
    }

    @Override
    @Transactional
    public PaymentResponse postPayment(Long id) {
        PaymentTransaction payment = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu thu/chi"));
        Partner partner = partnerRepository.findById(payment.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác"));

        if ("POSTED".equals(payment.getStatus())) {
            return toResponse(payment, partner);
        }
        if (!"DRAFT".equals(payment.getStatus())) {
            throw new BusinessException("Chỉ có thể ghi sổ phiếu ở trạng thái DRAFT");
        }

        ensurePaymentDoesNotExceedDebt(payment.getPartnerId(), payment.getAmount());
        payment.setStatus("POSTED");
        PaymentTransaction saved = paymentTransactionRepository.save(payment);
        recordPostedPaymentLedger(saved, saved.getNote());
        return toResponse(saved, partner);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getPartnerDebtBalance(Long partnerId) {
        if (partnerId == null) {
            return ZERO;
        }
        return partnerLedgerRepository.findTopByPartnerIdOrderByIdDesc(partnerId)
                .map(PartnerLedger::getBalanceAfter)
                .orElse(ZERO);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPartnerPaymentHistory(Long partnerId) {
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + partnerId));

        return paymentTransactionRepository.findByPartnerIdOrderByCreatedAtDesc(partnerId)
                .stream()
                .map(txn -> toResponse(txn, partner))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartnerLedgerResponse> getPartnerLedgerDetails(Long partnerId) {
        if (partnerId == null) {
            return List.of();
        }
        return partnerLedgerRepository.findByPartnerIdOrderByIdDesc(partnerId)
                .stream()
                .map(ledger -> PartnerLedgerResponse.builder()
                        .id(ledger.getId())
                        .partnerId(ledger.getPartnerId())
                        .entityType(ledger.getEntityType())
                        .entityId(ledger.getEntityId())
                        .referenceCode(ledger.getReferenceCode())
                        .amountDebt(ledger.getAmountDebt())
                        .amountReceipt(ledger.getAmountReceipt())
                        .balanceAfter(ledger.getBalanceAfter())
                        .note(ledger.getNote())
                        .createdAt(ledger.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    private void recordPostedPaymentLedger(PaymentTransaction payment, String note) {
        String ledgerRefType = "RECEIPT".equals(payment.getType()) ? "PAYMENT_RECEIPT" : "PAYMENT_VOUCHER";
        String defaultNote = ("RECEIPT".equals(payment.getType()) ? "Lập phiếu thu tiền " : "Lập phiếu chi tiền ")
                + payment.getTransactionCode();

        partnerLedgerService.recordLedger(
                payment.getPartnerId(),
                ledgerRefType,
                payment.getId(),
                payment.getTransactionCode(),
                ZERO,
                payment.getAmount(),
                note != null && !note.isBlank() ? note : defaultNote
        );
    }

    private void ensurePaymentDoesNotExceedDebt(Long partnerId, BigDecimal amount) {
        BigDecimal currentDebt = getPartnerDebtBalance(partnerId);
        if (amount.compareTo(currentDebt) > 0) {
            throw new BusinessException("Số tiền thu/chi không được vượt quá số công nợ hiện tại");
        }
    }

    private PaymentResponse toResponse(PaymentTransaction payment, Partner partner) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .code(payment.getTransactionCode())
                .partnerId(partner.getId())
                .partnerName(partner.getName())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .paymentMethod(payment.getPaymentMethod())
                .type(payment.getType())
                .note(payment.getNote())
                .createdAt(payment.getCreatedAt())
                .partnerDebtBalance(getPartnerDebtBalance(partner.getId()))
                .build();
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "CASH";
        }
        String normalized = paymentMethod.trim().toUpperCase();
        if (!"CASH".equals(normalized) && !"BANK_TRANSFER".equals(normalized)) {
            throw new BusinessException("Phương thức thanh toán chỉ chấp nhận CASH hoặc BANK_TRANSFER");
        }
        return normalized;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return "POSTED";
        }
        String normalized = status.trim().toUpperCase();
        if (!"DRAFT".equals(normalized) && !"POSTED".equals(normalized)) {
            throw new BusinessException("Trạng thái phiếu thu/chi chỉ chấp nhận DRAFT hoặc POSTED");
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
