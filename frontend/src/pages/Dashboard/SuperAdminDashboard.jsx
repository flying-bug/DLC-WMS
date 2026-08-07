import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './SuperAdminDashboard.module.css';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';
import Toast from '../../components/ui/Toast/Toast';
import { formatDateOnly, formatTime } from '../../utils/dateFormat';

function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
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
                <div className={styles.headerBrand} onClick={() => navigate('/')}>
                    <div className={styles.headerLogoBox} aria-hidden="true">
                        <img src="/dl-logo.png" alt="Duy Long Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <span className={styles.headerBrandName}>Duy Long Computer</span>
                </div>

                {/* Controls */}
                <div className={styles.headerControls}>
                    {/* Search */}
                    <div className={styles.searchBar}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Tìm kiếm nhanh..."
                            aria-label="Tìm kiếm"
                        />
                    </div>

                    {/* Bell */}
                    <button 
                        className={styles.bellBtn} 
                        aria-label="Thông báo"
                        onClick={() => setToast({ isVisible: true, type: 'info', message: 'Tính năng thông báo đang được phát triển.' })}
                    >
                        <i className="bi bi-bell" style={{ fontSize: '17px' }} />
                    </button>

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
                <div className={styles.cardsGrid} role="list">
                    {ACTION_CARDS.map((card) => (
                        <div
                            key={card.id}
                            className={styles.actionCard}
                            role="listitem"
                            onClick={() => navigate(card.route)}
                            onKeyDown={(e) => e.key === 'Enter' && navigate(card.route)}
                            tabIndex={0}
                            aria-label={card.title}
                        >
                            <div className={`${styles.cardIconWrapper} ${card.iconWrapperClass}`} aria-hidden="true">
                                {card.iconSvg ? card.iconSvg : <i className={card.iconClass} style={card.iconColorStyle} />}
                            </div>
                            <h2 className={styles.cardTitle}>{card.title}</h2>
                            <p className={styles.cardDesc}>{card.description}</p>
                        </div>
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

            {toast.isVisible && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast({ ...toast, isVisible: false })}
                />
            )}
        </div>
    );
}

export default SuperAdminDashboard;
