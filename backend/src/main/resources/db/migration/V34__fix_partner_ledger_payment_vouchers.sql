-- Sửa các bản ghi PAYMENT_VOUCHER ghi nhầm số tiền thanh toán vào amount_debt thành amount_receipt
UPDATE `PARTNER_LEDGER`
SET `amount_receipt` = `amount_debt`, `amount_debt` = 0.00
WHERE `entity_type` = 'PAYMENT_VOUCHER' AND `amount_debt` > 0.00 AND `amount_receipt` = 0.00;
