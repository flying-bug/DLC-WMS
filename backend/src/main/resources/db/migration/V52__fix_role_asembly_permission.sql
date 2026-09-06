-- Align assembly workflow permissions and grant each role only its responsibilities.
INSERT IGNORE INTO `PERMISSIONS` (`code`, `name`, `module`, `description`, `status`) VALUES
('assembly_config:view',   'View assembly BOMs',              'assembly_config', 'View assembly BOMs', 'APPROVED'),
('assembly_config:add',    'Create assembly BOMs',            'assembly_config', 'Create assembly BOMs', 'APPROVED'),
('assembly_config:edit',   'Edit assembly BOMs',              'assembly_config', 'Edit assembly BOMs', 'APPROVED'),
('assembly_config:delete', 'Delete assembly BOMs',            'assembly_config', 'Delete assembly BOMs', 'APPROVED'),
('assembly:view',          'View assembly orders',            'assembly',        'View assembly/disassembly orders', 'APPROVED'),
('assembly:add',           'Create assembly orders',          'assembly',        'Create assembly/disassembly orders', 'APPROVED'),
('assembly:edit',          'Edit assembly orders',            'assembly',        'Edit assembly/disassembly orders', 'APPROVED'),
('assembly:delete',        'Delete assembly orders',          'assembly',        'Delete assembly/disassembly draft orders', 'APPROVED'),
('assembly:export',        'Export assembly orders',          'assembly',        'Export assembly/disassembly orders', 'APPROVED'),
('assembly:print',         'Print assembly orders',           'assembly',        'Print assembly/disassembly orders', 'APPROVED'),
('assembly:submit',        'Submit assembly orders',          'assembly',        'Technician submits assembly/disassembly orders for approval', 'APPROVED'),
('assembly:approve',       'Approve assembly orders',         'assembly',        'Accountant approves or rejects assembly/disassembly orders', 'APPROVED'),
('assembly:execute',       'Execute assembly orders',         'assembly',        'Warehouse controller executes assembly/disassembly orders', 'APPROVED'),
('assembly:complete',      'Complete assembly orders',        'assembly',        'Warehouse controller completes assembly/disassembly orders', 'APPROVED');

UPDATE `PERMISSIONS`
SET `module` = 'assembly_config', `status` = 'APPROVED'
WHERE `code` LIKE 'assembly_config:%';

UPDATE `PERMISSIONS`
SET `module` = 'assembly', `status` = 'APPROVED'
WHERE `code` LIKE 'assembly:%';

DELETE rp
FROM `ROLE_PERMISSIONS` rp
JOIN `ROLES` r ON r.id = rp.role_id
JOIN `PERMISSIONS` p ON p.id = rp.permission_id
WHERE r.code IN ('ROLE_TECHNICIAN', 'TECHNICIAN')
  AND p.code IN ('assembly_config:delete', 'assembly:approve', 'assembly:execute', 'assembly:complete');

DELETE rp
FROM `ROLE_PERMISSIONS` rp
JOIN `ROLES` r ON r.id = rp.role_id
JOIN `PERMISSIONS` p ON p.id = rp.permission_id
WHERE r.code IN ('ROLE_ACCOUNTANT', 'ACCOUNTANT')
  AND p.code IN (
      'assembly_config:add', 'assembly_config:edit', 'assembly_config:delete',
      'assembly:add', 'assembly:delete', 'assembly:export', 'assembly:print',
      'assembly:submit', 'assembly:execute', 'assembly:complete'
  );

DELETE rp
FROM `ROLE_PERMISSIONS` rp
JOIN `ROLES` r ON r.id = rp.role_id
JOIN `PERMISSIONS` p ON p.id = rp.permission_id
WHERE r.code IN ('ROLE_WAREHOUSE_CONTROLLER', 'WAREHOUSE_CONTROLLER')
  AND p.code IN (
      'assembly_config:add', 'assembly_config:edit', 'assembly_config:delete',
      'assembly:add', 'assembly:edit', 'assembly:delete', 'assembly:export', 'assembly:print',
      'assembly:submit', 'assembly:approve'
  );

INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN (
    'assembly_config:view', 'assembly_config:add', 'assembly_config:edit', 'assembly_config:delete',
    'assembly:view', 'assembly:add', 'assembly:edit', 'assembly:delete',
    'assembly:export', 'assembly:print', 'assembly:submit', 'assembly:approve',
    'assembly:execute', 'assembly:complete'
)
WHERE r.code IN ('ROLE_MANAGER', 'MANAGER');

INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN (
    'assembly_config:view', 'assembly_config:add', 'assembly_config:edit',
    'assembly:view', 'assembly:add', 'assembly:edit', 'assembly:delete',
    'assembly:export', 'assembly:print', 'assembly:submit',
    'warehouse_master:view', 'product:view', 'report_balance:view'
)
WHERE r.code IN ('ROLE_TECHNICIAN', 'TECHNICIAN');

INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('assembly_config:view', 'assembly:view', 'assembly:approve')
WHERE r.code IN ('ROLE_ACCOUNTANT', 'ACCOUNTANT');

INSERT IGNORE INTO `ROLE_PERMISSIONS` (`role_id`, `permission_id`)
SELECT r.id, p.id
FROM `ROLES` r
JOIN `PERMISSIONS` p ON p.code IN ('assembly_config:view', 'assembly:view', 'assembly:execute', 'assembly:complete')
WHERE r.code IN ('ROLE_WAREHOUSE_CONTROLLER', 'WAREHOUSE_CONTROLLER');

