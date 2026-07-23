import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import VoiceCommandButton from '../ui/VoiceCommandButton/VoiceCommandButton';
import styles from './AdminLayout.module.css';

const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;
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

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.logoArea}>
                    <img src="/dl-logo.png" alt="Duy Long Logo" className={styles.brandLogo} />
                    <div className={styles.brandText}>
                        <span className={styles.brandTitle}>Duy Long</span>
                        <span className={styles.brandSubtitle}>Warehouse Management</span>
                    </div>
                </div>
                <nav className={styles.navMenu}>
                    <button
                        className={`${styles.navItem} ${currentPath === '/dashboard' ? styles.active : ''}`}
                        onClick={() => navigate('/dashboard')}
                        type="button"
                    >
                        <i className="fas fa-warehouse"></i>
                        <span>Kho</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/suppliers') ? styles.active : ''}`}
                        onClick={() => navigate('/suppliers')}
                        type="button"
                    >
                        <i className="fas fa-truck-loading"></i>
                        <span>Nhà cung cấp</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/customers') ? styles.active : ''}`}
                        onClick={() => navigate('/customers')}
                        type="button"
                    >
                        <i className="fas fa-users"></i>
                        <span>Khách hàng</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/warranties') ? styles.active : ''}`}
                        onClick={() => navigate('/warranties')}
                        type="button"
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>Bảo hành</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/repairs') ? styles.active : ''}`}
                        onClick={() => navigate('/repairs')}
                        type="button"
                    >
                        <i className="fas fa-tools"></i>
                        <span>Sửa chữa</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/brands') ? styles.active : ''}`}
                        onClick={() => navigate('/brands')}
                        type="button"
                    >
                        <i className="fas fa-tags"></i>
                        <span>Thương hiệu</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/assembly-orders') ? styles.active : ''}`}
                        onClick={() => navigate('/assembly-orders')}
                        type="button"
                    >
                        <i className="fas fa-boxes-stacked"></i>
                        <span>Lắp ráp / Tháo dỡ</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/assembly-boms') ? styles.active : ''}`}
                        onClick={() => navigate('/assembly-boms')}
                        type="button"
                    >
                        <i className="fas fa-sitemap"></i>
                        <span>Quản lý BOM</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/units') ? styles.active : ''}`}
                        onClick={() => navigate('/units')}
                        type="button"
                    >
                        <i className="fas fa-ruler-combined"></i>
                        <span>Đơn vị tính</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/product-categories') ? styles.active : ''}`}
                        onClick={() => navigate('/product-categories')}
                        type="button"
                    >
                        <i className="fas fa-layer-group"></i>
                        <span>Danh mục sản phẩm</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/ai-chat') ? styles.active : ''}`}
                        onClick={() => navigate('/ai-chat')}
                        type="button"
                    >
                        <i className="fas fa-robot"></i>
                        <span>AI Chat</span>
                    </button>
                </nav>
            </aside>

            <div className={styles.mainWrapper}>
                <header className={styles.header}>
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
                            BOM
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
