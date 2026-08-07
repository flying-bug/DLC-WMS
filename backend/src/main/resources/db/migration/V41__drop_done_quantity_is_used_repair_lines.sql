-- ============================================================
-- Migration  : V35
-- Created at : 2026-08-07
-- Author     : AI Assistant
-- Description: Drop done_quantity and is_used from REPAIR_LINES.
-- ============================================================

ALTER TABLE `REPAIR_LINES`
  DROP COLUMN `done_quantity`,
  DROP COLUMN `is_used`;
