ALTER TABLE `ASSEMBLY_BOMS`
    MODIFY COLUMN `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `submitted_by` BIGINT NULL,
    ADD COLUMN `submitted_at` DATETIME NULL,
    ADD COLUMN `approved_by` BIGINT NULL,
    ADD COLUMN `approved_at` DATETIME NULL,
    ADD COLUMN `rejected_by` BIGINT NULL,
    ADD COLUMN `rejected_at` DATETIME NULL,
    ADD COLUMN `rejection_reason` TEXT NULL;

ALTER TABLE `ASSEMBLY_ORDERS`
    ADD COLUMN `row_version` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `submitted_by` BIGINT NULL,
    ADD COLUMN `submitted_at` DATETIME NULL,
    ADD COLUMN `approved_at` DATETIME NULL,
    ADD COLUMN `rejected_by` BIGINT NULL,
    ADD COLUMN `rejected_at` DATETIME NULL,
    ADD COLUMN `rejection_reason` TEXT NULL,
    ADD COLUMN `cancel_requested_by` BIGINT NULL,
    ADD COLUMN `cancel_requested_at` DATETIME NULL,
    ADD COLUMN `cancellation_reason` TEXT NULL,
    ADD COLUMN `cancel_confirmed_by` BIGINT NULL,
    ADD COLUMN `cancel_confirmed_at` DATETIME NULL,
    ADD COLUMN `cancelled_by` BIGINT NULL,
    ADD COLUMN `cancelled_at` DATETIME NULL,
    ADD COLUMN `cancellation_settlement_status` VARCHAR(30) NOT NULL DEFAULT 'NONE';

ALTER TABLE `INVENTORY_DOCUMENTS`
    ADD COLUMN `assembly_order_reference_id` BIGINT
        GENERATED ALWAYS AS (
            CASE WHEN `reference_type` = 'ASSEMBLY_ORDER' THEN `reference_id` ELSE NULL END
        ) STORED,
    ADD UNIQUE INDEX `uq_assembly_order_document_pair` (`assembly_order_reference_id`, `doc_type`);

UPDATE `ASSEMBLY_ORDERS`
SET `status` = CASE
    WHEN `status` IN ('POSTED', 'SUBMITTED') THEN 'COMPLETED'
    WHEN `status` = 'APPROVED' AND EXISTS (
        SELECT 1 FROM `INVENTORY_DOCUMENTS` d
        WHERE d.`reference_type` = 'ASSEMBLY_ORDER'
          AND d.`reference_id` = `ASSEMBLY_ORDERS`.`id`
          AND d.`doc_type` = 'EX_SO'
          AND d.`status` = 'POSTED'
    ) THEN 'IN_PROGRESS'
    ELSE `status`
END;
