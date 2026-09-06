import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import DashboardTab from './tabs/DashboardTab';
import BackupCenterTab from './tabs/BackupCenterTab';
import SystemMonitorTab from './tabs/SystemMonitorTab';
import SystemSettingsTab from './tabs/SystemSettingsTab';
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
];

function OperationsCenterPage() {
    const navigate   = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderTab = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab />;
            case 'backup':    return <BackupCenterTab />;
            case 'monitor':   return <SystemMonitorTab />;
            case 'settings':  return <SystemSettingsTab />;
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
                            onClick={() => setActiveTab(tab.id)}
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
