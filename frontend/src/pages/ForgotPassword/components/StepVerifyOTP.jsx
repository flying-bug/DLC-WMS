import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './ForgotForm.module.css';
import { ROUTES, OTP_LENGTH, OTP_RESEND_SECONDS } from '../../../constants';

/**
 * Bước 2 — Nhập mã OTP 6 chữ số.
 * Mỗi ô nhận 1 ký tự, tự động focus sang ô tiếp theo.
 */
function StepVerifyOTP({ email, onNext, onBack }) {
    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(OTP_RESEND_SECONDS);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);

    // Đếm ngược
    useEffect(() => {
        if (countdown <= 0) { setCanResend(true); return; }
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [countdown]);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // chỉ chấp nhận số
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // lấy ký tự cuối nếu paste nhiều ký tự
        setOtp(newOtp);
        setError('');

        // Auto-focus ô tiếp theo
        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
        const newOtp = Array(OTP_LENGTH).fill('');
        text.split('').forEach((ch, i) => { newOtp[i] = ch; });
        setOtp(newOtp);
        inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
    };

    const handleResend = () => {
        setOtp(Array(OTP_LENGTH).fill(''));
        setCountdown(OTP_RESEND_SECONDS);
        setCanResend(false);
        setError('');
        inputRefs.current[0]?.focus();
        // TODO: gọi API gửi lại OTP
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < OTP_LENGTH) {
            setError(`Vui lòng nhập đủ ${OTP_LENGTH} chữ số.`);
            return;
        }
        setLoading(true);
        // TODO: gọi API xác thực OTP
        setTimeout(() => {
            setLoading(false);
            onNext(code);
        }, 800);
    };

    // Mask email: duc***@duylong.vn
    const maskedEmail = email
        ? email.replace(/^(.{3})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
        : '';

    return (
        <div className={styles.stepWrapper}>
            <Link to={ROUTES.LOGIN} className={`${styles.backLink} ${styles.backLinkTop}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Quay lại đăng nhập
            </Link>

            <div className={styles.header}>
                <h2 className={styles.title}>Xác thực mã OTP</h2>
                <p className={styles.subtitle}>
                    Vui lòng nhập mã OTP gồm{' '}
                    <strong>{OTP_LENGTH} chữ số</strong> đã được gửi đến{' '}
                    <span className={styles.emailHighlight}>{maskedEmail}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
                {/* OTP inputs */}
                <div className={styles.otpGroup} onPaste={handlePaste}
                    role="group" aria-label="Nhập mã OTP">
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => (inputRefs.current[i] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            className={`${styles.otpInput} ${error ? styles.otpInputError : ''} ${digit ? styles.otpInputFilled : ''}`}
                            aria-label={`Chữ số ${i + 1}`}
                            autoComplete="one-time-code"
                        />
                    ))}
                </div>

                {error && (
                    <span className={styles.errorMsg} role="alert">{error}</span>
                )}

                <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading}
                    aria-busy={loading}
                >
                    {loading
                        ? <span className={styles.spinner} aria-hidden="true" />
                        : 'Xác nhận'}
                </button>
            </form>

            {/* Resend */}
            <div className={styles.resendRow}>
                <span className={styles.resendLabel}>Bạn không nhận được mã?</span>
                {canResend ? (
                    <button type="button" className={styles.resendBtn} onClick={handleResend}>
                        Gửi lại mã
                    </button>
                ) : (
                    <span className={styles.resendCountdown}>
                        Gửi lại mã &nbsp;
                        <span className={styles.countdown}>({formatTime(countdown)})</span>
                    </span>
                )}
            </div>
        </div>
    );
}

export default StepVerifyOTP;
