import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getAuthRole } from '../../auth/session';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import VoiceCommandButton from '../ui/VoiceCommandButton/VoiceCommandButton';
import styles from './AdminLayout.module.css';

const MENU_CONFIG = [
    {
        id: 'overview',
        label: 'TỔNG QUAN',
        items: [
            { path: '/dashboard', icon: 'fas fa-warehouse', label: 'Quy trình' }
        ]
    },
    {
        id: 'transaction',
        label: 'GIAO DỊCH',
        items: [
            { path: '/purchase-orders', icon: 'bi bi-bag-plus', label: 'Đơn mua hàng' },
            { path: '/sales-orders', icon: 'bi bi-cart3', label: 'Đơn bán hàng' },
            { path: '/payments', icon: 'bi bi-cash-coin', label: 'Thu chi & Công nợ' }
        ]
    },
    {
        id: 'service',
        label: 'DỊCH VỤ',
        items: [
            { path: '/warranties', icon: 'fas fa-shield-alt', label: 'Bảo hành' },
            { path: '/repairs', icon: 'fas fa-tools', label: 'Sửa chữa' }
        ]
    },
    {
        id: 'partner',
        label: 'ĐỐI TÁC',
        items: [
            { path: '/customers', icon: 'fas fa-users', label: 'Khách hàng' },
            { path: '/suppliers', icon: 'fas fa-truck-loading', label: 'Nhà cung cấp' }
        ]
    },
    {
        id: 'catalog',
        label: 'DANH MỤC',
        items: [
            { path: '/product-categories', icon: 'fas fa-layer-group', label: 'Danh mục sản phẩm' },
            { path: '/brands', icon: 'fas fa-tags', label: 'Thương hiệu' },
            { path: '/units', icon: 'fas fa-ruler-combined', label: 'Đơn vị tính' }
        ]
    },
    {
        id: 'config',
        label: 'CẤU HÌNH',
        items: [
            { path: '/assembly-boms', icon: 'fas fa-sitemap', label: 'Quản lý Cấu hình' },
            { path: '/assembly-orders', icon: 'fas fa-boxes-stacked', label: 'Lắp ráp / Tháo dỡ' }
        ]
    },
    {
        id: 'system',
        label: 'HỆ THỐNG',
        items: [
            { path: '/ai-chat', icon: 'fas fa-robot', label: 'AI Chat' },
            { path: '/operations', icon: 'fas fa-database', label: 'Backup & System', adminOnly: true }
        ]
    }
];

