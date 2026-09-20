package com.duylongtech.backend.feature.stocktake;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "STOCKTAKE_LINES")
@Getter
@Setter
@NoArgsConstructor
public class StocktakeLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stocktake_id", nullable = false)
    private Stocktake stocktake;

    @Column(name = "variant_id", nullable = false)
    private Long variantId;

    @Column(name = "book_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal bookQty;

    @Column(name = "count_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal countQty;

    @Column(name = "diff_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal diffQty;

    @Column(name = "good_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal goodQty;

    @Column(name = "bad_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal badQty;

    @Column(name = "lost_qty", precision = 15, scale = 4)
    @Setter(AccessLevel.NONE)
    private BigDecimal lostQty;

    @Column(name = "action", length = 100)
    private String action;

    /** Lý do không xử lý chênh lệch (bắt buộc khi action = "Không xử lý" và dòng có chênh lệch). */
    @Column(name = "skip_reason", length = 500)
    private String skipReason;

    @OneToMany(mappedBy = "stocktakeLine", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StocktakeLineSerial> serials = new ArrayList<>();

    public void initLine(Long variantId, BigDecimal bookQty, BigDecimal countQty, BigDecimal goodQty, BigDecimal badQty, BigDecimal lostQty, String action) {
        this.variantId = variantId;
        this.bookQty = bookQty != null ? bookQty : BigDecimal.ZERO;
        this.countQty = countQty;
        this.goodQty = goodQty;
        this.badQty = badQty;
        this.lostQty = lostQty;
        this.action = action;
        calculateDiff();
    }

    public static final String ACTION_SKIP = "Không xử lý";

    public void updateSkipReason(String reason) {
        this.skipReason = reason != null && !reason.trim().isEmpty() ? reason.trim() : null;
    }

    /** Người dùng chọn không điều chỉnh tồn cho dòng này. */
    public boolean isSkipped() {
        return this.action != null && ACTION_SKIP.equals(this.action.trim());
    }

    public boolean hasDiff() {
        return this.diffQty != null && this.diffQty.signum() != 0;
    }

    /** Dòng lệch mà người dùng chọn bỏ qua: cần lý do và được Manager/Kế toán xác nhận. */
    public boolean isSkippedDiff() {
        return isSkipped() && hasDiff();
    }

    public void addSerial(StocktakeLineSerial serial) {
        serial.setStocktakeLine(this);
        this.serials.add(serial);
    }

    public void updateCount(BigDecimal countQty, BigDecimal goodQty, BigDecimal badQty, BigDecimal lostQty, String action) {
        this.countQty = countQty;
        this.goodQty = goodQty;
        this.badQty = badQty;
        this.lostQty = lostQty;
        this.action = action;
        calculateDiff();
    }
    
    /**
     * Chốt lại số sổ sách theo tồn thực tế lúc bắt đầu kiểm kê. Số đếm/đạt còn đang bằng số sổ sách cũ
     * (chưa ai sửa, do form tạo phiếu điền sẵn) thì đi theo số mới để không sinh chênh lệch giả.
     */
    public void rebaseBookQty(BigDecimal newBookQty) {
        BigDecimal oldBook = this.bookQty != null ? this.bookQty : BigDecimal.ZERO;
        boolean countUntouched = this.countQty != null && this.countQty.compareTo(oldBook) == 0;
        boolean goodUntouched = this.goodQty != null && this.goodQty.compareTo(oldBook) == 0;
        this.bookQty = newBookQty != null ? newBookQty : BigDecimal.ZERO;
        if (countUntouched) {
            this.countQty = this.bookQty;
            if (goodUntouched) {
                this.goodQty = this.bookQty;
            }
        }
        calculateDiff();
    }

    /** Giữ nguyên số sổ sách đã chốt khi thủ kho lưu số đếm (client không được đổi số sổ sách). */
    public void overrideBookQty(BigDecimal frozenBookQty) {
        this.bookQty = frozenBookQty != null ? frozenBookQty : BigDecimal.ZERO;
        calculateDiff();
    }

    private void calculateDiff() {
        if (this.countQty != null) {
            this.diffQty = this.countQty.subtract(this.bookQty != null ? this.bookQty : BigDecimal.ZERO);
        } else {
            this.diffQty = null;
        }
    }
}

