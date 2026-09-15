package com.duylongtech.backend.feature.assembly;

import com.duylongtech.backend.enums.DocumentStatus;
import com.duylongtech.backend.enums.SettlementStatus;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.duylongtech.backend.feature.product.ProductVariant;

@Entity
@Table(name = "ASSEMBLY_ORDERS")
@Getter
@Setter
@NoArgsConstructor
public class AssemblyOrder {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(name = "row_version", nullable = false)
        private Long version = 0L;

    @Column(name = "order_code", nullable = false, unique = true, length = 50)
    @Setter(AccessLevel.NONE)
    private String orderCode;

    @Column(name = "order_type", nullable = false, length = 30)
    @Setter(AccessLevel.NONE)
    private String orderType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bom_id")
    private AssemblyBom bom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_variant_id", nullable = false)
    private ProductVariant targetVariant;

    @Column(name = "warehouse_id", nullable = false)
    private Long warehouseId;

    @Column(nullable = false, precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal quantity;

    @Column(name = "quantity_produced", nullable = false, precision = 15, scale = 4)
        @Setter(AccessLevel.NONE)
    private BigDecimal quantityProduced = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
        @Setter(AccessLevel.NONE)
    private String status = DocumentStatus.DRAFT.name();

    @Column(name = "execution_date", nullable = false)
    private LocalDate executionDate;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "submitted_by")
    private Long submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_by")
    private Long rejectedBy;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "cancel_requested_by")
    private Long cancelRequestedBy;

    @Column(name = "cancel_requested_at")
    private LocalDateTime cancelRequestedAt;

    @Column(name = "cancellation_reason", columnDefinition = "TEXT")
    private String cancellationReason;

    @Column(name = "cancel_confirmed_by")
    private Long cancelConfirmedBy;

    @Column(name = "cancel_confirmed_at")
    private LocalDateTime cancelConfirmedAt;

    @Column(name = "cancelled_by")
    private Long cancelledBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_settlement_status", nullable = false, length = 30)
        @Setter(AccessLevel.NONE)
    private String cancellationSettlementStatus = SettlementStatus.NONE.name();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "assemblyOrder", cascade = CascadeType.ALL, orphanRemoval = true)
        @Setter(AccessLevel.NONE)
    private List<AssemblyOrderLine> lines = new ArrayList<>();

    public void initOrder(String orderCode, String orderType, AssemblyBom bom, ProductVariant targetVariant, Long warehouseId, BigDecimal quantity, LocalDate executionDate, String note, Long creatorId) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }
        this.orderCode = orderCode;
        this.orderType = orderType;
        this.bom = bom;
        this.targetVariant = targetVariant;
        this.warehouseId = warehouseId;
        this.quantity = quantity;
        this.executionDate = executionDate != null ? executionDate : LocalDate.now();
        this.note = note;
        this.createdBy = creatorId;
        this.status = DocumentStatus.DRAFT.name();
        this.quantityProduced = BigDecimal.ZERO;
        this.cancellationSettlementStatus = SettlementStatus.NONE.name();
    }

    public void updateDetails(String orderCode, AssemblyBom bom, ProductVariant targetVariant, Long warehouseId, BigDecimal quantity, LocalDate executionDate, String note) {
        if (!DocumentStatus.DRAFT.name().equals(this.status) && !DocumentStatus.APPROVED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được sửa lệnh khi ở trạng thái DRAFT hoặc APPROVED");
        }
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Số lượng phải lớn hơn 0");
        }
        if (orderCode != null) {
            this.orderCode = orderCode;
        }
        this.bom = bom;
        this.targetVariant = targetVariant;
        this.warehouseId = warehouseId;
        this.quantity = quantity;
        this.executionDate = executionDate;
        this.note = note;
    }

    public void addLine(AssemblyOrderLine line) {
        line.setAssemblyOrder(this);
        this.lines.add(line);
    }

    public void clearLines() {
        this.lines.clear();
    }

    public void submitForApproval(Long submitterId) {
        if (!DocumentStatus.DRAFT.name().equals(this.status) && !DocumentStatus.REJECTED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được trình duyệt khi ở trạng thái DRAFT hoặc REJECTED");
        }
        this.status = DocumentStatus.PENDING_APPROVAL.name();
        this.submittedBy = submitterId;
        this.submittedAt = LocalDateTime.now();
    }

    public void approve(Long approverId) {
        if (!DocumentStatus.PENDING_APPROVAL.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được duyệt khi lệnh ở trạng thái PENDING_APPROVAL");
        }
        this.status = DocumentStatus.APPROVED.name();
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject(Long rejectorId, String reason) {
        if (!DocumentStatus.PENDING_APPROVAL.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được từ chối khi lệnh ở trạng thái PENDING_APPROVAL");
        }
        this.status = DocumentStatus.REJECTED.name();
        this.rejectedBy = rejectorId;
        this.rejectedAt = LocalDateTime.now();
        this.rejectionReason = reason;
    }

    public void requestCancel(Long requesterId, String reason) {
        if (DocumentStatus.POSTED.name().equals(this.status) || DocumentStatus.CANCELLED.name().equals(this.status)) {
            throw new IllegalStateException("Lệnh đã hoàn thành hoặc đã hủy thì không thể yêu cầu hủy");
        }
        this.cancelRequestedBy = requesterId;
        this.cancelRequestedAt = LocalDateTime.now();
        this.cancellationReason = reason;
        if (DocumentStatus.SUBMITTED.name().equals(this.status)) {
            this.status = DocumentStatus.CANCEL_REQUESTED.name();
            this.cancellationSettlementStatus = SettlementStatus.PENDING.name();
        } else {
            // DRAFT, PENDING_APPROVAL, APPROVED, REJECTED
            this.status = DocumentStatus.CANCELLED.name();
            this.cancelledBy = requesterId;
            this.cancelledAt = LocalDateTime.now();
            this.cancellationSettlementStatus = SettlementStatus.SETTLED.name();
        }
    }

    public void confirmCancel(Long confirmerId) {
        if (!DocumentStatus.CANCEL_REQUESTED.name().equals(this.status)) {
            throw new IllegalStateException("Không có yêu cầu hủy nào cần xác nhận");
        }
        this.status = DocumentStatus.CANCELLED.name();
        this.cancelConfirmedBy = confirmerId;
        this.cancelConfirmedAt = LocalDateTime.now();
        this.cancelledBy = confirmerId;
        this.cancelledAt = LocalDateTime.now();
        this.cancellationSettlementStatus = SettlementStatus.SETTLED.name();
    }

    public void markAsInProgress() {
        if (!DocumentStatus.APPROVED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ lệnh đã duyệt mới có thể bắt đầu thực hiện");
        }
        this.status = DocumentStatus.SUBMITTED.name();
    }
    
    public void markAsCompleted() {
        if (!DocumentStatus.SUBMITTED.name().equals(this.status)) {
            throw new IllegalStateException("Lệnh phải đang thực hiện mới có thể hoàn thành");
        }
        this.status = DocumentStatus.POSTED.name();
    }
    
    public void updateProducedQuantity(BigDecimal quantity) {
        this.quantityProduced = quantity;
    }
}
