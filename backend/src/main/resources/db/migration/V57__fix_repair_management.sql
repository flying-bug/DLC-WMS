-- Feature 012: role-safe Repair workflow, inventory linkage and financial snapshots.

-- Drop every legacy repair status constraint before remapping values.
SET @drop_rep_status_v2 = (
  SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `REPAIRS` DROP CHECK `chk_rep_status_v2`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'REPAIRS'
    AND CONSTRAINT_NAME = 'chk_rep_status_v2'
);
PREPARE stmt FROM @drop_rep_status_v2;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @drop_rep_status = (
  SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `REPAIRS` DROP CHECK `chk_rep_status`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'REPAIRS'
    AND CONSTRAINT_NAME = 'chk_rep_status'
);
PREPARE stmt FROM @drop_rep_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `REPAIRS`
  ADD COLUMN `assigned_technician_id` BIGINT UNSIGNED NULL AFTER `warehouse_id`,
  ADD COLUMN `fee_policy` VARCHAR(20) NULL AFTER `under_warranty`,
  ADD COLUMN `customer_share_percent` DECIMAL(5,2) NULL AFTER `fee_policy`,
  ADD COLUMN `customer_pay_amount` DECIMAL(15,4) NOT NULL DEFAULT 0.0000 AFTER `total_amount`,
  ADD COLUMN `company_covered_amount` DECIMAL(15,4) NOT NULL DEFAULT 0.0000 AFTER `customer_pay_amount`,
  ADD COLUMN `fee_adjusted_by` BIGINT UNSIGNED NULL AFTER `company_covered_amount`,
  ADD COLUMN `fee_adjusted_at` DATETIME NULL AFTER `fee_adjusted_by`,
  ADD COLUMN `fee_adjustment_reason` TEXT NULL AFTER `fee_adjusted_at`,
  ADD COLUMN `manual_device_name` VARCHAR(255) NULL AFTER `product_variant_id`,
  ADD COLUMN `manual_device_identifier` VARCHAR(255) NULL AFTER `manual_device_name`,
  ADD COLUMN `scrap_warehouse_id` BIGINT UNSIGNED NULL AFTER `warehouse_id`,
  ADD COLUMN `repair_outcome` VARCHAR(30) NULL AFTER `repair_status`,
  ADD COLUMN `reject_reason` TEXT NULL AFTER `repair_outcome`,
  ADD COLUMN `rejected_at` DATETIME NULL AFTER `reject_reason`,
  ADD COLUMN `rejected_by` BIGINT UNSIGNED NULL AFTER `rejected_at`,
  ADD COLUMN `submitted_at` DATETIME NULL AFTER `rejected_by`,
  ADD COLUMN `submitted_by` BIGINT UNSIGNED NULL AFTER `submitted_at`,
  ADD COLUMN `accepted_at` DATETIME NULL AFTER `submitted_by`,
  ADD COLUMN `accepted_by` BIGINT UNSIGNED NULL AFTER `accepted_at`,
  ADD COLUMN `completed_at` DATETIME NULL AFTER `accepted_by`,
  ADD COLUMN `completed_by` BIGINT UNSIGNED NULL AFTER `completed_at`,
  ADD COLUMN `cancel_reason` TEXT NULL AFTER `completed_by`,
  ADD COLUMN `cancelled_at` DATETIME NULL AFTER `cancel_reason`,
  ADD COLUMN `cancelled_by` BIGINT UNSIGNED NULL AFTER `cancelled_at`,
  ADD COLUMN `returned_at` DATETIME NULL AFTER `cancelled_by`,
  ADD COLUMN `returned_by` BIGINT UNSIGNED NULL AFTER `returned_at`,
  ADD COLUMN `recipient_name` VARCHAR(150) NULL AFTER `returned_by`,
  ADD COLUMN `recipient_phone` VARCHAR(20) NULL AFTER `recipient_name`,
  ADD COLUMN `return_note` TEXT NULL AFTER `recipient_phone`,
  ADD COLUMN `handover_code` VARCHAR(50) NULL AFTER `return_note`;

