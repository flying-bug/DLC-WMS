package com.duylongtech.backend.feature.repair;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import com.duylongtech.backend.enums.RepairStatus;
import com.duylongtech.backend.feature.partner.Partner;
import com.duylongtech.backend.feature.product.ProductVariant;
import com.duylongtech.backend.feature.warranty.Warranty;

/**
 * Entity cho Lệnh Sửa Chữa (Repair Order).
 * State Machine: DRAFT -> QUOTATION -> CONFIRMED -> UNDER_REPAIR -> DONE
 *                                                                  -> CANCELLED (từ bất kỳ trạng thái nào trừ DONE)
 * Áp dụng Optimistic Locking (@Version) theo yêu cầu Constitution.
 */
@Entity
@Table(name = "REPAIRS")
@Getter
@Setter
@NoArgsConstructor
public class Repair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter(AccessLevel.NONE)
    @Column(name = "repair_code", nullable = false, unique = true, length = 50)
    private String repairCode;

    // Liên kết khách hàng (bắt buộc trước khi CONFIRMED)
    @Column(name = "partner_id", nullable = false)
    private Long partnerId;

    // Sản phẩm/thiết bị đang sửa (bắt buộc)
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "product_variant_id")
    private Long productVariantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_variant_id", insertable = false, updatable = false)
    private ProductVariant productVariant;

    @Column(name = "product_quantity")
    private Integer productQuantity = 1;

    @Column(name = "product_unit", length = 50)
    private String productUnit;

    // Kho thực hiện lệnh sửa chữa
    @Column(name = "warehouse_id")
    private Long warehouseId;

    // Serial của thiết bị đang sửa (nullable - thiết bị ngoài không có serial)
    @Column(name = "serial_number_id")
    private Long serialNumberId;

    // Liên kết warranty cũ (nullable - backward compatibility)
    @Column(name = "warranty_id")
    private Long warrantyId;

    // Tham chiếu chứng từ tổng quát (giống bên xuất kho)
    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    // Ngày tiếp nhận
    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    // Ngày dự kiến hoàn tất
    @Column(name = "expected_date")
    private LocalDate expectedDate;

    // Ngày hoàn tất thực tế
    @Column(name = "completed_date")
    private LocalDate completedDate;

    // Trạng thái state machine
    @Setter(AccessLevel.NONE)
    @Column(name = "repair_status", nullable = false, length = 30)
    private String repairStatus;

    // Mô tả lỗi
    @Column(name = "issue_description", columnDefinition = "TEXT")
    private String issueDescription;

    // Ghi chú chẩn đoán
    @Column(name = "diagnosis_note", columnDefinition = "TEXT")
    private String diagnosisNote;

    // Ghi chú nội bộ
    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    // Mô tả giải pháp
    @Column(name = "solution_description", columnDefinition = "TEXT")
    private String solutionDescription;

    // Có đang trong hạn bảo hành máy không
    @Column(name = "under_warranty", nullable = false)
    private Boolean underWarranty = false;

    // Hạn bảo hành sau sửa chữa (nếu có)
    @Column(name = "repair_warranty_end_date")
    private LocalDate repairWarrantyEndDate;

    // Phương thức xuất hóa đơn
    @Column(name = "invoice_method", nullable = false, length = 30)
    private String invoiceMethod = "after_repair";

    @Setter(AccessLevel.NONE)
    @Column(name = "total_amount", nullable = false, precision = 15, scale = 4)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    // Chi phí sửa chữa cũ (backward compat)
    @Column(name = "repair_cost", precision = 15, scale = 2)
    private BigDecimal repairCost = BigDecimal.ZERO;

    // Người chịu trách nhiệm (Kỹ thuật viên)
    @Column(name = "responsible_person", length = 255)
    private String responsiblePerson;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @OneToMany(mappedBy = "repair", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private java.util.List<RepairLine> repairLines = new java.util.ArrayList<>();
    @Column(name = "approved_by")
    private Long approvedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Optimistic Locking - bắt buộc theo Constitution để tránh Lost Update.
     */
    @Version
    @Column(name = "version", nullable = false)
    private Integer version = 0;



    // Quan hệ với REPAIR_FEES
    @OneToMany(mappedBy = "repair", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RepairFee> fees = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warranty_id", insertable = false, updatable = false)
    private Warranty warranty;

    public void initOrder(String repairCode, Long partnerId, Long productId, Long productVariantId, Integer productQuantity, String productUnit, Long warehouseId, Long serialNumberId, Long warrantyId, String referenceType, Long referenceId, String referenceCode, LocalDate receivedDate, LocalDate expectedDate, String issueDescription, String diagnosisNote, Boolean underWarranty, LocalDate repairWarrantyEndDate, String invoiceMethod, String responsiblePerson, String note, Long createdBy) {
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
        this.underWarranty = underWarranty != null ? underWarranty : false;
        this.repairWarrantyEndDate = repairWarrantyEndDate;
        this.invoiceMethod = invoiceMethod != null ? invoiceMethod : "after_repair";
        this.responsiblePerson = responsiblePerson;
        this.note = note;
        this.createdBy = createdBy;
        this.totalAmount = BigDecimal.ZERO;
        this.repairCost = BigDecimal.ZERO;
    }

    public void updateDetails(Long partnerId, Long productId, Long productVariantId, Integer productQuantity, String productUnit, Long warehouseId, Long serialNumberId, Long warrantyId, String referenceType, Long referenceId, String referenceCode, LocalDate receivedDate, LocalDate expectedDate, String issueDescription, String diagnosisNote, String internalNotes, Boolean newWarranty, LocalDate repairWarrantyEndDate, String invoiceMethod, String responsiblePerson, String note) {
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
            boolean oldWarranty = Boolean.TRUE.equals(this.underWarranty);
            this.underWarranty = newWarranty;
            if (!oldWarranty && newWarranty) {
                applyWarrantyZeroPrice();
            }
        }
        if (repairWarrantyEndDate != null) this.repairWarrantyEndDate = repairWarrantyEndDate;
        if (invoiceMethod != null) this.invoiceMethod = invoiceMethod;
        if (responsiblePerson != null) this.responsiblePerson = responsiblePerson;
        if (note != null) this.note = note;
    }

    public void recalculateTotalAmount() {
        BigDecimal lineTotal = this.repairLines.stream()
                .filter(l -> "ADD".equals(l.getActionType()) || "REPLACE".equals(l.getActionType()))
                .map(l -> {
                    BigDecimal qty = l.getQuantity() != null ? l.getQuantity() : BigDecimal.ZERO;
                    BigDecimal amount = l.getUnitPrice().multiply(qty);
                    BigDecimal vat = l.getVatPercent() != null ? l.getVatPercent() : BigDecimal.ZERO;
                    BigDecimal vatAmount = amount.multiply(vat).divide(BigDecimal.valueOf(100));
                    return amount.add(vatAmount);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal feeTotal = this.fees.stream()
                .map(f -> {
                    BigDecimal qty = f.getQuantity() != null ? f.getQuantity() : BigDecimal.ONE;
                    BigDecimal amount = f.getFeeAmount().multiply(qty);
                    BigDecimal vat = f.getVatPercent() != null ? f.getVatPercent() : BigDecimal.ZERO;
                    BigDecimal vatAmount = amount.multiply(vat).divide(BigDecimal.valueOf(100));
                    return amount.add(vatAmount);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.totalAmount = lineTotal.add(feeTotal);
    }

    public void applyWarrantyZeroPrice() {
        if (this.repairLines != null) {
            for (RepairLine line : this.repairLines) {
                line.applyWarrantyZeroPrice();
            }
        }
        if (this.fees != null) {
            for (RepairFee fee : this.fees) {
                fee.applyWarrantyZeroPrice();
            }
        }
        recalculateTotalAmount();
    }

    public void addLine(RepairLine line) {
        this.repairLines.add(line);
        recalculateTotalAmount();
    }

    public void removeLine(RepairLine line) {
        this.repairLines.remove(line);
        recalculateTotalAmount();
    }

    public void addFee(RepairFee fee) {
        this.fees.add(fee);
        recalculateTotalAmount();
    }

    public void removeFee(RepairFee fee) {
        this.fees.remove(fee);
        recalculateTotalAmount();
    }

    public void moveToQuotation() {
        if (!RepairStatus.DRAFT.name().equals(this.repairStatus)
                && !RepairStatus.CONFIRMED.name().equals(this.repairStatus)
                && !RepairStatus.UNDER_REPAIR.name().equals(this.repairStatus)
                && !RepairStatus.WAITING_FOR_APPROVAL.name().equals(this.repairStatus)) {
            throw new IllegalStateException("Không thể chuyển trạng thái sang Báo Giá");
        }
        this.repairStatus = RepairStatus.QUOTATION.name();
    }

    public void sendForApproval() {
        if (!RepairStatus.QUOTATION.name().equals(this.repairStatus)) {
            throw new IllegalStateException("Chỉ có thể gửi duyệt khi ở trạng thái Báo Giá");
        }
        this.repairStatus = RepairStatus.WAITING_FOR_APPROVAL.name();
    }

    public void reject(String reason) {
        if (!RepairStatus.WAITING_FOR_APPROVAL.name().equals(this.repairStatus)) {
            throw new IllegalStateException("Chỉ có thể từ chối khi ở trạng thái Chờ duyệt");
        }
        this.repairStatus = RepairStatus.QUOTATION.name();
        if (reason != null) {
            this.note = this.note != null ? this.note + "\nLý do từ chối: " + reason : "Lý do từ chối: " + reason;
        }
    }

    public void confirm() {
        if (!RepairStatus.WAITING_FOR_APPROVAL.name().equals(this.repairStatus)) {
            throw new IllegalStateException("Chỉ có thể xác nhận khi ở trạng thái Chờ duyệt");
        }
        this.repairStatus = RepairStatus.CONFIRMED.name();
    }

    public void waitForExport() {
        this.repairStatus = RepairStatus.WAITING_FOR_EXPORT.name();
    }

    public void startRepair() {
        if (!RepairStatus.WAITING_FOR_EXPORT.name().equals(this.repairStatus)
                && !RepairStatus.CONFIRMED.name().equals(this.repairStatus)) {
            throw new IllegalStateException("Chỉ có thể tiến hành sửa chữa khi kho đã xuất linh kiện hoặc sau khi xác nhận lệnh (nếu không cần xuất/nhập kho)");
        }
        this.repairStatus = RepairStatus.UNDER_REPAIR.name();
    }

    public void complete() {
        if (!RepairStatus.UNDER_REPAIR.name().equals(this.repairStatus)) {
            throw new IllegalStateException("Chỉ có thể hoàn thành khi đang sửa chữa");
        }
        this.repairStatus = RepairStatus.DONE.name();
        this.completedDate = LocalDate.now();
    }

    public void cancel() {
        if (RepairStatus.DONE.name().equals(this.repairStatus) || RepairStatus.CANCELLED.name().equals(this.repairStatus)) {
            throw new IllegalStateException("Không thể hủy lệnh đã hoàn thành hoặc đã hủy");
        }
        this.repairStatus = RepairStatus.CANCELLED.name();
    }
}
