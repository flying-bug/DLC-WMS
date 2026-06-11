import styles from './AdminLayout.module.css';
import { useNavigate } from 'react-router-dom';

const AdminLayout = ({ children }) => {
    const navigate = useNavigate();
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
                
                <button className={styles.quickAddBtn}>
                    <span className={styles.plusIcon}>+</span> Thêm nhanh
                </button>

                <nav className={styles.navMenu}>
                    <a className={styles.navItem}>
                        <i className="fas fa-money-check"></i> Tiền gửi
                    </a>
                    <a className={styles.navItem}>
                        <i className="fas fa-shopping-bag"></i> Mua hàng
                    </a>
                    <a className={styles.navItem}>
                        <i className="fas fa-shopping-cart"></i> Bán hàng
                    </a>
                    <a className={styles.navItem}>
                        <i className="fas fa-file-invoice"></i> Quản lý hóa đơn
                    </a>
                    <a className={`${styles.navItem} ${styles.active}`}>
                        <i className="fas fa-warehouse"></i> Kho
                    </a>
                    <a className={styles.navItem}>
                        <i className="fas fa-tools"></i> Công cụ dụng cụ
                    </a>
                    <a className={styles.navItem}>
                        <i className="fas fa-car"></i> Tài sản cố định
                    </a>
                    {userRole === 'MANAGER' && (
                        <a className={styles.navItem}>
                            <i className="fas fa-users"></i> Quản lý nhân sự
                        </a>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <div className={styles.mainWrapper}>
                {/* Header / Topbar */}
                <header className={styles.header}>
                    <div className={styles.topTabs}>
                        <div className={`${styles.tab} ${styles.activeTab}`}>Quy trình</div>
                        <div className={styles.tab}>Biểu đồ</div>
                        <div className={styles.tab}>Nhập kho</div>
                        <div className={styles.tab}>Xuất kho</div>
                        <div className={styles.tab}>Chuyển kho</div>
                        <div className={styles.tab}>Kiểm kê</div>
                        <div className={styles.tab}>Báo cáo</div>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>Xin chào, {userRole}</span>
                            <div className={styles.avatar}></div>
                        </div>
                        <button className={styles.logoutBtn} onClick={handleLogout}>Đăng xuất</button>
                    </div>
                </header>

                {/* Page Content */}
                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
