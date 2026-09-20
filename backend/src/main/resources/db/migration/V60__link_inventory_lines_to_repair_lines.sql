ALTER TABLE inventory_document_lines
    ADD COLUMN repair_line_id BIGINT UNSIGNED NULL;

CREATE INDEX idx_inv_doc_lines_repair_line_id
    ON inventory_document_lines (repair_line_id);
