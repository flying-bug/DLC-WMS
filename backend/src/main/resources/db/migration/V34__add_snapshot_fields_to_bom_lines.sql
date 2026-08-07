-- Add snapshot fields to assembly_bom_lines to preserve component details at the time of BOM creation/editing
ALTER TABLE assembly_bom_lines
ADD COLUMN unit_price DECIMAL(15, 2),
ADD COLUMN component_sku VARCHAR(100),
ADD COLUMN component_name VARCHAR(255),
ADD COLUMN warranty_months INT;
