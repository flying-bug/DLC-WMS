package com.duylongtech.backend.feature.purchase_order;

import com.duylongtech.backend.enums.DocumentStatus;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.duylongtech.backend.feature.auth.User;
import com.duylongtech.backend.feature.partner.Partner;

/**
 * Đơn mua hàng từ nhà cung cấp (Purchase Order).
 * PO không gắn với kho cụ thể — kho sẽ được xác định
 * khi tạo phiếu nhập kho liên kết sau.
 */
@Entity
@Table(name = "PURCHASE_ORDERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Setter(AccessLevel.NONE)
    @Column(name = "po_code", nullable = false, unique = true, length = 50)
    private String poCode;

    @Column(name = "po_date", nullable = false)
    private LocalDate poDate;

    @Setter(AccessLevel.NONE)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = DocumentStatus.DRAFT.name(); // DRAFT | APPROVED | POSTED | CANCELLED

    @Setter(AccessLevel.NONE)
    @Column(name = "sub_total_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal subTotalAmount = BigDecimal.ZERO;

    @Setter(AccessLevel.NONE)
    @Column(name = "tax_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Setter(AccessLevel.NONE)
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Setter(AccessLevel.NONE)
    @Column(name = "paid_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Setter(AccessLevel.NONE)
    @Column(name = "payment_status", length = 20)
    @Builder.Default
    private String paymentStatus = "UNPAID"; // UNPAID | PARTIAL | PAID

    @Column(name = "payment_due_date")
    private LocalDate paymentDueDate;

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User createdByUser;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false,
            columnDefinition = "datetime(6) default CURRENT_TIMESTAMP(6)")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false,
            columnDefinition = "datetime(6) default CURRENT_TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL,
               orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<PurchaseOrderLine> lines = new ArrayList<>();

    // --- DOMAIN METHODS ---

    public void assignCreator(Long userId) {
        if (this.createdBy == null) {
            this.createdBy = userId;
        }
    }

    public void assignInitialCode(String code) {
        if (this.poCode == null) {
            this.poCode = code;
        }
    }

    public void initDraftStatus() {
        this.status = DocumentStatus.DRAFT.name();
        this.paymentStatus = "UNPAID";
        this.paidAmount = BigDecimal.ZERO;
    }

    public void clearLines() {
        if (this.lines != null) {
            this.lines.clear();
        }
        recalculateTotals();
    }

    public void addLine(PurchaseOrderLine line) {
        if (this.lines == null) {
            this.lines = new ArrayList<>();
        }
        line.calculateAmounts();
        line.setPurchaseOrder(this);
        line.setPurchaseOrderId(this.id); // might be null initially
        this.lines.add(line);
        recalculateTotals();
    }

    public void recalculateTotals() {
        BigDecimal subTotal = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;

        if (this.lines != null) {
            for (PurchaseOrderLine line : this.lines) {
                line.calculateAmounts();
                if (line.getLineAmount() != null) subTotal = subTotal.add(line.getLineAmount());
                if (line.getVatAmount() != null) tax = tax.add(line.getVatAmount());
            }
        }

        this.subTotalAmount = subTotal;
        this.taxAmount = tax;
        this.totalAmount = subTotal.add(tax);
    }

    public void approve() {
        if (!DocumentStatus.DRAFT.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ có thể duyệt đơn ở trạng thái DRAFT");
        }
        this.status = DocumentStatus.APPROVED.name();
    }

    public void cancel() {
        if (DocumentStatus.POSTED.name().equals(this.status) || DocumentStatus.APPROVED.name().equals(this.status) || DocumentStatus.CANCELLED.name().equals(this.status)) {
            throw new IllegalStateException("Không thể huỷ đơn mua hàng ở trạng thái hiện tại");
        }
        this.status = DocumentStatus.CANCELLED.name();
    }

    public void markAsPosted() {
        this.status = DocumentStatus.POSTED.name();
    }

    public void revertToApproved() {
        if (!DocumentStatus.POSTED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ có thể chuyển về APPROVED khi đang ở trạng thái POSTED");
        }
        this.status = DocumentStatus.APPROVED.name();
    }
}
