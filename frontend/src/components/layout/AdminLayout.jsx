import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import styles from './AdminLayout.module.css';

const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

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
                        <span>NhÃ  cung cáº¥p</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/customers') ? styles.active : ''}`}
                        onClick={() => navigate('/customers')}
                        type="button"
                    >
                        <i className="fas fa-users"></i>
                        <span>KhÃ¡ch hÃ ng</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/warranties') ? styles.active : ''}`}
                        onClick={() => navigate('/warranties')}
                        type="button"
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>Báº£o hÃ nh</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/repairs') ? styles.active : ''}`}
                        onClick={() => navigate('/repairs')}
                        type="button"
                    >
                        <i className="fas fa-tools"></i>
                        <span>Sá»­a chá»¯a</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/brands') ? styles.active : ''}`}
                        onClick={() => navigate('/brands')}
                        type="button"
                    >
                        <i className="fas fa-tags"></i>
                        <span>ThÆ°Æ¡ng hiá»‡u</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/assembly-orders') ? styles.active : ''}`}
                        onClick={() => navigate('/assembly-orders')}
                        type="button"
                    >
                        <i className="fas fa-boxes-stacked"></i>
                        <span>Láº¯p rÃ¡p / ThÃ¡o dá»¡</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/assembly-boms') ? styles.active : ''}`}
                        onClick={() => navigate('/assembly-boms')}
                        type="button"
                    >
                        <i className="fas fa-sitemap"></i>
                        <span>Quáº£n lÃ½ BOM</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/units') ? styles.active : ''}`}
                        onClick={() => navigate('/units')}
                        type="button"
                    >
                        <i className="fas fa-ruler-combined"></i>
                        <span>ÄÆ¡n vá»‹ tÃ­nh</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/product-categories') ? styles.active : ''}`}
                        onClick={() => navigate('/product-categories')}
                        type="button"
                    >
                        <i className="fas fa-layer-group"></i>
                        <span>Danh má»¥c sáº£n pháº©m</span>
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
                            Quy trÃ¬nh
                        </button>
                        <button
                            className={`${styles.tab} ${(currentPath.startsWith('/import-history') || currentPath.startsWith('/import-slips/')) ? styles.activeTab : ''}`}
                            onClick={() => navigate('/import-history')}
                            type="button"
                        >
                            Nháº­p kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/export-slips') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/export-slips')}
                            type="button"
                        >
                            Xuáº¥t kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/transfer-history') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/transfer-history')}
                            type="button"
                        >
                            Chuyá»ƒn kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/stocktakes') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/stocktakes')}
                            type="button"
                        >
                            Kiá»ƒm kÃª
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/assembly-orders') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/assembly-orders')}
                            type="button"
                        >
                            Láº¯p rÃ¡p / ThÃ¡o dá»¡
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
                            BÃ¡o cÃ¡o
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath === '/warehouses' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/warehouses')}
                            type="button"
                        >
                            Quáº£n lÃ½ kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath === '/products' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/products')}
                            type="button"
                        >
                            HÃ ng hÃ³a, dá»‹ch vá»¥
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
                        <UserProfileDropdown />
                    </div>
                </header>

                <main className={styles.content}>
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
