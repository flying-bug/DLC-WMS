// Nguồn cấu hình chung cho Ma trận Phân quyền (Permission Matrix)
// Dùng chung cho cả Phân quyền theo Vai trò (RolePermissionsPage) và Phân quyền cá nhân (PermissionDetailPage).

export const PERMISSION_ACTIONS = [
    { key: 'full', label: 'Toàn quyền' },
    { key: 'view', label: 'Xem' },
    { key: 'add', label: 'Thêm' },
    { key: 'edit', label: 'Sửa' },
    { key: 'delete', label: 'Xóa' },
    { key: 'export', label: 'Xuất file' },
    { key: 'print', label: 'In ấn' },
    { key: 'post', label: 'Ghi sổ' },
    { key: 'submit', label: 'Trình duyệt' },
    { key: 'approve', label: 'Duyệt' },
    { key: 'execute', label: 'Thực hiện' },
    { key: 'complete', label: 'Hoàn tất' }
];

export const PERMISSION_CATEGORIES = [
    {
        key: 'warehouse',
        name: '1. Quản lý kho',
        icon: 'bi-box-seam',
        modules: [
            { key: 'warehouse_master', name: 'Quản lý danh sách Kho', icon: 'bi-houses' },
            { key: 'import', name: 'Phiếu Nhập kho', icon: 'bi-box-arrow-in-right' },
            { key: 'export', name: 'Phiếu Xuất kho', icon: 'bi-box-arrow-right' },
            { key: 'transfer', name: 'Phiếu Chuyển kho', icon: 'bi-arrow-left-right' },
            { key: 'stocktake', name: 'Phiếu Kiểm kê kho', icon: 'bi-clipboard2-check' }
        ]
    },
    {
        key: 'technical',
        name: '2. Kỹ thuật & Lắp ráp',
        icon: 'bi-tools',
        modules: [
            { key: 'assembly_config', name: 'Định mức Cấu hình PC (BOM)', icon: 'bi-diagram-3' },
            { key: 'assembly', name: 'Lệnh Lắp ráp / Tháo dỡ PC', icon: 'bi-box-seam' },
            { key: 'warranty', name: 'Tiếp nhận & Quản lý Bảo hành', icon: 'bi-shield-check' },
            { key: 'repair', name: 'Phiếu Sửa chữa Dịch vụ', icon: 'bi-tools' }
        ]
    },
    {
        key: 'business',
        name: '3. Kinh doanh & Thu chi',
        icon: 'bi-receipt',
        modules: [
            { key: 'sales_order', name: 'Đơn Bán hàng (SO)', icon: 'bi-cart3' },
            { key: 'purchase_order', name: 'Đơn Mua hàng NCC (PO)', icon: 'bi-bag-plus' },
            { key: 'einvoice', name: 'Hóa đơn Điện tử', icon: 'bi-receipt-cutoff' },
            { key: 'payment', name: 'Sổ quỹ & Thu chi tiền mặt', icon: 'bi-cash-coin' }
        ]
    },
    {
        key: 'master_data',
        name: '4. Danh mục & Đối tác',
        icon: 'bi-database',
        modules: [
            { key: 'product', name: 'Sản phẩm & Linh kiện', icon: 'bi-tags' },
            { key: 'product_category', name: 'Danh mục ngành hàng', icon: 'bi-folder' },
            { key: 'brand', name: 'Thương hiệu', icon: 'bi-bookmark-star' },
            { key: 'unit', name: 'Đơn vị tính', icon: 'bi-rulers' },
            { key: 'customer', name: 'Danh bạ Khách hàng', icon: 'bi-person-vcard' },
            { key: 'supplier', name: 'Danh bạ Nhà cung cấp', icon: 'bi-truck' }
        ]
    },
    {
        key: 'reports',
        name: '5. Báo cáo & Thống kê',
        icon: 'bi-bar-chart',
        modules: [
            { key: 'report_balance', name: 'Báo cáo tồn kho hiện tại', icon: 'bi-bar-chart' },
            { key: 'report_ledger', name: 'Sổ chi tiết vật tư hàng hóa', icon: 'bi-journal-text' },
            { key: 'report_transfer', name: 'Báo cáo luân chuyển kho', icon: 'bi-arrow-left-right' },
            { key: 'report_debt', name: 'Báo cáo công nợ đối tác', icon: 'bi-receipt' },
            { key: 'report_summary', name: 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', icon: 'bi-file-earmark-bar-graph' },
            { key: 'report_sales', name: 'Báo cáo doanh số bán hàng', icon: 'bi-currency-dollar' }
        ]
    },
    {
        key: 'system',
        name: '6. Quản trị hệ thống',
        icon: 'bi-gear',
        modules: [
            { key: 'ai_chat', name: 'Trợ lý AI Gemini', icon: 'bi-robot' },
            { key: 'account', name: 'Quản lý người dùng', icon: 'bi-people' },
            { key: 'auth', name: 'Ma trận phân quyền', icon: 'bi-shield-lock' },
            { key: 'audit', name: 'Nhật ký hệ thống (Audit Log)', icon: 'bi-journal-medical' }
        ]
    }
];

export const getInitialPermissionsState = () => ({
    // Quản lý kho
    warehouse_master: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
    import: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false, post: false },
    export: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false, post: false },
    transfer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
    stocktake: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

    // Kỹ thuật & Lắp ráp
    assembly_config: { full: false, view: false, add: false, edit: false, delete: false },
    assembly: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false, submit: false, approve: false, execute: false, complete: false },
    warranty: { full: false, view: false, add: false, edit: false },
    repair: { full: false, view: false, add: false, edit: false, delete: false },

    // Kinh doanh & Kế toán
    purchase_order: { full: false, view: false, add: false, edit: false },
    sales_order: { full: false, view: false, add: false, edit: false, export: false, print: false },
    einvoice: { full: false, view: false, add: false, edit: false },
    payment: { full: false, view: false, add: false, edit: false, delete: false },

    // Danh mục
    product: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
    product_category: { full: false, view: false, add: false, edit: false, delete: false },
    brand: { full: false, view: false, add: false, edit: false, delete: false },
    unit: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
    customer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
    supplier: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

    // Báo cáo
    report_balance: { full: false, view: false, export: false },
    report_ledger: { full: false, view: false, export: false },
    report_transfer: { full: false, view: false, export: false },
    report_debt: { full: false, view: false, export: false },
    report_summary: { full: false, view: false, export: false },
    report_sales: { full: false, view: false, export: false },

    // Quản trị hệ thống
    ai_chat: { full: false, view: false },
    account: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
    auth: { full: false, view: false, edit: false },
    audit: { full: false, view: false, export: false }
});

export const buildPermissionsFromCodes = (codes = []) => {
    const initialState = getInitialPermissionsState();
    const codesSet = new Set(codes);

    Object.keys(initialState).forEach(mod => {
        Object.keys(initialState[mod]).forEach(act => {
            if (act !== 'full' && codesSet.has(`${mod}:${act}`)) {
                initialState[mod][act] = true;
            }
        });

        const allOthersChecked = Object.keys(initialState[mod])
            .filter(key => key !== 'full')
            .every(key => initialState[mod][key]);
        initialState[mod].full = allOthersChecked;
    });

    return initialState;
};

export const extractCodesFromPermissions = (permissionsState) => {
    const codes = [];
    if (!permissionsState) return codes;

    Object.keys(permissionsState).forEach(mod => {
        Object.keys(permissionsState[mod]).forEach(act => {
            if (act !== 'full' && permissionsState[mod][act]) {
                codes.push(`${mod}:${act}`);
            }
        });
    });

    return codes;
};
