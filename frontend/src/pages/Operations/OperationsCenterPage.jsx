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
        label: 'Dashboard',
        icon: 'bi bi-grid-1x2-fill',
        desc: 'System Health & Quick Backup'
    },
    {
        id: 'backup',
        label: 'Backup & Restore',
        icon: 'bi bi-database-fill-gear',
        desc: 'Backup Center'
    },
    {
        id: 'monitor',
        label: 'System Monitor',
        icon: 'bi bi-activity',
        desc: 'Logs & Resource Usage'
    },
    {
        id: 'settings',
        label: 'System Settings',
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
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a onClick={() => navigate('/users')} className={styles.navLink}>
                            Quản lý người dùng
                        </a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLink}>
                            Nhật ký hệ thống
                        </a>
                        <a className={styles.navLinkActive}>
                            Operations Center
                        </a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.headerBadge}>
                        <i className="bi bi-shield-lock-fill" />
                        <span>SUPER ADMIN</span>
                    </div>
                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            <div className={styles.mainWrapper}>
                {/* ── Sidebar ─────────────────────────────────────────────────── */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarHeader}>
                        <i className="bi bi-terminal-fill" />
                        <span>Operations Center</span>
                    </div>
                    <nav className={styles.sidebarNav}>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                className={`${styles.sidebarItem} ${activeTab === tab.id ? styles.sidebarItemActive : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <i className={`${tab.icon} ${styles.sidebarIcon}`} />
                                <div className={styles.sidebarText}>
                                    <span className={styles.sidebarLabel}>{tab.label}</span>
                                    <span className={styles.sidebarDesc}>{tab.desc}</span>
                                </div>
                                {activeTab === tab.id && (
                                    <div className={styles.sidebarActiveBar} />
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className={styles.sidebarFooter}>
                        <i className="bi bi-hdd-fill" />
                        <span>DLC-WMS v2.0</span>
                    </div>
                </aside>

                {/* ── Content ─────────────────────────────────────────────────── */}
                <main className={styles.content}>
                    {renderTab()}
                </main>
            </div>
        </div>
    );
}

export default OperationsCenterPage;
