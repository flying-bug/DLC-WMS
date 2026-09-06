import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserProfileDropdown from '../ui/UserProfileDropdown/UserProfileDropdown';
import styles from './SuperAdminLayout.module.css';

const SuperAdminLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [currentPath]);

    useEffect(() => {
        if (!isMobileMenuOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobileMenuOpen]);

    const navigateFromMenu = (path) => {
        setIsMobileMenuOpen(false);
        navigate(path);
    };

    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button
                        type="button"
                        className={`btn d-md-none ${styles.hamburgerBtn}`}
                        onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
                        aria-label={isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="super-admin-navigation"
                    >
                        <i className={`bi ${isMobileMenuOpen ? 'bi-x-lg' : 'bi-list'} fs-4`} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.brandButton} onClick={() => navigateFromMenu('/dashboard')}>
                        <span className={styles.logoWrap}>
                            <img src="/dl-logo.png" alt="" className={styles.logo} />
                        </span>
                        <span className={styles.brandName}>Duy Long Computer</span>
                    </button>
                    <nav id="super-admin-navigation" aria-label="Điều hướng Super Admin" className={`${styles.navLinks} ${isMobileMenuOpen ? styles.navLinksMobileOpen : ''}`}>
                        <button
                            type="button"
                            onClick={() => navigateFromMenu('/users')}
                            className={currentPath.startsWith('/users') ? styles.navLinkActive : styles.navLink}
                            aria-current={currentPath.startsWith('/users') ? 'page' : undefined}
                        >
                            Quản lý người dùng
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateFromMenu('/audit-log')}
                            className={currentPath.startsWith('/audit-log') ? styles.navLinkActive : styles.navLink}
                            aria-current={currentPath.startsWith('/audit-log') ? 'page' : undefined}
                        >
                            Nhật ký hệ thống
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateFromMenu('/operations')}
                            className={currentPath.startsWith('/operations') ? styles.navLinkActive : styles.navLink}
                            aria-current={currentPath.startsWith('/operations') ? 'page' : undefined}
                        >
                            Trung tâm vận hành
                        </button>
                    </nav>
                </div>
                <div className={`${styles.headerRight} ${isMobileMenuOpen ? styles.headerRightMobileOpen : ''}`}>
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
