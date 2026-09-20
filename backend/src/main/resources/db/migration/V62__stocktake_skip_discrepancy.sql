-- Dòng kiểm kê lệch nhưng chọn "Không xử lý": lưu lý do; Manager/Kế toán xác nhận cho cả phiếu.
ALTER TABLE `STOCKTAKE_LINES`
    ADD COLUMN `skip_reason` VARCHAR(500) NULL;

ALTER TABLE `STOCKTAKES`
    ADD COLUMN `waiver_confirmed_by` BIGINT NULL,
    ADD COLUMN `waiver_confirmed_at` DATETIME NULL;
