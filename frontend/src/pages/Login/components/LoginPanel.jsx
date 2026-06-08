import { useState } from 'react';
import LoginForm from './LoginForm';
import GoogleAccountPicker from '../../../components/google/GoogleAccountPicker';
import GoogleIcon from '../../../components/ui/GoogleIcon';
import styles from './LoginPanel.module.css';
import { COMPANY_NAME, COPYRIGHT_YEAR } from '../../../constants';

function LoginPanel() {
    const [isGooglePickerOpen, setGooglePickerOpen] = useState(false);

    const handleGoogleAccountSelected = (account) => {
        // TODO: gọi API đăng nhập Google với account.email / token
        console.log('Google account selected:', account);
    };

    const handleUseOtherAccount = () => {
        // TODO: chuyển hướng sang Google OAuth flow thực
        console.log('Use other Google account');
    };

    return (
        <div className={styles.loginPanel}>
            <div className={styles.inner}>
                {/* Form khu vực */}
                <div className={styles.formSection}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>Đăng nhập hệ thống</h2>
                        <p className={styles.subtitle}>Vui lòng nhập thông tin tài khoản của bạn</p>
                    </div>

                    <LoginForm />

                    {/* Divider */}
                    <div className={styles.divider}>
                        <span className={styles.dividerText}>Hoặc</span>
                    </div>

                    {/* Google login button */}
                    <button
                        type="button"
                        className={styles.googleBtn}
                        onClick={() => setGooglePickerOpen(true)}
                        aria-label="Đăng nhập bằng Google"
                    >
                        <GoogleIcon size={20} />
                        Đăng nhập bằng Google
                    </button>
                </div>

                {/* Footer */}
                <footer className={styles.footer}>
                    <p className={styles.supportLabel}>Liên hệ hỗ trợ kỹ thuật</p>
                    <div className={styles.supportLinks}>
                        <a href="#" className={styles.supportLink}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                                aria-hidden="true"
                            >
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                            </svg>
                            Hỗ trợ
                        </a>
                        <a href="#" className={styles.supportLink}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                fill="currentColor"
                                viewBox="0 0 16 16"
                                aria-hidden="true"
                            >
                                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                            </svg>
                            Bảo mật
                        </a>
                    </div>
                    <p className={styles.copyright}>
                        © {COPYRIGHT_YEAR} {COMPANY_NAME.toUpperCase()}. ALL RIGHTS RESERVED.
                    </p>
                </footer>
            </div>

            {/* Google Account Picker Modal */}
            <GoogleAccountPicker
                isOpen={isGooglePickerOpen}
                onClose={() => setGooglePickerOpen(false)}
                onSelectAccount={handleGoogleAccountSelected}
                onUseOtherAccount={handleUseOtherAccount}
            />
        </div>
    );
}

export default LoginPanel;
