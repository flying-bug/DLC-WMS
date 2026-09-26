package com.duylongtech.backend.feature.stocktake;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StocktakeResponse {
    private Long id;
    private String stocktakeCode;
    private Long warehouseId;
    private String warehouseName;
    private String purpose;
    private LocalDate stocktakeDate;
    private String conclusion;
    private String status;
    private Long referenceImportId;
    private Long referenceExportId;
    private Long createdBy;
    private Long approvedBy;
    private LocalDateTime approvedAt;
    private String rejectReason;
    private Long waiverConfirmedBy;
    private Long lastCountedBy;
    // Họ tên người thực hiện từng bước (để hiện lịch sử xử lý và in biên bản)
    private String createdByName;
    private String approvedByName;
    private String waiverConfirmedByName;
    private String lastCountedByName;
    /** Số thành viên tham gia có họ tên; cần tối thiểu Stocktake.MIN_PARTICIPANTS để hoàn thành. */
    private long participantCount;
    /** Còn hàng thừa/thiếu (không tính dòng bỏ qua) cần phiếu nhập/xuất điều chỉnh, và phiếu đó đã ghi sổ chưa. */
    private boolean needsImportAdjustment;
    private boolean needsExportAdjustment;
    private boolean importAdjustmentPosted;
    private boolean exportAdjustmentPosted;
    /** Phiếu nhập / xuất điều chỉnh còn hiệu lực (chưa hủy) của lần kiểm kê: màn chi tiết mở phiếu này thay vì lập phiếu mới. */
    private Long importAdjustmentId;
    private String importAdjustmentCode;
    private String importAdjustmentStatus;
    private Long exportAdjustmentId;
    private String exportAdjustmentCode;
    private String exportAdjustmentStatus;
    private LocalDateTime waiverConfirmedAt;
    /** Số dòng lệch được chọn bỏ qua. */
    private int skippedDiffCount;
    /** Có dòng bỏ qua và đã được Manager/Kế toán xác nhận. */
    private boolean waiverConfirmed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<StocktakeLineResponse> lines;
    private List<StocktakeParticipantResponse> participants;
    private boolean createdByAccountant;
}
