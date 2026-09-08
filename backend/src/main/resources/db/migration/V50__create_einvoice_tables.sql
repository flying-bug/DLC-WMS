-- ==========================================================
-- V50: Create E-Invoice (Hóa đơn điện tử) Tables
-- Follows Nghị định 254/2026/NĐ-CP & Thông tư 91/2026/TT-BTC
-- ==========================================================

CREATE TABLE IF NOT EXISTS `E_INVOICES` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `sales_order_id` BIGINT NULL,
    `partner_id` BIGINT NOT NULL,
    `invoice_type` VARCHAR(20) NOT NULL DEFAULT '1' COMMENT '1: GTGT, 2: Bán hàng, 1M: GTGT máy tính tiền, 2M: Bán hàng máy tính tiền',
    `template_code` VARCHAR(50) NOT NULL COMMENT 'Ký hiệu mẫu số (VD: 1/001, 1/247)',
    `invoice_series` VARCHAR(50) NOT NULL COMMENT 'Ký hiệu hóa đơn (VD: 1C26TLL, 1M26TLL)',
    `invoice_number` VARCHAR(50) NULL COMMENT 'Số hóa đơn (VD: 0000001)',
    `invoice_date` DATE NOT NULL COMMENT 'Ngày lập hóa đơn',
    `issued_at` DATETIME(6) NULL COMMENT 'Thời điểm ký số phát hành',
    `status` VARCHAR(30) NOT NULL DEFAULT 'ISSUED' COMMENT 'DRAFT, ISSUED, CANCELED, REPLACED, ADJUSTED',
    
    -- Thông tin người mua tại thời điểm xuất HĐ
    `buyer_name` VARCHAR(150) NULL,
    `buyer_legal_name` VARCHAR(255) NULL,
    `buyer_tax_code` VARCHAR(50) NULL,
    `buyer_address` TEXT NULL,
    `buyer_phone` VARCHAR(30) NULL,
    `buyer_email` VARCHAR(150) NULL,
    
    -- Tiền tệ & Thanh toán
    `currency_code` VARCHAR(10) NOT NULL DEFAULT 'VND',
    `exchange_rate` DECIMAL(15, 4) NOT NULL DEFAULT 1.0000,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'TM/CK' COMMENT 'TM/CK, TM, CK',
    `sub_total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tổng tiền hàng chưa thuế',
    `vat_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tổng tiền thuế VAT',
    `total_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 COMMENT 'Tổng thanh toán đã gồm thuế',
    `total_amount_in_words` VARCHAR(500) NULL COMMENT 'Số tiền bằng chữ',
    
    -- Cơ quan Thuế & Chữ ký số
    `cqt_code` VARCHAR(100) NULL COMMENT 'Mã của Cơ quan Thuế cấp',
    `cqt_status` VARCHAR(50) NOT NULL DEFAULT 'VALID' COMMENT 'VALID, PENDING, REJECTED, NONE',
    `transaction_uuid` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Mã định danh giao dịch chống trùng',
    `provider` VARCHAR(50) NOT NULL DEFAULT 'MOCK' COMMENT 'VIETTEL, MISA, XINVOICE, MOCK',
    
    -- Tra cứu & Lưu trữ
    `view_url` TEXT NULL COMMENT 'Link tra cứu hóa đơn online',
    `pdf_url` TEXT NULL COMMENT 'Link hoặc đường dẫn tải PDF',
    `pdf_data` LONGTEXT NULL COMMENT 'Dữ liệu Base64 PDF (nếu lưu trực tiếp)',
    `xml_data` LONGTEXT NULL COMMENT 'Dữ liệu XML hóa đơn gốc',
    `raw_request` LONGTEXT NULL COMMENT 'Payload gửi sang nhà cung cấp HĐĐT',
    `raw_response` LONGTEXT NULL COMMENT 'Kết quả trả về từ nhà cung cấp HĐĐT',
    `cancel_reason` TEXT NULL COMMENT 'Lý do hủy nếu status=CANCELED',
    `canceled_at` DATETIME(6) NULL,
    `canceled_by` BIGINT NULL,
    
    -- Audit logs
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    CONSTRAINT `fk_e_invoices_so` FOREIGN KEY (`sales_order_id`) REFERENCES `SALES_ORDERS` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_e_invoices_partner` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`),
    CONSTRAINT `fk_e_invoices_created_by` FOREIGN KEY (`created_by`) REFERENCES `USERS` (`id`),
    INDEX `idx_einvoices_so` (`sales_order_id`),
    INDEX `idx_einvoices_partner` (`partner_id`),
    INDEX `idx_einvoices_number` (`invoice_series`, `invoice_number`),
    INDEX `idx_einvoices_date` (`invoice_date`),
    INDEX `idx_einvoices_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
