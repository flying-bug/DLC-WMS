-- ====================================================================
-- Migration V20: Bổ sung cột vat_rate cho INVENTORY_DOCUMENT_LINES
-- ====================================================================

ALTER TABLE `INVENTORY_DOCUMENT_LINES`
ADD COLUMN `vat_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `unit_price`;
