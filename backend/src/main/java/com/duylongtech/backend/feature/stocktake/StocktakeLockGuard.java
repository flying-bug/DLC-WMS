package com.duylongtech.backend.feature.stocktake;

import com.duylongtech.backend.enums.StocktakeStatus;
import com.duylongtech.backend.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Khóa kho trong lúc kiểm kê. Kho bị khóa khi có phiếu kiểm kê ở trạng thái COUNTING (đã được manager duyệt);
 * trạng thái là nguồn sự thật duy nhất nên khi phiếu POSTED / CANCELLED kho tự mở khóa, không có cờ nào để "kẹt".
 *
 * Chỉ các phiếu nhập/xuất điều chỉnh của CHÍNH phiếu kiểm kê đó (referenceType = STOCKTAKE, referenceId = id phiếu)
 * mới được ghi sổ trong lúc kho đang khóa.
 */
@Component
@RequiredArgsConstructor
public class StocktakeLockGuard {

    private static final Set<String> STOCKTAKE_REFERENCE_TYPES = Set.of("STOCKTAKE", "STOCK_TAKE", "STOCKTAKE_ADJUSTMENT");

    private final StocktakeRepository stocktakeRepository;

    /** Ném BusinessException nếu kho đang kiểm kê và phiếu không phải phiếu điều chỉnh của đợt kiểm kê đó. */
    public void assertWarehouseNotLocked(Long warehouseId, String referenceType, Long referenceId) {
        if (warehouseId == null) {
            return;
        }
        stocktakeRepository.findFirstByWarehouseIdAndStatus(warehouseId, StocktakeStatus.COUNTING.name())
                .ifPresent(locking -> {
                    if (isAdjustmentOf(locking, referenceType, referenceId)) {
                        return;
                    }
                    throw new BusinessException("Kho đang kiểm kê (phiếu " + locking.getStocktakeCode()
                            + "). Không thể nhập, xuất hay chuyển kho cho tới khi kiểm kê hoàn tất hoặc bị hủy.");
                });
    }

    /** Kho đang bị khóa bởi phiếu nào (dùng cho bán lẻ, để báo sớm ngay lúc lập đơn). */
    public void assertWarehouseNotLocked(Long warehouseId) {
        assertWarehouseNotLocked(warehouseId, null, null);
    }

    private static boolean isAdjustmentOf(Stocktake locking, String referenceType, Long referenceId) {
        return referenceType != null
                && STOCKTAKE_REFERENCE_TYPES.contains(referenceType)
                && locking.getId() != null
                && locking.getId().equals(referenceId);
    }
}
