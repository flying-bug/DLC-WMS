import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ForgotForm.module.css';
import { ROUTES } from '../../../constants';

/**
 * BÆ°á»›c 1 â€” Nháº­p email Ä‘á»ƒ nháº­n OTP khÃ´i phá»¥c máº­t kháº©u.
 */
function StepRequestEmail({ onNext }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validate = () => {
        if (!email.trim()) return 'Vui lÃ²ng nháº­p Ä‘á»‹a chá»‰ email.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return 'Äá»‹a chá»‰ email khÃ´ng há»£p lá»‡.';
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) { setError(err); return; }

        setLoading(true);
        try {
            await import('../../../api/axiosClient').then(m => m.default.post('/auth/forgot-password/request-otp?email=' + encodeURIComponent(email)));
            onNext(email);
        } catch (err) {
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'CÃ³ lá»—i xáº£y ra khi gá»­i email!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.stepWrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>QuÃªn máº­t kháº©u?</h2>
                <p className={styles.subtitle}>
                    Nháº­p Ä‘á»‹a chá»‰ email cá»§a báº¡n vÃ  chÃºng tÃ´i sáº½ gá»­i hÆ°á»›ng dáº«n
                    Ä‘á»ƒ báº¡n cÃ³ thá»ƒ Ä‘áº·t láº¡i máº­t kháº©u cá»§a mÃ¬nh.
                </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
                <div className={styles.fieldGroup}>
                    <label htmlFor="reset-email" className={styles.label}>
                        Äá»‹a chá»‰ Email cÃ´ng viá»‡c
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
                            Gá»­i yÃªu cáº§u khÃ´i phá»¥c
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
                Quay láº¡i trang Ä‘Äƒng nháº­p
            </Link>
        </div>
    );
}

export default StepRequestEmail;
