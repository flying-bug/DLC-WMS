package com.duylongtech.backend.feature.inventory;

import java.math.BigDecimal;

/**
 * Dữ liệu 1 dòng linh kiện cần xuất kho khi lệnh sửa chữa hoàn tất (ADD/REPLACE).
 * Repair module tự resolve các giá trị hiển thị (serialNumberText) trước khi truyền
 * sang đây, để Inventory module không phải query lại và cũng không phụ thuộc ngược
 * vào entity của Repair module.
 */
public record RepairStockOutLineRequest(
        Long componentVariantId,
        BigDecimal quantity,
        BigDecimal unitPrice,
        Long serialNumberId,
        String serialNumberText,
        String note,
        Long repairLineId
) {
}
