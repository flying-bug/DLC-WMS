-- Tạo bảng trung gian USER_PERMISSIONS nếu chưa tồn tại
-- Khắc phục lỗi tương thích khóa ngoại do Hibernate sinh ra sai kiểu dữ liệu BIGINT (signed) 
-- khi tham chiếu đến USERS.id và PERMISSIONS.id (BIGINT UNSIGNED)

-- BƯỚC 1: Xóa bảng rác do Hibernate tạo sai kiểu dữ liệu (nếu có)
DROP TABLE IF EXISTS `user_permissions`;
DROP TABLE IF EXISTS `USER_PERMISSIONS`;

-- BƯỚC 2: Tạo lại bảng chuẩn

CREATE TABLE IF NOT EXISTS `USER_PERMISSIONS` (
  `user_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `permission_id`),
  CONSTRAINT `fk_user_perms_user` FOREIGN KEY (`user_id`) REFERENCES `USERS` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_perms_permission` FOREIGN KEY (`permission_id`) REFERENCES `PERMISSIONS` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
