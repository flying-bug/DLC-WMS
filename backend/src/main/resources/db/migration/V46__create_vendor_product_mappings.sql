-- Bảng lưu lịch sử mapping tên hàng NCC với SKU hệ thống (OCR learning)
CREATE TABLE IF NOT EXISTS vendor_product_mappings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    partner_id BIGINT NOT NULL,
    vendor_product_name VARCHAR(500) NOT NULL,
    product_variant_id BIGINT NOT NULL,
    confirm_count INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT NULL,
    UNIQUE KEY uq_partner_vendor_name (
        partner_id,
        vendor_product_name
    ),
    CONSTRAINT fk_vpm_partner FOREIGN KEY (partner_id) REFERENCES partners (id),
    CONSTRAINT fk_vpm_variant FOREIGN KEY (product_variant_id) REFERENCES product_variants (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;