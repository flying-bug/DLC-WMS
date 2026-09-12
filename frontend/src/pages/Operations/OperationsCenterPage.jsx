import { useNavigate, useSearchParams } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import DashboardTab from './tabs/DashboardTab';
import BackupCenterTab from './tabs/BackupCenterTab';
import SystemMonitorTab from './tabs/SystemMonitorTab';
import SystemSettingsTab from './tabs/SystemSettingsTab';
import EmailSettingsTab from './tabs/EmailSettingsTab';
import styles from './OperationsCenterPage.module.css';

const TABS = [
    {
        id: 'dashboard',
        label: 'Tổng quan',
        icon: 'bi bi-grid-1x2-fill',
        desc: 'System Health & Quick Backup'
    },
    {
        id: 'backup',
        label: 'Sao lưu & Khôi phục',
        icon: 'bi bi-database-fill-gear',
        desc: 'Backup Center'
    },
    {
        id: 'monitor',
        label: 'Giám sát hệ thống',
        icon: 'bi bi-activity',
        desc: 'Logs & Resource Usage'
    },
    {
        id: 'settings',
        label: 'Cài đặt hệ thống',
        icon: 'bi bi-gear-wide-connected',
        desc: 'Drive, Encryption & Alerts'
    },
    {
        id: 'email',
        label: 'Cấu hình Email',
        icon: 'bi bi-envelope-at-fill',
        desc: 'Gmail OAuth & SMTP'
    },
];

function OperationsCenterPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'dashboard';

    const handleTabChange = (tabId) => {
        setSearchParams({ tab: tabId });
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab />;
            case 'backup':    return <BackupCenterTab />;
            case 'monitor':   return <SystemMonitorTab />;
            case 'settings':  return <SystemSettingsTab onNavigateTab={handleTabChange} />;
            case 'email':     return <EmailSettingsTab />;
            default:          return <DashboardTab />;
        }
    };

    return (
        <SuperAdminLayout>
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Trung tâm điều hành</h1>
                        <p className={styles.pageSubtitle}>Trung tâm điều hành, sao lưu và theo dõi trạng thái hệ thống.</p>
                    </div>
                </div>

                <div className={styles.tabsContainer}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange(tab.id)}
                        >
                            <i className={tab.icon} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className={styles.tabContent}>
                    {renderTab()}
                </div>
            </main>
        </SuperAdminLayout>
    );
}

export default OperationsCenterPage;
