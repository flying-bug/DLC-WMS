import { useState } from 'react';
import LoginForm from './LoginForm';
import styles from './LoginPanel.module.css';
import { COMPANY_NAME, COPYRIGHT_YEAR } from '../../../constants';

function LoginPanel() {
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

                    {/* Google login */}
                    <button
                        type="button"
                        className={styles.googleBtn}
                        aria-label="Đăng nhập bằng Google"
                    >
                        {/* Google SVG icon */}
                        <svg
                            className={styles.googleIcon}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 48 48"
                            width="20"
                            height="20"
                            aria-hidden="true"
                        >
                            <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.86l6.1-6.1C34.36 3.02 29.47 1 24 1 14.82 1 7.01 6.48 3.6 14.24l7.1 5.52C12.37 13.67 17.73 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.72c-.55 2.99-2.22 5.52-4.72 7.22l7.26 5.64C43.44 37.5 46.5 31.48 46.5 24.5z" />
                            <path fill="#FBBC05" d="M10.7 28.24A14.56 14.56 0 0 1 9.5 24c0-1.48.26-2.91.7-4.24l-7.1-5.52A23.93 23.93 0 0 0 0 24c0 3.87.93 7.52 2.57 10.74l8.13-6.5z" />
                            <path fill="#34A853" d="M24 47c5.47 0 10.06-1.81 13.42-4.9l-7.26-5.64c-1.81 1.22-4.12 1.94-6.16 1.94-6.27 0-11.63-4.17-13.3-9.76l-8.13 6.5C7.01 41.52 14.82 47 24 47z" />
                            <path fill="none" d="M0 0h48v48H0z" />
                        </svg>
                        Đăng nhập bằng Google
                    </button>
                </div>

                {/* Footer */}
                <footer className={styles.footer}>
                    <p className={styles.supportLabel}>Liên hệ hỗ trợ kỹ thuật</p>
                    <div className={styles.supportLinks}>
                        <a href="#" className={styles.supportLink}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
                                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                            </svg>
                            Hỗ trợ
                        </a>
                        <a href="#" className={styles.supportLink}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
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
        </div>
    );
}

export default LoginPanel;
