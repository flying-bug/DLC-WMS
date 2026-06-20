-- Make entity_id nullable in AUDIT_LOGS to prevent transaction failures on entity-less logs
ALTER TABLE `AUDIT_LOGS` MODIFY COLUMN `entity_id` BIGINT UNSIGNED NULL;
