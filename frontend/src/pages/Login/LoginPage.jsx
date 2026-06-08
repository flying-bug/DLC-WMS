import { useState } from 'react';
import LoginForm from './components/LoginForm';
import GoogleAccountPicker from '../../components/google/GoogleAccountPicker';
import GoogleIcon from '../../components/ui/GoogleIcon';
import styles from './LoginPage.module.css';
import { COMPANY_NAME, COPYRIGHT_YEAR, APP_NAME, ROUTES } from '../../constants';
import { Link } from 'react-router-dom';

function LoginPage() {
    const [isGooglePickerOpen, setGooglePickerOpen] = useState(false);

    const handleGoogleAccountSelected = (account) => {
        // TODO: gọi API đăng nhập Google
        console.log('Google account selected:', account);
    };

    const handleUseOtherAccount = () => {
        // TODO: Google OAuth redirect
        console.log('Use other Google account');
    };

    return (
        <div className={styles.page}>
            {/* Background decorations */}
            <div className={styles.bgBlob1} aria-hidden="true" />
            <div className={styles.bgBlob2} aria-hidden="true" />
            <div className={styles.bgGrid} aria-hidden="true" />

            <div className={styles.container}>

                {/* ── Logo / brand mark ── */}
                <div className={styles.brand}>
                    <div className={styles.logoBox} aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                            fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <div className={styles.brandText}>
                        <span className={styles.brandName}>DUY LONG</span>
                        <span className={styles.brandSub}>WAREHOUSE MANAGEMENT</span>
                    </div>
                </div>

                {/* ── Card ── */}
                <div className={styles.card}>
                    {/* Card header */}
                    <div className={styles.cardHeader}>
                        <h1 className={styles.title}>Đăng nhập</h1>
                        <p className={styles.subtitle}>Chào mừng trở lại! Vui lòng nhập thông tin của bạn.</p>
                    </div>

                    {/* Form */}
                    <LoginForm />

                    {/* Divider */}
                    <div className={styles.divider}>
                        <span className={styles.dividerText}>hoặc tiếp tục với</span>
                    </div>

                    {/* Google button */}
                    <button
                        type="button"
                        className={styles.googleBtn}
                        onClick={() => setGooglePickerOpen(true)}
                        aria-label="Đăng nhập bằng Google"
                    >
                        <GoogleIcon size={18} />
                        Google
                    </button>

                    {/* Footer links */}
                    <div className={styles.cardFooter}>
                        <a href="#" className={styles.footerLink}>Hỗ trợ</a>
                        <span className={styles.footerDot} aria-hidden="true">·</span>
                        <a href="#" className={styles.footerLink}>Bảo mật</a>
                        <span className={styles.footerDot} aria-hidden="true">·</span>
                        <a href="#" className={styles.footerLink}>Điều khoản</a>
                    </div>
                </div>

                {/* Copyright */}
                <p className={styles.copyright}>
                    © {COPYRIGHT_YEAR} {COMPANY_NAME.toUpperCase()}. ALL RIGHTS RESERVED.
                </p>
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

export default LoginPage;
