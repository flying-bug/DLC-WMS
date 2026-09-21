ALTER TABLE `INVENTORY_COST_LAYERS`
    ADD COLUMN `quantity_reserved` DECIMAL(15,4) NOT NULL DEFAULT 0.0000 AFTER `quantity_layered`,
    ADD CONSTRAINT `chk_icl_qty_reserved` CHECK (`quantity_reserved` >= 0.0000 AND `quantity_reserved` <= `quantity_layered`);

CREATE TABLE `INVENTORY_COST_ALLOCATIONS` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `inventory_document_line_id` BIGINT UNSIGNED NOT NULL,
    `cost_layer_id` BIGINT UNSIGNED NOT NULL,
    `quantity` DECIMAL(15,4) NOT NULL,
    `unit_cost` DECIMAL(15,4) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_cost_allocation_line_layer` (`inventory_document_line_id`, `cost_layer_id`),
    KEY `idx_cost_allocation_line_status` (`inventory_document_line_id`, `status`),
    KEY `idx_cost_allocation_layer_status` (`cost_layer_id`, `status`),
    CONSTRAINT `fk_cost_allocation_line` FOREIGN KEY (`inventory_document_line_id`)
        REFERENCES `INVENTORY_DOCUMENT_LINES` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cost_allocation_layer` FOREIGN KEY (`cost_layer_id`)
        REFERENCES `INVENTORY_COST_LAYERS` (`id`) ON DELETE CASCADE,
    CONSTRAINT `chk_cost_allocation_qty` CHECK (`quantity` > 0.0000),
    CONSTRAINT `chk_cost_allocation_cost` CHECK (`unit_cost` >= 0.0000),
    CONSTRAINT `chk_cost_allocation_status` CHECK (`status` IN ('HOLDING', 'CONSUMED', 'RELEASED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
