import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChangePasswordPage.module.css';

// ── Minimal static data for UI render ──
const SESSION_INFO = {
    loginTime: '45:12',
    serverName: 'DL-HCM-01',
};

function ChangePasswordPage() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Form states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle logic
    };

    return (
        <div className={styles.page}>

            {/* ── HEADER ── */}
            <header className={styles.header}>

                {/* Brand */}
                <div className={styles.headerBrand}>
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
                <div className={styles.contentWrapper}>
                    {/* Breadcrumb */}
                    <div className={styles.breadcrumb}>
                        <i className="bi bi-house-door" />
                        <i className="bi bi-chevron-right" />
                        <span className={styles.breadcrumbItem}>Tài khoản</span>
                        <i className="bi bi-chevron-right" />
                        <span className={styles.breadcrumbActive}>Đổi mật khẩu</span>
                    </div>

                    {/* Card */}
                    <div className={styles.card}>
                        <h1 className={styles.cardTitle}>Đổi mật khẩu</h1>
                        <p className={styles.cardSubtitle}>
                            Vui lòng nhập mật khẩu hiện tại và mật khẩu mới để bảo mật tài khoản.
                        </p>

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {/* Current Password */}
                            <div className={styles.formGroup}>
                                <label>Mật khẩu hiện tại</label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type={showCurrent ? "text" : "password"} 
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <i 
                                        className={`bi ${showCurrent ? 'bi-eye' : 'bi-eye-slash'} ${styles.eyeIcon}`} 
                                        onClick={() => setShowCurrent(!showCurrent)}
                                    />
                                </div>
                            </div>

                            {/* New Password */}
                            <div className={styles.formGroup}>
                                <label>Mật khẩu mới</label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type={showNew ? "text" : "password"} 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <i 
                                        className={`bi ${showNew ? 'bi-eye' : 'bi-eye-slash'} ${styles.eyeIcon}`} 
                                        onClick={() => setShowNew(!showNew)}
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className={styles.formGroup}>
                                <label>Xác nhận mật khẩu mới</label>
                                <div className={styles.inputWrapper}>
                                    <input 
                                        type={showConfirm ? "text" : "password"} 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                    <i 
                                        className={`bi ${showConfirm ? 'bi-eye' : 'bi-eye-slash'} ${styles.eyeIcon}`} 
                                        onClick={() => setShowConfirm(!showConfirm)}
                                    />
                                </div>
                            </div>

                            {/* Info Alert */}
                            <div className={styles.infoAlert}>
                                <i className="bi bi-info-circle" />
                                <span>Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và chữ số.</span>
                            </div>

                            {/* Actions */}
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.btnPrimary}>
                                    <i className="bi bi-floppy" /> Cập nhật mật khẩu
                                </button>
                                <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard')}>
                                    Hủy bỏ
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Badge */}
                    <div className={styles.securityBadge}>
                        <i className="bi bi-shield-check" />
                        <span>Hệ thống bảo mật Duy Long v2.0 - Đã được mã hóa 256-bit</span>
                    </div>
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

export default ChangePasswordPage;
