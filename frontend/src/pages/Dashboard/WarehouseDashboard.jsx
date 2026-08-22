import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getAuthRoles, getAuthPermissions } from '../../auth/session';
import styles from './WarehouseDashboard.module.css';

function WarehouseDashboard() {
    const navigate = useNavigate();
    const userRoles = getAuthRoles();
    const userPermissions = getAuthPermissions();
    const isSuperAdmin = userRoles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN' || r === 'ADMIN' || r === 'ROLE_ADMIN');
    const isManager = userRoles.some(r => r === 'MANAGER' || r === 'ROLE_MANAGER');

    const hasModule = (moduleCode) => {
        if (isSuperAdmin || isManager) return true;
        return userPermissions.some(p => p.startsWith(`${moduleCode}:`));
    };

    const processItems = [
        { label: 'Lắp ráp, tháo dỡ', icon: 'fas fa-tools', module: 'assembly', action: () => navigate('/assembly-orders') },
        { label: 'Xuất kho', icon: 'fas fa-truck-loading', module: 'export', action: () => navigate('/export-slips') },
        { label: 'Nhập kho', icon: 'fas fa-boxes', module: 'import', action: () => navigate('/import-history') },
        { label: 'Chuyển kho', icon: 'fas fa-exchange-alt', module: 'transfer', action: () => navigate('/transfer-history') },
        { label: 'Quản lý Cấu hình', icon: 'fas fa-sitemap', module: 'assembly_config', action: () => navigate('/assembly-boms') },
        { label: 'Kiểm kê', icon: 'fas fa-clipboard-check', module: 'stocktake', action: () => navigate('/stocktakes') },
    ].filter(item => hasModule(item.module));

    const toolbarItems = [
        { label: 'Kho', icon: 'fas fa-warehouse', module: 'warehouse_master', action: () => navigate('/warehouses') },
        { label: 'Hàng hóa dịch vụ', icon: 'fas fa-box', module: 'product', action: () => navigate('/products') },
        { label: 'Đơn vị tính', icon: 'fas fa-balance-scale', module: 'unit', action: () => navigate('/units') },
        { label: 'Danh mục sản phẩm', icon: 'fas fa-list', module: 'product_category', action: () => navigate('/product-categories') },
        { label: 'Bảo hành', icon: 'fas fa-shield-alt', module: 'warranty', action: () => navigate('/warranties') }
    ].filter(item => hasModule(item.module));

    const reportItems = [
        { id: 'inventory-summary', name: 'Tổng hợp tồn kho (Nhập - Xuất - Tồn)', module: 'report_summary' },
        { id: 'stock-ledger', name: 'Sổ chi tiết vật tư hàng hóa', module: 'report_ledger' },
        { id: 'inventory-balance', name: 'Báo cáo tồn kho hiện tại', module: 'report_balance' },
        { id: 'stock-transfers', name: 'Báo cáo chuyển kho nội bộ', module: 'report_transfer' },
        { id: 'debt', name: 'Báo cáo công nợ đối tác', module: 'report_debt' }
    ].filter(item => hasModule(item.module));

    return (
        <AdminLayout activeTab="dashboard">
            <div className={styles.dashboardContainer}>
                <section className={styles.mainProcess}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.eyebrow}>Quy trình vận hành</p>
                            <h3 className={styles.sectionTitle}>Nghiệp vụ kho</h3>
                        </div>

                    </div>

                    <div className={styles.processDiagram}>
                        <div className={styles.flowLine}></div>
                        {processItems.map((item, index) => (
                            <button
                                className={styles.node}
                                key={item.label}
                                onClick={item.action}
                                type="button"
                                style={{ '--delay': `${index * 40}ms` }}
                            >
                                <span className={styles.iconWrapper}>
                                    <i className={item.icon}></i>
                                </span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className={styles.bottomToolbar}>
                        {toolbarItems.map((item) => (
                            <button className={styles.toolbarItem} key={item.label} onClick={item.action} type="button">
                                <i className={item.icon}></i>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                <aside className={styles.reportsArea}>
                    <div className={styles.reportHeader}>
                        <p className={styles.eyebrow}>Theo dõi nhanh</p>
                        <h3 className={styles.sectionTitle}>Báo cáo</h3>
                    </div>
                    <ul className={styles.reportList}>
                        {reportItems.map((report) => (
                            <li key={report.id} onClick={() => navigate('/reports', { state: { reportId: report.id, fromDashboard: true } })} style={{ cursor: 'pointer' }}>
                                <i className="fas fa-chart-line"></i>
                                <span>{report.name}</span>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.allReports}>
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/reports'); }}>
                            Tất cả báo cáo
                            <i className="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </aside>
            </div>
        </AdminLayout>
    );
}

export default WarehouseDashboard;
