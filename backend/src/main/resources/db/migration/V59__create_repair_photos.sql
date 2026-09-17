-- V59__create_repair_photos.sql
-- Bảng lưu ảnh sửa chữa theo từng giai đoạn của lệnh sửa chữa.
-- phase: INTAKE (tiếp nhận) | DIAGNOSIS (chẩn đoán) | COMPLETION (hoàn thành)

CREATE TABLE `REPAIR_PHOTOS` (
    `id`             BIGINT        NOT NULL AUTO_INCREMENT,
    `repair_id`      BIGINT        NOT NULL,
    `phase`          VARCHAR(30)   NOT NULL COMMENT 'INTAKE | DIAGNOSIS | COMPLETION',
    `category`       VARCHAR(50)   NULL     COMMENT 'Nhãn phân loại tùy chọn (FRONT, BACK, DETAIL...)',
    `public_id`      VARCHAR(255)  NOT NULL COMMENT 'Cloudinary public_id để xóa ảnh',
    `secure_url`     VARCHAR(2048) NOT NULL COMMENT 'Cloudinary secure URL',
    `checksum`       VARCHAR(64)   NULL     COMMENT 'SHA-256 của file gốc',
    `watermarked_at` DATETIME      NULL     COMMENT 'Thời điểm upload (dùng làm thông tin watermark)',
    `uploaded_by`    BIGINT        NULL,
    `locked`         TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = không cho xóa sau khi chuyển bước',
    `caption`        VARCHAR(500)  NULL     COMMENT 'Ghi chú mô tả ảnh',
    `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_repair_photos_repair_id`       (`repair_id`),
    INDEX `idx_repair_photos_repair_phase`    (`repair_id`, `phase`),
    INDEX `idx_repair_photos_repair_locked`   (`repair_id`, `locked`),
    CONSTRAINT `fk_repair_photos_repair` FOREIGN KEY (`repair_id`) REFERENCES `REPAIRS` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT = 'Ảnh sửa chữa theo từng giai đoạn (INTAKE/DIAGNOSIS/COMPLETION)';
