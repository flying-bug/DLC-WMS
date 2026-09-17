-- V55 correctly removed warranty:add and warranty:edit from Technician,
-- but forgot to ensure warranty:view is still assigned (it was wiped by V47 TRUNCATE
-- and never re-granted to Technician in subsequent migrations).
-- Technicians must be able to look up warranty coverage to support repair workflows.
--
-- Furthermore, technicians also need brand:view and product:view to properly
-- load dropdowns when viewing or editing repair orders.
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('warranty:view', 'brand:view', 'product:view')
WHERE r.code IN ('ROLE_TECHNICIAN', 'TECHNICIAN');

-- Đảm bảo quyền import:post và export:post tồn tại
INSERT IGNORE INTO `PERMISSIONS` (`code`, `name`, `module`, `description`, `status`) VALUES
('import:post', 'Ghi sổ phiếu nhập kho', 'import', 'Ghi sổ phiếu nhập kho', 'APPROVED'),
('export:post', 'Ghi sổ phiếu xuất kho', 'export', 'Ghi sổ phiếu xuất kho', 'APPROVED');

-- Cấp quyền Ghi sổ cho Thủ kho (WAREHOUSE_CONTROLLER) và Quản lý (MANAGER)
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('import:post', 'export:post')
WHERE r.code IN ('ROLE_WAREHOUSE_CONTROLLER', 'WAREHOUSE_CONTROLLER', 'ROLE_MANAGER', 'MANAGER');
