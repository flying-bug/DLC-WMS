package com.duylongtech.backend.service.impl;

import com.duylongtech.backend.dto.request.PaymentRequest;
import com.duylongtech.backend.constant.SystemMessage;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
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
            throw new BusinessException(SystemMessage.PAY_ERR_006.getMessage());
        }
        Partner partner = partnerRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + request.getPartnerId()));

        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(ZERO) <= 0) {
            throw new BusinessException(SystemMessage.PAY_ERR_005.getMessage());
        }

        String paymentMethod = normalizePaymentMethod(request.getPaymentMethod());

        PaymentTransaction transaction = PaymentTransaction.builder()
                .transactionCode(codeGeneratorService.generateCode("PAYMENT_TRANSACTIONS", "transaction_code", prefix, 5))
                .type(type)
                .partnerId(partner.getId())
                .amount(amount)
                .status("DRAFT")
                .paymentMethod(paymentMethod)
                .note(trimToNull(request.getNote()))
                .createdAt(LocalDateTime.now())
                .build();

        PaymentTransaction saved = paymentTransactionRepository.save(transaction);
        return toResponse(saved, partner);
    }

    @Override
    @Transactional
    public PaymentResponse updatePayment(Long id, PaymentRequest request) {
        PaymentTransaction payment = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu thu/chi với ID: " + id));

        if (!"DRAFT".equals(payment.getStatus())) {
            throw new BusinessException("Chỉ có thể chỉnh sửa phiếu ở trạng thái Lưu tạm (DRAFT)");
        }

        Long partnerId = request != null && request.getPartnerId() != null ? request.getPartnerId() : payment.getPartnerId();
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác với ID: " + partnerId));

        BigDecimal amount = request != null && request.getAmount() != null ? request.getAmount() : payment.getAmount();
        if (amount == null || amount.compareTo(ZERO) <= 0) {
            throw new BusinessException(SystemMessage.PAY_ERR_005.getMessage());
        }

        String paymentMethod = request != null && request.getPaymentMethod() != null ? normalizePaymentMethod(request.getPaymentMethod()) : payment.getPaymentMethod();

        payment.setPartnerId(partner.getId());
        payment.setAmount(amount);
        payment.setPaymentMethod(paymentMethod);
        payment.setNote(request != null ? trimToNull(request.getNote()) : payment.getNote());
        payment.setStatus("DRAFT");

        PaymentTransaction saved = paymentTransactionRepository.save(payment);
        return toResponse(saved, partner);
    }

    @Override
    @Transactional
    public void deletePayment(Long id) {
        PaymentTransaction payment = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu thu/chi với ID: " + id));

        if (!"DRAFT".equals(payment.getStatus())) {
            throw new BusinessException("Chỉ có thể xóa phiếu ở trạng thái Lưu tạm (DRAFT)");
        }

        paymentTransactionRepository.delete(payment);
    }

    @Override
    @Transactional
    public PaymentResponse postPayment(Long id) {
        if (!canPostDirectly()) {
            throw new BusinessException("Chỉ Thủ quỹ hoặc Quản trị viên mới có quyền ghi sổ quỹ");
        }
        PaymentTransaction payment = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu thu/chi"));
        Partner partner = partnerRepository.findById(payment.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác"));

        if ("POSTED".equals(payment.getStatus())) {
            return toResponse(payment, partner);
        }
        if (!"DRAFT".equals(payment.getStatus())) {
            throw new BusinessException(SystemMessage.PAY_ERR_004.getMessage());
        }

        ensurePaymentDoesNotExceedDebt(payment.getPartnerId(), payment.getAmount());
        payment.setStatus("POSTED");
        PaymentTransaction saved = paymentTransactionRepository.save(payment);
        recordPostedPaymentLedger(saved, saved.getNote());
        return toResponse(saved, partner);
    }

    @Override
    @Transactional
    public PaymentResponse unpostPayment(Long id, String reason) {
        if (!canPostDirectly()) {
            throw new BusinessException("Chỉ Thủ quỹ hoặc Quản trị viên mới có quyền bỏ ghi sổ quỹ");
        }
        PaymentTransaction payment = paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Không tìm thấy phiếu thu/chi với ID: " + id));
        Partner partner = partnerRepository.findById(payment.getPartnerId())
                .orElseThrow(() -> new BusinessException("Không tìm thấy đối tác"));

        if (!"POSTED".equals(payment.getStatus())) {
            throw new BusinessException("Chỉ có thể bỏ ghi sổ cho phiếu đã ghi sổ quỹ (POSTED)");
        }

        // Hoàn tác công nợ trên sổ cái: ghi nợ ngược lại để khôi phục số dư nợ
        String rollbackRefType = "UNPOST_" + ("RECEIPT".equals(payment.getType()) ? "RECEIPT" : "VOUCHER");
        String cleanReason = reason != null && !reason.isBlank() ? reason.trim() : "Bỏ ghi sổ phiếu";
        String rollbackNote = "Bỏ ghi sổ " + ("RECEIPT".equals(payment.getType()) ? "phiếu thu " : "phiếu chi ")
                + payment.getTransactionCode() + " - Lý do: " + cleanReason;

        partnerLedgerService.recordLedger(
                payment.getPartnerId(),
                rollbackRefType,
                payment.getId(),
                payment.getTransactionCode(),
                payment.getAmount(),
                ZERO,
                rollbackNote
        );

        // Chuyển trạng thái phiếu về DRAFT (Chờ ghi sổ)
        payment.setStatus("DRAFT");
        PaymentTransaction saved = paymentTransactionRepository.save(payment);

        log.info("[Payment] Đã bỏ ghi sổ phiếu {}. Đưa về trạng thái DRAFT. Lý do: {}", 
                saved.getTransactionCode(), cleanReason);

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
            throw new BusinessException(SystemMessage.PAY_ERR_003.getMessage());
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
            throw new BusinessException(SystemMessage.PAY_ERR_002.getMessage());
        }
        return normalized;
    }

    private boolean canPostDirectly() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            String role = authority.getAuthority();
            if ("ROLE_CASHIER_CONTROLLER".equals(role)
                    || "ROLE_SUPER_ADMIN".equals(role)
                    || "ROLE_MANAGER".equals(role)
                    || "ROLE_ADMIN".equals(role)) {
                return true;
            }
        }
        return false;
    }


    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getAllPayments(String type, String status) {
        List<PaymentTransaction> list;
        if (type != null && !type.isBlank()) {
            list = paymentTransactionRepository.findByTypeOrderByCreatedAtDesc(type.trim().toUpperCase());
        } else {

            list = paymentTransactionRepository.findAllByOrderByCreatedAtDesc();
        }
        if (status != null && !status.isBlank()) {
            String s = status.trim().toUpperCase();
            list = list.stream().filter(p -> s.equalsIgnoreCase(p.getStatus())).collect(Collectors.toList());
        }
        return list.stream().map(p -> {
            Partner partner = p.getPartnerId() != null ? partnerRepository.findById(p.getPartnerId()).orElse(null) : null;
            if (partner == null) {
                partner = new Partner();
                partner.setId(p.getPartnerId());
                partner.setName(p.getPartnerId() != null ? ("Đối tác #" + p.getPartnerId()) : "Vãng lai");
            }
            return toResponse(p, partner);
        }).collect(Collectors.toList());
    }
}


