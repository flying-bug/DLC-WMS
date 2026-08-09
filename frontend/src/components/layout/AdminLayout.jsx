import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getAuthRole } from '../../auth/session';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import VoiceCommandButton from '../ui/VoiceCommandButton/VoiceCommandButton';
import ActiveWorkflowGuide from '../workflow/ActiveWorkflowGuide';
import styles from './AdminLayout.module.css';

const MENU_CONFIG = [
    {
        id: 'overview',
        label: 'TỔNG QUAN',
        items: [
            { path: '/dashboard', icon: 'fas fa-chart-pie', label: 'Tổng quan' }
        ]
    },
    {
        id: 'inbound',
        label: 'MUA & NHẬP HÀNG',
        items: [
            { path: '/purchase-orders', icon: 'bi bi-bag-plus', label: 'Đơn mua hàng' },
            { path: '/import-history', activePaths: ['/import-history', '/import-slips'], icon: 'fas fa-boxes', label: 'Nhập kho' }
        ]
    },
    {
        id: 'outbound',
        label: 'BÁN & XUẤT HÀNG',
        items: [
            { path: '/sales-orders', icon: 'bi bi-cart3', label: 'Đơn bán hàng' },
            { path: '/export-slips', icon: 'fas fa-truck-loading', label: 'Xuất kho' }
        ]
    },
    {
        id: 'warehouse',
        label: 'QUẢN LÝ KHO',
        items: [
            { path: '/warehouses', icon: 'fas fa-warehouse', label: 'Kho' },
            { path: '/transfer-history', icon: 'fas fa-exchange-alt', label: 'Chuyển kho' },
            { path: '/stocktakes', icon: 'fas fa-clipboard-check', label: 'Kiểm kê' }
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
        id: 'catalog',
        label: 'HÀNG HÓA',
        items: [
            { path: '/products', icon: 'fas fa-box', label: 'Hàng hóa, dịch vụ' },
            { path: '/product-categories', icon: 'fas fa-layer-group', label: 'Danh mục sản phẩm' },
            { path: '/brands', icon: 'fas fa-tags', label: 'Thương hiệu' },
            { path: '/units', icon: 'fas fa-ruler-combined', label: 'Đơn vị tính' }
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
        id: 'config',
        label: 'CẤU HÌNH',
        items: [
            { path: '/assembly-boms', icon: 'fas fa-sitemap', label: 'Quản lý Cấu hình' },
            { path: '/assembly-orders', icon: 'fas fa-boxes-stacked', label: 'Lắp ráp / Tháo dỡ' }
        ]
    },
    {
        id: 'finance',
        label: 'TÀI CHÍNH & BÁO CÁO',
        items: [
            { path: '/payments', icon: 'bi bi-cash-coin', label: 'Thu chi & Công nợ' },
            { path: '/reports', icon: 'fas fa-chart-line', label: 'Báo cáo' }
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
        overview: true,
        inbound: true,
        outbound: true,
        warehouse: true,
        service: true,
        partner: true,
        catalog: true,
        config: true,
        finance: true,
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
                                <button
                                    type="button"
                                    className={styles.navGroupLabel} 
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={isExpanded}
                                >
                                    <span>{group.label}</span>
                                    <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                                </button>
                                {isExpanded && (
                                    <div className={styles.groupItems}>
                                        {group.items.map(item => {
                                            const isActive = isMenuItemActive(item, currentPath);

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

                    <div className={styles.headerContext}>
                        <span className={styles.headerSection}>{activeGroup?.label || 'DUY LONG WMS'}</span>
                        <i className="fas fa-chevron-right" aria-hidden="true"></i>
                        <strong>{activeItem?.label || 'Quản lý kho vận'}</strong>
                    </div>
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
