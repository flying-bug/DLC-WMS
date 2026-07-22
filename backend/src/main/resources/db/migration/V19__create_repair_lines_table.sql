-- ============================================================
-- Migration  : V19
-- Created at : 2026-07-21
-- Author     : AI Assistant
-- Description: Tạo bảng REPAIR_LINES và update trạng thái REPAIRS.
-- ============================================================

CREATE TABLE `REPAIR_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `repair_id` BIGINT UNSIGNED NOT NULL,
  `component_variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(15,4) NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `is_warranty_covered` BOOLEAN NOT NULL DEFAULT FALSE,
  `note` TEXT,
  CONSTRAINT `fk_repair_line_repair` FOREIGN KEY (`repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_repair_line_variant` FOREIGN KEY (`component_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_rl_qty` CHECK (`quantity` > 0.0000),
  CONSTRAINT `chk_rl_price` CHECK (`unit_price` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `REPAIRS` 
  DROP CHECK `chk_rep_status`;

ALTER TABLE `REPAIRS`
  ADD CONSTRAINT `chk_rep_status` CHECK (`repair_status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED', 'RECEIVED', 'REPAIRING', 'WAITING_FOR_PARTS', 'READY_FOR_PICKUP', 'COMPLETED'));
