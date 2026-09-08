-- Thêm cột warehouse_id và target_warehouse_id vào inventory_document_lines
ALTER TABLE inventory_document_lines
ADD COLUMN warehouse_id BIGINT NULL,
ADD COLUMN target_warehouse_id BIGINT NULL;

-- Backfill warehouse_id từ inventory_documents nếu có dòng cũ
UPDATE inventory_document_lines idl
JOIN inventory_documents id ON idl.inventory_document_id = id.id
SET idl.warehouse_id = id.warehouse_id
WHERE idl.warehouse_id IS NULL AND id.warehouse_id IS NOT NULL;

-- Tạo index cho warehouse_id để tối ưu truy vấn
CREATE INDEX idx_inv_doc_lines_warehouse_id ON inventory_document_lines(warehouse_id);
CREATE INDEX idx_inv_doc_lines_target_wh ON inventory_document_lines(target_warehouse_id);
