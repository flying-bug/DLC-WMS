import { useNavigate } from 'react-router-dom';
import styles from './DashboardPage.module.css';

// ── Minimal static data for UI render ──
const SESSION_INFO = {
    loginTime: '45:12',
    serverName: 'DL-HCM-01',
};

const ACTION_CARDS = [
    {
        id: 'users',
        iconClass: 'bi bi-people-fill',
        iconWrapperClass: styles.cardIconBlue,
        iconColorStyle: { color: '#1e3f7a' },
        title: 'Quản lý tài khoản & Phân quyền',
        description: 'Quản lý hồ sơ nhân viên, thiết lập vai trò hệ thống và gán quyền truy cập bảo mật.',
        route: '/users',
    },
    {
        id: 'audit-log',
        iconClass: 'bi bi-journal-text',
        iconWrapperClass: styles.cardIconOrange,
        iconColorStyle: { color: '#d97706' },
        title: 'Xem nhật ký hệ thống',
        description: 'Kiểm tra lịch sử thao tác, nhật ký đăng nhập và các thay đổi dữ liệu quan trọng trong kho.',
        route: '/audit-log',
    },
];

function DashboardPage() {
    const navigate = useNavigate();

    return (
        <div className={styles.page}>

            {/* ── HEADER ── */}
            <header className={styles.header}>

                {/* Brand */}
                <div className={styles.headerBrand}>
                    <div className={styles.headerLogoBox} aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                    </div>
                    <span className={styles.headerBrandName}>Duy Long Computer</span>
                    <span className={styles.headerDivider} aria-hidden="true" />
                    <span className={styles.headerSubtitle}>Warehouse Management</span>
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
                    <button className={styles.bellBtn} aria-label="Thông báo">
                        <i className="bi bi-bell" style={{ fontSize: '17px' }} />
                    </button>

                    {/* User info */}
                    <div className={styles.userInfo} role="button" tabIndex={0} aria-label="Tài khoản người dùng">
                        <div className={styles.avatarCircle} aria-hidden="true">SA</div>
                        <span className={styles.userName}>Super Admin</span>
                        <i className={`bi bi-chevron-down ${styles.chevronIcon}`} aria-hidden="true" />
                    </div>
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
                                <i className={card.iconClass} style={card.iconColorStyle} />
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
                        Phiên đăng nhập: {SESSION_INFO.loginTime}
                    </span>
                    <span className={styles.footerItem}>
                        <i className={`bi bi-server ${styles.footerItemIcon}`} aria-hidden="true" />
                        Server: {SESSION_INFO.serverName}
                    </span>
                </div>
                <div className={styles.footerRight}>
                    © 2026 Duy Long Computer &nbsp;·&nbsp; Warehouse Management System v2.4
                </div>
            </footer>

        </div>
    );
}

export default DashboardPage;
