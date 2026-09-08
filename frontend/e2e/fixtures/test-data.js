/**
 * Dữ liệu dùng chung cho các kịch bản kiểm thử E2E Playwright
 */
export const USERS = {
  ADMIN: {
    username: 'admin',
    password: '123456',
    role: 'ADMIN',
    fullName: 'Quản Trị Viên',
  },
  MANAGER: {
    username: 'manager@duylong.vn',
    password: '123456',
    role: 'MANAGER',
    fullName: 'Quản Lý Hệ Thống',
  },
  ACCOUNTANT: {
    username: 'accountant@duylong.vn',
    password: '123456',
    role: 'ACCOUNTANT',
    fullName: 'Kế Toán Trưởng',
  },
  WAREHOUSE_STAFF: {
    username: 'wh_controller@duylong.vn',
    password: '123456',
    role: 'WAREHOUSE_STAFF',
    fullName: 'Thủ Kho Vận',
  },
};

export const ROUTES = {
  LOGIN: '/login',
  MAIN_DASHBOARD: '/main-dashboard',
  WAREHOUSE_WORKSPACE: '/warehouse-workspace',
  PURCHASE_ORDERS: '/purchase-orders',
  IMPORT_SLIPS: '/import-slips',
  EXPORT_SLIPS: '/export-slips',
  E_INVOICES: '/einvoices',
  PAYMENTS: '/payments',
};
