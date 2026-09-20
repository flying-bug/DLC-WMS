-- Kiểm kê cần Manager duyệt trước khi khóa kho: PENDING_APPROVAL -> COUNTING (đang kiểm kê) hoặc REJECTED.
ALTER TABLE `STOCKTAKES`
    ADD COLUMN `approved_by` BIGINT NULL,
    ADD COLUMN `approved_at` DATETIME NULL,
    ADD COLUMN `reject_reason` VARCHAR(500) NULL;

-- Kiểm tra "kho đang kiểm kê?" chạy ở mỗi lần ghi sổ nhập/xuất/chuyển kho.
CREATE INDEX `idx_stocktakes_warehouse_status` ON `STOCKTAKES` (`warehouse_id`, `status`);

-- Kế toán tạo phiếu kiểm kê (gửi yêu cầu chờ duyệt); vẫn không được sửa/ghi sổ.
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code = 'stocktake:add'
WHERE r.code IN ('ROLE_ACCOUNTANT', 'ACCOUNTANT');
