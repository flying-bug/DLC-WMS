import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import LoginForm from './components/LoginForm';
import styles from './LoginPage.module.css';
import { COMPANY_NAME, COPYRIGHT_YEAR } from '../../constants';
import axiosClient from '../../api/axiosClient';

function LoginPage() {
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credentialResponse) => {
        setErrorMsg('');
        try {
            const response = await axiosClient.post('/auth/login-google?token=' + credentialResponse.credential);
            if (response.data && response.data.data.token) {
                localStorage.setItem('token', response.data.data.token);
                if (response.data.data.role) {
                    localStorage.setItem('role', response.data.data.role);
                }
                navigate('/');
            }
        } catch (error) {
            console.error('Google Login failed:', error);
            if (error.response && error.response.status === 403) {
                setErrorMsg('Tài khoản không tồn tại. Vui lòng liên hệ Admin!');
            } else {
                setErrorMsg('Đăng nhập bằng Google thất bại. Vui lòng thử lại!');
            }
        }
    };

    const handleGoogleError = () => {
        setErrorMsg('Đăng nhập bằng Google thất bại!');
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

                    {errorMsg && (
                        <div className="alert alert-danger" role="alert" style={{ fontSize: '13px', padding: '10px', marginTop: '10px' }}>
                            {errorMsg}
                        </div>
                    )}

                    {/* Form */}
                    <LoginForm />

                    {/* Divider */}
                    <div className={styles.divider}>
                        <span className={styles.dividerText}>hoặc tiếp tục với</span>
                    </div>

                    {/* Google button */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            text="signin_with"
                            theme="outline"
                            size="large"
                        />
                    </div>

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
        </div>
    );
}

export default LoginPage;
