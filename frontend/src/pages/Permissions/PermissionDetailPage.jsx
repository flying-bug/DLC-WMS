import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { useToast } from '../../contexts/ToastContext';
import styles from './PermissionDetailPage.module.css';

function PermissionDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [activeCategory, setActiveCategory] = useState('warehouse');
    const { showToast } = useToast();
    const matrixRef = useRef(null);

    const scrollMatrix = (direction) => {
        const matrix = matrixRef.current;
        if (!matrix) return;

        const distance = Math.max(matrix.clientWidth * 0.75, 180);
        matrix.scrollTo({
            left: matrix.scrollLeft + direction * distance,
            behavior: 'smooth',
        });
    };

    // Initial state matching the UC list
    const [permissions, setPermissions] = useState({
        // Quản lý kho
        warehouse_master: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        import: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        export: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        transfer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        stocktake: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

        // Kỹ thuật & Lắp ráp
        assembly_config: { full: false, view: false, add: false, edit: false },
        assembly: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        warranty: { full: false, view: false, add: false, edit: false },
        repair: { full: false, view: false, add: false, edit: false, delete: false },

        // Kinh doanh & Kế toán
        purchase_order: { full: false, view: false, add: false, edit: false },
        sales_order: { full: false, view: false, add: false, edit: false, export: false, print: false },
        einvoice: { full: false, view: false, add: false, edit: false, export: false, print: false },
        payment: { full: false, view: false, add: false, edit: false },

        // Danh mục
        product: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        product_category: { full: false, view: false, add: false, edit: false, delete: false },
        brand: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
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

    const ROLE_DEFAULT_PERMS = {
        ROLE_WAREHOUSE_CONTROLLER: [
            'warehouse_master:view', 'import:view', 'import:edit', 'import:print',
            'export:view', 'export:add', 'export:edit', 'export:export', 'export:print',
            'transfer:view', 'transfer:add', 'transfer:edit', 'transfer:delete', 'transfer:export', 'transfer:print',
            'stocktake:view', 'stocktake:add', 'stocktake:edit', 'stocktake:delete', 'stocktake:export', 'stocktake:print',
            'product:view', 'unit:view', 'brand:view',
            'report_balance:view', 'report_balance:export', 'report_ledger:view', 'report_ledger:export', 'report_transfer:view', 'report_transfer:export',
            'ai_chat:view'
        ],
        ROLE_TECHNICIAN: [
            'assembly_config:view', 'assembly_config:add', 'assembly_config:edit',
            'assembly:view', 'assembly:add', 'assembly:edit', 'assembly:delete', 'assembly:export', 'assembly:print',
            'warranty:view', 'warranty:add', 'warranty:edit',
            'repair:view', 'repair:add', 'repair:edit', 'repair:delete',
            'product:view', 'export:view', 'ai_chat:view'
        ],
        ROLE_ACCOUNTANT: [
            'import:view', 'import:add', 'import:edit', 'import:export', 'import:print',
            'sales_order:view', 'sales_order:add', 'sales_order:edit', 'sales_order:export', 'sales_order:print',
            'purchase_order:view', 'purchase_order:add', 'purchase_order:edit',
            'einvoice:view', 'einvoice:add', 'einvoice:edit', 'einvoice:export', 'einvoice:print',
            'customer:view', 'customer:add', 'customer:edit', 'customer:delete', 'customer:export', 'customer:print',
            'supplier:view', 'supplier:add', 'supplier:edit', 'supplier:delete', 'supplier:export', 'supplier:print',
            'report_debt:view', 'report_debt:export', 'report_sales:view', 'report_sales:export', 'report_summary:view', 'report_summary:export',
            'payment:view', 'export:view', 'ai_chat:view'
        ],
        ROLE_CASHIER_CONTROLLER: [
            'payment:view', 'payment:add', 'payment:edit',
            'sales_order:view', 'customer:view', 'ai_chat:view'
        ],
        ROLE_STAFF: [
            'import:view', 'import:add', 'import:edit', 'export:view', 'export:add', 'export:edit',
            'purchase_order:view', 'sales_order:view', 'payment:view',
            'transfer:view', 'stocktake:view', 'assembly_config:view', 'assembly:view', 'warranty:view', 'repair:view',
            'product:view', 'report_balance:view', 'report_sales:view', 'ai_chat:view'
        ]
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch user
                const userRes = await axiosClient.get(`/users/${id}`);
                const userData = userRes.data?.data;
                setUser(userData);

                // Check permissions access
                if (userData) {
                    const isSuperAdmin = userData.roles && userData.roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN');
                    if (isSuperAdmin) {
                        showToast('warning', "Tài khoản Super Admin có toàn quyền hệ thống mặc định.");
                        setTimeout(() => navigate('/users'), 1500);
                        return;
                    }

                    setPermissions(prev => {
                        const newPerms = {};
                        // Deep clone prev
                        Object.keys(prev).forEach(m => {
                            newPerms[m] = { ...prev[m] };
                        });

                        // 1. If user already has explicit custom permissions, populate them
                        if (userData.permissions && userData.permissions.length > 0) {
                            userData.permissions.forEach(code => {
                                const [mod, act] = code.split(':');
                                if (newPerms[mod] && newPerms[mod][act] !== undefined) {
                                    newPerms[mod][act] = true;
                                }
                            });
                        } else if (userData.roles) {
                            // 2. Otherwise fallback to union of default permissions based on all assigned roles
                            const hasManager = userData.roles.some(r => r === 'MANAGER' || r === 'ROLE_MANAGER');

                            if (hasManager) {
                                Object.keys(newPerms).forEach(mod => {
                                    const isSystem = ['account', 'auth', 'audit'].includes(mod);
                                    Object.keys(newPerms[mod]).forEach(act => {
                                        newPerms[mod][act] = !isSystem;
                                    });
                                });
                            } else {
                                userData.roles.forEach(roleCode => {
                                    const normalized = roleCode.startsWith('ROLE_') ? roleCode : `ROLE_${roleCode}`;
                                    const defaults = ROLE_DEFAULT_PERMS[normalized] || [];
                                    defaults.forEach(code => {
                                        const [mod, act] = code.split(':');
                                        if (newPerms[mod] && newPerms[mod][act] !== undefined) {
                                            newPerms[mod][act] = true;
                                        }
                                    });
                                });
                            }
                        }

                        // For each module, determine if all actions are checked to set 'full' checkbox
                        Object.keys(newPerms).forEach(mod => {
                            const allOthersChecked = Object.keys(newPerms[mod])
                                .filter(key => key !== 'full')
                                .every(key => newPerms[mod][key]);
                            newPerms[mod].full = allOthersChecked;
                        });

                        return newPerms;
                    });
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin phân quyền:", error);
                showToast('error', 'Có lỗi xảy ra. Vui lòng thử lại.');
            }
        };

        loadData();
    }, [id, navigate]);

    const handleCheck = (module, action, checked) => {
        setPermissions(prev => {
            const modulePerms = { ...prev[module] };

            if (action === 'full') {
                Object.keys(modulePerms).forEach(key => {
                    modulePerms[key] = checked;
                });
            } else {
                modulePerms[action] = checked;

                if (!checked) {
                    modulePerms.full = false;
                } else {
                    const allOthersChecked = Object.keys(modulePerms)
                        .filter(key => key !== 'full')
                        .every(key => modulePerms[key]);

                    if (allOthersChecked) {
                        modulePerms.full = true;
                    }
                }
            }

            return { ...prev, [module]: modulePerms };
        });
    };

    const handleSave = async () => {
        try {
            // Compile list of ticked permission codes
            const tickedCodes = [];
            Object.keys(permissions).forEach(mod => {
                Object.keys(permissions[mod]).forEach(act => {
                    // Skip the 'full' helper checkbox
                    if (act !== 'full' && permissions[mod][act]) {
                        tickedCodes.push(`${mod}:${act}`);
                    }
                });
            });

            await axiosClient.put(`/users/${id}/permissions`, tickedCodes);
            showToast('success', 'Phân quyền thành công.');
            setTimeout(() => navigate('/users'), 1500);
        } catch (error) {
            console.error('Lỗi lưu phân quyền:', error);
            showToast('error', 'Thao tác thất bại.');
        }
    };

    const renderCheckbox = (module, action, featureName) => {
        if (permissions[module][action] === undefined) {
            return (
                <label className={styles.checkboxTarget}>
                    <input type="checkbox" className={styles.checkbox} disabled aria-label={`${action} cho ${featureName} không khả dụng`} />
                </label>
            );
        }
        return (
            <label className={styles.checkboxTarget}>
                <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={permissions[module][action]}
                    onChange={(e) => handleCheck(module, action, e.target.checked)}
                    aria-label={`${action} cho ${featureName}`}
                />
            </label>
        );
    };

    const renderRow = (module, name, icon) => (
        <tr className={styles.tableRow} key={module}>
            <td>
                <div className={styles.featureName}>
                    <div className={styles.featureIcon}><i className={`bi ${icon}`}></i></div>
                    {name}
                </div>
            </td>
            <td>{renderCheckbox(module, 'full', name)}</td>
            <td>{renderCheckbox(module, 'view', name)}</td>
            <td>{renderCheckbox(module, 'add', name)}</td>
            <td>{renderCheckbox(module, 'edit', name)}</td>
            <td>{renderCheckbox(module, 'delete', name)}</td>
            <td>{renderCheckbox(module, 'export', name)}</td>
            <td>{renderCheckbox(module, 'print', name)}</td>
        </tr>
    );

    const renderTableBody = () => {
        switch (activeCategory) {
            case 'warehouse':
                return (
                    <>
                        {renderRow('warehouse_master', 'Quản lý danh sách Kho', 'bi-houses')}
                        {renderRow('import', 'Phiếu Nhập kho', 'bi-box-arrow-in-right')}
                        {renderRow('export', 'Phiếu Xuất kho', 'bi-box-arrow-right')}
                        {renderRow('transfer', 'Phiếu Chuyển kho', 'bi-arrow-left-right')}
                        {renderRow('stocktake', 'Phiếu Kiểm kê kho', 'bi-clipboard2-check')}
                    </>
                );
            case 'technical':
                return (
                    <>
                        {renderRow('assembly_config', 'Định mức Cấu hình PC (BOM)', 'bi-diagram-3')}
                        {renderRow('assembly', 'Lệnh Lắp ráp / Tháo dỡ PC', 'bi-box-seam')}
                        {renderRow('warranty', 'Tiếp nhận & Quản lý Bảo hành', 'bi-shield-check')}
                        {renderRow('repair', 'Phiếu Sửa chữa Dịch vụ', 'bi-tools')}
                    </>
                );
            case 'business':
                return (
                    <>
                        {renderRow('sales_order', 'Đơn Bán hàng (SO)', 'bi-cart3')}
                        {renderRow('purchase_order', 'Đơn Mua hàng NCC (PO)', 'bi-bag-plus')}
                        {renderRow('einvoice', 'Hóa đơn Điện tử', 'bi-receipt-cutoff')}
                        {renderRow('payment', 'Sổ quỹ & Thu chi tiền mặt', 'bi-cash-coin')}
                    </>
                );
            case 'master_data':
                return (
                    <>
                        {renderRow('product', 'Sản phẩm & Linh kiện', 'bi-tags')}
                        {renderRow('product_category', 'Danh mục ngành hàng', 'bi-folder')}
                        {renderRow('brand', 'Thương hiệu', 'bi-bookmark-star')}
                        {renderRow('unit', 'Đơn vị tính', 'bi-rulers')}
                        {renderRow('customer', 'Danh bạ Khách hàng', 'bi-person-vcard')}
                        {renderRow('supplier', 'Danh bạ Nhà cung cấp', 'bi-truck')}
                    </>
                );
            case 'reports':
                return (
                    <>
                        {renderRow('report_balance', 'Báo cáo tồn kho hiện tại', 'bi-bar-chart')}
                        {renderRow('report_ledger', 'Sổ chi tiết vật tư hàng hóa', 'bi-journal-text')}
                        {renderRow('report_transfer', 'Báo cáo luân chuyển kho', 'bi-arrow-left-right')}
                        {renderRow('report_debt', 'Báo cáo công nợ đối tác', 'bi-receipt')}
                        {renderRow('report_summary', 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', 'bi-file-earmark-bar-graph')}
                        {renderRow('report_sales', 'Báo cáo doanh số bán hàng', 'bi-currency-dollar')}
                    </>
                );
            case 'system':
                return (
                    <>
                        {renderRow('ai_chat', 'Trợ lý AI Gemini', 'bi-robot')}
                        {renderRow('account', 'Quản lý người dùng', 'bi-people')}
                        {renderRow('auth', 'Ma trận phân quyền', 'bi-shield-lock')}
                        {renderRow('audit', 'Nhật ký hệ thống (Audit Log)', 'bi-journal-medical')}
                    </>
                );
            default:
                return null;
        }
    };

    const userName = user ? user.fullName : "Đang tải...";
    const userRolesDisplay = user && user.roles ? user.roles.join(', ') : 'Chưa có vai trò';

    return (
        <SuperAdminLayout>
        <div className={styles.page}>
            {/* Main */}
            <div className={styles.main}>
                <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                    <button type="button" className={styles.breadcrumbItem} onClick={() => navigate('/users')}>Quản lý người dùng</button>
                    <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right" aria-hidden="true"></i></span>
                    <span className={styles.breadcrumbItem}>{userName}</span>
                    <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right" aria-hidden="true"></i></span>
                    <span className={styles.breadcrumbActive}>Phân quyền chi tiết</span>
                </nav>
                <h1 className={styles.pageTitle}>Phân quyền chức năng cho nhân viên: {userName}</h1>
                <p className={styles.pageSubtitle}>Vai trò hiện tại: {userRolesDisplay}</p>

                <div className={styles.layout}>
                    {/* Sidebar */}
                    <nav className={styles.sidebar} aria-label="Danh mục module">
                        <div className={styles.sidebarHeader}>DANH MỤC MODULE</div>
                        <button type="button" aria-pressed={activeCategory === 'warehouse'} className={`${styles.menuItem} ${activeCategory === 'warehouse' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('warehouse')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-box-seam"></i> 1. Quản lý kho</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'technical'} className={`${styles.menuItem} ${activeCategory === 'technical' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('technical')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-tools"></i> 2. Kỹ thuật & Lắp ráp</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'business'} className={`${styles.menuItem} ${activeCategory === 'business' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('business')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-receipt"></i> 3. Kinh doanh & Thu chi</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'master_data'} className={`${styles.menuItem} ${activeCategory === 'master_data' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('master_data')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-database"></i> 4. Danh mục & Đối tác</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'reports'} className={`${styles.menuItem} ${activeCategory === 'reports' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('reports')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-bar-chart"></i> 5. Báo cáo & Thống kê</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'system'} className={`${styles.menuItem} ${activeCategory === 'system' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('system')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-gear"></i> 6. Quản trị hệ thống</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </button>
                    </nav>

                    {/* Matrix Content */}
                    <div className={styles.matrixPanel}>
                        <div className={styles.matrixScrollControls} aria-label="Điều khiển cuộn ngang ma trận phân quyền">
                            <span className={styles.matrixScrollHint}>Vuốt ngang hoặc dùng nút</span>
                            <button type="button" className={styles.matrixScrollButton} onClick={() => scrollMatrix(-1)} aria-label="Cuộn ma trận sang trái">
                                <i className="bi bi-chevron-left" aria-hidden="true" />
                            </button>
                            <button type="button" className={styles.matrixScrollButton} onClick={() => scrollMatrix(1)} aria-label="Cuộn ma trận sang phải">
                                <i className="bi bi-chevron-right" aria-hidden="true" />
                            </button>
                        </div>

                        <div ref={matrixRef} className={styles.matrixContent}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>CHỨC NĂNG CHI TIẾT</th>
                                        <th>Toàn quyền</th>
                                        <th>Xem</th>
                                        <th>Thêm</th>
                                        <th>Sửa</th>
                                        <th>Xóa</th>
                                        <th>Xuất Excel</th>
                                        <th>In</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renderTableBody()}
                                </tbody>
                            </table>

                            <div className={styles.legend}>
                                <div className={styles.legendLeft}>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendIcon} ${styles.legendIconSelected}`}></div>
                                        <span>Đã chọn</span>
                                    </div>
                                    <div className={styles.legendItem}>
                                        <div className={`${styles.legendIcon} ${styles.legendIconUnselected}`}></div>
                                        <span>Chưa chọn</span>
                                    </div>
                                </div>
                                <div className={styles.legendRight}>
                                    <i className="bi bi-info-circle"></i> Đối với nghiệp vụ nào không cho sử dụng sẽ làm mờ và không thể tick
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className={styles.footer}>
                <button type="button" className="btnDefault" onClick={() => navigate('/users')}>Hủy</button>
                <button type="button" className="btnPrimary" onClick={handleSave}>
                    <i className="bi bi-save"></i> Lưu thay đổi
                </button>
            </div>
        </div>
        </SuperAdminLayout>
    );
}

export default PermissionDetailPage;
