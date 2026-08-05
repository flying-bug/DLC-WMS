package com.duylongtech.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PARTNER_LEDGER")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Column(name = "entity_type", nullable = false, length = 30)
    private String entityType; // SALES_ORDER, PURCHASE_ORDER, PAYMENT_RECEIPT, PAYMENT_VOUCHER, INVENTORY_IMPORT

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "reference_code", nullable = false, length = 50)
    private String referenceCode;

    @Column(name = "amount_debt", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal amountDebt = BigDecimal.ZERO;

    @Column(name = "amount_receipt", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal amountReceipt = BigDecimal.ZERO;

    @Column(name = "balance_after", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal balanceAfter = BigDecimal.ZERO;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
