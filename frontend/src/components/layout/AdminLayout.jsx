import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getAuthRole } from '../../auth/session';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import VoiceCommandButton from '../ui/VoiceCommandButton/VoiceCommandButton';
import styles from './AdminLayout.module.css';

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
        document.documentElement.style.setProperty('--sidebar-width', isSidebarCollapsed ? '68px' : '248px');
    }, [isSidebarCollapsed]);
    const [voiceEnabled, setVoiceEnabled] = useState(() => {
        return localStorage.getItem('dlc_voice_enabled') !== 'false';
    });

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
                    <button
                        className={`${styles.navItem} ${currentPath === '/dashboard' ? styles.active : ''}`}
                        onClick={() => handleNavClick('/dashboard')}
                        type="button"
                    >
                        <i className="fas fa-warehouse"></i>
                        <span>Quy trình</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/suppliers') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/suppliers')}
                        type="button"
                    >
                        <i className="fas fa-truck-loading"></i>
                        <span>Nhà cung cấp</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/customers') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/customers')}
                        type="button"
                    >
                        <i className="fas fa-users"></i>
                        <span>Khách hàng</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/warranties') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/warranties')}
                        type="button"
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>Bảo hành</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/repairs') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/repairs')}
                        type="button"
                    >
                        <i className="fas fa-tools"></i>
                        <span>Sửa chữa</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/brands') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/brands')}
                        type="button"
                    >
                        <i className="fas fa-tags"></i>
                        <span>Thương hiệu</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/sales-orders') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/sales-orders')}
                        type="button"
                    >
                        <i className="bi bi-cart3"></i>
                        <span>Đơn bán hàng</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/assembly-orders') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/assembly-orders')}
                        type="button"
                    >
                        <i className="fas fa-boxes-stacked"></i>
                        <span>Lắp ráp / Tháo dỡ</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/assembly-boms') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/assembly-boms')}
                        type="button"
                    >
                        <i className="fas fa-sitemap"></i>
                        <span>Quản lý Cấu hình</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/units') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/units')}
                        type="button"
                    >
                        <i className="fas fa-ruler-combined"></i>
                        <span>Đơn vị tính</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/product-categories') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/product-categories')}
                        type="button"
                    >
                        <i className="fas fa-layer-group"></i>
                        <span>Danh mục sản phẩm</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/ai-chat') ? styles.active : ''}`}
                        onClick={() => handleNavClick('/ai-chat')}
                        type="button"
                    >
                        <i className="fas fa-robot"></i>
                        <span>AI Chat</span>
                    </button>
                    {isSuperAdmin && (
                        <button
                            className={`${styles.navItem} ${currentPath.startsWith('/operations') ? styles.active : ''}`}
                            onClick={() => handleNavClick('/operations')}
                            type="button"
                            style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', marginTop: '8px', fontWeight: 'bold' }}
                        >
                            <i className="fas fa-database"></i>
                            <span>Backup & System</span>
                        </button>
                    )}
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
