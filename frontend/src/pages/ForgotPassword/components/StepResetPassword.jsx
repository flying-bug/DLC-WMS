import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ForgotForm.module.css';
import { ROUTES, PASSWORD_RULES } from '../../../constants';

/**
 * Bước 3 — Đặt mật khẩu mới.
 */
function StepResetPassword({ email, otp, onSuccess }) {
    const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    // Kiểm tra từng rule với mật khẩu hiện tại
    const ruleStatus = PASSWORD_RULES.map((rule) => ({
        ...rule,
        passed: rule.regex.test(form.newPassword),
    }));

    const strengthScore = ruleStatus.filter((r) => r.passed).length;
    const strengthLabels = ['', 'Yếu', 'Trung bình', 'Mạnh'];
    const strengthColors = ['', '#ef4444', '#f97316', '#22c55e'];

    const validate = () => {
        const errs = {};
        if (!form.newPassword) errs.newPassword = 'Vui lòng nhập mật khẩu mới.';
        else if (strengthScore < PASSWORD_RULES.length) errs.newPassword = 'Mật khẩu chưa đạt yêu cầu.';

        if (!form.confirmPassword) errs.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
        else if (form.newPassword !== form.confirmPassword)
            errs.confirmPassword = 'Mật khẩu xác nhận không khớp.';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        try {
            await import('../../../api/axiosClient').then(m => m.default.post('/auth/forgot-password/reset?email=' + encodeURIComponent(email) + '&otp=' + otp + '&newPassword=' + encodeURIComponent(form.newPassword)));
            onSuccess();
        } catch (err) {
            setErrors({ newPassword: err.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu!' });
        } finally {
            setLoading(false);
        }
    };

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
                <h2 className={styles.title}>Thiết lập mật khẩu mới</h2>
                <p className={styles.subtitle}>
                    Mật khẩu mới của bạn phải khác với mật khẩu đã sử dụng trước đó.
                </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className={styles.form}>
                {/* New password */}
                <div className={styles.fieldGroup}>
                    <label htmlFor="new-password" className={styles.label}>Mật khẩu mới</label>
                    <div className={`${styles.inputWrapper} ${errors.newPassword ? styles.inputError : ''}`}>
                        <input
                            id="new-password"
                            name="newPassword"
                            type={showNew ? 'text' : 'password'}
                            className={styles.input}
                            placeholder="Nhập mật khẩu mới"
                            value={form.newPassword}
                            onChange={handleChange}
                            autoComplete="new-password"
                            aria-describedby="new-password-error"
                            aria-invalid={!!errors.newPassword}
                        />
                        <button type="button" className={styles.togglePassword}
                            onClick={() => setShowNew((v) => !v)}
                            aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                            {showNew ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    {errors.newPassword && (
                        <span id="new-password-error" className={styles.errorMsg} role="alert">
                            {errors.newPassword}
                        </span>
                    )}

                    {/* Strength bar */}
                    {form.newPassword && (
                        <div className={styles.strengthBar}>
                            <div className={styles.strengthSegments}>
                                {[1, 2, 3].map((n) => (
                                    <div
                                        key={n}
                                        className={styles.strengthSegment}
                                        style={{ background: n <= strengthScore ? strengthColors[strengthScore] : '#e2e8f0' }}
                                    />
                                ))}
                            </div>
                            <span className={styles.strengthText}
                                style={{ color: strengthColors[strengthScore] }}>
                                {strengthLabels[strengthScore]}
                            </span>
                        </div>
                    )}

                    {/* Độ mạnh label khi chưa nhập */}
                    {!form.newPassword && (
                        <p className={styles.strengthHint}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                strokeWidth={2} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                            </svg>
                            Độ mạnh mật khẩu: <strong>Chưa nhập</strong>
                        </p>
                    )}
                </div>

                {/* Confirm password */}
                <div className={styles.fieldGroup}>
                    <label htmlFor="confirm-password" className={styles.label}>Xác nhận mật khẩu</label>
                    <div className={`${styles.inputWrapper} ${errors.confirmPassword ? styles.inputError : ''}`}>
                        <input
                            id="confirm-password"
                            name="confirmPassword"
                            type={showConfirm ? 'text' : 'password'}
                            className={styles.input}
                            placeholder="Nhập lại mật khẩu mới"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            autoComplete="new-password"
                            aria-describedby="confirm-password-error"
                            aria-invalid={!!errors.confirmPassword}
                        />
                        <button type="button" className={styles.togglePassword}
                            onClick={() => setShowConfirm((v) => !v)}
                            aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                            {showConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    {errors.confirmPassword && (
                        <span id="confirm-password-error" className={styles.errorMsg} role="alert">
                            {errors.confirmPassword}
                        </span>
                    )}
                </div>

                {/* Password rules checklist */}
                <div className={styles.ruleBox}>
                    <p className={styles.ruleTitle}>Yêu cầu mật khẩu:</p>
                    <ul className={styles.ruleList}>
                        {ruleStatus.map((rule) => (
                            <li key={rule.id}
                                className={`${styles.ruleItem} ${rule.passed ? styles.rulePassed : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    strokeWidth={2.5} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                                </svg>
                                {rule.label}
                            </li>
                        ))}
                    </ul>
                </div>

                <button type="submit" className={styles.submitBtn}
                    disabled={loading} aria-busy={loading}>
                    {loading ? (
                        <span className={styles.spinner} aria-hidden="true" />
                    ) : (
                        <>
                            Lưu mật khẩu
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                strokeWidth={2.5} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

// ── Icon helpers ──────────────────────────────────────────────
function EyeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            viewBox="0 0 16 16" aria-hidden="true">
            <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
            <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
        </svg>
    );
}

function EyeSlashIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
            viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
            <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
            <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
        </svg>
    );
}

export default StepResetPassword;
