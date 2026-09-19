// Mỗi vai trò nghiệp vụ chỉ làm việc trong chế độ (workspace) của mình. Sidebar đã ẩn các mục ngoài chế độ,
// module này khóa nốt phía route để gõ thẳng URL cũng không vào được.

const COMMON = ['/change-password', '/profile', '/ai-chat'];

// Khớp các module mà sidebar hiển thị ở Chế độ Thủ kho (warehouse + catalog + workspace).
const WAREHOUSE_SCOPE = [
    '/warehouse-workspace', '/import-history', '/import-slips', '/export-slips', '/transfer-history',
    '/stocktakes', '/assembly-orders', '/assembly-boms', '/warehouses', '/reports',
    '/products', '/product-categories', '/brands', '/units'
];

// Khớp các module mà sidebar hiển thị ở Chế độ Thủ quỹ (workspace + partner + reports).
const CASHIER_SCOPE = ['/cashier-workspace', '/reports', '/customers', '/suppliers'];

// Kế toán làm việc ở chế độ Kế toán: không vào bàn làm việc của Thủ kho / Thủ quỹ.
const ACCOUNTANT_DENIED = ['/warehouse-workspace', '/cashier-workspace'];

const normalizeRole = (role) => String(role || '').toUpperCase().replace(/^ROLE_/, '');

const matches = (pathname, prefixes) =>
    prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function isPathAllowedForRoles(pathname, roles = []) {
    const roleSet = new Set(roles.map(normalizeRole));
    if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].some(role => roleSet.has(role))) return true;

    const scopes = [];
    if (roleSet.has('WAREHOUSE_CONTROLLER')) scopes.push(WAREHOUSE_SCOPE);
    if (roleSet.has('CASHIER_CONTROLLER')) scopes.push(CASHIER_SCOPE);
    const isAccountant = roleSet.has('ACCOUNTANT');

    if (scopes.length === 0 && !isAccountant) return true;
    if (pathname === '/' || matches(pathname, COMMON)) return true;
    if (scopes.some(scope => matches(pathname, scope))) return true;
    return isAccountant && !matches(pathname, ACCOUNTANT_DENIED);
}
