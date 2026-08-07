-- Add optimistic locking support for warehouse updates
ALTER TABLE `WAREHOUSES`
    ADD COLUMN `version` BIGINT NOT NULL DEFAULT 0;
