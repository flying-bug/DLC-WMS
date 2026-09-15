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
@NoArgsConstructor
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Column(name = "po_code", nullable = false, unique = true, length = 50)
    private String poCode;

    @Column(name = "po_date", nullable = false)
    private LocalDate poDate;

    @Column(name = "status", nullable = false, length = 30)
    private String status = DocumentStatus.DRAFT.name(); // DRAFT | APPROVED | POSTED | CANCELLED

    @Column(name = "sub_total_amount", precision = 15, scale = 2)
    private BigDecimal subTotalAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 15, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "paid_amount", precision = 15, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "payment_status", length = 20)
    private String paymentStatus = "UNPAID"; // UNPAID | PARTIAL | PAID

    @Column(name = "payment_due_date")
    private LocalDate paymentDueDate;

    @Column(name = "expected_delivery_date")
    private LocalDate expectedDeliveryDate;

    /**
     * Đánh dấu đơn đã được kế toán chủ động "đóng hụt" - không chờ nhận thêm hàng
     * dù số lượng đã nhập chưa đủ so với đơn. Dùng flag riêng thay vì thêm trạng thái
     * mới vào {@link com.duylongtech.backend.enums.DocumentStatus} (enum dùng chung
     * cho 40+ nơi trong hệ thống) - đơn vẫn giữ status APPROVED như bình thường.
     */
    @Column(name = "is_short_closed")
    private Boolean isShortClosed = false;

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
    private List<PurchaseOrderLine> lines = new ArrayList<>();

    // --- DOMAIN METHODS ---

    public void initOrder(String code, Long partnerId, LocalDate poDate, LocalDate paymentDueDate, LocalDate expectedDeliveryDate, String note, Long creatorId) {
        if (this.poCode != null) {
            throw new com.duylongtech.backend.exception.BusinessException("Mã đơn hàng đã được khởi tạo");
        }
        this.poCode = code;
        this.partnerId = partnerId;
        this.poDate = poDate;
        this.paymentDueDate = paymentDueDate;
        this.expectedDeliveryDate = expectedDeliveryDate;
        this.note = note;
        this.createdBy = creatorId;
        this.status = DocumentStatus.DRAFT.name();
        this.paymentStatus = "UNPAID";
        this.paidAmount = BigDecimal.ZERO;
        this.subTotalAmount = BigDecimal.ZERO;
        this.taxAmount = BigDecimal.ZERO;
        this.totalAmount = BigDecimal.ZERO;
    }

    public void updateDetails(Long partnerId, LocalDate poDate, LocalDate paymentDueDate, LocalDate expectedDeliveryDate, String note) {
        if (!DocumentStatus.DRAFT.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được cập nhật thông tin khi đơn mua hàng ở trạng thái DRAFT");
        }
        if (partnerId != null) this.partnerId = partnerId;
        if (poDate != null) this.poDate = poDate;
        this.paymentDueDate = paymentDueDate;
        this.expectedDeliveryDate = expectedDeliveryDate;
        this.note = note;
    }

    // --- DOMAIN METHODS ---



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

    public void shortClose() {
        if (!DocumentStatus.APPROVED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ có thể đóng đơn hụt khi đơn đang ở trạng thái APPROVED");
        }
        if (Boolean.TRUE.equals(this.isShortClosed)) {
            throw new IllegalStateException("Đơn mua hàng đã được đóng hụt trước đó");
        }
        this.isShortClosed = true;
    }

    public void revertShortClose() {
        if (!Boolean.TRUE.equals(this.isShortClosed)) {
            throw new IllegalStateException("Đơn mua hàng chưa được đóng hụt");
        }
        this.isShortClosed = false;
    }
}
