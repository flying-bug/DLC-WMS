package com.duylongtech.backend.feature.repair;

import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.warranty.Warranty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "REPAIRS")
@Getter
@Setter
@NoArgsConstructor
public class Repair {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter(AccessLevel.NONE)
    @Column(name = "repair_code", nullable = false, unique = true, length = 50)
    private String repairCode;

    @Column(name = "partner_id", nullable = false) private Long partnerId;
    @Column(name = "product_id") private Long productId;
    @Column(name = "product_variant_id") private Long productVariantId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_variant_id", insertable = false, updatable = false)
    private ProductVariant productVariant;
    @Column(name = "manual_device_name", length = 255) private String manualDeviceName;
    @Column(name = "manual_device_identifier", length = 255) private String manualDeviceIdentifier;
    @Column(name = "external_device_status", length = 255) private String externalDeviceStatus;
    @Column(name = "product_quantity") private Integer productQuantity = 1;
    @Column(name = "product_unit", length = 50) private String productUnit;
    @Column(name = "warehouse_id") private Long warehouseId;
    @Column(name = "scrap_warehouse_id") private Long scrapWarehouseId;
    @Column(name = "assigned_technician_id") private Long assignedTechnicianId;
    @Column(name = "serial_number_id") private Long serialNumberId;
    @Column(name = "warranty_id") private Long warrantyId;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", insertable = false, updatable = false)
    private Warranty warranty;

    @Column(name = "reference_type", length = 50) private String referenceType;
    @Column(name = "reference_id") private Long referenceId;
    @Column(name = "reference_code", length = 100) private String referenceCode;
    @Column(name = "received_date", nullable = false) private LocalDate receivedDate;
    @Column(name = "expected_date") private LocalDate expectedDate;
    @Column(name = "completed_date") private LocalDate completedDate;

    @Setter(AccessLevel.NONE)
    @Column(name = "repair_status", nullable = false, length = 30)
    private String repairStatus;
    @Column(name = "repair_outcome", length = 30) private String repairOutcome;

    @Column(name = "issue_description", columnDefinition = "TEXT") private String issueDescription;
    @Column(name = "diagnosis_note", columnDefinition = "TEXT") private String diagnosisNote;
    @Column(name = "internal_notes", columnDefinition = "TEXT") private String internalNotes;
    @Column(name = "solution_description", columnDefinition = "TEXT") private String solutionDescription;

    @Column(name = "under_warranty", nullable = false) private Boolean underWarranty = false;
    @Column(name = "fee_policy", length = 20) private String feePolicy;
    @Column(name = "customer_share_percent", precision = 5, scale = 2) private BigDecimal customerSharePercent;
    @Column(name = "repair_warranty_end_date") private LocalDate repairWarrantyEndDate;
    @Column(name = "invoice_method", nullable = false, length = 30) private String invoiceMethod = "after_repair";

