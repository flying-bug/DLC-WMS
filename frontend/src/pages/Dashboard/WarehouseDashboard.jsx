import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './WarehouseDashboard.module.css';

function WarehouseDashboard() {
    const navigate = useNavigate();

    const processItems = [
        { label: 'Lắp ráp, tháo dỡ', icon: 'fas fa-tools' },
        { label: 'Xuất kho', icon: 'fas fa-truck-loading', action: () => navigate('/export-slips') },
        { label: 'Nhập kho', icon: 'fas fa-boxes', action: () => navigate('/import-history') },
        { label: 'Chuyển kho', icon: 'fas fa-exchange-alt' },
        { label: 'Tính giá xuất kho', icon: 'fas fa-calculator' },
        { label: 'Kiểm kê', icon: 'fas fa-clipboard-check' },
    ];

    const toolbarItems = [
        { label: 'Kho', icon: 'fas fa-warehouse' },
        { label: 'Vật tư hàng hóa', icon: 'fas fa-box', action: () => navigate('/products') },
        { label: 'Đơn vị tính', icon: 'fas fa-balance-scale', action: () => navigate('/units') },
        { label: 'Tiện ích', icon: 'fas fa-cog' },
        { label: 'Tùy chọn', icon: 'fas fa-sliders-h' },
    ];

    const reportItems = [
        'Sổ chi tiết vật tư hàng hóa',
        'Tổng hợp tồn kho',
        'Báo cáo đối chiếu giá thành và giá trị nhập kho',
        'Báo cáo đối chiếu kho và sổ cái',
        'Báo cáo tiến độ sản xuất',
    ];

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
                            <li key={report}>
                                <i className="fas fa-chart-line"></i>
                                <span>{report}</span>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.allReports}>
                        <a href="#" onClick={(e) => e.preventDefault()}>
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
