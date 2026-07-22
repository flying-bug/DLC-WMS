-- ====================================================================
-- PHÂN HỆ: REPAIR MANAGEMENT - Mở rộng bảng REPAIRS và tạo mới
-- REPAIR_LINES, REPAIR_FEES theo Spec 007
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Bước 1: Mở rộng bảng REPAIRS theo data-model mới
-- Thêm các cột mới, thay đổi cột status và sửa các cột cho phép NULL
ALTER TABLE `REPAIRS`
  ADD COLUMN `product_id` BIGINT UNSIGNED NULL COMMENT 'Sản phẩm dịch vụ hoặc thiết bị đang sửa' AFTER `partner_id`,
  ADD COLUMN `under_warranty` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Có trong hạn bảo hành không' AFTER `issue_description`,
  ADD COLUMN `repair_warranty_end_date` DATE NULL COMMENT 'Hạn bảo hành sau sửa chữa' AFTER `under_warranty`,
  ADD COLUMN `invoice_method` VARCHAR(30) NOT NULL DEFAULT 'after_repair' COMMENT 'none | b4repair | after_repair' AFTER `repair_warranty_end_date`,
  ADD COLUMN `total_amount` DECIMAL(15,4) NOT NULL DEFAULT 0.0000 COMMENT 'Tổng chi phí linh kiện + phí dịch vụ' AFTER `invoice_method`,
  ADD COLUMN `approved_by` BIGINT UNSIGNED NULL AFTER `created_by`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`,
  ADD COLUMN `version` INT NOT NULL DEFAULT 0 COMMENT 'Optimistic Locking' AFTER `updated_at`,
  MODIFY COLUMN `serial_number_id` BIGINT UNSIGNED NULL,
  MODIFY COLUMN `issue_description` TEXT NULL,
  MODIFY COLUMN `warranty_id` BIGINT UNSIGNED NULL;

-- Bước 2: Xóa constraint cũ trên status và thêm constraint mới theo state machine
ALTER TABLE `REPAIRS`
  DROP CONSTRAINT IF EXISTS `chk_rep_status`;

ALTER TABLE `REPAIRS`
  ADD CONSTRAINT `chk_rep_status_v2` CHECK (
    `repair_status` IN ('DRAFT', 'QUOTATION', 'CONFIRMED', 'UNDER_REPAIR', 'DONE', 'CANCELLED')
  );

-- Bước 3: Đổi tên cột repair_status -> status theo convention mới
-- (Giữ cột repair_status vì entity cũ đang sử dụng, thêm alias nếu cần)
-- Không đổi tên để backward compatible với RepairTicketService cũ

-- Bước 4: Tạo bảng REPAIR_LINES
CREATE TABLE IF NOT EXISTS `REPAIR_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `repair_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK -> REPAIRS',
  `component_variant_id` BIGINT UNSIGNED NOT NULL COMMENT 'Linh kiện (variant)',
  `action_type` VARCHAR(20) NOT NULL COMMENT 'ADD | REMOVE',
  `quantity` DECIMAL(15,4) NOT NULL,
  `unit_price` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `is_free_warranty` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Miễn phí do bảo hành',
  `serial_number_id` BIGINT UNSIGNED NULL COMMENT 'Serial linh kiện tháo ra/lắp vào',
  `note` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_repair_line_repair` FOREIGN KEY (`repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repair_line_variant` FOREIGN KEY (`component_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_repair_line_serial` FOREIGN KEY (`serial_number_id`) REFERENCES `SERIAL_NUMBERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_repair_line_action` CHECK (`action_type` IN ('ADD', 'REMOVE')),
  CONSTRAINT `chk_repair_line_qty` CHECK (`quantity` > 0.0000),
  CONSTRAINT `chk_repair_line_price` CHECK (`unit_price` >= 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bước 5: Tạo bảng REPAIR_FEES
CREATE TABLE IF NOT EXISTS `REPAIR_FEES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `repair_id` BIGINT UNSIGNED NOT NULL COMMENT 'FK -> REPAIRS',
  `fee_name` VARCHAR(255) NOT NULL COMMENT 'Tên phí dịch vụ/nhân công',
  `fee_amount` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `is_free_warranty` BOOLEAN NOT NULL DEFAULT FALSE,
  `note` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_repair_fee_repair` FOREIGN KEY (`repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_repair_fee_amount` CHECK (`fee_amount` >= 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bước 6: Thêm cột reference_repair_id vào INVENTORY_DOCUMENTS để truy vết
ALTER TABLE `INVENTORY_DOCUMENTS`
  ADD COLUMN `reference_repair_id` BIGINT UNSIGNED NULL COMMENT 'Liên kết lệnh sửa chữa' AFTER `reference_id`;

-- Bước 7: Indexes
CREATE INDEX `idx_repair_lines_repair_id` ON `REPAIR_LINES` (`repair_id`);
CREATE INDEX `idx_repair_fees_repair_id` ON `REPAIR_FEES` (`repair_id`);
CREATE INDEX `idx_inv_docs_repair_ref` ON `INVENTORY_DOCUMENTS` (`reference_repair_id`);

SET FOREIGN_KEY_CHECKS = 1;
