-- V27__refactor_warranties_to_header_lines.sql
-- Tách dữ liệu chi tiết bảo hành từ WARRANTIES ra bảng WARRANTY_LINES riêng.
-- Đồng thời điều chỉnh WARRANTIES cho phép sales_order_id nullable
-- và xoá cột serial_number_id (đã chuyển sang WARRANTY_LINES).

-- 1. Tạo bảng WARRANTY_LINES
CREATE TABLE IF NOT EXISTS `WARRANTY_LINES` (
    `id`                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `warranty_id`       BIGINT UNSIGNED NOT NULL,
    `serial_number_id`  BIGINT UNSIGNED NULL,
    `product_variant_id` BIGINT UNSIGNED NULL,
    `quantity`          DECIMAL(15,4) NULL,
    `start_date`        DATE NOT NULL,
    `end_date`          DATE NOT NULL,
    `warranty_status`   VARCHAR(30) NOT NULL DEFAULT 'APPROVED',
    CONSTRAINT `fk_wl_warranty` FOREIGN KEY (`warranty_id`) REFERENCES `WARRANTIES` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_wl_serial`   FOREIGN KEY (`serial_number_id`) REFERENCES `SERIAL_NUMBERS` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_wl_variant`  FOREIGN KEY (`product_variant_id`) REFERENCES `PRODUCT_VARIANTS` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Migrate dữ liệu cũ: mỗi warranty có serial_number_id -> tạo một warranty_line tương ứng
INSERT INTO `WARRANTY_LINES` (`warranty_id`, `serial_number_id`, `product_variant_id`, `quantity`, `start_date`, `end_date`, `warranty_status`)
SELECT
    w.`id`,
    w.`serial_number_id`,
    sn.`variant_id`,
    1,
    w.`start_date`,
    w.`end_date`,
    w.`warranty_status`
FROM `WARRANTIES` w
JOIN `SERIAL_NUMBERS` sn ON sn.`id` = w.`serial_number_id`;

-- 3. Xoá FK ràng buộc serial_number_id trên WARRANTIES
ALTER TABLE `WARRANTIES` DROP FOREIGN KEY IF EXISTS `fk_warranty_serial`;
ALTER TABLE `WARRANTIES` DROP FOREIGN KEY IF EXISTS `FKeyicqvvpwqy2c2wxdthbbqyd9`;

-- 4. Xoá cột serial_number_id khỏi WARRANTIES
ALTER TABLE `WARRANTIES` DROP COLUMN `serial_number_id`;

-- 5. Đổi sales_order_id từ NOT NULL -> NULL (bảo hành có thể không gắn đơn hàng)
ALTER TABLE `WARRANTIES` MODIFY COLUMN `sales_order_id` BIGINT UNSIGNED NULL;

