-- ─────────────────────────────────────────────────────────────────────────────
-- V21 — Backup & Operations Center tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_settings (
    id          BIGINT       PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description VARCHAR(255),
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_records (
    id           BIGINT       PRIMARY KEY AUTO_INCREMENT,
    filename     VARCHAR(255) NOT NULL,
    file_size    BIGINT,
    status       ENUM('LOCAL', 'DRIVE', 'BOTH', 'FAILED', 'RESTORING') DEFAULT 'LOCAL',
    drive_file_id VARCHAR(255),
    drive_link   VARCHAR(512),
    created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    created_by   VARCHAR(100),
    note         TEXT
);

-- Default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('backup.path',              '/tmp/backups',                    'Thư mục lưu backup tạm'),
    ('backup.schedule.enabled',  'false',                           'Bật/tắt lịch backup tự động'),
    ('backup.schedule.type',     'DAILY',                           'Loại lịch: DAILY | WEEKLY | MONTHLY'),
    ('backup.schedule.time',     '02:00',                           'Giờ chạy backup (HH:mm)'),
    ('backup.schedule.day',      '1',                               'Ngày trong tuần (1=Mon) hoặc ngày trong tháng'),
    ('backup.retention.days',    '30',                              'Giữ backup trong N ngày'),
    ('drive.folder.id',          '',                                'Google Drive folder ID'),
    ('drive.service.account',    '',                                'Service Account JSON (base64)'),
    ('drive.enabled',            'false',                           'Bật/tắt Google Drive upload'),
    ('notify.email.enabled',     'false',                           'Gửi email khi backup'),
    ('notify.email.to',          '',                                'Email nhận thông báo backup'),
    ('backup.encrypt.enabled',   'false',                           'Mã hoá file backup'),
    ('backup.encrypt.key',       '',                                'Khoá mã hoá (AES-256)');
