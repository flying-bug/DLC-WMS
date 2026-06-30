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
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/warranties') ? styles.active : ''}`}
                        onClick={() => navigate('/warranties')}
                        type="button"
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>Bảo hành</span>
                    </button>
                    <button
                        className={`${styles.navItem} ${currentPath.startsWith('/repair-tickets') ? styles.active : ''}`}
                        onClick={() => navigate('/repair-tickets')}
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
                        <button
                            className={`${styles.tab} ${currentPath.startsWith('/assembly-orders') ? styles.activeTab : ''}`}
                            onClick={() => navigate('/assembly-orders')}
                            type="button"
                        >
                            Lắp ráp / Tháo dỡ
                        </button>
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
