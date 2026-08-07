-- Migration V32: Đảm bảo cột serial_number_id trong các bảng được phép NULL
-- Đề phòng trường hợp Hibernate ddl-auto=update không tự động chuyển NOT NULL thành NULL

SET FOREIGN_KEY_CHECKS = 0;

-- Bảng REPAIRS
ALTER TABLE `REPAIRS` MODIFY COLUMN `serial_number_id` BIGINT NULL COMMENT 'Serial của thiết bị sửa chữa (Nullable)';

-- Bảng WARRANTIES (nếu bảng này còn dùng cột serial_number_id)
ALTER TABLE `WARRANTIES` MODIFY COLUMN `serial_number_id` BIGINT NULL COMMENT 'Serial của thiết bị bảo hành (Nullable)';

SET FOREIGN_KEY_CHECKS = 1;
