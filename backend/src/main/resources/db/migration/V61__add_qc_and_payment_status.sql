-- Add QC and payment status fields to repair table
ALTER TABLE repair 
ADD COLUMN qc_result VARCHAR(50),
ADD COLUMN qc_note TEXT,
ADD COLUMN qc_checklist TEXT,
ADD COLUMN technical_completed_at DATETIME,
ADD COLUMN technical_completed_by BIGINT,
ADD COLUMN payment_status VARCHAR(50) DEFAULT 'UNPAID';
