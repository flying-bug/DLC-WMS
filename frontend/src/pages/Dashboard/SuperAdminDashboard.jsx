import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SuperAdminDashboard.module.css';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import { formatDateOnly, formatTime } from '../../utils/dateFormat';

function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const ACTION_CARDS = [
        {
            id: 'users',
            iconClass: 'bi bi-person-gear',
            iconWrapperClass: styles.cardIconBlue,
            iconColorStyle: { color: 'var(--color-primary)' },
            title: 'Quản lý tài khoản & Phân quyền',
            description: 'Quản lý hồ sơ nhân viên, thiết lập vai trò hệ thống và gán quyền truy cập bảo mật.',
            route: '/users',
        },
        {
            id: 'audit-log',
            iconSvg: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-warning)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z" />
                </svg>
            ),
            iconWrapperClass: styles.cardIconOrange,
            iconColorStyle: { color: 'var(--color-warning)' },
            title: 'Xem nhật ký hệ thống',
            description: 'Kiểm tra lịch sử thao tác, nhật ký đăng nhập và các thay đổi dữ liệu quan trọng trong kho.',
            route: '/audit-log',
        },
        {
            id: 'operations',
            iconClass: 'bi bi-speedometer2',
            iconWrapperClass: styles.cardIconGreen,
            iconColorStyle: { color: 'var(--color-success, #22c55e)' },
            title: 'Trung tâm điều hành',
            description: 'Giám sát hoạt động kho, tiến độ đơn hàng và hiệu suất nhân viên theo thời gian thực.',
            route: '/operations',
        },
    ];

    return (
        <div className={styles.page}>
            {/* ── HEADER ── */}
            <header className={styles.header}>
                {/* Brand */}
                <button type="button" className={styles.headerBrand} onClick={() => navigate('/')}>
                    <div className={styles.headerLogoBox} aria-hidden="true">
                        <img src="/dl-logo.png" alt="" className={styles.headerLogo} />
                    </div>
                    <span className={styles.headerBrandName}>Duy Long Computer</span>
                </button>

                {/* Controls */}
                <div className={styles.headerControls}>
                    {/* User info */}
                    <UserProfileDropdown />
                </div>
            </header>

            {/* ── MAIN CONTENT ── */}
            <main className={styles.main}>
                {/* Welcome section */}
                <section className={styles.welcomeSection} aria-labelledby="welcome-heading">
                    <h1 className={styles.welcomeTitle} id="welcome-heading">
                        Chào mừng Super Admin
                    </h1>
                    <p className={styles.welcomeSubtitle}>
                        Hệ thống quản trị kho Duy Long Computer. Vui lòng chọn một trong các tác vụ
                        quản trị trọng tâm dưới đây để tiếp tục.
                    </p>
                </section>

                {/* Action cards */}
                <div className={styles.cardsGrid}>
                    {ACTION_CARDS.map((card) => (
                        <button
                            type="button"
                            key={card.id}
                            className={styles.actionCard}
                            onClick={() => navigate(card.route)}
                            aria-label={card.title}
                        >
                            <div className={`${styles.cardIconWrapper} ${card.iconWrapperClass}`} aria-hidden="true">
                                {card.iconSvg ? card.iconSvg : <i className={card.iconClass} style={card.iconColorStyle} />}
                            </div>
                            <h2 className={styles.cardTitle}>{card.title}</h2>
                            <p className={styles.cardDesc}>{card.description}</p>
                        </button>
                    ))}
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer className={styles.footer}>
                <div className={styles.footerLeft}>
                    <span className={styles.footerItem}>
                        <i className={`bi bi-clock ${styles.footerItemIcon}`} aria-hidden="true" />
                        Giờ hiện tại: {formatTime(currentTime, { withSeconds: true })} {formatDateOnly(currentTime)}
                    </span>
                </div>
                <div className={styles.footerRight}>
                    © 2026 Duy Long Computer &nbsp;·&nbsp; Warehouse Management System v1.0
                </div>
            </footer>

        </div>
    );
}

export default SuperAdminDashboard;
