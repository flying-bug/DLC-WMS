import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ForgotForm.module.css';
import { ROUTES } from '../../../constants';

/**
 * Bước 1 — Nhập email để nhận OTP khôi phục mật khẩu.
 */
function StepRequestEmail({ onNext }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (!email.trim()) return 'Vui lòng nhập địa chỉ email.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return 'Địa chỉ email không hợp lệ.';
        return '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const err = validate();
        if (err) { setError(err); return; }

        setLoading(true);
        // TODO: gọi API gửi OTP
        setTimeout(() => {
            setLoading(false);
            onNext(email);
        }, 800);
    };

    return (
        <div className={styles.stepWrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>Quên mật khẩu?</h2>
                <p className={styles.subtitle}>
                    Nhập địa chỉ email của bạn và chúng tôi sẽ gửi hướng dẫn
                    để bạn có thể đặt lại mật khẩu của mình.
                </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
                <div className={styles.fieldGroup}>
                    <label htmlFor="reset-email" className={styles.label}>
                        Địa chỉ Email công việc
                    </label>
                    <div className={`${styles.inputWrapper} ${error ? styles.inputError : ''}`}>
                        <svg className={styles.inputIcon} xmlns="http://www.w3.org/2000/svg"
                            width="16" height="16" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
                        </svg>
                        <input
                            id="reset-email"
                            type="email"
                            className={styles.input}
                            placeholder="name@duylong.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(''); }}
                            autoComplete="email"
                            aria-describedby={error ? 'reset-email-error' : undefined}
                            aria-invalid={!!error}
                        />
                    </div>
                    {error && (
                        <span id="reset-email-error" className={styles.errorMsg} role="alert">
                            {error}
                        </span>
                    )}
                </div>

                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading}
                    aria-busy={loading}
                >
                    {loading ? (
                        <span className={styles.spinner} aria-hidden="true" />
                    ) : (
                        <>
                            Gửi yêu cầu khôi phục
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                strokeWidth={2.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </>
                    )}
                </button>
            </form>

            <Link to={ROUTES.LOGIN} className={styles.backLink}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại trang đăng nhập
            </Link>
        </div>
    );
}

export default StepRequestEmail;
