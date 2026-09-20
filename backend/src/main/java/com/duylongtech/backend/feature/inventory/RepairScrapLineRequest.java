package com.duylongtech.backend.feature.inventory;

import java.math.BigDecimal;

/**
 * Dữ liệu 1 dòng linh kiện tháo ra (REMOVE/REPLACE) cần nhập kho phế liệu khi
 * lệnh sửa chữa hoàn tất. Xem ghi chú ở {@link RepairStockOutLineRequest}.
 */
public record RepairScrapLineRequest(
        Long componentVariantId,
        BigDecimal quantity,
        Long serialNumberId,
        String serialNumberText,
        Long repairLineId
) {
}
