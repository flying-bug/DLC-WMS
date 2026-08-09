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
        import: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        export: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        transfer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        stocktake: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        assembly_config: { full: false, view: false, add: false, edit: false },
        assembly: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

        // Giao dịch
        purchase_order: { full: false, view: false, add: false, edit: false },
        sales_order: { full: false, view: false, add: false, edit: false, export: false, print: false },
        payment: { full: false, view: false, add: false, edit: false },

        // Dịch vụ
        warranty: { full: false, view: false },
        repair: { full: false, view: false, add: false, edit: false, delete: false },

        // Danh mục
        product: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        product_category: { full: false, view: false, add: false, edit: false, delete: false },
        brand: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        unit: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        customer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        supplier: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        warehouse_master: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

        // Báo cáo
        report_balance: { full: false, view: false, export: false },
        report_ledger: { full: false, view: false, export: false },
        report_transfer: { full: false, view: false, export: false },
        report_debt: { full: false, view: false, export: false },
        report_summary: { full: false, view: false, export: false },

        // Quản trị hệ thống
        ai_chat: { full: false, view: false },
        account: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        auth: { full: false, view: false, edit: false },
        audit: { full: false, view: false, export: false }
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch user
                const userRes = await axiosClient.get(`/users/${id}`);
                const userData = userRes.data?.data;
                setUser(userData);

                // Set initial permission matrix based on saved permissions or roles
                if (userData) {
                    const hasStaff = userData.roles && userData.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF');
                    if (!hasStaff) {
                        showToast('error', "Chỉ tài khoản Nhân viên (STAFF) mới được phép phân quyền động.");
                        setTimeout(() => navigate('/users'), 1500);
                        return;
                    }
                    setPermissions(prev => {
                        const newPerms = { ...prev };

                        // 1. If user already has explicit permissions, populate them
                        if (userData.permissions && userData.permissions.length > 0) {
                            userData.permissions.forEach(code => {
                                const [mod, act] = code.split(':');
                                if (newPerms[mod] && newPerms[mod][act] !== undefined) {
                                    newPerms[mod][act] = true;
                                }
                            });
                        } else if (userData.roles) {
                            // 2. Otherwise fallback to default permissions based on roles
                            const hasAdmin = userData.roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN');
                            const hasManager = userData.roles.some(r => r === 'MANAGER' || r === 'ROLE_MANAGER');
                            const hasStaff = userData.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF');

                            if (hasAdmin) {
                                Object.keys(newPerms).forEach(mod => {
                                    Object.keys(newPerms[mod]).forEach(act => {
                                        newPerms[mod][act] = true;
                                    });
                                });
                            } else if (hasManager) {
                                Object.keys(newPerms).forEach(mod => {
                                    const isSystem = ['account', 'auth', 'audit'].includes(mod);
                                    Object.keys(newPerms[mod]).forEach(act => {
                                        newPerms[mod][act] = !isSystem;
                                    });
                                });
                            } else if (hasStaff) {
                                const defaultStaffModules = [
                                    'import', 'export', 'purchase_order', 'sales_order', 'payment',
                                    'transfer', 'stocktake', 'assembly_config', 'assembly', 'warranty', 'repair',
                                    'product', 'report_balance', 'ai_chat'
                                ];
                                Object.keys(newPerms).forEach(mod => {
                                    const isDefaultStaffModule = defaultStaffModules.includes(mod);
                                    Object.keys(newPerms[mod]).forEach(act => {
                                        newPerms[mod][act] = isDefaultStaffModule;
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
                        {renderRow('warehouse_master', 'Kho', 'bi-houses')}
                        {renderRow('import', 'Nhập kho', 'bi-box-arrow-in-right')}
                        {renderRow('export', 'Xuất kho', 'bi-box-arrow-right')}
                        {renderRow('transfer', 'Chuyển kho', 'bi-arrow-left-right')}
                        {renderRow('stocktake', 'Kiểm kê kho', 'bi-clipboard2-check')}
                        {renderRow('assembly_config', 'Quản lý Cấu hình', 'bi-diagram-3')}
                        {renderRow('assembly', 'Lắp ráp/Tháo dỡ', 'bi-box-seam')}
                    </>
                );
            case 'transactions':
                return (
                    <>
                        {renderRow('purchase_order', 'Đơn mua hàng', 'bi-bag-plus')}
                        {renderRow('sales_order', 'Đơn bán hàng', 'bi-cart3')}
                        {renderRow('payment', 'Thu chi & Công nợ', 'bi-cash-coin')}
                    </>
                );
            case 'services':
                return (
                    <>
                        {renderRow('warranty', 'Bảo hành', 'bi-shield-check')}
                        {renderRow('repair', 'Sửa chữa', 'bi-tools')}
                    </>
                );
            case 'master_data':
                return (
                    <>
                        {renderRow('product', 'Sản phẩm', 'bi-tags')}
                        {renderRow('product_category', 'Danh mục sản phẩm', 'bi-folder')}
                        {renderRow('brand', 'Thương hiệu', 'bi-bookmark-star')}
                        {renderRow('unit', 'Đơn vị tính', 'bi-rulers')}
                        {renderRow('customer', 'Khách hàng', 'bi-person-vcard')}
                        {renderRow('supplier', 'Nhà cung cấp', 'bi-truck')}
                    </>
                );
            case 'reports':
                return (
                    <>
                        {renderRow('report_balance', 'Báo cáo tồn kho hiện tại', 'bi-bar-chart')}
                        {renderRow('report_ledger', 'Sổ chi tiết vật tư hàng hóa', 'bi-journal-text')}
                        {renderRow('report_transfer', 'Báo cáo chuyển kho nội bộ', 'bi-arrow-left-right')}
                        {renderRow('report_debt', 'Báo cáo công nợ đối tác', 'bi-receipt')}
                        {renderRow('report_summary', 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', 'bi-file-earmark-bar-graph')}
                    </>
                );
            case 'system':
                return (
                    <>
                        {renderRow('ai_chat', 'AI Chat', 'bi-robot')}
                        {renderRow('account', 'Quản lý người dùng', 'bi-people')}
                        {renderRow('auth', 'Phân quyền', 'bi-shield-lock')}
                        {renderRow('audit', 'Nhật ký hệ thống', 'bi-journal-medical')}
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
                            <div className={styles.menuItemLeft}><i className="bi bi-box-seam"></i> Quản lý kho</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'transactions'} className={`${styles.menuItem} ${activeCategory === 'transactions' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('transactions')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-receipt"></i> Giao dịch</div>
                            {activeCategory === 'transactions' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'services'} className={`${styles.menuItem} ${activeCategory === 'services' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('services')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-tools"></i> Dịch vụ</div>
                            {activeCategory === 'services' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'master_data'} className={`${styles.menuItem} ${activeCategory === 'master_data' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('master_data')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-database"></i> Danh mục</div>
                            {activeCategory === 'master_data' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'reports'} className={`${styles.menuItem} ${activeCategory === 'reports' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('reports')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-bar-chart"></i> Báo cáo</div>
                            {activeCategory === 'reports' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </button>
                        <button type="button" aria-pressed={activeCategory === 'system'} className={`${styles.menuItem} ${activeCategory === 'system' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('system')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-gear"></i> Quản trị hệ thống</div>
                            {activeCategory === 'system' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
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
