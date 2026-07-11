-- ============================================================
-- Migration  : V14
-- Created at : 2026-07-08
-- Author     : DLC-WMS Team
-- Description: Thêm cột warranty_months vào INVENTORY_DOCUMENT_LINES.
--
-- Mục đích:
--   Khi tạo phiếu xuất kho bán hàng (EX_SO), nhân viên có thể nhập
--   thời hạn bảo hành (tháng) cho từng dòng sản phẩm có Serial Number.
--   Khi phiếu xuất được POST (ghi sổ), hệ thống sẽ tự động sinh bản
--   ghi trong bảng WARRANTIES tương ứng với mỗi serial number có
--   warranty_months > 0 — thực hiện nghiệp vụ
--   "phiếu xuất kho kiêm phiếu bảo hành".
--
-- Giá trị:
--   NULL hoặc <= 0 → sản phẩm không có bảo hành, không sinh WARRANTY.
--   > 0            → số tháng bảo hành; hệ thống tự sinh WARRANTY với
--                    start_date = doc_date, end_date = doc_date + N tháng.
-- ============================================================

ALTER TABLE `INVENTORY_DOCUMENT_LINES`
  ADD COLUMN `warranty_months` INT NULL
  COMMENT 'Thoi han bao hanh (thang). NULL hoac <= 0 = khong bao hanh. > 0 = tu dong tao phieu bao hanh khi POST phieu xuat.';
