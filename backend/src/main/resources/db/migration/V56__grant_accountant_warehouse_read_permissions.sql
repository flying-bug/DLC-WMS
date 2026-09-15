-- Accountants may inspect warehouse movements and master data for reconciliation,
-- but do not receive any create, edit, delete, execute, or complete permission.
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('transfer:view', 'stocktake:view', 'warehouse_master:view')
WHERE r.code IN ('ROLE_ACCOUNTANT', 'ACCOUNTANT');
