import styles from './AdminLayout.module.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';

const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;
    const userRole = localStorage.getItem('role') || 'STAFF';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logoArea}>
                    <div className={styles.logoIcon}>DL</div>
                    <span className={styles.logoText}>Duy Long<br/><small>Tech System</small></span>
                </div>
                <nav className={styles.navMenu}>
                    <a className={`${styles.navItem} ${currentPath === '/dashboard' ? styles.active : ''}`} onClick={() => navigate('/dashboard')}>
                        <i className="fas fa-warehouse"></i> Kho
                    </a>
                </nav>
            </aside>

            {/* Main Content */}
            <div className={styles.mainWrapper}>
                {/* Header / Topbar */}
                <header className={styles.header}>
                    <div className={styles.topTabs}>
                        <div 
                            className={`${styles.tab} ${currentPath === '/dashboard' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/dashboard')}
                        >
                            Quy trình
                        </div>
                        <div className={styles.tab}>Biểu đồ</div>
                        <div className={styles.tab}>Nhập kho</div>
                        <div 
                            className={`${styles.tab} ${currentPath === '/export-slips' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/export-slips')}
                        >
                            Xuất kho
                        </div>
                        <div className={styles.tab}>Chuyển kho</div>
                        <div className={styles.tab}>Kiểm kê</div>
                        <div className={styles.tab}>Báo cáo</div>
                        <div 
                            className={`${styles.tab} ${currentPath === '/products' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/products')}
                        >
                            Hàng hóa, dịch vụ
                        </div>
                        <div 
                            className={`${styles.tab} ${currentPath === '/units' ? styles.activeTab : ''}`}
                            onClick={() => navigate('/units')}
                        >
                            Đơn vị tính
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <UserProfileDropdown />
                    </div>
                </header>

                {/* Page Content */}
                <main className={styles.content}>
                    {children || <Outlet />}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
