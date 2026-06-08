import styles from './AccountRow.module.css';

/**
 * AccountRow — một dòng tài khoản trong GoogleAccountPicker.
 * Hiển thị avatar (ảnh hoặc initials), tên và email.
 */
function AccountRow({ account, onClick }) {
    const { name, email, avatarUrl, initials } = account;

    return (
        <li className={styles.item} role="option">
            <button
                type="button"
                className={styles.btn}
                onClick={onClick}
                aria-label={`Đăng nhập với ${name} (${email})`}
            >
                {/* Avatar */}
                <div className={styles.avatar} aria-hidden="true">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="" className={styles.avatarImg} />
                    ) : (
                        <span className={styles.avatarInitials}>{initials}</span>
                    )}
                </div>

                {/* Info */}
                <div className={styles.info}>
                    <span className={styles.name}>{name}</span>
                    <span className={styles.email}>{email}</span>
                </div>
            </button>
        </li>
    );
}

export default AccountRow;
