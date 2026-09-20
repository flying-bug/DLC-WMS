package com.duylongtech.backend.feature.stocktake;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.duylongtech.backend.enums.StocktakeStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "STOCKTAKES")
@Getter
@Setter
@NoArgsConstructor
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

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "reject_reason", length = 500)
    private String rejectReason;

    /** Manager/Kế toán xác nhận việc bỏ qua chênh lệch. Bị xóa mỗi khi số đếm hoặc dòng bỏ qua thay đổi. */
    @Column(name = "waiver_confirmed_by")
    private Long waiverConfirmedBy;

    /** Người lưu số đếm/lựa chọn xử lý gần nhất (chỉ đổi khi số đếm, lựa chọn hoặc lý do thật sự thay đổi). */
    @Column(name = "last_counted_by")
    private Long lastCountedBy;

    @Column(name = "waiver_confirmed_at")
    private LocalDateTime waiverConfirmedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "stocktake", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StocktakeLine> lines = new ArrayList<>();

    @OneToMany(mappedBy = "stocktake", cascade = CascadeType.ALL, orphanRemoval = true)
    @Setter(AccessLevel.NONE)
    private List<StocktakeParticipant> participants = new ArrayList<>();

    public void initOrder(String stocktakeCode, Long warehouseId, String purpose, LocalDate stocktakeDate, Long creatorId) {
        this.stocktakeCode = stocktakeCode;
        this.warehouseId = warehouseId;
        this.purpose = purpose;
        this.stocktakeDate = stocktakeDate != null ? stocktakeDate : LocalDate.now();
        this.createdBy = creatorId;
        this.status = StocktakeStatus.DRAFT.name();
    }

    public void updateDetails(String purpose, LocalDate stocktakeDate) {
        if (!isEditable()) {
            throw new IllegalStateException("Chỉ được cập nhật phiếu kiểm kê khi ở trạng thái DRAFT hoặc COUNTING");
        }
        if (purpose != null) this.purpose = purpose;
        if (stocktakeDate != null) this.stocktakeDate = stocktakeDate;
    }

    /** Các dòng có chênh lệch nhưng được chọn "Không xử lý". */
    public List<StocktakeLine> skippedDiffLines() {
        return lines.stream().filter(StocktakeLine::isSkippedDiff).toList();
    }

    /** Có hàng thừa cần phiếu nhập điều chỉnh (dòng bỏ qua không tính). */
    public boolean requiresImportAdjustment() {
        return lines.stream().anyMatch(l -> !l.isSkipped() && l.getDiffQty() != null && l.getDiffQty().signum() > 0);
    }

    /** Có hàng thiếu cần phiếu xuất điều chỉnh (dòng bỏ qua không tính). */
    public boolean requiresExportAdjustment() {
        return lines.stream().anyMatch(l -> !l.isSkipped() && l.getDiffQty() != null && l.getDiffQty().signum() < 0);
    }

    public boolean hasUnconfirmedWaivers() {
        return !skippedDiffLines().isEmpty() && this.waiverConfirmedAt == null;
    }

    public void confirmWaivers(Long confirmerId) {
        if (skippedDiffLines().isEmpty()) {
            throw new IllegalStateException("Không có dòng chênh lệch nào được bỏ qua để xác nhận");
        }
        this.waiverConfirmedBy = confirmerId;
        this.waiverConfirmedAt = LocalDateTime.now();
    }

    public void clearWaiverConfirmation() {
        this.waiverConfirmedBy = null;
        this.waiverConfirmedAt = null;
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
    
    /** DRAFT (cũ) hoặc COUNTING (đang kiểm kê) mới cho sửa số đếm. PENDING_APPROVAL/REJECTED/POSTED... chỉ xem. */
    public boolean isEditable() {
        return StocktakeStatus.DRAFT.name().equals(this.status) || StocktakeStatus.COUNTING.name().equals(this.status);
    }

    /** Đang kiểm kê: kho của phiếu bị khóa. */
    public boolean isCounting() {
        return StocktakeStatus.COUNTING.name().equals(this.status);
    }

    public void submitForApproval() {
        if (!StocktakeStatus.DRAFT.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ phiếu kiểm kê DRAFT mới có thể gửi duyệt");
        }
        this.status = StocktakeStatus.PENDING_APPROVAL.name();
    }

    /** Manager duyệt: bắt đầu kiểm kê (khóa kho). */
    public void approve(Long approverId) {
        if (!StocktakeStatus.PENDING_APPROVAL.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ phiếu đang chờ duyệt mới có thể duyệt");
        }
        this.status = StocktakeStatus.COUNTING.name();
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void reject(Long approverId, String reason) {
        if (!StocktakeStatus.PENDING_APPROVAL.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ phiếu đang chờ duyệt mới có thể từ chối");
        }
        this.status = StocktakeStatus.REJECTED.name();
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
        this.rejectReason = reason;
    }

    /** Người có quyền duyệt tạo phiếu thì bắt đầu kiểm kê ngay (không cần tự duyệt chính mình). */
    public void startCounting(Long approverId) {
        if (!StocktakeStatus.DRAFT.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ phiếu kiểm kê DRAFT mới có thể bắt đầu kiểm");
        }
        this.status = StocktakeStatus.COUNTING.name();
        this.approvedBy = approverId;
        this.approvedAt = LocalDateTime.now();
    }

    public void complete(String conclusion, Long referenceExportId, Long referenceImportId) {
        if (!StocktakeStatus.COUNTING.name().equals(this.status)) {
            throw new IllegalStateException("Chỉ phiếu kiểm kê đang kiểm mới có thể hoàn thành");
        }
        this.conclusion = conclusion;
        this.referenceExportId = referenceExportId;
        this.referenceImportId = referenceImportId;
        this.status = StocktakeStatus.COMPLETED.name();
    }

    public void markAsPosted() {
        if (!StocktakeStatus.DRAFT.name().equals(this.status) && !StocktakeStatus.COUNTING.name().equals(this.status)
                && !StocktakeStatus.COMPLETED.name().equals(this.status)) {
            throw new IllegalStateException("Phiếu kiểm kê chưa hoàn thành");
        }
        this.status = StocktakeStatus.POSTED.name();
    }

    public void cancel() {
        if (StocktakeStatus.COMPLETED.name().equals(this.status) || StocktakeStatus.POSTED.name().equals(this.status)
                || StocktakeStatus.CANCELLED.name().equals(this.status) || StocktakeStatus.REJECTED.name().equals(this.status)) {
            throw new IllegalStateException("Không thể hủy phiếu kiểm kê đã hoàn thành, vào sổ, bị từ chối hoặc đã hủy");
        }
        this.status = StocktakeStatus.CANCELLED.name();
    }
}