UPDATE `REPAIRS`
SET `repair_status` = CASE
  WHEN `repair_status` = 'QUOTATION' THEN 'DRAFT'
  WHEN `repair_status` = 'CONFIRMED' AND EXISTS (
    SELECT 1 FROM `INVENTORY_DOCUMENTS` d
    WHERE (d.`reference_id` = `REPAIRS`.`id` OR d.`reference_repair_id` = `REPAIRS`.`id`)
      AND d.`doc_type` = 'EX_SO'
      AND d.`status` NOT IN ('CANCELLED', 'CANCELED')
  ) THEN 'WAITING_STOCK'
  WHEN `repair_status` = 'CONFIRMED' THEN 'WAITING_CONFIRM'
  WHEN `repair_status` = 'UNDER_REPAIR' THEN 'IN_REPAIR'
  WHEN `repair_status` IN ('SUBMITTED', 'APPROVED', 'RECEIVED', 'WAITING_FOR_PARTS') THEN 'WAITING_CONFIRM'
  WHEN `repair_status` IN ('POSTED', 'REPAIRING') THEN 'IN_REPAIR'
  WHEN `repair_status` IN ('READY_FOR_PICKUP', 'COMPLETED') THEN 'DONE'
  ELSE `repair_status`
END;

UPDATE `REPAIRS`
SET `fee_policy` = CASE WHEN `under_warranty` = TRUE THEN 'WARRANTY' ELSE 'PAID' END,
    `customer_share_percent` = CASE WHEN `under_warranty` = TRUE THEN 0.00 ELSE 100.00 END,
    `customer_pay_amount` = CASE WHEN `under_warranty` = TRUE THEN 0.0000 ELSE `total_amount` END,
    `company_covered_amount` = CASE WHEN `under_warranty` = TRUE THEN `total_amount` ELSE 0.0000 END
WHERE `fee_policy` IS NULL;

