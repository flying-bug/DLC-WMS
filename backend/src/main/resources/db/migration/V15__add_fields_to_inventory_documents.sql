ALTER TABLE inventory_documents
ADD COLUMN recipient_name VARCHAR(150) NULL,
ADD COLUMN recipient_address TEXT NULL,
ADD COLUMN salesperson_id BIGINT NULL;
