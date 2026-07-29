import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
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
        <div className={styles.page}>
            {/* ── Top Header ─────────────────────────────────────────────────── */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                        Duy Long Computer
                    </div>
                    <nav className={styles.navLinks}>
                        <a onClick={() => navigate('/users')} className={styles.navLink}>
                            Quản lý người dùng
                        </a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLink}>
                            Nhật ký hệ thống
                        </a>
                        <a className={styles.navLinkActive}>
                            Trung tâm vận hành
                        </a>
                    </nav>
                </div>
                <div className={styles.headerRight}>

                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Trung tâm vận hành</h1>
                        <p className={styles.pageSubtitle}>Trung tâm vận hành, sao lưu và theo dõi trạng thái hệ thống.</p>
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
        </div>
    );
}

export default OperationsCenterPage;
