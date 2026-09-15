-- Accountant owns warranty intake/management, selected product catalogs, and warehouse reports.
INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN (
    'warranty:view', 'warranty:add', 'warranty:edit',
    'product:view', 'product:add', 'product:edit',
    'product_category:view', 'product_category:add', 'product_category:edit',
    'unit:view', 'unit:add', 'unit:edit',
    'brand:view', 'brand:add', 'brand:edit',
    'report_ledger:view', 'report_ledger:export',
    'report_transfer:view', 'report_transfer:export',
    'report_balance:view', 'report_balance:export'
)
WHERE r.code IN ('ROLE_ACCOUNTANT', 'ACCOUNTANT');

-- Technicians may look up warranty coverage but may no longer create or change it.
DELETE rp
FROM `ROLE_PERMISSIONS` rp
JOIN `ROLES` r ON r.id = rp.role_id
JOIN `PERMISSIONS` p ON p.id = rp.permission_id
WHERE r.code IN ('ROLE_TECHNICIAN', 'TECHNICIAN')
  AND p.code IN ('warranty:add', 'warranty:edit');
