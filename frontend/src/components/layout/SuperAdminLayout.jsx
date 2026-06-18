import { useNavigate, useLocation } from 'react-router-dom';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import styles from './SuperAdminLayout.module.css';

const SuperAdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;

    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a
                            onClick={() => navigate('/users')}
                            className={currentPath.startsWith('/users') ? styles.navLinkActive : styles.navLink}
                        >
                            Quản lý người dùng
                        </a>
                        <a
                            onClick={() => navigate('/audit-log')}
                            className={currentPath.startsWith('/audit-log') ? styles.navLinkActive : styles.navLink}
                        >
                            Nhật ký hệ thống
                        </a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="Tìm kiếm hệ thống..." />
                    </div>
                    <button className={styles.bellBtn}>
                        <i className="bi bi-bell" />
                        <span className={styles.bellDot}></span>
                    </button>
                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            <div className={styles.mainWrapper}>
                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default SuperAdminLayout;
