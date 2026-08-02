-- V25__refactor_warranties_to_header_lines.sql

CREATE TABLE WARRANTY_LINES (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    warranty_id BIGINT UNSIGNED NOT NULL,
    serial_number_id BIGINT UNSIGNED NULL,
    product_variant_id BIGINT UNSIGNED NULL,
    quantity DECIMAL(15,4) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    warranty_status VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
    FOREIGN KEY (warranty_id) REFERENCES WARRANTIES(id) ON DELETE CASCADE,
    FOREIGN KEY (serial_number_id) REFERENCES SERIAL_NUMBERS(id) ON DELETE RESTRICT,
    FOREIGN KEY (product_variant_id) REFERENCES PRODUCT_VARIANTS(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate data
INSERT INTO WARRANTY_LINES (warranty_id, serial_number_id, product_variant_id, quantity, start_date, end_date, warranty_status)
SELECT id, serial_number_id, product_variant_id, quantity, start_date, end_date, warranty_status
FROM WARRANTIES;

-- Drop foreign keys and columns from WARRANTIES
ALTER TABLE WARRANTIES DROP FOREIGN KEY fk_warranty_serial;
ALTER TABLE WARRANTIES DROP FOREIGN KEY fk_warranty_product_variant;

ALTER TABLE WARRANTIES 
DROP COLUMN serial_number_id,
DROP COLUMN product_variant_id,
DROP COLUMN quantity;
