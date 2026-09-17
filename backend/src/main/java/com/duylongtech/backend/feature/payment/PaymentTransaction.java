package com.duylongtech.backend.feature.payment;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.duylongtech.backend.feature.partner.Partner;

@Entity
@Table(name = "PAYMENT_TRANSACTIONS")
@Getter
@Setter
@NoArgsConstructor
public class PaymentTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_code", nullable = false, unique = true, length = 50)
    private String transactionCode;

    @Column(name = "type", nullable = false, length = 20)
    private String type; // RECEIPT or VOUCHER

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public void initTransaction(String transactionCode, String type, Long partnerId, BigDecimal amount, String status, String paymentMethod, String note) {
        this.transactionCode = transactionCode;
        this.type = type;
        this.partnerId = partnerId;
        this.amount = amount;
        this.status = status;
        this.paymentMethod = paymentMethod;
        this.note = note;
        this.createdAt = LocalDateTime.now();
    }

    public void linkReference(String referenceType, Long referenceId, String idempotencyKey, Long createdBy) {
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.idempotencyKey = idempotencyKey;
        this.createdBy = createdBy;
    }
}
