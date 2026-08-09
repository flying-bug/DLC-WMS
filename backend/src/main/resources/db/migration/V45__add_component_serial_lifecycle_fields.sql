CREATE TABLE IF NOT EXISTS `ASSEMBLY_ORDER_SERIALS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `assembly_order_id` BIGINT UNSIGNED NOT NULL,
  `target_variant_id` BIGINT UNSIGNED NOT NULL,
  `target_serial` VARCHAR(100) NOT NULL,
  `component_variant_id` BIGINT UNSIGNED NOT NULL,
  `component_serial` VARCHAR(100) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  `installed_at` DATETIME NULL,
  `removed_at` DATETIME NULL,
  `source_repair_id` BIGINT UNSIGNED NULL,
  `removed_by_repair_id` BIGINT UNSIGNED NULL,
  `replaced_by_serial` VARCHAR(100) NULL,
  `note` TEXT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_aos_order` FOREIGN KEY (`assembly_order_id`) REFERENCES `ASSEMBLY_ORDERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_aos_target_variant` FOREIGN KEY (`target_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_aos_component_variant` FOREIGN KEY (`component_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `ASSEMBLY_ORDER_SERIALS` ADD COLUMN `status` VARCHAR(30) NOT NULL DEFAULT ''ACTIVE'' AFTER `component_serial`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ASSEMBLY_ORDER_SERIALS'
    AND COLUMN_NAME = 'status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `ASSEMBLY_ORDER_SERIALS` ADD COLUMN `installed_at` DATETIME NULL AFTER `status`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ASSEMBLY_ORDER_SERIALS'
    AND COLUMN_NAME = 'installed_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `ASSEMBLY_ORDER_SERIALS` ADD COLUMN `removed_at` DATETIME NULL AFTER `installed_at`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ASSEMBLY_ORDER_SERIALS'
    AND COLUMN_NAME = 'removed_at'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `ASSEMBLY_ORDER_SERIALS` ADD COLUMN `source_repair_id` BIGINT UNSIGNED NULL AFTER `removed_at`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ASSEMBLY_ORDER_SERIALS'
    AND COLUMN_NAME = 'source_repair_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `ASSEMBLY_ORDER_SERIALS` ADD COLUMN `removed_by_repair_id` BIGINT UNSIGNED NULL AFTER `source_repair_id`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ASSEMBLY_ORDER_SERIALS'
    AND COLUMN_NAME = 'removed_by_repair_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `ASSEMBLY_ORDER_SERIALS` ADD COLUMN `replaced_by_serial` VARCHAR(100) NULL AFTER `removed_by_repair_id`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ASSEMBLY_ORDER_SERIALS'
    AND COLUMN_NAME = 'replaced_by_serial'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `ASSEMBLY_ORDER_SERIALS` ADD COLUMN `note` TEXT NULL AFTER `replaced_by_serial`',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ASSEMBLY_ORDER_SERIALS'
    AND COLUMN_NAME = 'note'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `ASSEMBLY_ORDER_SERIALS`
SET `status` = 'ACTIVE'
WHERE `status` IS NULL OR TRIM(`status`) = '';

UPDATE `ASSEMBLY_ORDER_SERIALS`
SET `installed_at` = COALESCE(`created_at`, CURRENT_TIMESTAMP)
WHERE `installed_at` IS NULL;

CREATE TABLE IF NOT EXISTS `DEVICE_COMPONENT_SERIALS` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `source_assembly_order_id` BIGINT UNSIGNED NULL,
  `removed_by_assembly_order_id` BIGINT UNSIGNED NULL,
  `target_variant_id` BIGINT UNSIGNED NOT NULL,
  `target_serial` VARCHAR(100) NOT NULL,
  `component_variant_id` BIGINT UNSIGNED NOT NULL,
  `component_serial` VARCHAR(100) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  `installed_at` DATETIME NULL,
  `removed_at` DATETIME NULL,
  `source_repair_id` BIGINT UNSIGNED NULL,
  `removed_by_repair_id` BIGINT UNSIGNED NULL,
  `replaced_by_serial` VARCHAR(100) NULL,
  `note` TEXT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_dcs_source_assembly_order` FOREIGN KEY (`source_assembly_order_id`) REFERENCES `ASSEMBLY_ORDERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dcs_removed_by_assembly_order` FOREIGN KEY (`removed_by_assembly_order_id`) REFERENCES `ASSEMBLY_ORDERS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dcs_target_variant` FOREIGN KEY (`target_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dcs_component_variant` FOREIGN KEY (`component_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_dcs_source_repair` FOREIGN KEY (`source_repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_dcs_removed_by_repair` FOREIGN KEY (`removed_by_repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `idx_dcs_source_assembly` ON `DEVICE_COMPONENT_SERIALS` (`source_assembly_order_id`);
CREATE INDEX `idx_dcs_target` ON `DEVICE_COMPONENT_SERIALS` (`target_variant_id`, `target_serial`, `status`);
CREATE INDEX `idx_dcs_component` ON `DEVICE_COMPONENT_SERIALS` (`component_variant_id`, `component_serial`, `status`);
CREATE INDEX `idx_dcs_source_repair` ON `DEVICE_COMPONENT_SERIALS` (`source_repair_id`);
CREATE INDEX `idx_dcs_removed_by_repair` ON `DEVICE_COMPONENT_SERIALS` (`removed_by_repair_id`);

INSERT INTO `DEVICE_COMPONENT_SERIALS` (
  `source_assembly_order_id`,
  `target_variant_id`,
  `target_serial`,
  `component_variant_id`,
  `component_serial`,
  `status`,
  `installed_at`,
  `removed_at`,
  `source_repair_id`,
  `removed_by_repair_id`,
  `replaced_by_serial`,
  `note`,
  `created_by`,
  `created_at`
)
SELECT
  aos.`assembly_order_id`,
  aos.`target_variant_id`,
  aos.`target_serial`,
  aos.`component_variant_id`,
  aos.`component_serial`,
  COALESCE(NULLIF(TRIM(aos.`status`), ''), 'ACTIVE'),
  aos.`installed_at`,
  aos.`removed_at`,
  aos.`source_repair_id`,
  aos.`removed_by_repair_id`,
  aos.`replaced_by_serial`,
  aos.`note`,
  aos.`created_by`,
  COALESCE(aos.`created_at`, CURRENT_TIMESTAMP)
FROM `ASSEMBLY_ORDER_SERIALS` aos
JOIN `ASSEMBLY_ORDERS` ao_src ON ao_src.`id` = aos.`assembly_order_id`
WHERE ao_src.`order_type` <> 'DISASSEMBLY';

UPDATE `DEVICE_COMPONENT_SERIALS` dcs
JOIN `ASSEMBLY_ORDER_SERIALS` aos ON aos.`target_variant_id` = dcs.`target_variant_id`
  AND aos.`target_serial` = dcs.`target_serial`
  AND aos.`component_variant_id` = dcs.`component_variant_id`
  AND LOWER(aos.`component_serial`) = LOWER(dcs.`component_serial`)
JOIN `ASSEMBLY_ORDERS` ao ON ao.`id` = aos.`assembly_order_id`
SET
  dcs.`status` = 'REMOVED',
  dcs.`removed_by_assembly_order_id` = ao.`id`,
  dcs.`removed_at` = COALESCE(aos.`removed_at`, aos.`created_at`, CURRENT_TIMESTAMP),
  dcs.`replaced_by_serial` = NULL,
  dcs.`note` = CASE
    WHEN dcs.`note` IS NULL OR TRIM(dcs.`note`) = '' THEN CONCAT('Thao do tu lenh ', ao.`order_code`)
    ELSE CONCAT(dcs.`note`, ' | Thao do tu lenh ', ao.`order_code`)
  END
WHERE ao.`order_type` = 'DISASSEMBLY'
  AND (dcs.`status` IS NULL OR dcs.`status` = 'ACTIVE');

UPDATE `ASSEMBLY_ORDER_SERIALS` aos
JOIN `ASSEMBLY_ORDERS` ao ON ao.`id` = aos.`assembly_order_id`
SET
  aos.`status` = CASE WHEN ao.`order_type` = 'DISASSEMBLY' THEN 'REMOVED' ELSE 'ACTIVE' END,
  aos.`installed_at` = CASE WHEN ao.`order_type` = 'DISASSEMBLY' THEN NULL ELSE COALESCE(aos.`installed_at`, aos.`created_at`, CURRENT_TIMESTAMP) END,
  aos.`removed_at` = CASE WHEN ao.`order_type` = 'DISASSEMBLY' THEN COALESCE(aos.`removed_at`, aos.`created_at`, CURRENT_TIMESTAMP) ELSE NULL END,
  aos.`source_repair_id` = NULL,
  aos.`removed_by_repair_id` = NULL,
  aos.`replaced_by_serial` = NULL,
  aos.`note` = CASE WHEN ao.`order_type` = 'DISASSEMBLY' THEN COALESCE(aos.`note`, CONCAT('Thao do tu lenh ', ao.`order_code`)) ELSE NULL END
WHERE aos.`source_repair_id` IS NULL;

DELETE FROM `ASSEMBLY_ORDER_SERIALS`
WHERE `source_repair_id` IS NOT NULL;
