import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../../api/axiosClient';
import { forceLogout, getAuthRole, USER_EVENT } from '../../../auth/session';
import { useTheme } from '../../../theme/useTheme';
import styles from './UserProfileDropdown.module.css';

function UserProfileDropdown({ voiceEnabled, onToggleVoice }) {
    const navigate = useNavigate();
    const { theme, themes, setTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const dropdownRef = useRef(null);

    const userRole = getAuthRole() || 'STAFF';
    const isSA = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const isMN = userRole === 'MANAGER' || userRole === 'ROLE_MANAGER';
    const fallbackName = isSA ? 'Quản trị viên' : isMN ? 'Quản lý' : 'Nhân viên';
    const displayName = profile?.fullName || fallbackName;
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || (isSA ? 'SA' : isMN ? 'MN' : 'ST');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axiosClient.get('/users/me');
                setProfile(response.data?.data || null);
            } catch {
                setProfile(null);
            }
        };

        const handleUserUpdated = (event) => {
            if (event.detail?.user) {
                setProfile(event.detail.user);
            } else {
                fetchProfile();
            }
        };

        fetchProfile();
        window.addEventListener(USER_EVENT, handleUserUpdated);
        return () => window.removeEventListener(USER_EVENT, handleUserUpdated);
    }, []);

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
            <div className={styles.avatarCircle} aria-hidden="true">
                {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className={styles.avatarImage} />
                ) : initials}
            </div>
            <span className={styles.userName}>{displayName}</span>
            <i className={`bi bi-chevron-down ${styles.chevronIcon}`} aria-hidden="true" />

            {isDropdownOpen && (
                <div className={`${styles.userDropdown} ${isDropdownOpen ? styles.showDropdown : ''}`}>
                    <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/profile'); setIsDropdownOpen(false); }}>
                        <i className="bi bi-person" /> Xem thông tin cá nhân
                    </div>
                    <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/change-password'); setIsDropdownOpen(false); }}>
                        <i className="bi bi-shield-lock" /> Đổi mật khẩu
                    </div>
                    {isSA && (
                        <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/operations'); setIsDropdownOpen(false); }}>
                            <i className="bi bi-hdd-network" /> Operations Center (Backup DB)
                        </div>
                    )}
                    <div className={styles.dropdownDivider} />
                    <div className={styles.themeSection} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.themeTitle}>
                            <i className="bi bi-palette" /> Giao diện
                        </div>
                        <div className={styles.themeOptions}>
                            {themes.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`${styles.themeOption} ${theme === item.id ? styles.themeOptionActive : ''}`}
                                    onClick={() => setTheme(item.id)}
                                    aria-pressed={theme === item.id}
                                    title={item.name}
                                >
                                    <span
                                        className={styles.themeSwatch}
                                        style={{ backgroundColor: item.color }}
                                        aria-hidden="true"
                                    />
                                    <span>{item.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={styles.voiceSection} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.themeTitle}>
                            <i className="fas fa-microphone" /> Voice AI
                        </div>
                        <button
                            type="button"
                            className={`${styles.voiceToggle} ${voiceEnabled ? styles.voiceToggleActive : ''}`}
                            onClick={onToggleVoice}
                            aria-pressed={voiceEnabled}
                        >
                            <span className={styles.voiceToggleTrack}>
                                <span className={styles.voiceToggleThumb} />
                            </span>
                            <span>{voiceEnabled ? 'Đang bật' : 'Đang tắt'}</span>
                        </button>
                    </div>
                    <div className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); forceLogout(); }}>
                        <i className="bi bi-box-arrow-right" /> Đăng xuất
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserProfileDropdown;
