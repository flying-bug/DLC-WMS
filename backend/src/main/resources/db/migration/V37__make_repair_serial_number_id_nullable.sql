-- Migration V31: Sửa cột serial_number_id trong bảng REPAIRS thành NULLABLE
-- Nguyên nhân: Thiết bị đưa vào sửa chữa (hoặc thiết bị ngoài không quản lý serial) có thể không có serial_number_id.

SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE `REPAIRS` MODIFY COLUMN `serial_number_id` BIGINT UNSIGNED NULL COMMENT 'Serial của thiết bị sửa chữa (Nullable)';
SET FOREIGN_KEY_CHECKS = 1;
