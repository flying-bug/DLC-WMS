-- Chèn Khách hàng mẫu (Sử dụng INSERT IGNORE để không lỗi nếu id đã tồn tại)
INSERT IGNORE INTO `PARTNERS` (`id`, `code`, `type`, `name`, `is_customer`, `is_supplier`, `credit_limit`, `payment_term_days`, `status`, `created_at`)
VALUES (9991, 'KH-TEST-01', 'COMPANY', 'Khách hàng MISA Test', 1, 0, 100000000, 30, 'APPROVED', NOW());

-- Chèn Nhà cung cấp mẫu
INSERT IGNORE INTO `PARTNERS` (`id`, `code`, `type`, `name`, `is_customer`, `is_supplier`, `credit_limit`, `payment_term_days`, `status`, `created_at`)
VALUES (9992, 'NCC-TEST-01', 'COMPANY', 'Nhà cung cấp MISA Test', 0, 1, 500000000, 30, 'APPROVED', NOW());

-- Chèn dữ liệu sổ chi tiết công nợ (PARTNER_LEDGER)
INSERT INTO `PARTNER_LEDGER` (`partner_id`, `entity_type`, `entity_id`, `reference_code`, `amount_debt`, `amount_receipt`, `balance_after`, `note`, `created_at`)
VALUES 
-- Giao dịch của khách hàng (KH nợ mình -> trả tiền)
(9991, 'SALES_ORDER', 1, 'SO-TEST-001', 5000000.00, 0.00, 5000000.00, 'Ghi nợ từ đơn bán hàng SO-TEST-001', '2026-07-01 10:00:00'),
(9991, 'PAYMENT_RECEIPT', 1, 'PT-TEST-001', 0.00, 2000000.00, 3000000.00, 'Khách hàng thanh toán một phần (Phiếu Thu PT-TEST-001)', '2026-07-05 14:30:00'),

-- Giao dịch của nhà cung cấp (Mình nợ NCC -> chi tiền)
(9992, 'PURCHASE_ORDER', 1, 'PO-TEST-001', 15000000.00, 0.00, 15000000.00, 'Ghi nợ phải trả từ đơn nhập hàng PO-TEST-001', '2026-07-02 08:00:00'),
(9992, 'PAYMENT_VOUCHER', 1, 'PC-TEST-001', 0.00, 15000000.00, 0.00, 'Thanh toán toàn bộ công nợ cho NCC (Phiếu Chi PC-TEST-001)', '2026-07-10 09:15:00');
