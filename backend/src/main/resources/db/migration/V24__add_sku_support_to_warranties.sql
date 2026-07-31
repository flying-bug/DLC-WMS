-- V24__add_sku_support_to_warranties.sql

-- Bỏ bắt buộc nhập (NOT NULL) của cột serial_number_id
ALTER TABLE WARRANTIES MODIFY serial_number_id BIGINT NULL;

-- Thêm cột product_variant_id để hỗ trợ bảo hành theo SKU (tùy chọn)
ALTER TABLE WARRANTIES ADD product_variant_id BIGINT NULL;

-- Thêm cột quantity để lưu số lượng bảo hành cho SKU (tùy chọn)
ALTER TABLE WARRANTIES ADD quantity DECIMAL(10,2) NULL;

-- Tạo khóa ngoại cho product_variant_id
ALTER TABLE WARRANTIES ADD CONSTRAINT fk_warranty_product_variant 
    FOREIGN KEY (product_variant_id) REFERENCES PRODUCT_VARIANTS(id);
