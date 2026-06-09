import { useState, useEffect, useRef } from 'react';
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
        iconClass: 'bi bi-person-gear',
        iconWrapperClass: styles.cardIconBlue,
        iconColorStyle: { color: '#1e3f7a' },
        title: 'Quản lý tài khoản & Phân quyền',
        description: 'Quản lý hồ sơ nhân viên, thiết lập vai trò hệ thống và gán quyền truy cập bảo mật.',
        route: '/users',
    },
    {
        id: 'audit-log',
        iconSvg: (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d97706' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z" />
            </svg>
        ),
        iconWrapperClass: styles.cardIconOrange,
        iconColorStyle: { color: '#d97706' },
        title: 'Xem nhật ký hệ thống',
        description: 'Kiểm tra lịch sử thao tác, nhật ký đăng nhập và các thay đổi dữ liệu quan trọng trong kho.',
        route: '/audit-log',
    },
];

function DashboardPage() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                    <div
                        className={styles.userInfo}
                        role="button"
                        tabIndex={0}
                        aria-label="Tài khoản người dùng"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        onMouseEnter={() => setIsDropdownOpen(true)}
                        onMouseLeave={() => setIsDropdownOpen(false)}
                        ref={dropdownRef}
                    >
                        <div className={styles.avatarCircle} aria-hidden="true">SA</div>
                        <span className={styles.userName}>Super Admin</span>
                        <i className={`bi bi-chevron-down ${styles.chevronIcon}`} aria-hidden="true" />

                        {/* Dropdown Menu */}
                        {(isDropdownOpen || null) && (
                            <div className={`${styles.userDropdown} ${isDropdownOpen ? styles.showDropdown : ''}`}>
                                <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/profile'); setIsDropdownOpen(false); }}>
                                    <i className="bi bi-person" /> Xem thông tin cá nhân
                                </div>
                                <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/change-password'); setIsDropdownOpen(false); }}>
                                    <i className="bi bi-shield-lock" /> Đổi mật khẩu
                                </div>
                                <div className={styles.dropdownDivider} />
                                <div className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={(e) => { e.stopPropagation(); navigate('/login'); setIsDropdownOpen(false); }}>
                                    <i className="bi bi-box-arrow-right" /> Đăng xuất
                                </div>
                            </div>
                        )}
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
