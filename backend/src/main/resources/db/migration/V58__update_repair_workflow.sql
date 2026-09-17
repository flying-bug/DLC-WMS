-- V58__update_repair_workflow.sql
-- Thêm trường external_device_status
ALTER TABLE `REPAIRS`
ADD COLUMN `external_device_status` VARCHAR(255) NULL;

-- Migrate các trạng thái cũ sang State Machine mới
UPDATE `REPAIRS` SET `repair_status` = 'ASSIGNED' WHERE `repair_status` = 'WAITING_CONFIRM';
UPDATE `REPAIRS` SET `repair_status` = 'APPROVED' WHERE `repair_status` = 'WAITING_STOCK';
UPDATE `REPAIRS` SET `repair_status` = 'UNDER_REPAIR' WHERE `repair_status` = 'IN_REPAIR';
UPDATE `REPAIRS` SET `repair_status` = 'UNDER_REPAIR' WHERE `repair_status` = 'WAITING_SCRAP_RETURN';
UPDATE `REPAIRS` SET `repair_status` = 'READY_FOR_DELIVERY' WHERE `repair_status` = 'DONE';
