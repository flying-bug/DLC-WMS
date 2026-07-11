-- V2 Migration for Assembly and Disassembly Management
-- Adds cost_allocation_pct to ASSEMBLY_BOM_LINES
ALTER TABLE `ASSEMBLY_BOM_LINES` 
ADD COLUMN `cost_allocation_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `quantity`;

-- Adds quantity_produced to ASSEMBLY_ORDERS
ALTER TABLE `ASSEMBLY_ORDERS` 
ADD COLUMN `quantity_produced` DECIMAL(15,4) NOT NULL DEFAULT 0.0000 AFTER `quantity`;
