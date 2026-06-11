import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import styles from './PermissionDetailPage.module.css';

function PermissionDetailPage() {
    const navigate = useNavigate();
    const { id: _id } = useParams();

    const userName = "An Nguyễn";

    const [activeCategory, setActiveCategory] = useState('warehouse');

    // Initial state matching the UC list
    const [permissions, setPermissions] = useState({
        // Quản lý kho
        import: { full: false, view: true, add: true, edit: true, delete: false, export: true, print: true },
        export: { full: false, view: true, add: false, edit: false, delete: false, export: true, print: true },
        transfer: { full: false, view: true, add: false, edit: false, delete: false, export: false, print: true },
        stocktake: { full: false, view: true, add: false, edit: false, delete: false, export: false, print: true },
        assembly: { full: false, view: true, add: false, edit: false, delete: false, export: false, print: false },
        
        // Danh mục
        product: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        unit: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        customer: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        supplier: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        warehouse_master: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },

        // Báo cáo (no add/edit/delete/print in some)
        report_balance: { full: false, view: false, export: false },
        report_ledger: { full: false, view: false, export: false },
        report_summary: { full: false, view: false, export: false },

        // Quản trị hệ thống
        account: { full: false, view: false, add: false, edit: false, delete: false, export: false, print: false },
        auth: { full: false, view: false, edit: false },
        audit: { full: false, view: false, export: false }
    });

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

    const handleSave = () => {
        console.log("Saved permissions:", permissions);
        navigate('/users');
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
                <p className={styles.pageSubtitle}>Vai trò: Người sử dụng hệ thống</p>

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
