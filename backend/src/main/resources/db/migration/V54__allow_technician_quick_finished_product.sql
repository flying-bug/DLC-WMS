-- Technicians need read-only category/unit lookups for the restricted quick-finished-product form.
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('product_category:view', 'unit:view')
WHERE r.code IN ('ROLE_TECHNICIAN', 'TECHNICIAN');
