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
                    <div className={styles.logoIcon}>DL</div>
                    <span className={styles.logoText}>
                        Duy Long
                        <br />
                        <small>Tech System</small>
                    </span>
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
                        <button className={styles.tab} type="button">Biểu đồ</button>
                        <button
                            className={`${styles.tab} ${currentPath === '/import-history' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/import-history')}
                            type="button"
                        >
                            Nhập kho
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath === '/export-slips' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/export-slips')}
                            type="button"
                        >
                            Xuất kho
                        </button>
                        <button className={styles.tab} type="button">Chuyển kho</button>
                        <button className={styles.tab} type="button">Kiểm kê</button>
                        <button className={styles.tab} type="button">Báo cáo</button>
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
                            className={`${styles.tab} ${currentPath === '/units' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/units')}
                            type="button"
                        >
                            Đơn vị tính
                        </button>
                        <button
                            className={`${styles.tab} ${currentPath === '/product-categories' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/product-categories')}
                            type="button"
                        >
                            Danh mục sản phẩm
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
