import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserProfileDropdown.module.css';

function UserProfileDropdown() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const userRole = localStorage.getItem('role') || 'STAFF';
    const initials = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN' ? 'SA' : userRole === 'MANAGER' ? 'MN' : 'ST';
    const displayName = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN' ? 'Super Admin' : userRole === 'MANAGER' ? 'Manager' : 'Staff';

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
            <div className={styles.avatarCircle} aria-hidden="true">{initials}</div>
            <span className={styles.userName}>{displayName}</span>
            <i className={`bi bi-chevron-down ${styles.chevronIcon}`} aria-hidden="true" />

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div className={`${styles.userDropdown} ${isDropdownOpen ? styles.showDropdown : ''}`}>
                    <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/profile'); setIsDropdownOpen(false); }}>
                        <i className="bi bi-person" /> Xem thông tin cá nhân
                    </div>
                    <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/change-password'); setIsDropdownOpen(false); }}>
                        <i className="bi bi-shield-lock" /> Đổi mật khẩu
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={(e) => { e.stopPropagation(); localStorage.clear(); navigate('/login'); setIsDropdownOpen(false); }}>
                        <i className="bi bi-box-arrow-right" /> Đăng xuất
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserProfileDropdown;