    @Setter(AccessLevel.NONE)
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal totalAmount = BigDecimal.ZERO;
    @Setter(AccessLevel.NONE)
    @Column(name = "customer_pay_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal customerPayAmount = BigDecimal.ZERO;
    @Setter(AccessLevel.NONE)
    @Column(name = "company_covered_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal companyCoveredAmount = BigDecimal.ZERO;
    @Column(name = "fee_adjusted_by") private Long feeAdjustedBy;
    @Column(name = "fee_adjusted_at") private LocalDateTime feeAdjustedAt;
    @Column(name = "fee_adjustment_reason", columnDefinition = "TEXT") private String feeAdjustmentReason;
    @Column(name = "repair_cost", precision = 15, scale = 2) private BigDecimal repairCost = BigDecimal.ZERO;

    @Column(name = "qc_result", length = 50) private String qcResult;
    @Column(name = "qc_note", columnDefinition = "TEXT") private String qcNote;
    @Column(name = "qc_checklist", columnDefinition = "TEXT") private String qcChecklist;
    @Column(name = "technical_completed_at") private LocalDateTime technicalCompletedAt;
    @Column(name = "technical_completed_by") private Long technicalCompletedBy;
    @Column(name = "payment_status", length = 50) private String paymentStatus = "UNPAID";

    /** Kept temporarily for old reports; authorization uses assignedTechnicianId. */
    @Column(name = "responsible_person", length = 255) private String responsiblePerson;
    @Column(name = "note", columnDefinition = "TEXT") private String note;
    @Column(name = "created_by") private Long createdBy;
    @Column(name = "approved_by") private Long approvedBy;

    @Column(name = "reject_reason", columnDefinition = "TEXT") private String rejectReason;
    @Column(name = "rejected_at") private LocalDateTime rejectedAt;
    @Column(name = "rejected_by") private Long rejectedBy;
    @Column(name = "submitted_at") private LocalDateTime submittedAt;
    @Column(name = "submitted_by") private Long submittedBy;
    @Column(name = "accepted_at") private LocalDateTime acceptedAt;
    @Column(name = "accepted_by") private Long acceptedBy;
    @Column(name = "completed_at") private LocalDateTime completedAt;
    @Column(name = "completed_by") private Long completedBy;
    @Column(name = "cancel_reason", columnDefinition = "TEXT") private String cancelReason;
    @Column(name = "cancelled_at") private LocalDateTime cancelledAt;
    @Column(name = "cancelled_by") private Long cancelledBy;
    @Column(name = "returned_at") private LocalDateTime returnedAt;
    @Column(name = "returned_by") private Long returnedBy;
    @Column(name = "recipient_name", length = 150) private String recipientName;
    @Column(name = "recipient_phone", length = 20) private String recipientPhone;
    @Column(name = "return_note", columnDefinition = "TEXT") private String returnNote;
    @Column(name = "handover_code", length = 50) private String handoverCode;

    @CreationTimestamp @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at") private LocalDateTime updatedAt;
    @Version @Column(name = "version", nullable = false) private Integer version = 0;

    @OneToMany(mappedBy = "repair", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RepairLine> repairLines = new ArrayList<>();
    @OneToMany(mappedBy = "repair", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RepairFee> fees = new ArrayList<>();

    public void initOrder(String repairCode, Long partnerId, Long productId, Long productVariantId, Integer productQuantity,
            String productUnit, Long warehouseId, Long serialNumberId, Long warrantyId,
            String referenceType, Long referenceId, String referenceCode, LocalDate receivedDate,
            LocalDate expectedDate, String issueDescription, String diagnosisNote, Boolean underWarranty,
            LocalDate repairWarrantyEndDate, String invoiceMethod, String responsiblePerson, String note,
            Long createdBy, String externalDeviceStatus) {
        this.repairCode = repairCode;
        this.partnerId = partnerId;
        this.productId = productId;
        this.productVariantId = productVariantId;
        this.productQuantity = productQuantity != null ? productQuantity : 1;
        this.productUnit = productUnit;
        this.warehouseId = warehouseId;
        this.serialNumberId = serialNumberId;
        this.warrantyId = warrantyId;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.referenceCode = referenceCode;
        this.receivedDate = receivedDate != null ? receivedDate : LocalDate.now();
        this.expectedDate = expectedDate;
        this.repairStatus = RepairStatus.DRAFT.name();
        this.issueDescription = issueDescription;
        this.diagnosisNote = diagnosisNote;
        this.underWarranty = Boolean.TRUE.equals(underWarranty);
        this.feePolicy = this.underWarranty ? "WARRANTY" : "PAID";
        this.customerSharePercent = this.underWarranty ? BigDecimal.ZERO : BigDecimal.valueOf(100);
        this.repairWarrantyEndDate = repairWarrantyEndDate;
        this.invoiceMethod = invoiceMethod != null ? invoiceMethod : "after_repair";
        this.responsiblePerson = responsiblePerson;
        this.note = note;
        this.createdBy = createdBy;
        this.externalDeviceStatus = externalDeviceStatus;
    }

    public void updateDetails(Long partnerId, Long productId, Long productVariantId, Integer productQuantity, String productUnit,
            Long warehouseId, Long serialNumberId, Long warrantyId, String referenceType, Long referenceId,
            String referenceCode, LocalDate receivedDate, LocalDate expectedDate, String issueDescription,
            String diagnosisNote, String internalNotes, Boolean newWarranty, LocalDate repairWarrantyEndDate,
            String invoiceMethod, String responsiblePerson, String note, String externalDeviceStatus) {
        if (partnerId != null) this.partnerId = partnerId;
        if (productId != null) this.productId = productId;
        if (productVariantId != null) this.productVariantId = productVariantId;
        if (productQuantity != null) this.productQuantity = productQuantity;
        if (productUnit != null) this.productUnit = productUnit;
        if (warehouseId != null) this.warehouseId = warehouseId;
        if (serialNumberId != null) this.serialNumberId = serialNumberId;
        if (warrantyId != null) this.warrantyId = warrantyId;
        if (referenceType != null) this.referenceType = referenceType;
        if (referenceId != null) this.referenceId = referenceId;
        if (referenceCode != null) this.referenceCode = referenceCode;
        if (receivedDate != null) this.receivedDate = receivedDate;
        if (expectedDate != null) this.expectedDate = expectedDate;
        if (issueDescription != null) this.issueDescription = issueDescription;
        if (diagnosisNote != null) this.diagnosisNote = diagnosisNote;
        if (internalNotes != null) this.internalNotes = internalNotes;
        if (newWarranty != null) {
            this.underWarranty = newWarranty;
            this.feePolicy = newWarranty ? "WARRANTY" : "PAID";
            this.customerSharePercent = newWarranty ? BigDecimal.ZERO : BigDecimal.valueOf(100);
        }
        if (repairWarrantyEndDate != null) this.repairWarrantyEndDate = repairWarrantyEndDate;
        if (invoiceMethod != null) this.invoiceMethod = invoiceMethod;
        if (responsiblePerson != null) this.responsiblePerson = responsiblePerson;
        if (note != null) this.note = note;
        if (externalDeviceStatus != null) this.externalDeviceStatus = externalDeviceStatus;
    }

    public void configureWorkflow(Long technicianId, String policy, BigDecimal sharePercent,
            String manualDeviceName, String manualDeviceIdentifier, Long actorId, String adjustmentReason) {
        boolean changed = feePolicy != null && (!feePolicy.equals(policy)
                || customerSharePercent == null || customerSharePercent.compareTo(sharePercent) != 0);
        assignedTechnicianId = technicianId;
        feePolicy = policy;
        customerSharePercent = sharePercent;
        underWarranty = "WARRANTY".equals(policy);
        this.manualDeviceName = manualDeviceName;
        this.manualDeviceIdentifier = manualDeviceIdentifier;
        if (changed) {
            feeAdjustedBy = actorId;
            feeAdjustedAt = LocalDateTime.now();
            feeAdjustmentReason = adjustmentReason;
        }
    }

    public void assign(Long technicianId, Long actorId) {
        requireStatus(RepairStatus.DRAFT);
        if (technicianId == null) {
            throw new IllegalArgumentException("Kỹ thuật viên không được để trống");
        }
        this.assignedTechnicianId = technicianId;
        this.repairStatus = RepairStatus.DIAGNOSING.name();
        this.submittedBy = actorId;
        this.submittedAt = LocalDateTime.now();
    }

    public void submitQuotation(Long actorId) {
        requireStatus(RepairStatus.DIAGNOSING);
        if (Boolean.TRUE.equals(this.underWarranty)) {
            this.repairStatus = RepairStatus.UNDER_REPAIR.name();
        } else {
            this.repairStatus = RepairStatus.QUOTATION_PENDING.name();
        }
    }

    public void approve(Long actorId, Long resolvedScrapWarehouseId) {
        requireStatus(RepairStatus.QUOTATION_PENDING);
        this.scrapWarehouseId = resolvedScrapWarehouseId;
        this.repairStatus = RepairStatus.APPROVED.name();
        this.approvedBy = actorId;
        this.acceptedAt = LocalDateTime.now(); // Dùng trường này tạm cho approved time
        this.acceptedBy = actorId;
    }

    public void decline(Long actorId, String reason) {
        requireStatus(RepairStatus.QUOTATION_PENDING);
        this.repairStatus = RepairStatus.READY_FOR_DELIVERY.name();
        this.rejectReason = reason;
        this.rejectedBy = actorId;
        this.rejectedAt = LocalDateTime.now();
    }

    public void markUnderRepair() {
        if (!RepairStatus.APPROVED.name().equals(this.repairStatus) && !RepairStatus.DIAGNOSING.name().equals(this.repairStatus)) {
             throw new IllegalStateException("Trạng thái lệnh sửa chữa không hợp lệ");
        }
        this.repairStatus = RepairStatus.UNDER_REPAIR.name();
    }

    public void markWaitingForParts() {
        if (!RepairStatus.APPROVED.name().equals(this.repairStatus) && !RepairStatus.DIAGNOSING.name().equals(this.repairStatus)) {
             throw new IllegalStateException("Trạng thái lệnh sửa chữa không hợp lệ");
        }
        this.repairStatus = RepairStatus.WAITING_FOR_PARTS.name();
    }

    /**
     * Dùng khi bỏ ghi sổ phiếu xuất kho (unpost PARTS_EXPORT).
     * Không kiểm tra trạng thái vì đây là rollback.
     */
    public void rollbackToApproved() {
        this.repairStatus = RepairStatus.APPROVED.name();
    }

    public void completeRepair(Long actorId, String outcome) {
        completeRepair(actorId, outcome, null, null, null);
    }

    public void completeRepair(Long actorId, String outcome, String qcResult, String qcNote, String qcChecklist) {
        requireStatus(RepairStatus.UNDER_REPAIR);
        this.repairStatus = RepairStatus.READY_FOR_DELIVERY.name();
        if (outcome != null) this.repairOutcome = outcome;
        this.qcResult = qcResult;
        this.qcNote = qcNote;
        this.qcChecklist = qcChecklist;
        this.technicalCompletedAt = LocalDateTime.now();
        this.technicalCompletedBy = actorId;
        this.completedBy = actorId;
        this.completedAt = LocalDateTime.now();

        this.updatedAt = LocalDateTime.now();
    }

    public void closeRepair(Long actorId) {
        closeRepair(actorId, null);
    }

    public void closeRepair(Long actorId, String paymentStatus) {
        requireStatus(RepairStatus.READY_FOR_DELIVERY);
        this.repairStatus = RepairStatus.CLOSED.name();
        if (paymentStatus != null) {
            this.paymentStatus = paymentStatus;
        }

        this.updatedAt = LocalDateTime.now();
        snapshotFinancials();
    }

    public void cancel(Long actorId, String reason) {
        if (RepairStatus.CLOSED.name().equals(repairStatus) || RepairStatus.CANCELLED.name().equals(repairStatus)) {
            throw new IllegalStateException("Không thể hủy lệnh đã hoàn thành hoặc đã hủy");
        }
        repairStatus = RepairStatus.CANCELLED.name();
        cancelledBy = actorId;
        cancelledAt = LocalDateTime.now();
        cancelReason = reason;
    }

    public void markReturned(Long actorId, String code, String name, String phone, String note) {
        requireStatus(RepairStatus.CLOSED);
        if (returnedAt != null) return;
        returnedBy = actorId;
        returnedAt = LocalDateTime.now();
        handoverCode = code;
        recipientName = name;
        recipientPhone = phone;
        returnNote = note;
    }

    public void recalculateTotalAmount() {
        BigDecimal lineTotal = repairLines.stream()
                .filter(l -> "ADD".equals(l.getActionType()) || "REPLACE".equals(l.getActionType()))
                .map(l -> (l.getIsFreeWarranty() != null && l.getIsFreeWarranty()) ? BigDecimal.ZERO : withVat(l.getUnitPrice(), l.getQuantity(), l.getVatPercent()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal feeTotal = fees.stream()
                .map(f -> (f.getIsFreeWarranty() != null && f.getIsFreeWarranty()) ? BigDecimal.ZERO : withVat(f.getFeeAmount(), f.getQuantity(), f.getVatPercent()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        totalAmount = lineTotal.add(feeTotal);
    }

    public void snapshotFinancials() {
        BigDecimal percent = customerSharePercent != null ? customerSharePercent : BigDecimal.ZERO;
        customerPayAmount = totalAmount.multiply(percent)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        companyCoveredAmount = totalAmount.subtract(customerPayAmount);
    }

    public void applyWarrantyZeroPrice() {
        repairLines.forEach(RepairLine::applyWarrantyZeroPrice);
        fees.forEach(RepairFee::applyWarrantyZeroPrice);
        recalculateTotalAmount();
    }

    public void addLine(RepairLine line) { repairLines.add(line); recalculateTotalAmount(); }
    public void removeLine(RepairLine line) { repairLines.remove(line); recalculateTotalAmount(); }
    public void addFee(RepairFee fee) { fees.add(fee); recalculateTotalAmount(); }
    public void removeFee(RepairFee fee) { fees.remove(fee); recalculateTotalAmount(); }

    private BigDecimal withVat(BigDecimal price, BigDecimal quantity, BigDecimal vatPercent) {
        BigDecimal amount = value(price).multiply(quantity != null ? quantity : BigDecimal.ONE);
        return amount.add(amount.multiply(value(vatPercent)).divide(BigDecimal.valueOf(100)));
    }

    private BigDecimal value(BigDecimal value) { return value != null ? value : BigDecimal.ZERO; }

    private void requireStatus(RepairStatus expected) {
        if (!expected.name().equals(repairStatus)) {
            throw new IllegalStateException("Trạng thái lệnh sửa chữa không hợp lệ");
        }
    }
}

