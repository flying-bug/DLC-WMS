import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import styles from './PermissionDetailPage.module.css';

function PermissionDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [user, setUser] = useState(null);
    const [rolesList, setRolesList] = useState([]);
    const [activeCategory, setActiveCategory] = useState('warehouse');

    // Initial state matching the UC list
    const [permissions, setPermissions] = useState({
        // Quản lý kho
        import: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        export: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        transfer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        stocktake: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        assembly: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        
        // Danh mục
        product: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        unit: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        customer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        supplier: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        warehouse_master: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

        // Báo cáo
        report_balance: { full: false, view: false, export: false },
        report_ledger: { full: false, view: false, export: false },
        report_summary: { full: false, view: false, export: false },

        // Quản trị hệ thống
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
                
                // Fetch roles
                const rolesRes = await axiosClient.get('/roles');
                const rolesData = rolesRes.data?.data || [];
                setRolesList(rolesData);

                // Set initial permission matrix based on roles
                if (userData && userData.roles) {
                    const hasAdmin = userData.roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN');
                    const hasManager = userData.roles.some(r => r === 'MANAGER' || r === 'ROLE_MANAGER');
                    const hasStaff = userData.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF');

                    setPermissions(prev => {
                        const newPerms = { ...prev };
                        if (hasAdmin) {
                            // Give full permissions everywhere
                            Object.keys(newPerms).forEach(mod => {
                                Object.keys(newPerms[mod]).forEach(act => {
                                    newPerms[mod][act] = true;
                                });
                            });
                        } else if (hasManager) {
                            // Give warehouse + master_data + reports full, system none
                            Object.keys(newPerms).forEach(mod => {
                                const isSystem = ['account', 'auth', 'audit'].includes(mod);
                                Object.keys(newPerms[mod]).forEach(act => {
                                    newPerms[mod][act] = !isSystem;
                                });
                            });
                        } else if (hasStaff) {
                            // Give warehouse only
                            Object.keys(newPerms).forEach(mod => {
                                const isWarehouse = ['import', 'export', 'transfer', 'stocktake', 'assembly'].includes(mod);
                                Object.keys(newPerms[mod]).forEach(act => {
                                    newPerms[mod][act] = isWarehouse;
                                });
                            });
                        }
                        return newPerms;
                    });
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin phân quyền:", error);
            }
        };

        loadData();
    }, [id]);

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
            // Determine role code based on matrix selections:
            // - If any system module has views/edits checked -> SUPER_ADMIN
            // - Else if any master_data or report module has views/edits checked -> MANAGER
            // - Else -> STAFF
            const hasSystemSelected = ['account', 'auth', 'audit'].some(mod => {
                return Object.keys(permissions[mod] || {}).some(act => permissions[mod][act]);
            });

            const hasManagerSelected = ['product', 'unit', 'customer', 'supplier', 'warehouse_master', 'report_balance', 'report_ledger', 'report_summary'].some(mod => {
                return Object.keys(permissions[mod] || {}).some(act => permissions[mod][act]);
            });

            let targetRoleCode = 'STAFF';
            if (hasSystemSelected) {
                targetRoleCode = 'SUPER_ADMIN';
            } else if (hasManagerSelected) {
                const possibleCodes = rolesList.map(r => r.code);
                if (possibleCodes.includes('MANAGER')) {
                    targetRoleCode = 'MANAGER';
                } else if (possibleCodes.includes('ROLE_MANAGER')) {
                    targetRoleCode = 'ROLE_MANAGER';
                }
            } else {
                const possibleCodes = rolesList.map(r => r.code);
                if (possibleCodes.includes('STAFF')) {
                    targetRoleCode = 'STAFF';
                } else if (possibleCodes.includes('ROLE_STAFF')) {
                    targetRoleCode = 'ROLE_STAFF';
                }
            }

            const targetRole = rolesList.find(r => r.code === targetRoleCode);
            if (!targetRole) {
                alert('Không tìm thấy vai trò phù hợp trong cơ sở dữ liệu!');
                return;
            }

            await axiosClient.put(`/users/${id}/permissions`, [targetRole.id]);
            alert('Cập nhật phân quyền thành công!');
            navigate('/users');
        } catch (error) {
            console.error('Lỗi lưu phân quyền:', error);
            alert('Có lỗi xảy ra khi lưu phân quyền.');
        }
    };

    const renderCheckbox = (module, action) => {
        if (permissions[module][action] === undefined) {
            return <input type="checkbox" className={styles.checkbox} disabled style={{ opacity: 0.3 }} />;
        }
        return (
            <input 
                type="checkbox" 
                className={styles.checkbox} 
                checked={permissions[module][action]} 
                onChange={(e) => handleCheck(module, action, e.target.checked)} 
            />
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
            <td>{renderCheckbox(module, 'full')}</td>
            <td>{renderCheckbox(module, 'view')}</td>
            <td>{renderCheckbox(module, 'add')}</td>
            <td>{renderCheckbox(module, 'edit')}</td>
            <td>{renderCheckbox(module, 'delete')}</td>
            <td>{renderCheckbox(module, 'export')}</td>
            <td>{renderCheckbox(module, 'print')}</td>
        </tr>
    );

    const renderTableBody = () => {
        switch(activeCategory) {
            case 'warehouse':
                return (
                    <>
                        {renderRow('import', 'Nhập kho', 'bi-box-arrow-in-right')}
                        {renderRow('export', 'Xuất kho', 'bi-box-arrow-right')}
                        {renderRow('transfer', 'Chuyển kho', 'bi-arrow-left-right')}
                        {renderRow('stocktake', 'Kiểm kê kho', 'bi-clipboard2-check')}
                        {renderRow('assembly', 'Đóng gói / Tháo dỡ', 'bi-box-seam')}
                    </>
                );
            case 'master_data':
                return (
                    <>
                        {renderRow('product', 'Sản phẩm', 'bi-tags')}
                        {renderRow('unit', 'Đơn vị tính', 'bi-rulers')}
                        {renderRow('customer', 'Khách hàng', 'bi-person-vcard')}
                        {renderRow('supplier', 'Nhà cung cấp', 'bi-truck')}
                        {renderRow('warehouse_master', 'Danh mục kho bãi', 'bi-houses')}
                    </>
                );
            case 'reports':
                return (
                    <>
                        {renderRow('report_balance', 'Tồn kho hiện tại', 'bi-bar-chart')}
                        {renderRow('report_ledger', 'Sổ kho', 'bi-journal-text')}
                        {renderRow('report_summary', 'Báo cáo tổng hợp', 'bi-file-earmark-bar-graph')}
                    </>
                );
            case 'system':
                return (
                    <>
                        {renderRow('account', 'Quản lý tài khoản', 'bi-people')}
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
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>DUY LONG COMPUTER</div>
                    <div className={styles.breadcrumb}>
                        <span className={styles.breadcrumbItem} onClick={() => navigate('/users')}>Quản lý người dùng</span>
                        <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                        <span className={styles.breadcrumbItem}>{userName}</span>
                        <span className={styles.breadcrumbSeparator}><i className="bi bi-chevron-right"></i></span>
                        <span className={styles.breadcrumbActive}>Phân quyền chi tiết</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="Tìm kiếm chức năng..." />
                    </div>
                    <button className={styles.headerRightBtn}><i className="bi bi-bell"></i></button>
                    <button className={styles.headerRightBtn}><i className="bi bi-question-circle"></i></button>
                    <UserProfileDropdown />
                </div>
            </header>

            {/* Main */}
            <main className={styles.main}>
                <h1 className={styles.pageTitle}>Phân quyền chức năng cho nhân viên: {userName}</h1>
                <p className={styles.pageSubtitle}>Vai trò hiện tại: {userRolesDisplay}</p>

                <div className={styles.layout}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        <div className={styles.sidebarHeader}>DANH MỤC MODULE</div>
                        <div className={`${styles.menuItem} ${activeCategory === 'warehouse' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('warehouse')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-box-seam"></i> Quản lý kho</div>
                            <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>
                        </div>
                        <div className={`${styles.menuItem} ${activeCategory === 'master_data' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('master_data')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-database"></i> Danh mục</div>
                            {activeCategory === 'master_data' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </div>
                        <div className={`${styles.menuItem} ${activeCategory === 'reports' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('reports')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-bar-chart"></i> Báo cáo</div>
                            {activeCategory === 'reports' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </div>
                        <div className={`${styles.menuItem} ${activeCategory === 'system' ? styles.menuItemActive : ''}`} onClick={() => setActiveCategory('system')}>
                            <div className={styles.menuItemLeft}><i className="bi bi-gear"></i> Quản trị hệ thống</div>
                            {activeCategory === 'system' && <i className="bi bi-chevron-right" style={{ fontSize: '12px' }}></i>}
                        </div>
                    </div>

                    {/* Matrix Content */}
                    <div className={styles.matrixContent}>
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
            </main>

            {/* Footer Actions */}
            <div className={styles.footer}>
                <button className={styles.btnCancel} onClick={() => navigate('/users')}>Hủy</button>
                <button className={styles.btnSave} onClick={handleSave}>
                    <i className="bi bi-save"></i> Lưu thay đổi
                </button>
            </div>
        </div>
    );
}

export default PermissionDetailPage;
