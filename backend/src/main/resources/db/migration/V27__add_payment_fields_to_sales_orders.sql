-- Bổ sung trường thanh toán công nợ vào bảng SALES_ORDERS
ALTER TABLE sales_orders ADD COLUMN paid_amount DECIMAL(15, 2) DEFAULT 0.00;
ALTER TABLE sales_orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'UNPAID';
ALTER TABLE sales_orders ADD COLUMN payment_due_date DATE;

-- Update existing records to UNPAID and 0
UPDATE sales_orders SET paid_amount = 0.00, payment_status = 'UNPAID' WHERE paid_amount IS NULL;
