-- Người lưu số đếm / lựa chọn xử lý gần nhất: người xác nhận bỏ qua chênh lệch phải là người khác.
ALTER TABLE `STOCKTAKES`
    ADD COLUMN `last_counted_by` BIGINT NULL;
