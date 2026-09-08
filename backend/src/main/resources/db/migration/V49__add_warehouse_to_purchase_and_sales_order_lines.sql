-- Thêm cột warehouse_id vào purchase_order_lines và sales_order_lines
ALTER TABLE `purchase_order_lines`
ADD COLUMN `warehouse_id` BIGINT NULL;

ALTER TABLE `sales_order_lines`
ADD COLUMN `warehouse_id` BIGINT NULL;

-- Backfill warehouse_id từ bảng cha nếu có
UPDATE `sales_order_lines` sol
JOIN `sales_orders` so ON sol.sales_order_id = so.id
SET sol.warehouse_id = so.warehouse_id
WHERE sol.warehouse_id IS NULL AND so.warehouse_id IS NOT NULL;

-- Cho phép warehouse_id ở header sales_orders có thể nullable khi đơn hàng xuất từ nhiều kho
ALTER TABLE `sales_orders` MODIFY COLUMN `warehouse_id` BIGINT NULL;

-- Tạo index cho warehouse_id để tối ưu truy vấn
CREATE INDEX `idx_pol_warehouse_id` ON `purchase_order_lines`(`warehouse_id`);
CREATE INDEX `idx_sol_warehouse_id` ON `sales_order_lines`(`warehouse_id`);