ALTER TABLE `REPAIRS`
  ADD CONSTRAINT `chk_rep_status_v3` CHECK (`repair_status` IN (
    'DRAFT', 'WAITING_CONFIRM', 'WAITING_STOCK', 'IN_REPAIR',
    'WAITING_SCRAP_RETURN', 'DONE', 'CANCELLED')),
  ADD CONSTRAINT `chk_rep_fee_policy` CHECK (`fee_policy` IS NULL OR `fee_policy` IN ('WARRANTY', 'PAID', 'PARTIAL')),
  ADD CONSTRAINT `chk_rep_customer_share` CHECK (`customer_share_percent` IS NULL OR (`customer_share_percent` >= 0 AND `customer_share_percent` <= 100)),
  ADD CONSTRAINT `chk_rep_outcome` CHECK (`repair_outcome` IS NULL OR `repair_outcome` IN ('SUCCESS', 'FAILED', 'CUSTOMER_DECLINED', 'UNREPAIRABLE')),
  ADD CONSTRAINT `fk_rep_assigned_technician` FOREIGN KEY (`assigned_technician_id`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_rep_scrap_warehouse` FOREIGN KEY (`scrap_warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  ADD UNIQUE KEY `uk_rep_handover_code` (`handover_code`),
  ADD INDEX `idx_rep_assignee_status` (`assigned_technician_id`, `repair_status`);

ALTER TABLE `REPAIRS`
  ADD COLUMN `active_serial_id` BIGINT UNSIGNED
    GENERATED ALWAYS AS (CASE WHEN `repair_status` NOT IN ('DONE', 'CANCELLED') THEN `serial_number_id` ELSE NULL END) STORED,
  ADD UNIQUE KEY `uk_rep_active_serial` (`active_serial_id`);

ALTER TABLE `WAREHOUSES`
  ADD COLUMN `scrap_warehouse_id` BIGINT UNSIGNED NULL AFTER `type`,
  ADD CONSTRAINT `fk_warehouse_scrap_warehouse`
    FOREIGN KEY (`scrap_warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT;

CREATE TABLE `REPAIR_MIGRATION_ISSUES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `repair_id` BIGINT UNSIGNED NOT NULL,
  `issue_code` VARCHAR(50) NOT NULL,
  `detail` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_repair_migration_issue` (`repair_id`, `issue_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `REPAIR_MIGRATION_ISSUES` (`repair_id`, `issue_code`, `detail`)
SELECT r.`id`, 'TECHNICIAN_NOT_MAPPED', CONCAT('responsible_person=', COALESCE(r.`responsible_person`, '<null>'))
FROM `REPAIRS` r
WHERE r.`repair_status` NOT IN ('DONE', 'CANCELLED')
  AND r.`assigned_technician_id` IS NULL;

INSERT IGNORE INTO `REPAIR_MIGRATION_ISSUES` (`repair_id`, `issue_code`, `detail`)
SELECT r.`id`, 'SCRAP_WAREHOUSE_NOT_MAPPED', CONCAT('warehouse_id=', COALESCE(r.`warehouse_id`, 0))
FROM `REPAIRS` r
LEFT JOIN `WAREHOUSES` w ON w.`id` = r.`warehouse_id`
WHERE r.`repair_status` NOT IN ('DONE', 'CANCELLED')
  AND (w.`id` IS NULL OR w.`scrap_warehouse_id` IS NULL);

SET @drop_repair_line_action = (
  SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `REPAIR_LINES` DROP CHECK `chk_repair_line_action`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'REPAIR_LINES'
    AND CONSTRAINT_NAME = 'chk_repair_line_action'
);
PREPARE stmt FROM @drop_repair_line_action;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `REPAIR_LINES`
  ADD COLUMN `removed_variant_id` BIGINT UNSIGNED NULL AFTER `replacement_serial_number_text`,
  ADD COLUMN `removed_quantity` DECIMAL(15,4) NULL AFTER `removed_variant_id`,
  ADD COLUMN `scrap_condition` VARCHAR(50) NULL AFTER `removed_quantity`,
  ADD CONSTRAINT `fk_repair_line_removed_variant`
    FOREIGN KEY (`removed_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `chk_repair_line_action_v2` CHECK (`action_type` IN ('ADD', 'REPLACE', 'REMOVE')),
  ADD CONSTRAINT `chk_repair_line_removed_qty` CHECK (`removed_quantity` IS NULL OR `removed_quantity` > 0);

ALTER TABLE `INVENTORY_DOCUMENTS`
  ADD COLUMN `document_role` VARCHAR(30) NULL AFTER `reference_repair_id`;

UPDATE `INVENTORY_DOCUMENTS`
SET `reference_type` = 'REPAIR',
    `reference_id` = COALESCE(`reference_id`, `reference_repair_id`),
    `document_role` = CASE
      WHEN `doc_type` = 'EX_SO' THEN 'PARTS_EXPORT'
      WHEN `doc_type` = 'IN_PO' AND `issue_purpose` = 'SCRAP' THEN 'SCRAP_IMPORT'
      ELSE NULL
    END
WHERE (`reference_type` = 'REPAIR' OR `reference_repair_id` IS NOT NULL)
  AND `document_role` IS NULL;

ALTER TABLE `INVENTORY_DOCUMENTS`
  ADD CONSTRAINT `chk_inv_doc_repair_role`
    CHECK (`document_role` IS NULL OR `document_role` IN ('PARTS_EXPORT', 'SCRAP_IMPORT')),
  ADD UNIQUE KEY `uk_inv_doc_reference_role` (`reference_type`, `reference_id`, `document_role`);

ALTER TABLE `STOCK_RESERVATIONS`
  MODIFY COLUMN `sales_order_id` BIGINT UNSIGNED NULL,
  ADD COLUMN `repair_id` BIGINT UNSIGNED NULL AFTER `sales_order_id`,
  ADD CONSTRAINT `fk_reservation_repair`
    FOREIGN KEY (`repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chk_reservation_owner`
    CHECK ((`sales_order_id` IS NOT NULL) + (`repair_id` IS NOT NULL) = 1),
  ADD UNIQUE KEY `uk_repair_variant_warehouse_reserve` (`repair_id`, `variant_id`, `warehouse_id`);

ALTER TABLE `PAYMENT_TRANSACTIONS`
  ADD COLUMN `reference_type` VARCHAR(30) NULL AFTER `partner_id`,
  ADD COLUMN `reference_id` BIGINT UNSIGNED NULL AFTER `reference_type`,
  ADD COLUMN `idempotency_key` VARCHAR(100) NULL AFTER `reference_id`,
  ADD COLUMN `created_by` BIGINT UNSIGNED NULL AFTER `note`,
  ADD UNIQUE KEY `uk_payment_idempotency_key` (`idempotency_key`),
  ADD UNIQUE KEY `uk_payment_reference_type` (`reference_type`, `reference_id`, `type`);

-- Accountant owns Repair intake/finance; Technician works assigned repairs;
-- Warehouse Controller needs read access to follow linked documents.
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('repair:view', 'repair:add', 'repair:edit', 'repair:delete')
WHERE r.code IN ('ROLE_ACCOUNTANT', 'ACCOUNTANT', 'ROLE_TECHNICIAN', 'TECHNICIAN');

INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code = 'repair:view'
WHERE r.code IN ('ROLE_WAREHOUSE_CONTROLLER', 'WAREHOUSE_CONTROLLER');
