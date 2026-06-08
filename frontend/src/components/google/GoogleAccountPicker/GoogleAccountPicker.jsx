import Modal from '../../ui/Modal';
import GoogleIcon from '../../ui/GoogleIcon';
import AccountRow from './AccountRow';
import styles from './GoogleAccountPicker.module.css';
import { MOCK_GOOGLE_ACCOUNTS, APP_DISPLAY_NAME } from '../../../constants';

/**
 * GoogleAccountPicker
 * Modal giả lập màn hình chọn tài khoản Google.
 * Khi BE sẵn sàng: thay MOCK_GOOGLE_ACCOUNTS bằng danh sách
 * từ Google OAuth và wire onSelectAccount → gọi API.
 */
function GoogleAccountPicker({ isOpen, onClose, onSelectAccount, onUseOtherAccount }) {
    const handleSelect = (account) => {
        onSelectAccount?.(account);
        onClose();
    };

    const handleOtherAccount = () => {
        onUseOtherAccount?.();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Chọn tài khoản Google">
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <GoogleIcon size={40} className={styles.googleLogo} />
                    <h2 className={styles.title}>Đăng nhập</h2>
                    <p className={styles.subtitle}>
                        Để tiếp tục với{' '}
                        <a href="#" className={styles.appLink}>
                            {APP_DISPLAY_NAME}
                        </a>
                    </p>
                </div>

                {/* Account list */}
                <ul className={styles.accountList} role="listbox" aria-label="Chọn tài khoản">
                    {MOCK_GOOGLE_ACCOUNTS.map((account) => (
                        <AccountRow
                            key={account.id}
                            account={account}
                            onClick={() => handleSelect(account)}
                        />
                    ))}

                    {/* Use another account */}
                    <li className={styles.otherAccountItem} role="option">
                        <button
                            type="button"
                            className={styles.otherAccountBtn}
                            onClick={handleOtherAccount}
                            aria-label="Sử dụng một tài khoản khác"
                        >
                            <span className={styles.addIconWrapper} aria-hidden="true">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.8}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19 8v6M22 11h-6"
                                    />
                                </svg>
                            </span>
                            <span className={styles.otherAccountLabel}>Sử dụng một tài khoản khác</span>
                        </button>
                    </li>
                </ul>

                {/* Privacy notice */}
                <div className={styles.notice}>
                    <p>
                        Để tiếp tục, Google sẽ chia sẻ tên, địa chỉ email, tùy chọn ngôn ngữ và
                        ảnh hồ sơ của bạn với {APP_DISPLAY_NAME}. Trước khi sử dụng ứng dụng này,
                        bạn có thể xem lại{' '}
                        <a href="#" className={styles.noticeLink}>Chính sách quyền riêng tư</a>
                        {' '}và{' '}
                        <a href="#" className={styles.noticeLink}>Điều khoản dịch vụ</a>
                        {' '}của {APP_DISPLAY_NAME}.
                    </p>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button type="button" className={styles.footerLangBtn}>
                        Tiếng Việt
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
                        </svg>
                    </button>
                    <nav className={styles.footerLinks} aria-label="Footer links">
                        <a href="#" className={styles.footerLink}>Trợ giúp</a>
                        <a href="#" className={styles.footerLink}>Bảo mật</a>
                        <a href="#" className={styles.footerLink}>Điều khoản</a>
                    </nav>
                </div>
            </div>
        </Modal>
    );
}

export default GoogleAccountPicker;