const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const userRole = getAuthRole() || 'STAFF';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'ROLE_ADMIN';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem('dlc_sidebar_collapsed') === 'true';
    });

    useEffect(() => {
        const syncSidebarWidth = () => {
            const viewportWidth = window.innerWidth;
            const sidebarWidth = viewportWidth < 768
                ? '0px'
                : isSidebarCollapsed
                    ? '72px'
                    : viewportWidth < 1200
                        ? '80px'
                        : '248px';
            document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
        };

        syncSidebarWidth();
        window.addEventListener('resize', syncSidebarWidth);
        return () => window.removeEventListener('resize', syncSidebarWidth);
    }, [isSidebarCollapsed]);
    const [voiceEnabled, setVoiceEnabled] = useState(() => {
        return localStorage.getItem('dlc_voice_enabled') !== 'false';
    });

    const [expandedGroups, setExpandedGroups] = useState({
        overview: true,
        transaction: true,
        service: true,
        partner: true,
        catalog: true,
        config: true,
        system: true
    });

    const toggleGroup = (groupId) => {
        if (isSidebarCollapsed) {
            setIsSidebarCollapsed(false);
            localStorage.setItem('dlc_sidebar_collapsed', 'false');
        }
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const toggleVoice = () => {
        setVoiceEnabled((prev) => {
            const next = !prev;
            localStorage.setItem('dlc_voice_enabled', String(next));
            return next;
        });
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('dlc_sidebar_collapsed', String(next));
            return next;
        });
    };

    const handleNavClick = (path) => {
        navigate(path);
        setMobileMenuOpen(false);
    };

    return (
        <div className={styles.layout}>
            {/* Mobile Overlay Backdrop */}
            {mobileMenuOpen && (
                <div
                    className={styles.mobileBackdrop}
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
                <div className={styles.logoArea}>
                    <img src="/dl-logo.png" alt="Duy Long Logo" className={styles.brandLogo} />
                    <div className={styles.brandText}>
                        <span className={styles.brandTitle}>Duy Long</span>
                        <span className={styles.brandSubtitle}>Warehouse Management</span>
                    </div>
                    <button
                        type="button"
                        className={styles.mobileCloseBtn}
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <nav className={styles.navMenu}>
                    {MENU_CONFIG.map(group => {
                        const hasVisibleItems = group.items.some(item => !item.adminOnly || isSuperAdmin);
                        if (!hasVisibleItems) return null;

                        const isExpanded = expandedGroups[group.id];

                        return (
                            <div key={group.id} className={styles.menuGroup}>
                                <div 
                                    className={styles.navGroupLabel} 
                                    onClick={() => toggleGroup(group.id)}
                                >
                                    <span>{group.label}</span>
                                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                </div>
                                {isExpanded && (
                                    <div className={styles.groupItems}>
                                        {group.items.map(item => {
                                            if (item.adminOnly && !isSuperAdmin) return null;
                                            
                                            const isActive = item.path === '/dashboard' 
                                                ? currentPath === item.path 
                                                : currentPath.startsWith(item.path);

                                            return (
                                                <button
                                                    key={item.path}
                                                    className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                                    onClick={() => handleNavClick(item.path)}
                                                    type="button"
                                                >
                                                    <i className={item.icon}></i>
                                                    <span>{item.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
                <div className={styles.collapseBtnContainer}>
                    <button
                        type="button"
                        className={styles.collapseBtn}
                        onClick={toggleSidebar}
                        title={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
                    >
                        <i className={`fas ${isSidebarCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`}></i>
                    </button>
                </div>
            </aside>

            <div className={styles.mainWrapper}>
                <header className={styles.header}>
                    <button
                        type="button"
                        className={styles.hamburgerBtn}
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Mở menu"
                    >
                        <i className="fas fa-bars"></i>
                    </button>

                    <nav className={styles.topTabs}>
                        <button
                            className={`${styles.tab} ${currentPath === '/dashboard' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/dashboard')}
                            type="button"
                        >
                            Quy trình
                        </button>
                        <button
                            className={`${styles.tab} ${(currentPath.startsWith('/import-history') || currentPath.startsWith('/import-slips/')) ? styles.activeTab : ''}`}
                            onClick={() => navigate('/import-history')}
                            type="button"
                        >
                            Nhập kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/export-slips') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/export-slips')}
                            type="button"
                        >
                            Xuất kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/transfer-history') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/transfer-history')}
                            type="button"
                        >
                            Chuyển kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/stocktakes') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/stocktakes')}
                            type="button"
                        >
                            Kiểm kê
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/assembly-orders') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/assembly-orders')}
                            type="button"
                        >
                            Lắp ráp / Tháo dỡ
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/assembly-boms') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/assembly-boms')}
                            type="button"
                        >
                            Cấu hình
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/reports') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/reports')}
                            type="button"
                        >
                            Báo cáo
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/payments') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/payments')}
                            type="button"
                        >
                            Thu chi
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath === '/warehouses' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/warehouses')}
                            type="button"
                        >
                            Quản lý kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath === '/products' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/products')}
                            type="button"
                        >
                            Hàng hóa, dịch vụ
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/ai-chat') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/ai-chat')}
                            type="button"
                        >
                            AI Chat
                        </button>
                        {isSuperAdmin && (
                            <button
                                className={`${styles.tab} ${currentPath.startsWith('/operations') ? styles.activeTab : ''}`}
                                onClick={() => navigate('/operations')}
                                type="button"
                                style={{ color: '#6366f1', fontWeight: 'bold' }}
                            >
                                <i className="fas fa-database" style={{ marginRight: '6px' }}></i>
                                Backup DB
                            </button>
                        )}
                    </nav>
                    <div className={styles.headerRight}>
                        <UserProfileDropdown voiceEnabled={voiceEnabled} onToggleVoice={toggleVoice} />
                    </div>
                </header>

                <main className={styles.content}>
                    {children || <Outlet />}
                </main>
            </div>

            {voiceEnabled && <VoiceCommandButton />}
        </div>
    );
};

export default AdminLayout;
