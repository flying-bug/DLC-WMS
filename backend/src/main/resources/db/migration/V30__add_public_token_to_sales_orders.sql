ALTER TABLE SALES_ORDERS ADD COLUMN public_token VARCHAR(36) UNIQUE;

-- Populate existing orders with a generated UUID.
-- In MySQL, we can use UUID(). If this is H2 (for tests), it might be UUID() or random_uuid().
-- Assuming MySQL based on typical setup.
UPDATE SALES_ORDERS SET public_token = UUID() WHERE public_token IS NULL;
