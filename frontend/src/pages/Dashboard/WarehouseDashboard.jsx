import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import styles from './WarehouseDashboard.module.css';

function WarehouseDashboard() {
    const navigate = useNavigate();

    const processItems = [
        { label: 'Láº¯p rÃ¡p, thÃ¡o dá»¡', icon: 'fas fa-tools' },
        { label: 'Xuáº¥t kho', icon: 'fas fa-truck-loading', action: () => navigate('/export-slips') },
        { label: 'Nháº­p kho', icon: 'fas fa-boxes', action: () => navigate('/import-history') },
        { label: 'Chuyá»ƒn kho', icon: 'fas fa-exchange-alt', action: () => navigate('/transfer-history') },
        { label: 'Quáº£n lÃ½ kho', icon: 'fas fa-warehouse', action: () => navigate('/warehouses') },
        { label: 'Kiá»ƒm kÃª', icon: 'fas fa-clipboard-check' },
    ];

    const toolbarItems = [
        { label: 'Kho', icon: 'fas fa-warehouse', action: () => navigate('/warehouses') },
        { label: 'Váº­t tÆ° hÃ ng hÃ³a', icon: 'fas fa-box', action: () => navigate('/products') },
        { label: 'ÄÆ¡n vá»‹ tÃ­nh', icon: 'fas fa-balance-scale', action: () => navigate('/units') },
        { label: 'Tiá»‡n Ã­ch', icon: 'fas fa-cog' },
        { label: 'TÃ¹y chá»n', icon: 'fas fa-sliders-h' },
    ];

    const reportItems = [
        'Sá»• chi tiáº¿t váº­t tÆ° hÃ ng hÃ³a',
        'Tá»•ng há»£p tá»“n kho',
        'BÃ¡o cÃ¡o Ä‘á»‘i chiáº¿u giÃ¡ thÃ nh vÃ  giÃ¡ trá»‹ nháº­p kho',
        'BÃ¡o cÃ¡o Ä‘á»‘i chiáº¿u kho vÃ  sá»• cÃ¡i',
        'BÃ¡o cÃ¡o tiáº¿n Ä‘á»™ sáº£n xuáº¥t',
    ];

    return (
        <AdminLayout activeTab="dashboard">
            <div className={styles.dashboardContainer}>
                <section className={styles.mainProcess}>
                    <div className={styles.panelHeader}>
                        <div>
                            <p className={styles.eyebrow}>Quy trÃ¬nh váº­n hÃ nh</p>
                            <h3 className={styles.sectionTitle}>Nghiá»‡p vá»¥ kho</h3>
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
                        <p className={styles.eyebrow}>Theo dÃµi nhanh</p>
                        <h3 className={styles.sectionTitle}>BÃ¡o cÃ¡o</h3>
                    </div>
                    <ul className={styles.reportList}>
                        {reportItems.map((report) => (
                            <li key={report} onClick={() => navigate('/reports')} style={{ cursor: 'pointer' }}>
                                <i className="fas fa-chart-line"></i>
                                <span>{report}</span>
                            </li>
                        ))}
                    </ul>
                    <div className={styles.allReports}>
                        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/reports'); }}>
                            Táº¥t cáº£ bÃ¡o cÃ¡o
                            <i className="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </aside>
            </div>
        </AdminLayout>
    );
}

export default WarehouseDashboard;
