ALTER TABLE payment_transactions
    ADD COLUMN posted_at DATETIME(6) NULL AFTER created_at;

UPDATE payment_transactions
SET posted_at = created_at
WHERE status = 'POSTED' AND posted_at IS NULL;

CREATE INDEX idx_payment_status_posted_at
    ON payment_transactions (status, posted_at);

ALTER TABLE sales_orders
    ADD COLUMN posted_at DATETIME(6) NULL AFTER updated_at;

UPDATE sales_orders so
LEFT JOIN (
    SELECT d.sales_order_id, MAX(l.movement_at) AS last_movement_at
    FROM inventory_documents d
    JOIN inventory_ledger l ON l.inventory_document_id = d.id
    WHERE d.sales_order_id IS NOT NULL
      AND d.doc_type = 'EX_SO'
    GROUP BY d.sales_order_id
) posted_export ON posted_export.sales_order_id = so.id
SET so.posted_at = COALESCE(posted_export.last_movement_at, so.updated_at, so.created_at)
WHERE so.status = 'POSTED' AND so.posted_at IS NULL;

CREATE INDEX idx_sales_order_status_posted_at
    ON sales_orders (status, posted_at);

ALTER TABLE partner_ledger
    ADD COLUMN account_type VARCHAR(20) NULL AFTER partner_id;

UPDATE partner_ledger
SET account_type = CASE
    WHEN entity_type LIKE '%VOUCHER%'
      OR entity_type LIKE '%IMPORT%'
      OR entity_type LIKE '%PURCHASE%' THEN 'PAYABLE'
    ELSE 'RECEIVABLE'
END
WHERE account_type IS NULL;

UPDATE partner_ledger pl
JOIN (
    SELECT id,
           SUM(amount_debt - amount_receipt) OVER (
               PARTITION BY partner_id, account_type
               ORDER BY created_at, id
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
           ) AS recalculated_balance
    FROM partner_ledger
) balances ON balances.id = pl.id
SET pl.balance_after = balances.recalculated_balance;

ALTER TABLE partner_ledger
    MODIFY COLUMN account_type VARCHAR(20) NOT NULL;

CREATE INDEX idx_partner_ledger_account_created
    ON partner_ledger (partner_id, account_type, created_at, id);

