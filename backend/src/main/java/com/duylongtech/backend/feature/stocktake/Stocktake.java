package com.duylongtech.backend.feature.stocktake;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "STOCKTAKES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stocktake {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stocktake_code", nullable = false, length = 50, unique = true)
    @Setter(AccessLevel.NONE)
    private String stocktakeCode;

    @Column(name = "warehouse_id", nullable = false)
    @Setter(AccessLevel.NONE)
    private Long warehouseId;

    @Column(name = "purpose", length = 255)
    @Setter(AccessLevel.NONE)
    private String purpose;

    @Column(name = "stocktake_date")
    @Setter(AccessLevel.NONE)
    private LocalDate stocktakeDate;

    @Column(name = "conclusion", columnDefinition = "TEXT")
    @Setter(AccessLevel.NONE)
    private String conclusion;

    @Column(name = "status", length = 30)
    @Setter(AccessLevel.NONE)
    private String status;

    @Column(name = "reference_import_id")
    private Long referenceImportId;

    @Column(name = "reference_export_id")
    private Long referenceExportId;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "stocktake", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StocktakeLine> lines = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "stocktake", cascade = CascadeType.ALL, orphanRemoval = true)
    @Setter(AccessLevel.NONE)
    private List<StocktakeParticipant> participants = new ArrayList<>();

    public void initOrder(String stocktakeCode, Long warehouseId, String purpose, LocalDate stocktakeDate, Long creatorId) {
        this.stocktakeCode = stocktakeCode;
        this.warehouseId = warehouseId;
        this.purpose = purpose;
        this.stocktakeDate = stocktakeDate != null ? stocktakeDate : LocalDate.now();
        this.createdBy = creatorId;
        this.status = "DRAFT";
    }
    
    public void updateDetails(String purpose, LocalDate stocktakeDate) {
        if (!"DRAFT".equals(this.status)) {
            throw new IllegalStateException("Chỉ được cập nhật phiếu kiểm kê khi ở trạng thái DRAFT");
        }
        if (purpose != null) this.purpose = purpose;
        if (stocktakeDate != null) this.stocktakeDate = stocktakeDate;
    }

    public void addLine(StocktakeLine line) {
        line.setStocktake(this);
        this.lines.add(line);
    }

    public void clearLines() {
        this.lines.clear();
    }

    public void addParticipant(StocktakeParticipant participant) {
        participant.setStocktake(this);
        this.participants.add(participant);
    }

    public void clearParticipants() {
        this.participants.clear();
    }
    
    public void startCounting() {
        if (!"DRAFT".equals(this.status)) {
            throw new IllegalStateException("Chỉ phiếu kiểm kê DRAFT mới có thể bắt đầu kiểm");
        }
        this.status = "COUNTING";
    }

    public void complete(String conclusion, Long referenceExportId, Long referenceImportId) {
        if (!"COUNTING".equals(this.status)) {
            throw new IllegalStateException("Chỉ phiếu kiểm kê đang kiểm mới có thể hoàn thành");
        }
        this.conclusion = conclusion;
        this.referenceExportId = referenceExportId;
        this.referenceImportId = referenceImportId;
        this.status = "COMPLETED";
    }

    public void markAsPosted() {
        if (!"DRAFT".equals(this.status) && !"COMPLETED".equals(this.status)) {
            throw new IllegalStateException("Phiếu kiểm kê chưa hoàn thành");
        }
        this.status = "POSTED";
    }

    public void cancel() {
        if ("COMPLETED".equals(this.status) || "POSTED".equals(this.status)) {
            throw new IllegalStateException("Không thể hủy phiếu kiểm kê đã hoàn thành hoặc vào sổ");
        }
        this.status = "CANCELLED";
    }
}
