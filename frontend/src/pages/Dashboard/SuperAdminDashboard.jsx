import { useNavigate } from 'react-router-dom';
import styles from './SuperAdminDashboard.module.css';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown/UserProfileDropdown';

const SESSION_INFO = {
    loginTime: '45:12',
    serverName: 'DL-HCM-01',
};

function SuperAdminDashboard() {
    const navigate = useNavigate();

    const ACTION_CARDS = [
        {
            id: 'users',
            iconClass: 'bi bi-person-gear',
            iconWrapperClass: styles.cardIconBlue,
            iconColorStyle: { color: 'var(--color-primary)' },
            title: 'Quáº£n lÃ½ tÃ i khoáº£n & PhÃ¢n quyá»n',
            description: 'Quáº£n lÃ½ há»“ sÆ¡ nhÃ¢n viÃªn, thiáº¿t láº­p vai trÃ² há»‡ thá»‘ng vÃ  gÃ¡n quyá»n truy cáº­p báº£o máº­t.',
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
            title: 'Xem nháº­t kÃ½ há»‡ thá»‘ng',
            description: 'Kiá»ƒm tra lá»‹ch sá»­ thao tÃ¡c, nháº­t kÃ½ Ä‘Äƒng nháº­p vÃ  cÃ¡c thay Ä‘á»•i dá»¯ liá»‡u quan trá»ng trong kho.',
            route: '/audit-log',
        },
    ];

    return (
        <div className={styles.page}>
            {/* â”€â”€ HEADER â”€â”€ */}
            <header className={styles.header}>
                {/* Brand */}
                <div className={styles.headerBrand} onClick={() => navigate('/')}>
                    <div className={styles.headerLogoBox} aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="var(--color-white)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
                            placeholder="TÃ¬m kiáº¿m nhanh..."
                            aria-label="TÃ¬m kiáº¿m"
                        />
                    </div>

                    {/* Bell */}
                    <button className={styles.bellBtn} aria-label="ThÃ´ng bÃ¡o">
                        <i className="bi bi-bell" style={{ fontSize: '17px' }} />
                    </button>

                    {/* User info */}
                    <UserProfileDropdown />
                </div>
            </header>

            {/* â”€â”€ MAIN CONTENT â”€â”€ */}
            <main className={styles.main}>
                {/* Welcome section */}
                <section className={styles.welcomeSection} aria-labelledby="welcome-heading">
                    <h1 className={styles.welcomeTitle} id="welcome-heading">
                        ChÃ o má»«ng Super Admin
                    </h1>
                    <p className={styles.welcomeSubtitle}>
                        Há»‡ thá»‘ng quáº£n trá»‹ kho Duy Long Computer. Vui lÃ²ng chá»n má»™t trong cÃ¡c tÃ¡c vá»¥
                        quáº£n trá»‹ trá»ng tÃ¢m dÆ°á»›i Ä‘Ã¢y Ä‘á»ƒ tiáº¿p tá»¥c.
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

            {/* â”€â”€ FOOTER â”€â”€ */}
            <footer className={styles.footer}>
                <div className={styles.footerLeft}>
                    <span className={styles.footerItem}>
                        <i className={`bi bi-clock ${styles.footerItemIcon}`} aria-hidden="true" />
                        PhiÃªn Ä‘Äƒng nháº­p: {SESSION_INFO.loginTime}
                    </span>
                    <span className={styles.footerItem}>
                        <i className={`bi bi-server ${styles.footerItemIcon}`} aria-hidden="true" />
                        Server: {SESSION_INFO.serverName}
                    </span>
                </div>
                <div className={styles.footerRight}>
                    Â© 2026 Duy Long Computer &nbsp;Â·&nbsp; Warehouse Management System v2.4
                </div>
            </footer>
        </div>
    );
}

export default SuperAdminDashboard;
