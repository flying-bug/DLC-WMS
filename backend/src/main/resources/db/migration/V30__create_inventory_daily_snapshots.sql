CREATE TABLE IF NOT EXISTS `INVENTORY_DAILY_SNAPSHOTS` (
    `id`                BIGINT AUTO_INCREMENT PRIMARY KEY,
    `snapshot_date`     DATE NOT NULL,
    `warehouse_id`      BIGINT NOT NULL,
    `variant_id`        BIGINT NOT NULL,
    `closing_quantity`  DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
    `closing_value`     DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
    `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_daily_snapshot` (`snapshot_date`, `warehouse_id`, `variant_id`),
    CONSTRAINT `fk_ids_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ids_variant`   FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_daily_snapshot_date_wh` ON `INVENTORY_DAILY_SNAPSHOTS` (`snapshot_date`, `warehouse_id`);
