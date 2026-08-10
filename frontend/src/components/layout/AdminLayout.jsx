import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getAuthRole } from '../../auth/session';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import VoiceCommandButton from '../ui/VoiceCommandButton/VoiceCommandButton';
import ActiveWorkflowGuide from '../workflow/ActiveWorkflowGuide';
import styles from './AdminLayout.module.css';

const MENU_CONFIG = [
    {
        id: 'main',
        label: 'PHÂN HỆ',
        items: [
            { path: '/main-dashboard', icon: 'fas fa-chart-pie', label: 'Tổng quan', moduleId: 'overview' },
            { path: '/dashboard', icon: 'fas fa-warehouse', label: 'Kho', moduleId: 'warehouse' },
            { path: '/purchase-orders', icon: 'bi bi-bag-plus', label: 'Mua hàng', moduleId: 'purchase' },
            { path: '/sales-orders', icon: 'bi bi-cart3', label: 'Bán hàng', moduleId: 'sales' },
            { path: '/payments', icon: 'bi bi-cash-coin', label: 'Quỹ / Thu chi', moduleId: 'finance' },
            { path: '/warranties', icon: 'fas fa-shield-alt', label: 'Dịch vụ', moduleId: 'service' }
        ]
    },
    {
        id: 'catalog',
        label: 'DANH MỤC',
        items: [
            { path: '/customers', icon: 'fas fa-handshake', label: 'Đối tác', moduleId: 'partner' },
            { path: '/products', icon: 'fas fa-boxes', label: 'Vật tư hàng hóa', moduleId: 'catalog' }
        ]
    },
    {
        id: 'system',
        label: 'HỆ THỐNG',
        items: [
            { path: '/ai-chat', icon: 'fas fa-robot', label: 'Trợ lý AI' },
            { path: '/operations', icon: 'fas fa-cogs', label: 'Thiết lập', adminOnly: true }
        ]
    }
];

const isMenuItemActive = (item, currentPath) => {
    const activePaths = item.activePaths || [item.path];
    return activePaths.some(path => (
        path === '/dashboard' ? currentPath === path : currentPath.startsWith(path)
    ));
};

const SIDEBAR_SCROLL_KEY = 'dlc_sidebar_scroll_top';

