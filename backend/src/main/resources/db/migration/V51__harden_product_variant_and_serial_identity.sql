-- Variant is the sellable/inventory unit. Product fields remain temporarily
-- for backward compatibility and are removed after all readers migrate.
ALTER TABLE `PRODUCT_VARIANTS`
  ADD COLUMN `tracking_mode` VARCHAR(20) NULL AFTER `specs_json`,
  ADD COLUMN `min_stock_qty` DECIMAL(15,4) NOT NULL DEFAULT 0.0000 AFTER `tracking_mode`;

UPDATE `PRODUCT_VARIANTS` pv
JOIN `PRODUCTS` p ON p.`id` = pv.`product_id`
SET pv.`tracking_mode` = CASE
  WHEN COALESCE(p.`track_serial`, FALSE) = TRUE AND COALESCE(p.`track_lot`, FALSE) = TRUE THEN 'SERIAL_LOT'
  WHEN COALESCE(p.`track_serial`, FALSE) = TRUE THEN 'SERIAL'
  WHEN COALESCE(p.`track_lot`, FALSE) = TRUE THEN 'LOT'
  ELSE 'NONE'
END,
pv.`min_stock_qty` = COALESCE(p.`min_stock_qty`, 0.0000)
WHERE pv.`tracking_mode` IS NULL;

ALTER TABLE `PRODUCT_VARIANTS`
  MODIFY COLUMN `tracking_mode` VARCHAR(20) NOT NULL DEFAULT 'NONE',
  ADD CONSTRAINT `chk_variant_tracking_mode`
    CHECK (`tracking_mode` IN ('NONE', 'LOT', 'SERIAL', 'SERIAL_LOT'));

ALTER TABLE `SERIAL_NUMBERS`
  ADD COLUMN `normalized_serial_number` VARCHAR(100) NULL AFTER `serial_number`,
  ADD COLUMN `asset_tag` VARCHAR(40) NULL AFTER `normalized_serial_number`;

UPDATE `SERIAL_NUMBERS`
SET `normalized_serial_number` = UPPER(TRIM(`serial_number`)),
    `asset_tag` = CONCAT('DLC-', LPAD(`id`, 10, '0'));

ALTER TABLE `SERIAL_NUMBERS`
  MODIFY COLUMN `normalized_serial_number` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `asset_tag` VARCHAR(40) NOT NULL,
  ADD CONSTRAINT `uk_serial_variant_normalized`
    UNIQUE (`variant_id`, `normalized_serial_number`),
  ADD CONSTRAINT `uk_serial_asset_tag` UNIQUE (`asset_tag`);

ALTER TABLE `REPAIRS`
  ADD COLUMN `product_variant_id` BIGINT UNSIGNED NULL AFTER `product_id`;

UPDATE `REPAIRS` r
JOIN `SERIAL_NUMBERS` sn ON sn.`id` = r.`serial_number_id`
SET r.`product_variant_id` = sn.`variant_id`
WHERE r.`product_variant_id` IS NULL;

UPDATE `REPAIRS` r
JOIN (
  SELECT `product_id`, MIN(`id`) AS `variant_id`
  FROM `PRODUCT_VARIANTS`
  GROUP BY `product_id`
) pv ON pv.`product_id` = r.`product_id`
SET r.`product_variant_id` = pv.`variant_id`
WHERE r.`product_variant_id` IS NULL;

CREATE INDEX `idx_repairs_product_variant_id`
  ON `REPAIRS` (`product_variant_id`);

ALTER TABLE `REPAIRS`
  ADD CONSTRAINT `fk_repairs_product_variant`
    FOREIGN KEY (`product_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT;
