CREATE DATABASE IF NOT EXISTS `duylongcomputer` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `duylongcomputer`;

SET FOREIGN_KEY_CHECKS = 0;

-- ====================================================================
-- PHÂN HỆ 1: CƠ CẤU TỔ CHỨC & PHÂN QUYỀN (RBAC)
-- ====================================================================

CREATE TABLE `USERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) UNIQUE,
  `phone` VARCHAR(20) UNIQUE,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_users_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ROLES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_roles_status` CHECK (`status` IN ('DRAFT', 'APPROVED', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PERMISSIONS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_permissions_status` CHECK (`status` IN ('DRAFT', 'APPROVED', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `USER_ROLES` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `USERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `ROLES` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ROLE_PERMISSIONS` (
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `ROLES` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `PERMISSIONS` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 2: ĐỐI TÁC, CÔNG NỢ & TÀI CHÍNH (TIỀN THU / TIỀN CHI)
-- ====================================================================

CREATE TABLE `WAREHOUSES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `address` TEXT,
  `type` VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `version` BIGINT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_warehouses_status` CHECK (`status` IN ('DRAFT', 'APPROVED', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `USER_WAREHOUSE_ROLES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_warehouse_role` (`user_id`, `warehouse_id`, `role_id`),
  CONSTRAINT `fk_uwr_user` FOREIGN KEY (`user_id`) REFERENCES `USERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uwr_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_uwr_role` FOREIGN KEY (`role_id`) REFERENCES `ROLES` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PARTNERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `type` VARCHAR(20) NOT NULL DEFAULT 'COMPANY',
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `address` TEXT,
  `tax_code` VARCHAR(50),
  `is_customer` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_supplier` BOOLEAN NOT NULL DEFAULT FALSE,
  `parent_id` BIGINT UNSIGNED NULL,
  `credit_limit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_term_days` INT NOT NULL DEFAULT 0,
  `bank_account_number` VARCHAR(50),
  `bank_name` VARCHAR(100),
  `bank_beneficiary_name` VARCHAR(100),
  `group_type` VARCHAR(50) NOT NULL DEFAULT 'RETAIL',
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_partners_parent` FOREIGN KEY (`parent_id`) REFERENCES `PARTNERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_partners_type` CHECK (`type` IN ('INDIVIDUAL', 'COMPANY')),
  CONSTRAINT `chk_partners_group` CHECK (`group_type` IN ('RETAIL', 'WHOLESALE', 'DISTRIBUTOR')),
  CONSTRAINT `chk_partners_credit` CHECK (`credit_limit` >= 0.00),
  CONSTRAINT `chk_partners_term` CHECK (`payment_term_days` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PARTNER_LEDGER` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `entity_type` VARCHAR(30) NOT NULL,
  `entity_id` BIGINT UNSIGNED NOT NULL,
  `reference_code` VARCHAR(50) NOT NULL,
  `amount_debt` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `amount_receipt` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `balance_after` DECIMAL(15,2) NOT NULL,
  `note` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_partner_ledger_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_p_ledger_debt` CHECK (`amount_debt` >= 0.00),
  CONSTRAINT `chk_p_ledger_receipt` CHECK (`amount_receipt` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PAYMENT_VOUCHERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `voucher_code` VARCHAR(50) NOT NULL UNIQUE,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(30) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pv_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pv_user` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_pv_amount` CHECK (`amount` > 0.00),
  CONSTRAINT `chk_pv_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PAYMENT_RECEIPTS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `receipt_code` VARCHAR(50) NOT NULL UNIQUE,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(30) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pr_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_pr_user` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_pr_amount` CHECK (`amount` > 0.00),
  CONSTRAINT `chk_pr_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 3: QUẢN LÝ SẢN PHẨM (PIM - SINGLE SKU ARCHITECTURE)
-- ====================================================================

CREATE TABLE `BRANDS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PRODUCT_CATEGORIES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `parent_id` BIGINT UNSIGNED NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `PRODUCT_CATEGORIES` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UNITS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PRODUCTS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `brand_id` BIGINT UNSIGNED NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `unit_id` BIGINT UNSIGNED NOT NULL,
  `product_code` VARCHAR(50) NOT NULL UNIQUE,
  `product_name` VARCHAR(255) NOT NULL,
  `product_type` VARCHAR(50) NOT NULL,
  `sale_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
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

CREATE TABLE `PRODUCT_IMAGES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `PRODUCTS` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 4: THƯƠNG MẠI & GIỮ HÀNG KHO
-- ====================================================================

CREATE TABLE `PURCHASE_ORDERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `po_code` VARCHAR(50) NOT NULL UNIQUE,
  `po_date` DATE NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `note` TEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_po_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_po_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_po_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_po_amount` CHECK (`total_amount` >= 0.00),
  CONSTRAINT `chk_po_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `PURCHASE_ORDER_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `purchase_order_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(15,4) NOT NULL,
  `unit_price` DECIMAL(15,4) NOT NULL,
  `line_amount` DECIMAL(15,2) NOT NULL,
  `note` TEXT,
  CONSTRAINT `fk_pol_po` FOREIGN KEY (`purchase_order_id`) REFERENCES `PURCHASE_ORDERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pol_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_pol_qty` CHECK (`quantity` > 0.0000),
  CONSTRAINT `chk_pol_price` CHECK (`unit_price` >= 0.0000),
  CONSTRAINT `chk_pol_amount` CHECK (`line_amount` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SALES_ORDERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `so_code` VARCHAR(50) NOT NULL UNIQUE,
  `so_date` DATE NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `note` TEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_so_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_so_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_so_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_so_amount` CHECK (`total_amount` >= 0.00),
  CONSTRAINT `chk_so_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SALES_ORDER_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sales_order_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(15,4) NOT NULL,
  `unit_price` DECIMAL(15,4) NOT NULL,
  `line_amount` DECIMAL(15,2) NOT NULL,
  `note` TEXT,
  CONSTRAINT `fk_sol_so` FOREIGN KEY (`sales_order_id`) REFERENCES `SALES_ORDERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sol_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_sol_qty` CHECK (`quantity` > 0.0000),
  CONSTRAINT `chk_sol_price` CHECK (`unit_price` >= 0.0000),
  CONSTRAINT `chk_sol_amount` CHECK (`line_amount` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `STOCK_RESERVATIONS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sales_order_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `quantity_reserved` DECIMAL(15,4) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'HOLDING',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  UNIQUE KEY `uk_order_variant_warehouse_reserve` (`sales_order_id`, `variant_id`, `warehouse_id`),
  CONSTRAINT `fk_reservation_so` FOREIGN KEY (`sales_order_id`) REFERENCES `SALES_ORDERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reservation_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_reservation_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_reservation_qty` CHECK (`quantity_reserved` > 0.0000),
  CONSTRAINT `chk_reserve_status` CHECK (`status` IN ('HOLDING', 'FULFILLED', 'RELEASED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 5: ĐỊNH DANH CHI TIẾT LINH KIỆN (LOT / SERIAL)
-- ====================================================================

CREATE TABLE `LOT_BATCHES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `lot_code` VARCHAR(50) NOT NULL,
  `manufacture_date` DATE,
  `expiry_date` DATE,
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_lot_batch_warehouse` (`warehouse_id`, `variant_id`, `lot_code`),
  CONSTRAINT `fk_lot_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_lot_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_lot_status` CHECK (`status` IN ('DRAFT', 'APPROVED', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE `INVENTORY_COST_LAYERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `inventory_document_line_id` BIGINT UNSIGNED NOT NULL,
  `quantity_received` DECIMAL(15,4) NOT NULL,
  `quantity_layered` DECIMAL(15,4) NOT NULL,
  `unit_cost` DECIMAL(15,4) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_icl_wh` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_icl_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_icl_line` FOREIGN KEY (`inventory_document_line_id`) REFERENCES `INVENTORY_DOCUMENT_LINES` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_icl_qty_rec` CHECK (`quantity_received` > 0.0000),
  CONSTRAINT `chk_icl_qty_lay` CHECK (`quantity_layered` >= 0.0000),
  CONSTRAINT `chk_icl_cost` CHECK (`unit_cost` >= 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 7: LOGISTICS NỘI BỘ (TRANSFERS & STOCKTAKES)
-- ====================================================================

CREATE TABLE `STOCK_TRANSFERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transfer_code` VARCHAR(50) NOT NULL UNIQUE,
  `from_warehouse_id` BIGINT UNSIGNED NOT NULL,
  `to_warehouse_id` BIGINT UNSIGNED NOT NULL,
  `transfer_date` DATE NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `note` TEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_transfer_from_wh` FOREIGN KEY (`from_warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_transfer_to_wh` FOREIGN KEY (`to_warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_transfer_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_transfer_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `USERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_st_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `STOCK_TRANSFER_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `stock_transfer_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(15,4) NOT NULL,
  `unit_cost` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `note` TEXT,
  CONSTRAINT `fk_transfer_line_transfer` FOREIGN KEY (`stock_transfer_id`) REFERENCES `STOCK_TRANSFERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transfer_line_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_st_line_qty` CHECK (`quantity` > 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `STOCKTAKES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `stocktake_code` VARCHAR(50) NOT NULL UNIQUE,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `stocktake_date` DATE NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `note` TEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_stocktake_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stocktake_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_stocktake_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `USERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_stocktake_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `STOCKTAKE_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `stocktake_id` BIGINT UNSIGNED NOT NULL,
  `variant_id` BIGINT UNSIGNED NOT NULL,
  `system_quantity` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `counted_quantity` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `difference_quantity` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `unit_cost` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `note` TEXT,
  CONSTRAINT `fk_stocktake_line_stocktake` FOREIGN KEY (`stocktake_id`) REFERENCES `STOCKTAKES` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stocktake_line_variant` FOREIGN KEY (`variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_stocktake_sys_qty` CHECK (`system_quantity` >= 0.0000),
  CONSTRAINT `chk_stocktake_cnt_qty` CHECK (`counted_quantity` >= 0.0000)
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

CREATE TABLE `REPAIRS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `warranty_id` BIGINT UNSIGNED NULL,
  `partner_id` BIGINT UNSIGNED NOT NULL,
  `serial_number_id` BIGINT UNSIGNED NOT NULL,
  `repair_code` VARCHAR(50) NOT NULL UNIQUE,
  `received_date` DATE NOT NULL,
  `completed_date` DATE NULL,
  `repair_status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `issue_description` TEXT NOT NULL,
  `solution_description` TEXT,
  `repair_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_repair_warranty` FOREIGN KEY (`warranty_id`) REFERENCES `WARRANTIES` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_repair_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_repair_serial` FOREIGN KEY (`serial_number_id`) REFERENCES `SERIAL_NUMBERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_repair_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_rep_cost` CHECK (`repair_cost` >= 0.00),
  CONSTRAINT `chk_rep_timeline` CHECK (`completed_date` >= `received_date` OR `completed_date` IS NULL),
  CONSTRAINT `chk_rep_status` CHECK (`repair_status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED', 'RECEIVED', 'REPAIRING'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 9: THAO TÁC SẢN XUẤT (LẮP RÁP PC & RÃ XÁC MÁY LINH KIỆN)
-- ====================================================================

CREATE TABLE `ASSEMBLY_BOMS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `bom_code` VARCHAR(50) NOT NULL UNIQUE,
  `bom_name` VARCHAR(150) NOT NULL,
  `version_no` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bom_product` FOREIGN KEY (`product_id`) REFERENCES `PRODUCTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_bom_status` CHECK (`status` IN ('DRAFT', 'APPROVED', 'INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ASSEMBLY_BOM_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `assembly_bom_id` BIGINT UNSIGNED NOT NULL,
  `component_variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(15,4) NOT NULL,
  `note` TEXT,
  CONSTRAINT `fk_bom_line_bom` FOREIGN KEY (`assembly_bom_id`) REFERENCES `ASSEMBLY_BOMS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bom_line_component` FOREIGN KEY (`component_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_bom_line_qty` CHECK (`quantity` > 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ASSEMBLY_ORDERS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_code` VARCHAR(50) NOT NULL UNIQUE,
  `order_type` VARCHAR(30) NOT NULL,
  `bom_id` BIGINT UNSIGNED NULL,
  `target_variant_id` BIGINT UNSIGNED NOT NULL,
  `warehouse_id` BIGINT UNSIGNED NOT NULL,
  `quantity` DECIMAL(15,4) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  `execution_date` DATE NOT NULL,
  `note` TEXT,
  `created_by` BIGINT UNSIGNED NOT NULL,
  `approved_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ao_bom` FOREIGN KEY (`bom_id`) REFERENCES `ASSEMBLY_BOMS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ao_variant` FOREIGN KEY (`target_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ao_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `WAREHOUSES` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ao_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ao_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `USERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_ao_type` CHECK (`order_type` IN ('ASSEMBLY', 'DISASSEMBLY')),
  CONSTRAINT `chk_ao_qty` CHECK (`quantity` > 0.0000),
  CONSTRAINT `chk_ao_status` CHECK (`status` IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ASSEMBLY_ORDER_LINES` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `assembly_order_id` BIGINT UNSIGNED NOT NULL,
  `component_variant_id` BIGINT UNSIGNED NOT NULL,
  `quantity_required` DECIMAL(15,4) NOT NULL,
  `quantity_actual` DECIMAL(15,4) NOT NULL,
  `unit_cost` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  `note` TEXT,
  CONSTRAINT `fk_aol_order` FOREIGN KEY (`assembly_order_id`) REFERENCES `ASSEMBLY_ORDERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aol_component` FOREIGN KEY (`component_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_aol_qty_req` CHECK (`quantity_required` > 0.0000),
  CONSTRAINT `chk_aol_qty_act` CHECK (`quantity_actual` > 0.0000),
  CONSTRAINT `chk_aol_cost` CHECK (`unit_cost` >= 0.0000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================================================
-- PHÂN HỆ 10: HỘP ĐEN BẢO MẬT HỆ THỐNG
-- ====================================================================

CREATE TABLE `AUDIT_LOGS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(50) NOT NULL,
  `entity_name` VARCHAR(100) NOT NULL,
  `entity_id` BIGINT UNSIGNED NULL,
  `detail` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `status` VARCHAR(20) NULL,
  `description` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `USERS` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ====================================================================
-- PHÂN HỆ 11: CHỈ MỤC TỐI ƯU HOÁ TỐC ĐỘ (INDEX PERFORMANCE)
-- ====================================================================

CREATE INDEX `idx_inv_docs_composite` ON `INVENTORY_DOCUMENTS` (`warehouse_id`, `doc_type`, `status`, `doc_date`);
CREATE INDEX `idx_inv_ledger_composite` ON `INVENTORY_LEDGER` (`warehouse_id`, `variant_id`, `movement_at`);
CREATE INDEX `idx_purchase_orders_lookup` ON `PURCHASE_ORDERS` (`partner_id`, `po_date`);
CREATE INDEX `idx_sales_orders_lookup` ON `SALES_ORDERS` (`partner_id`, `so_date`);
CREATE INDEX `idx_audit_logs_tracker` ON `AUDIT_LOGS` (`entity_name`, `entity_id`, `created_at`);
CREATE INDEX `idx_assembly_orders_lookup` ON `ASSEMBLY_ORDERS` (`warehouse_id`, `order_type`, `status`);

CREATE INDEX `idx_products_brand_id` ON `PRODUCTS` (`brand_id`);
CREATE INDEX `idx_products_category_id` ON `PRODUCTS` (`category_id`);
CREATE INDEX `idx_product_variants_product_id` ON `PRODUCT_VARIANTS` (`product_id`);
CREATE INDEX `idx_pol_variant_id` ON `PURCHASE_ORDER_LINES` (`variant_id`);
CREATE INDEX `idx_sol_variant_id` ON `SALES_ORDER_LINES` (`variant_id`);
CREATE INDEX `idx_inv_lines_variant_id` ON `INVENTORY_DOCUMENT_LINES` (`variant_id`);
CREATE INDEX `idx_serials_variant_id` ON `SERIAL_NUMBERS` (`variant_id`);
CREATE INDEX `idx_warranties_serial_id` ON `WARRANTIES` (`serial_number_id`);
CREATE INDEX `idx_ao_lines_component` ON `ASSEMBLY_ORDER_LINES` (`component_variant_id`);

CREATE INDEX `idx_partners_phone` ON `PARTNERS` (`phone`);
CREATE INDEX `idx_partners_tax_code` ON `PARTNERS` (`tax_code`);
CREATE INDEX `idx_inv_docs_users` ON `INVENTORY_DOCUMENTS` (`created_by`, `approved_by`);
CREATE INDEX `idx_pv_lookup` ON `PAYMENT_VOUCHERS` (`partner_id`, `status`);
CREATE INDEX `idx_pr_lookup` ON `PAYMENT_RECEIPTS` (`partner_id`, `status`);
