// Nguồn duy nhất cho danh sách 6 role thật của hệ thống + mô tả hiển thị.
// Dùng chung giữa CreateEmployeePage (tạo mới) và EmployeeDrawer (sửa), tránh mỗi nơi
// tự định nghĩa một danh sách riêng rồi lệch nhau theo thời gian.
export const ROLE_OPTIONS = [
    { value: 'ROLE_WAREHOUSE_CONTROLLER', label: 'Thủ kho (Warehouse Controller)', icon: 'bi-box-seam', desc: 'Nhập / Xuất / Chuyển kho / Kiểm kê, Quét mã Scanner' },
    { value: 'ROLE_TECHNICIAN', label: 'Kỹ thuật viên (Technician)', icon: 'bi-tools', desc: 'Lắp ráp PC theo BOM, Tiếp nhận Bảo hành & Sửa chữa' },
    { value: 'ROLE_ACCOUNTANT', label: 'Kế toán (Accountant)', icon: 'bi-receipt', desc: 'Phiếu nhập dự kiến, Đơn bán SO, Hóa đơn & Công nợ' },
    { value: 'ROLE_CASHIER_CONTROLLER', label: 'Thủ quỹ / Thu ngân (Cashier Controller)', icon: 'bi-cash-stack', desc: 'Lập Phiếu thu, Phiếu chi, Quản lý quỹ tiền mặt' },
    { value: 'ROLE_MANAGER', label: 'Quản lý điều hành (Manager)', icon: 'bi-person-badge', desc: 'Toàn quyền nghiệp vụ, phê duyệt đơn, xem Dashboard' },
    { value: 'ROLE_SUPER_ADMIN', label: 'Quản trị hệ thống (Super Admin)', icon: 'bi-shield-lock', desc: 'Quản lý tài khoản, Phân quyền ma trận, Backup CSDL' }
];

// Role được coi là "cấp cao" (toàn quyền/gần như toàn quyền) - thêm mới các role này cho
// một nhân viên là hành động nhạy cảm, nên cảnh báo xác nhận trước khi lưu.
export const ELEVATED_ROLE_CODES = ['ROLE_MANAGER', 'MANAGER', 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN'];

export const normalizeRoleCode = (code) => (code && code.startsWith('ROLE_') ? code : `ROLE_${code}`);
