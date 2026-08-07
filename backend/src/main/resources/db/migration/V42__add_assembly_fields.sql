-- V36 Migration for Assembly and Disassembly Management
-- Adds quantity_produced to ASSEMBLY_ORDERS
ALTER TABLE `ASSEMBLY_ORDERS` 
ADD COLUMN `quantity_produced` DECIMAL(15,4) NOT NULL DEFAULT 0.0000 AFTER `quantity`;
