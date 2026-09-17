-- V62__update_repair_schema_for_odoo_workflow.sql
-- TASK-02: Rename ASSIGNED to DIAGNOSING
UPDATE `REPAIRS` SET `repair_status` = 'DIAGNOSING' WHERE `repair_status` = 'ASSIGNED';

-- Drop the old check constraint so we can freely use DIAGNOSING and WAITING_FOR_PARTS
SET @drop_rep_status = (
  SELECT IF(COUNT(*) > 0,
    'ALTER TABLE `REPAIRS` DROP CHECK `chk_rep_status_v3`',
    'SELECT 1')
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'REPAIRS'
    AND CONSTRAINT_NAME = 'chk_rep_status_v3'
);
PREPARE stmt FROM @drop_rep_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- TASK-14: Add repair_id to E_INVOICES
ALTER TABLE `E_INVOICES`
ADD COLUMN `repair_id` BIGINT UNSIGNED NULL AFTER `sales_order_id`,
ADD CONSTRAINT `fk_e_invoices_repair` FOREIGN KEY (`repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE SET NULL;
