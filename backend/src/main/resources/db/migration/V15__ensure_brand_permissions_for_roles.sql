INSERT IGNORE INTO `PERMISSIONS` (`code`, `name`, `module`, `description`, `status`) VALUES
('brand:view',   'Xem danh sach / chi tiet thuong hieu', 'BRAND', 'Xem danh sach va chi tiet nha san xuat', 'APPROVED'),
('brand:add',    'Them moi thuong hieu',                 'BRAND', 'Tao moi thuong hieu / nha san xuat',      'APPROVED'),
('brand:edit',   'Chinh sua thuong hieu',                'BRAND', 'Cap nhat thong tin thuong hieu',          'APPROVED'),
('brand:delete', 'Xoa / vo hieu hoa thuong hieu',        'BRAND', 'Xoa hoac doi trang thai thuong hieu',     'APPROVED');

INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('brand:view', 'brand:add', 'brand:edit', 'brand:delete')
WHERE r.code IN ('ROLE_MANAGER', 'MANAGER');

INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code = 'brand:view'
WHERE r.code IN ('ROLE_STAFF', 'STAFF');
