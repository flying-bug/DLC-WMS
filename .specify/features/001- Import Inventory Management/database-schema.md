```sql
-- ====================================================================
-- PHÂN HỆ 2: KHO BÃI
-- ====================================================================

CREATE TABLE `WAREHOUSES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `address` TEXT,
  `type` VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_warehouses_status` CHECK (`status` IN ('DRAFT', 'APPROVED', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 3: QUẢN LÝ SẢN PHẨM
-- ====================================================================

CREATE TABLE `PRODUCTS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `brand_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `unit_id` BIGINT UNSIGNED NOT NULL,
  `product_code` VARCHAR(50) NOT NULL UNIQUE, 
  `product_name` VARCHAR(255) NOT NULL,
  `product_type` VARCHAR(50) NOT NULL, 
  `track_serial` BOOLEAN NOT NULL DEFAULT FALSE,
  `track_lot` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_assembly` BOOLEAN NOT NULL DEFAULT FALSE,
  `description` TEXT,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `BRANDS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `PRODUCT_CATEGORIES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_products_unit` FOREIGN KEY (`unit_id`) REFERENCES `UNITS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_products_type` CHECK (`product_type` IN ('PC', 'LAPTOP', 'COMPONENT', 'ACCESSORY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PRODUCT_VARIANTS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `sku` VARCHAR(50) NOT NULL UNIQUE,
  `variant_name` VARCHAR(255) NOT NULL,
  `cost_price` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `sale_price` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `manufacturer_part_number` VARCHAR(100) NULL,
  `specs_json` JSON NULL,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `PRODUCTS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_variants_cost` CHECK (`cost_price` >= 0.0000),
  CONSTRAINT `chk_variants_sale` CHECK (`sale_price` >= 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 5: ĐỊNH DANH CHI TIẾT LINH KIỆN (LOT / SERIAL)
-- ====================================================================

CREATE TABLE `SERIAL_NUMBERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `serial_number` VARCHAR(100) NOT NULL UNIQUE,
  `status` VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', 
  `purchase_order_line_id` BIGINT UNSIGNED NULL,
  `sales_order_line_id` BIGINT UNSIGNED NULL,
  `imported_at` DATETIME NULL,
  `sold_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_serial_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_serial_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_serial_po_line` FOREIGN KEY (`purchase_order_line_id`) REFERENCES `PURCHASE_ORDER_LINES` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_serial_so_line` FOREIGN KEY (`sales_order_line_id`) REFERENCES `SALES_ORDER_LINES` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_serial_status` CHECK (`status` IN ('AVAILABLE', 'SOLD', 'WARRANTY_HOLD', 'REPAIRING'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 6: QUẢN LÝ KHO CORE & ENGINE GIÁ VỐN ĐỢT NHẬP CHUẨN FIFO
-- ====================================================================

CREATE TABLE `INVENTORY_DOCUMENTS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `doc_code` VARCHAR(50) NOT NULL UNIQUE,
  `doc_type` VARCHAR(30) NOT NULL, 
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `source_warehouse_id` BIGINT UNSIGNED NULL,
  `purchase_order_id` BIGINT UNSIGNED NULL,
  `sales_order_id` BIGINT UNSIGNED NULL,
  `partner_id` BIGINT UNSIGNED NULL,
  `doc_date` DATE NOT NULL,
  `posted_at` DATETIME NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT', 
  `note` TEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inv_doc_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inv_doc_source_warehouse` FOREIGN KEY (`source_warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inv_doc_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `PURCHASE_ORDERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inv_doc_so` FOREIGN KEY (`sales_order_id`) REFERENCES `SALES_ORDERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inv_doc_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inv_doc_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inv_doc_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `USERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_inv_doc_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED')),
  CONSTRAINT `chk_inv_doc_type` CHECK (`doc_type` IN ('IN_PO', 'EX_SO', 'TRANSFER', 'STOCKTAKE', 'ASSEMBLY', 'DISASSEMBLY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `INVENTORY_DOCUMENT_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `inventory_document_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity_in` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `quantity_out` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `unit_cost` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `unit_price` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `line_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `lot_batch_id` BIGINT UNSIGNED NULL,
  `serial_number_id` BIGINT UNSIGNED NULL,
  `note` TEXT,
  CONSTRAINT `fk_inv_line_doc` FOREIGN KEY (`inventory_document_id`) REFERENCES `INVENTORY_DOCUMENTS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_line_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inv_line_lot` FOREIGN KEY (`lot_batch_id`) REFERENCES `LOT_BATCHES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inv_line_serial` FOREIGN KEY (`serial_number_id`) REFERENCES `SERIAL_NUMBERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_inv_line_movement` CHECK (`quantity_in` > 0.0000 OR `quantity_out` > 0.0000),
  CONSTRAINT `chk_inv_line_qty_in` CHECK (`quantity_in` >= 0.0000),
  CONSTRAINT `chk_inv_line_qty_out` CHECK (`quantity_out` >= 0.0000),
  CONSTRAINT `chk_inv_line_cost` CHECK (`unit_cost` >= 0.0000),
  CONSTRAINT `chk_inv_line_price` CHECK (`unit_price` >= 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `INVENTORY_BALANCES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `serial_number_id` BIGINT UNSIGNED NULL,
  `lot_batch_id` BIGINT UNSIGNED NULL,
  `stock_status` VARCHAR(30) NOT NULL DEFAULT 'GOOD',
  `quantity_on_hand` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `quantity_reserved` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `average_cost` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  `_idx_serial` BIGINT UNSIGNED GENERATED ALWAYS AS (IFNULL(`serial_number_id`, 0)) STORED,
  `_idx_lot` BIGINT UNSIGNED GENERATED ALWAYS AS (IFNULL(`lot_batch_id`, 0)) STORED,
  
  UNIQUE KEY `uk_balance_strict_key` (`warehouse_id`, `variant_id`, `_idx_serial`, `_idx_lot`, `stock_status`),
  CONSTRAINT `fk_balance_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_balance_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_balances_qoh` CHECK (`quantity_on_hand` >= 0.0000),
  CONSTRAINT `chk_balances_res` CHECK (`quantity_reserved` >= 0.0000),
  CONSTRAINT `chk_balances_cost` CHECK (`average_cost` >= 0.0000),
  CONSTRAINT `chk_balances_status` CHECK (`stock_status` IN ('GOOD', 'DEFECTIVE', 'USED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `INVENTORY_LEDGER` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `inventory_document_id` BIGINT UNSIGNED NOT NULL,
  `inventory_document_line_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `serial_number_id` BIGINT UNSIGNED NULL,
  `lot_batch_id` BIGINT UNSIGNED NULL,
  `movement_type` VARCHAR(30) NOT NULL, -- IN, OUT
  `quantity_in` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `quantity_out` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `unit_cost` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `balance_after` DECIMAL(15,4) NOT NULL,
  `movement_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ledger_doc` FOREIGN KEY (`inventory_document_id`) REFERENCES `INVENTORY_DOCUMENTS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ledger_line` FOREIGN KEY (`inventory_document_line_id`) REFERENCES `INVENTORY_DOCUMENT_LINES` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ledger_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ledger_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ledger_serial` FOREIGN KEY (`serial_number_id`) REFERENCES `SERIAL_NUMBERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ledger_lot` FOREIGN KEY (`lot_batch_id`) REFERENCES `LOT_BATCHES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_ledger_qty` CHECK (`quantity_in` > 0.0000 OR `quantity_out` > 0.0000),
  CONSTRAINT `chk_ledger_move` CHECK (`movement_type` IN ('IN', 'OUT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 8: DỊCH VỤ SAU BÁN HÀNG (WARRANTY & REPAIRS)
-- ====================================================================

CREATE TABLE `WARRANTIES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `serial_number_id` BIGINT UNSIGNED NOT NULL,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `sales_order_id` BIGINT UNSIGNED NOT NULL,
  `warranty_code` VARCHAR(50) NOT NULL UNIQUE,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `warranty_status` VARCHAR(30) NOT NULL DEFAULT 'APPROVED', 
  `note` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_warranty_serial` FOREIGN KEY (`serial_number_id`) REFERENCES `SERIAL_NUMBERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_warranty_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_warranty_so` FOREIGN KEY (`sales_order_id`) REFERENCES `SALES_ORDERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_warranty_dates` CHECK (`end_date` >= `start_date`),
  CONSTRAINT `chk_warranty_status` CHECK (`warranty_status` IN ('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED', 'EXPIRED', 'VOIDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;