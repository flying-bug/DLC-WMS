import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getAuthRole, getAuthRoles, getAuthPermissions } from '../../auth/session';
import { useAiFeature } from '../../contexts/AiFeatureContext';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import NotificationBell from '../ui/NotificationBell/NotificationBell';
import VoiceCommandButton from '../ui/VoiceCommandButton/VoiceCommandButton';
import ActiveWorkflowGuide from '../workflow/ActiveWorkflowGuide';
import styles from './AdminLayout.module.css';

const MENU_CONFIG = [
    {
        id: 'main',
        label: 'PHÂN HỆ',
        items: [
            { path: '/main-dashboard', icon: 'fas fa-chart-pie', label: 'Tổng quan', moduleId: 'overview', moduleKeys: ['report_balance', 'report_ledger', 'report_transfer', 'report_debt', 'report_sales', 'report_summary'] },
            { path: '/dashboard', icon: 'fas fa-warehouse', label: 'Kho', moduleId: 'warehouse', moduleKeys: ['import', 'export', 'transfer', 'stocktake', 'assembly', 'assembly_config', 'warehouse_master', 'report_balance', 'report_ledger', 'report_transfer'] },
            { path: '/purchase-orders', icon: 'bi bi-bag-plus', label: 'Mua hàng', moduleId: 'purchase', moduleKey: 'purchase_order' },
            { path: '/sales-orders', icon: 'bi bi-cart3', label: 'Bán hàng', moduleId: 'sales', moduleKeys: ['sales_order', 'einvoice'] },
            { path: '/payments', icon: 'bi bi-cash-coin', label: 'Thu chi', moduleId: 'finance', moduleKey: 'payment' },
            { path: '/warranties', icon: 'fas fa-shield-alt', label: 'Dịch vụ', moduleId: 'service', moduleKeys: ['warranty', 'repair'] }
        ]
    },
    {
        id: 'catalog',
        label: 'DANH MỤC',
        items: [
            { path: '/customers', icon: 'fas fa-handshake', label: 'Đối tác', moduleId: 'partner', moduleKeys: ['customer', 'supplier'] },
            { path: '/products', icon: 'fas fa-boxes', label: 'Vật tư hàng hóa', moduleId: 'catalog', moduleKeys: ['product', 'product_category', 'brand', 'unit'] }
        ]
    },
    {
        id: 'system',
        label: 'HỆ THỐNG',
        items: [
            { path: '/ai-chat', icon: 'fas fa-robot', label: 'Trợ lý AI', moduleKey: 'ai_chat' },
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

    const userRoles = getAuthRoles();
    const userPermissions = getAuthPermissions();
    const isSuperAdmin = userRoles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN' || r === 'ADMIN' || r === 'ROLE_ADMIN');
    const isManager = userRoles.some(r => r === 'MANAGER' || r === 'ROLE_MANAGER');
    const { aiEnabled } = useAiFeature();
    
    // Configuration for top header tabs based on active module
    const TABS_CONFIG = {
        overview: [
            { path: '/main-dashboard', label: 'Tổng quan', exact: true }
        ],
        warehouse: [
            { path: '/dashboard', label: 'Quy trình', exact: true },
            { path: '/import-history', label: 'Nhập kho', matches: ['/import-history', '/import-slips'], moduleKey: 'import' },
            { path: '/export-slips', label: 'Xuất kho', moduleKey: 'export' },
            { path: '/transfer-history', label: 'Chuyển kho', moduleKey: 'transfer' },
            { path: '/stocktakes', label: 'Kiểm kê', moduleKey: 'stocktake' },
            { path: '/assembly-orders', label: 'Lắp ráp / Tháo dỡ', moduleKey: 'assembly' },
            { path: '/assembly-boms', label: 'Cấu hình máy', moduleKey: 'assembly_config' },
            { path: '/warehouses', label: 'Quản lý kho', moduleKey: 'warehouse_master' },
            { path: '/reports', label: 'Báo cáo kho', moduleKeys: ['report_balance', 'report_ledger', 'report_transfer'] }
        ],
        purchase: [
            { path: '/purchase-orders', label: 'Đơn mua hàng', moduleKey: 'purchase_order' }
        ],
        sales: [
            { path: '/sales-orders', label: 'Đơn bán hàng', moduleKey: 'sales_order' },
            { path: '/einvoices', label: 'Hóa đơn điện tử', moduleKey: 'einvoice' }
        ],
        finance: [
            { path: '/payments/receipt', label: 'Phiếu Thu', moduleKey: 'payment' },
            { path: '/payments/expense', label: 'Phiếu Chi', moduleKey: 'payment' }
        ],
        service: [
            { path: '/warranties', label: 'Bảo hành', moduleKey: 'warranty' },
            { path: '/repairs', label: 'Sửa chữa', moduleKey: 'repair' }
        ],
        partner: [
            { path: '/customers', label: 'Khách hàng', moduleKey: 'customer' },
            { path: '/suppliers', label: 'Nhà cung cấp', moduleKey: 'supplier' }
        ],
        catalog: [
            { path: '/products', label: 'Danh sách Hàng hóa', moduleKey: 'product' },
            { path: '/product-categories', label: 'Danh mục sản phẩm', moduleKey: 'product_category' },
            { path: '/brands', label: 'Thương hiệu', moduleKey: 'brand' },
            { path: '/units', label: 'Đơn vị tính', moduleKey: 'unit' }
        ],
        system: [
            { path: '/ai-chat', label: 'AI Chat', moduleKey: 'ai_chat' },
            { path: '/operations', label: 'Backup DB', adminOnly: true }
        ]
    };

    // Determine the active module based on currentPath
    const getActiveModule = () => {
        if (currentPath === '/main-dashboard') return 'overview';
        if (['/dashboard', '/import-history', '/import-slips', '/export-slips', '/transfer-history', '/stocktakes', '/assembly-orders', '/assembly-boms', '/warehouses', '/reports'].some(p => currentPath.startsWith(p))) return 'warehouse';
        if (currentPath.startsWith('/purchase-orders')) return 'purchase';
        if (currentPath.startsWith('/sales-orders') || currentPath.startsWith('/einvoices')) return 'sales';
        if (currentPath.startsWith('/payments')) return 'finance';
        if (currentPath.startsWith('/warranties') || currentPath.startsWith('/repairs')) return 'service';
        if (['/customers', '/suppliers'].some(p => currentPath.startsWith(p))) return 'partner';
        if (['/product-categories', '/brands', '/units', '/products'].some(p => currentPath.startsWith(p))) return 'catalog';
        if (currentPath.startsWith('/ai-chat') || currentPath.startsWith('/operations')) return 'system';
        return 'overview';
    };

    const activeModule = getActiveModule();
    const activeTabs = (TABS_CONFIG[activeModule] || []).filter(tab => {
        if (tab.adminOnly && !isSuperAdmin) return false;
        if (tab.path === '/ai-chat' && !aiEnabled) return false;
        if (isSuperAdmin || isManager) return true;
        if (tab.moduleKey) {
            return userPermissions.some(p => p.startsWith(`${tab.moduleKey}:`));
        }
        if (tab.moduleKeys) {
            return tab.moduleKeys.some(key => userPermissions.some(p => p.startsWith(`${key}:`)));
        }
        return true;
    });

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navMenuRef = useRef(null);

    useEffect(() => {
        const syncSidebarWidth = () => {
            const viewportWidth = window.innerWidth;
            const sidebarWidth = viewportWidth < 768 ? '0px' : '72px';
            document.documentElement.style.setProperty('--sidebar-width', sidebarWidth);
        };

        syncSidebarWidth();
        window.addEventListener('resize', syncSidebarWidth);
        return () => window.removeEventListener('resize', syncSidebarWidth);
    }, []);

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

    const checkItemPermission = (item) => {
        if (item.adminOnly && !isSuperAdmin) return false;
        if (item.path === '/ai-chat' && !aiEnabled) return false;
        if (isSuperAdmin || isManager) return true;

        if (item.moduleKey) {
            return userPermissions.some(p => p.startsWith(`${item.moduleKey}:`));
        }
        if (item.moduleKeys) {
            return item.moduleKeys.some(key => userPermissions.some(p => p.startsWith(`${key}:`)));
        }
        return true;
    };

    const visibleMenuGroups = MENU_CONFIG.map(group => ({
        ...group,
        items: group.items.filter(checkItemPermission)
    })).filter(group => group.items.length > 0);

    const activeGroup = visibleMenuGroups.find(group => group.items.some(item => (
        isMenuItemActive(item, currentPath)
    )));
    const activeItem = activeGroup?.items.find(item => (
        isMenuItemActive(item, currentPath)
    ));

    const toggleGroup = (groupId) => {
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

            <div className={styles.sidebarWrapper}>
                <aside
                    className={`${styles.sidebar} ${mobileMenuOpen ? styles.mobileOpen : ''}`}
                >
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
                                                        title={item.label}
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
                </aside>
            </div>

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
                    <div className={styles.headerRight} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <NotificationBell />
                        <UserProfileDropdown voiceEnabled={voiceEnabled} onToggleVoice={toggleVoice} aiEnabled={aiEnabled} />
                    </div>
                </header>

                <main className={styles.content}>
                    {children || <Outlet />}
                </main>
                <ActiveWorkflowGuide />
            </div>

            {aiEnabled && voiceEnabled && <VoiceCommandButton />}
        </div>
    );
};

export default AdminLayout;
