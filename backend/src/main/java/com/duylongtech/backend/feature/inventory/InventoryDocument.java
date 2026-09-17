package com.duylongtech.backend.feature.inventory;

import jakarta.persistence.*;
import lombok.*;

import com.duylongtech.backend.enums.DocumentStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "INVENTORY_DOCUMENTS")
@Getter
@Setter
@NoArgsConstructor
public class InventoryDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter(AccessLevel.NONE)
    @Column(name = "doc_code", nullable = false, length = 50, unique = true)
    private String docCode;

    @Setter(AccessLevel.NONE)
    @Column(name = "doc_type", nullable = false, length = 30)
    private String docType;

    @Column(name = "issue_purpose", length = 30)
    private String issuePurpose;

    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_repair_id")
    private Long referenceRepairId;

    @Column(name = "warehouse_id")
    private Long warehouseId;

    @Column(name = "source_warehouse_id")
    private Long sourceWarehouseId;

    @Column(name = "purchase_order_id")
    private Long purchaseOrderId;

    @Column(name = "sales_order_id")
    private Long salesOrderId;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "doc_date")
    private LocalDate docDate;

    @Setter(AccessLevel.NONE)
    @Column(name = "posted_at")
    private LocalDateTime postedAt;

    @Setter(AccessLevel.NONE)
    @Column(name = "status", length = 30)
    private String status;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Setter(AccessLevel.NONE)
    @Column(name = "created_by")
    private Long createdBy;

    @Setter(AccessLevel.NONE)
    @Column(name = "approved_by")
    private Long approvedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "inventoryDocument", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryDocumentLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "inventoryDocument", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryDocumentReference> references = new ArrayList<>();

    @Column(name = "recipient_name", length = 150)
    private String recipientName;

    @Column(name = "recipient_address", columnDefinition = "TEXT")
    private String recipientAddress;

    @Column(name = "salesperson_id")
    private Long salespersonId;

    @Column(name = "has_discrepancy")
    private Boolean hasDiscrepancy;

    @Column(name = "discrepancy_note", columnDefinition = "TEXT")
    private String discrepancyNote;

    @Setter(AccessLevel.NONE)
    @Column(name = "unposted_by")
    private Long unpostedBy;

    @Setter(AccessLevel.NONE)
    @Column(name = "unposted_at")
    private LocalDateTime unpostedAt;

    @Setter(AccessLevel.NONE)
    @Column(name = "unpost_reason", columnDefinition = "TEXT")
    private String unpostReason;

    // --- Domain Business Logic ---

    public void initExportDocument(String code) {
        assignInitialCode(code);
        this.docType = "EX_SO";
    }

    public void initImportDocument(String code) {
        assignInitialCode(code);
        this.docType = "IN_PO";
    }

    public void assignCreator(Long userId) {
        if (this.createdBy == null) {
            this.createdBy = userId;
        }
    }

    public void assignInitialCode(String code) {
        if (this.docCode != null) {
            throw new com.duylongtech.backend.exception.BusinessException("Không được phép thay đổi mã chứng từ sau khi khởi tạo.");
        }
        this.docCode = code;
    }
    
    public void updateCode(String code) {
        this.docCode = code;
    }

    public void updateStatus(String newStatus) {
        this.status = newStatus;
    }

    public void clearLines() {
        if (!isEditable()) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ được sửa chi tiết khi phiếu ở trạng thái DRAFT, SUBMITTED hoặc UNPOSTED");
        }
        this.lines.clear();
    }

    public void addExportLine(InventoryDocumentLine line) {
        if (!isEditable()) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ được sửa chi tiết khi phiếu ở trạng thái DRAFT, SUBMITTED hoặc UNPOSTED");
        }
        line.calculateExportAmounts();
        this.lines.add(line);
        line.setInventoryDocument(this);
    }

    public void addImportLine(InventoryDocumentLine line) {
        if (!isEditable()) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ được sửa chi tiết khi phiếu ở trạng thái DRAFT, SUBMITTED hoặc UNPOSTED");
        }
        line.calculateImportAmounts();
        this.lines.add(line);
        line.setInventoryDocument(this);
    }

    private boolean isEditable() {
        return DocumentStatus.DRAFT.name().equals(this.status) || DocumentStatus.SUBMITTED.name().equals(this.status)
                || DocumentStatus.UNPOSTED.name().equals(this.status) || this.status == null;
    }

    public void post(Long userId) {
        if (DocumentStatus.POSTED.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chứng từ đã được ghi sổ.");
        }
        this.status = DocumentStatus.POSTED.name();
        this.postedAt = LocalDateTime.now();
        this.approvedBy = userId;
        if (this.salespersonId == null) {
            this.salespersonId = userId;
        }
    }

    public void unpost(Long userId, String reason) {
        if (!DocumentStatus.POSTED.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ có thể bỏ ghi sổ chứng từ đã ghi sổ.");
        }
        this.status = DocumentStatus.UNPOSTED.name();
        this.unpostedBy = userId;
        this.unpostedAt = LocalDateTime.now();
        this.unpostReason = reason;
        this.postedAt = null;
        this.approvedBy = null;
    }

    // Terminal step right after unpost(): the old document becomes a read-only
    // history record instead of being edited and re-posted in place. Keeps the
    // unpostedBy/unpostedAt/unpostReason audit fields set by unpost() as-is.
    public void cancelAfterUnpost() {
        if (!DocumentStatus.UNPOSTED.name().equals(this.status)) {
            throw new com.duylongtech.backend.exception.BusinessException("Chỉ có thể hủy chứng từ vừa bỏ ghi sổ.");
        }
        this.status = DocumentStatus.CANCELLED.name();
    }
}

