-- =====================================================================
-- V6: Thêm permissions Brand Management vào DB
-- Áp dụng cho: Manager (full quyền), Staff (quyền cơ bản)
-- Tương ứng UC-36 → UC-40 trong report3.txt
-- =====================================================================

-- BƯỚC 1: Insert 4 permissions Brand vào bảng PERMISSIONS
INSERT IGNORE INTO `PERMISSIONS` (`code`, `name`, `module`, `description`, `status`) VALUES
('brand:view',   'Xem danh sách / chi tiết thương hiệu', 'BRAND', 'UC-36, UC-37: Xem danh sách và chi tiết nhà sản xuất', 'APPROVED'),
('brand:add',    'Thêm mới thương hiệu',                 'BRAND', 'UC-38: Tạo mới thương hiệu / nhà sản xuất',            'APPROVED'),
('brand:edit',   'Chỉnh sửa thương hiệu',                'BRAND', 'UC-39: Cập nhật thông tin thương hiệu',                'APPROVED'),
('brand:delete', 'Xóa / vô hiệu hóa thương hiệu',        'BRAND', 'UC-40: Xóa hoặc đổi trạng thái INACTIVE thương hiệu',  'APPROVED');

-- BƯỚC 2: Gán FULL quyền Brand cho role MANAGER
-- Manager có toàn quyền: view + add + edit + delete
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r, `PERMISSIONS` p
WHERE r.code = 'MANAGER'
  AND p.code IN ('brand:view', 'brand:add', 'brand:edit', 'brand:delete');

-- BƯỚC 3: Gán quyền cơ bản Brand cho role STAFF (chỉ view theo mặc định)
-- Staff có thể được cấp thêm quyền add/edit/delete từng user thông qua USER_PERMISSIONS
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r, `PERMISSIONS` p
WHERE r.code = 'STAFF'
  AND p.code IN ('brand:view');
