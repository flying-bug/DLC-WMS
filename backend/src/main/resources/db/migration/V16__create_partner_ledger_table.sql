CREATE TABLE IF NOT EXISTS `PARTNER_LEDGER` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `partner_id` BIGINT NOT NULL,
  `entity_type` VARCHAR(30) NOT NULL, 
  `entity_id` BIGINT NOT NULL,
  `reference_code` VARCHAR(50) NOT NULL,
  `amount_debt` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `amount_receipt` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `balance_after` DECIMAL(15,2) NOT NULL,
  `note` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_partner_ledger_partner_v16` FOREIGN KEY (`partner_id`) REFERENCES `PARTNERS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_p_ledger_debt_v16` CHECK (`amount_debt` >= 0.00),
  CONSTRAINT `chk_p_ledger_receipt_v16` CHECK (`amount_receipt` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
