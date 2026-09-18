package com.duylongtech.backend.feature.warehouse;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.duylongtech.backend.enums.DocumentStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "STOCK_TRANSFERS")
@Getter
@NoArgsConstructor
public class StockTransfer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Setter(AccessLevel.NONE)
    @Column(name = "transfer_code", nullable = false, length = 50, unique = true)
    private String transferCode;

    @Setter(AccessLevel.NONE)
    @Column(name = "from_warehouse_id", nullable = false)
    private Long fromWarehouseId;

    @Setter(AccessLevel.NONE)
    @Column(name = "to_warehouse_id", nullable = false)
    private Long toWarehouseId;

    @Column(name = "transfer_date", nullable = false)
    private LocalDate transferDate;

    @Setter(AccessLevel.NONE)
    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    public void setNote(String note) {
        this.note = note;
    }

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "deliverer", length = 100)
    private String deliverer;

    public void setDeliverer(String deliverer) {
        this.deliverer = deliverer;
    }

    @Column(name = "attached_document", length = 255)
    private String attachedDocument;

    public void setAttachedDocument(String attachedDocument) {
        this.attachedDocument = attachedDocument;
    }

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    public void initReference(Long referenceId, String referenceType, String referenceCode) {
        this.referenceId = referenceId;
        this.referenceType = referenceType;
        this.referenceCode = referenceCode;
    }

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "stockTransfer", cascade = CascadeType.ALL, orphanRemoval = true)
        private List<StockTransferLine> lines = new ArrayList<>();

    // --- DOMAIN METHODS ---

    public void initDraft(String code, Long fromWh, Long toWh, LocalDate transferDate) {
        if (fromWh == null || toWh == null || fromWh.equals(toWh)) {
            throw new IllegalArgumentException("Kho xuất và kho nhập phải khác nhau và không được để trống");
        }
        if (this.transferCode == null) {
            this.transferCode = code;
        }
        this.fromWarehouseId = fromWh;
        this.toWarehouseId = toWh;
        this.transferDate = transferDate != null ? transferDate : LocalDate.now();
        this.status = DocumentStatus.DRAFT.name();
    }

    public void updateTransferDate(LocalDate transferDate) {
        if (transferDate != null) {
            this.transferDate = transferDate;
        }
    }

    public void assignCreator(Long userId) {
        if (this.createdBy == null) {
            this.createdBy = userId;
        }
    }

    public void clearLines() {
        if (this.lines != null) {
            this.lines.clear();
        }
    }

    public void addLine(StockTransferLine line) {
        if (this.lines == null) {
            this.lines = new ArrayList<>();
        }
        line.setStockTransfer(this);
        this.lines.add(line);
    }

    public void approve(Long approverId) {
        if (!DocumentStatus.DRAFT.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ có thể duyệt khi phiếu chuyển ở trạng thái DRAFT");
        }
        this.status = DocumentStatus.APPROVED.name();
        this.approvedBy = approverId;
    }

    public void cancel() {
        if (!DocumentStatus.DRAFT.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ có thể hủy phiếu chuyển kho khi còn ở trạng thái Lưu tạm");
        }
        this.status = DocumentStatus.CANCELLED.name();
    }

    public void changeWarehouses(Long fromWh, Long toWh) {
        if (!DocumentStatus.DRAFT.name().equals(this.status) && !DocumentStatus.SUBMITTED.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ được đổi kho khi ở trạng thái DRAFT hoặc SUBMITTED");
        }
        if (fromWh == null || toWh == null || fromWh.equals(toWh)) {
            throw new IllegalArgumentException("Kho xuất và kho nhập phải khác nhau và không được để trống");
        }
        this.fromWarehouseId = fromWh;
        this.toWarehouseId = toWh;
    }

    public void dispatch() {
        this.status = DocumentStatus.IN_TRANSIT.name();
    }

    public void complete() {
        this.status = DocumentStatus.POSTED.name();
    }
}