const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    const userRole = getAuthRole() || 'STAFF';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'ROLE_ADMIN';
    
    // Configuration for top header tabs based on active module
    const TABS_CONFIG = {
        overview: [
            { path: '/main-dashboard', label: 'Tổng quan', exact: true }
        ],
        warehouse: [
            { path: '/dashboard', label: 'Quy trình', exact: true },
            { path: '/import-history', label: 'Nhập kho', matches: ['/import-history', '/import-slips'] },
            { path: '/export-slips', label: 'Xuất kho' },
            { path: '/transfer-history', label: 'Chuyển kho' },
            { path: '/stocktakes', label: 'Kiểm kê' },
            { path: '/assembly-orders', label: 'Lắp ráp / Tháo dỡ' },
            { path: '/assembly-boms', label: 'Cấu hình BOM' },
            { path: '/warehouses', label: 'Quản lý kho' },
            { path: '/reports', label: 'Báo cáo kho' }
        ],
        purchase: [
            { path: '/purchase-orders', label: 'Đơn mua hàng' }
        ],
        sales: [
            { path: '/sales-orders', label: 'Đơn bán hàng' }
        ],
        finance: [
            { path: '/payments', label: 'Thu chi & Công nợ' }
        ],
        service: [
            { path: '/warranties', label: 'Bảo hành' },
            { path: '/repairs', label: 'Sửa chữa' }
        ],
        partner: [
            { path: '/customers', label: 'Khách hàng' },
            { path: '/suppliers', label: 'Nhà cung cấp' }
        ],
        catalog: [
            { path: '/products', label: 'Danh sách Hàng hóa' },
            { path: '/product-categories', label: 'Danh mục sản phẩm' },
            { path: '/brands', label: 'Thương hiệu' },
            { path: '/units', label: 'Đơn vị tính' }
        ],
        system: [
            { path: '/ai-chat', label: 'AI Chat' },
            { path: '/operations', label: 'Backup DB', adminOnly: true }
        ]
    };

    // Determine the active module based on currentPath
    const getActiveModule = () => {
        if (currentPath === '/main-dashboard') return 'overview';
        if (['/dashboard', '/import-history', '/import-slips', '/export-slips', '/transfer-history', '/stocktakes', '/assembly-orders', '/assembly-boms', '/warehouses', '/reports'].some(p => currentPath.startsWith(p))) return 'warehouse';
        if (currentPath.startsWith('/purchase-orders')) return 'purchase';
        if (currentPath.startsWith('/sales-orders')) return 'sales';
        if (currentPath.startsWith('/payments')) return 'finance';
        if (currentPath.startsWith('/warranties') || currentPath.startsWith('/repairs')) return 'service';
        if (['/customers', '/suppliers'].some(p => currentPath.startsWith(p))) return 'partner';
        if (['/product-categories', '/brands', '/units', '/products'].some(p => currentPath.startsWith(p))) return 'catalog';
        if (currentPath.startsWith('/ai-chat') || currentPath.startsWith('/operations')) return 'system';
        return 'overview';
    };

    const activeModule = getActiveModule();
    const activeTabs = TABS_CONFIG[activeModule] || [];

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navMenuRef = useRef(null);
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

    useLayoutEffect(() => {
        const savedScrollTop = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY));
        if (navMenuRef.current && Number.isFinite(savedScrollTop)) {
            navMenuRef.current.scrollTop = savedScrollTop;
        }
    }, []);
    const [voiceEnabled, setVoiceEnabled] = useState(() => {
        return localStorage.getItem('dlc_voice_enabled') !== 'false';
    });

    const [expandedGroups, setExpandedGroups] = useState({
        main: true,
        catalog: true,
        system: true
    });

    const visibleMenuGroups = MENU_CONFIG.map(group => ({
        ...group,
        items: group.items.filter(item => !item.adminOnly || isSuperAdmin)
    })).filter(group => group.items.length > 0);

    const activeGroup = visibleMenuGroups.find(group => group.items.some(item => (
        isMenuItemActive(item, currentPath)
    )));
    const activeItem = activeGroup?.items.find(item => (
        isMenuItemActive(item, currentPath)
    ));

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
        if (navMenuRef.current) {
            sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(navMenuRef.current.scrollTop));
        }
        navigate(path);
        setMobileMenuOpen(false);
    };

    const handleNavScroll = (event) => {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(event.currentTarget.scrollTop));
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
                        <span className={styles.brandTitle}>Duy Long Computer</span>
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
                <nav ref={navMenuRef} className={styles.navMenu} onScroll={handleNavScroll}>
                    {visibleMenuGroups.map(group => {
                        const isExpanded = expandedGroups[group.id];

                        return (
                            <div key={group.id} className={styles.menuGroup}>
                                <div
                                    className={styles.navGroupLabel}
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={isExpanded}
                                >
                                    <span>{group.label}</span>
                                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                </div>
                                {isExpanded && (
                                    <div className={styles.groupItems}>
                                        {group.items.map(item => {
                                            if (item.adminOnly && !isSuperAdmin) return null;

                                            const isActive = item.moduleId 
                                                ? item.moduleId === activeModule
                                                : currentPath === item.path || currentPath.startsWith(item.path + '/');

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
                        {activeTabs.map((tab) => {
                            if (tab.adminOnly && !isSuperAdmin) return null;
                            
                            // Check if current path matches the tab
                            const isActive = tab.matches 
                                ? tab.matches.some(m => currentPath.startsWith(m))
                                : (tab.exact ? currentPath === tab.path : currentPath.startsWith(tab.path));

                            return (
                                <button
                                    key={tab.path}
                                    className={`${styles.tab} ${isActive ? styles.activeTab : ''}`}
                                    onClick={() => navigate(tab.path)}
                                    type="button"
                                    style={tab.adminOnly ? { color: '#6366f1', fontWeight: 'bold' } : {}}
                                >
                                    {tab.adminOnly && <i className="fas fa-database" style={{ marginRight: '6px' }}></i>}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                    <div className={styles.headerRight}>
                        <UserProfileDropdown voiceEnabled={voiceEnabled} onToggleVoice={toggleVoice} />
                    </div>
                </header>

                <main className={styles.content}>
                    {children || <Outlet />}
                </main>
                <ActiveWorkflowGuide />
            </div>

            {voiceEnabled && <VoiceCommandButton />}
        </div>
    );
};

export default AdminLayout;
