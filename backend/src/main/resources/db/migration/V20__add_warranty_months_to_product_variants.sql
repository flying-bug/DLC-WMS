-- ============================================================
-- Migration  : V18
-- Created at : 2026-07-21
-- Author     : AI Assistant
-- Description: Thêm cột warranty_months vào PRODUCT_VARIANTS.
-- ============================================================

ALTER TABLE `PRODUCT_VARIANTS`
  ADD COLUMN `warranty_months` INT NULL DEFAULT 0
  COMMENT 'Thoi han bao hanh (thang). 0 hoac NULL = khong bao hanh';
