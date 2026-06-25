INSERT INTO `PRODUCT_VARIANTS` (
  `product_id`,
  `sku`,
  `variant_name`,
  `cost_price`,
  `sale_price`,
  `active`,
  `created_at`,
  `updated_at`
)
SELECT
  p.`id`,
  p.`product_code`,
  p.`product_name`,
  0.0000,
  COALESCE(p.`sale_price`, 0.0000),
  COALESCE(p.`active`, TRUE),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `PRODUCTS` p
WHERE NOT EXISTS (
  SELECT 1 FROM `PRODUCT_VARIANTS` v WHERE v.`product_id` = p.`id`
)
AND NOT EXISTS (
  SELECT 1 FROM `PRODUCT_VARIANTS` v WHERE v.`sku` = p.`product_code`
);
