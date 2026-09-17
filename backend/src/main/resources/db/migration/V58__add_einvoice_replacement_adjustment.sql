ALTER TABLE E_INVOICES
    ADD COLUMN original_invoice_id BIGINT NULL,
    ADD COLUMN adjustment_type VARCHAR(20) NULL,
    ADD CONSTRAINT fk_einvoice_original FOREIGN KEY (original_invoice_id) REFERENCES E_INVOICES(id);
