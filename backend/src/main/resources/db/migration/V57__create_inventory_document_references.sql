-- Cho phép 1 phiếu kho tham chiếu tới nhiều chứng từ khác (đính kèm 1-N),
-- khác với các cột purchase_order_id/sales_order_id/reference_id hiện có trên
-- inventory_documents vốn mô tả nguồn gốc phát sinh (1-1) và vẫn giữ nguyên.
-- Dùng ngay cho luồng "Bỏ ghi sổ": phiếu mới tạo ra sẽ tham chiếu ngược về
-- phiếu cũ vừa bị hủy (reference_type = 'UNPOST_SOURCE').
CREATE TABLE IF NOT EXISTS inventory_document_references (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inventory_document_id BIGINT NOT NULL,
    reference_doc_id BIGINT NOT NULL,
    reference_type VARCHAR(30) NOT NULL,
    note VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_idr_document FOREIGN KEY (inventory_document_id) REFERENCES inventory_documents (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
