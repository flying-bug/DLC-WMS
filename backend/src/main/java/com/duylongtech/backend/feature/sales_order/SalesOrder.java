package com.duylongtech.backend.feature.sales_order;

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
import com.duylongtech.backend.feature.warehouse.Warehouse;

@Entity
@Table(name = "SALES_ORDERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", insertable = false, updatable = false)
    private Partner partner;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", insertable = false, updatable = false)
    private Warehouse warehouse;

    @Setter(AccessLevel.NONE)
    @Column(name = "so_code", nullable = false, unique = true, length = 50)
    private String soCode;

    @Column(name = "so_date", nullable = false)
    private LocalDate soDate;

    @Setter(AccessLevel.NONE)
    @Column(name = "status", nullable = false, length = 30)
    private String status;

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
    private BigDecimal totalAmount;

    @Setter(AccessLevel.NONE)
    @Column(name = "paid_amount", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Setter(AccessLevel.NONE)
    @Column(name = "payment_status", length = 20)
    @Builder.Default
    private String paymentStatus = "UNPAID";

    @Column(name = "payment_due_date")
    private LocalDate paymentDueDate;

    @Column(name = "delivery_address", length = 500)
    private String deliveryAddress;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Setter(AccessLevel.NONE)
    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", insertable = false, updatable = false)
    private User createdByUser;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false, columnDefinition = "datetime(6) default CURRENT_TIMESTAMP(6)")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false, columnDefinition = "datetime(6) default CURRENT_TIMESTAMP(6)")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "salesOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<SalesOrderLine> lines = new ArrayList<>();

    // --- Domain Logic ---

    public void assignCreator(Long userId) {
        if (this.createdBy == null) {
            this.createdBy = userId;
        }
    }

    public void assignInitialCode(String code) {
        if (this.soCode != null) {
            throw new com.duylongtech.backend.exception.BusinessException("Không được phép thay đổi mã chứng từ sau khi khởi tạo.");
        }
        this.soCode = code;
    }

    public void initDraftStatus() {
        this.status = com.duylongtech.backend.enums.DocumentStatus.DRAFT.name();
        this.paymentStatus = "UNPAID";
        this.paidAmount = BigDecimal.ZERO;
    }

    public void clearLines() {
        if (!com.duylongtech.backend.enums.DocumentStatus.DRAFT.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ được thay đổi chi tiết khi đơn ở trạng thái DRAFT");
        }
        this.lines.clear();
        recalculateTotals();
    }

    public void addLine(SalesOrderLine line) {
        if (!com.duylongtech.backend.enums.DocumentStatus.DRAFT.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ được thay đổi chi tiết khi đơn ở trạng thái DRAFT");
        }
        line.calculateAmounts();
        this.lines.add(line);
        line.setSalesOrder(this);
        if (this.id != null) {
            line.setSalesOrderId(this.id);
        }
        recalculateTotals();
    }

    private void recalculateTotals() {
        this.subTotalAmount = BigDecimal.ZERO;
        this.taxAmount = BigDecimal.ZERO;

        for (SalesOrderLine line : this.lines) {
            this.subTotalAmount = this.subTotalAmount.add(line.getLineAmount());
            this.taxAmount = this.taxAmount.add(line.getVatAmount());
        }
        this.totalAmount = this.subTotalAmount.add(this.taxAmount);
    }

    public void approve() {
        if (!com.duylongtech.backend.enums.DocumentStatus.DRAFT.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ được duyệt đơn ở trạng thái DRAFT");
        }
        if (this.lines.isEmpty()) {
            throw new com.duylongtech.backend.exception.BusinessException("Đơn hàng phải có ít nhất 1 sản phẩm");
        }
        this.status = com.duylongtech.backend.enums.DocumentStatus.APPROVED.name();
    }

    public void cancel() {
        if (com.duylongtech.backend.enums.DocumentStatus.POSTED.name().equals(this.status) || 
            com.duylongtech.backend.enums.DocumentStatus.CANCELLED.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Không thể hủy đơn hàng đã ghi sổ hoặc đã hủy");
        }
        this.status = com.duylongtech.backend.enums.DocumentStatus.CANCELLED.name();
    }

    public void recordPayment(BigDecimal amount) {
        if (com.duylongtech.backend.enums.DocumentStatus.CANCELLED.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Không thể thanh toán cho đơn hàng đã hủy");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new com.duylongtech.backend.exception.BusinessException("Số tiền thanh toán phải lớn hơn 0");
        }

        BigDecimal newPaidAmount = this.paidAmount.add(amount);
        if (newPaidAmount.compareTo(this.totalAmount) > 0) {
            throw new com.duylongtech.backend.exception.BusinessException("Số tiền thanh toán vượt quá tổng giá trị đơn hàng");
        }

        this.paidAmount = newPaidAmount;

        if (this.paidAmount.compareTo(this.totalAmount) >= 0) {
            this.paymentStatus = "PAID";
        } else if (this.paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            this.paymentStatus = "PARTIAL";
        } else {
            this.paymentStatus = "UNPAID";
        }
    }

    public void markAsPosted() {
        if (!com.duylongtech.backend.enums.DocumentStatus.APPROVED.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ đơn hàng đã APPROVED mới có thể POSTED");
        }
        this.status = com.duylongtech.backend.enums.DocumentStatus.POSTED.name();
    }

    public void revertToApproved() {
        if (!com.duylongtech.backend.enums.DocumentStatus.POSTED.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ đơn hàng POSTED mới có thể revert về APPROVED");
        }
        this.status = com.duylongtech.backend.enums.DocumentStatus.APPROVED.name();
    }
}
