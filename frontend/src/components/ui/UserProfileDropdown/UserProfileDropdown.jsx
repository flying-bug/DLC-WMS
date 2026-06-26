import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserProfileDropdown.module.css';
import { forceLogout, getAuthRole } from '../../../auth/session';

function UserProfileDropdown() {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const userRole = getAuthRole() || 'STAFF';
    const isSA = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const isMN = userRole === 'MANAGER' || userRole === 'ROLE_MANAGER';
    const initials = isSA ? 'SA' : isMN ? 'MN' : 'ST';
    const displayName = isSA ? 'Super Admin' : isMN ? 'Manager' : 'Staff';

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
            aria-label="Tai khoan nguoi dung"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            onMouseEnter={() => setIsDropdownOpen(true)}
            onMouseLeave={() => setIsDropdownOpen(false)}
            ref={dropdownRef}
        >
            <div className={styles.avatarCircle} aria-hidden="true">{initials}</div>
            <span className={styles.userName}>{displayName}</span>
            <i className={`bi bi-chevron-down ${styles.chevronIcon}`} aria-hidden="true" />

            {isDropdownOpen && (
                <div className={`${styles.userDropdown} ${isDropdownOpen ? styles.showDropdown : ''}`}>
                    <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/profile'); setIsDropdownOpen(false); }}>
                        <i className="bi bi-person" /> Xem thong tin ca nhan
                    </div>
                    <div className={styles.dropdownItem} onClick={(e) => { e.stopPropagation(); navigate('/change-password'); setIsDropdownOpen(false); }}>
                        <i className="bi bi-shield-lock" /> Doi mat khau
                    </div>
                    <div className={styles.dropdownDivider} />
                    <div className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(false); forceLogout(); }}>
                        <i className="bi bi-box-arrow-right" /> Dang xuat
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserProfileDropdown;
