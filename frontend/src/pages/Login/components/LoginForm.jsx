import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './LoginForm.module.css';
import { PLACEHOLDERS, ROUTES } from '../../../constants';
import { setAuthSession } from '../../../auth/session';

function LoginForm() {
    const [formData, setFormData] = useState({
        usernameOrEmail: '',
        password: '',
        rememberMe: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Xóa lỗi khi người dùng bắt đầu nhập lại
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.usernameOrEmail.trim()) {
            newErrors.usernameOrEmail = 'Vui lòng nhập email hoặc tên đăng nhập.';
        }
        if (!formData.password) {
            newErrors.password = 'Vui lòng nhập mật khẩu.';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
        }
        return newErrors;
    };

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        try {
            const { default: axiosClient } = await import('../../../api/axiosClient');
            const response = await axiosClient.post('/auth/login', {
                username: formData.usernameOrEmail,
                password: formData.password
            });

            if (response.data && response.data.data.token) {
                setAuthSession(response.data.data);
                // Handle remember me if necessary (e.g. store username or token preference)
                if (formData.rememberMe) {
                    localStorage.setItem('rememberedUser', formData.usernameOrEmail);
                } else {
                    localStorage.removeItem('rememberedUser');
                }
                navigate('/');
            }
        } catch (error) {
            console.error('Login failed:', error);
            setErrors({
                usernameOrEmail:
                    error.response?.data?.userMessage ||
                    error.response?.data?.message ||
                    'Tài khoản hoặc mật khẩu không chính xác.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {/* Email / Username */}
            <div className={styles.fieldGroup}>
                <label htmlFor="usernameOrEmail" className={styles.label}>
                    Email hoặc Tên đăng nhập
                </label>
                <div className={`${styles.inputWrapper} ${errors.usernameOrEmail ? styles.inputError : ''}`}>
                    {/* Person icon */}
                    <svg
                        className={styles.inputIcon}
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                    >
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10c-2.03 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
                    </svg>
                    <input
                        id="usernameOrEmail"
                        name="usernameOrEmail"
                        type="text"
                        className={styles.input}
                        placeholder={PLACEHOLDERS.EMAIL_OR_USERNAME}
                        value={formData.usernameOrEmail}
                        onChange={handleChange}
                        autoComplete="username"
                        aria-describedby={errors.usernameOrEmail ? 'usernameOrEmail-error' : undefined}
                        aria-invalid={!!errors.usernameOrEmail}
                    />
                </div>
                {errors.usernameOrEmail && (
                    <span id="usernameOrEmail-error" className={styles.errorMsg} role="alert">
                        {errors.usernameOrEmail}
                    </span>
                )}
            </div>

            {/* Password */}
            <div className={styles.fieldGroup}>
                <label htmlFor="password" className={styles.label}>
                    Mật khẩu
                </label>
                <div className={`${styles.inputWrapper} ${errors.password ? styles.inputError : ''}`}>
                    {/* Lock icon */}
                    <svg
                        className={styles.inputIcon}
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                        aria-hidden="true"
                    >
                        <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                    </svg>
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        className={styles.input}
                        placeholder={PLACEHOLDERS.PASSWORD}
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="current-password"
                        aria-describedby={errors.password ? 'password-error' : undefined}
                        aria-invalid={!!errors.password}
                    />
                    {/* Toggle show/hide password */}
                    <button
                        type="button"
                        className={styles.togglePassword}
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                        {showPassword ? (
                            // Eye-slash icon
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
                                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
                                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
                            </svg>
                        ) : (
                            // Eye icon
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
                            </svg>
                        )}
                    </button>
                </div>
                {errors.password && (
                    <span id="password-error" className={styles.errorMsg} role="alert">
                        {errors.password}
                    </span>
                )}
            </div>

            {/* Remember me + Forgot password */}
            <div className={styles.optionsRow}>
                <label className={styles.checkboxLabel}>
                    <input
                        type="checkbox"
                        name="rememberMe"
                        className={styles.checkbox}
                        checked={formData.rememberMe}
                        onChange={handleChange}
                    />
                    <span>Ghi nhớ đăng nhập</span>
                </label>
                <Link to={ROUTES.FORGOT_PASSWORD} className={styles.forgotLink}>
                    Quên mật khẩu?
                </Link>
            </div>

            {/* Submit button */}
            <button type="submit" className={styles.submitBtn} disabled={loading} aria-busy={loading}>
                {loading ? (
                    <span className={styles.spinner} aria-hidden="true" />
                ) : (
                    <>
                        Đăng nhập
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            aria-hidden="true"
                        >
                            <path fillRule="evenodd" d="M10 3.5a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 1 1 0v2A1.5 1.5 0 0 1 9.5 14h-8A1.5 1.5 0 0 1 0 12.5v-9A1.5 1.5 0 0 1 1.5 2h8A1.5 1.5 0 0 1 11 3.5v2a.5.5 0 0 1-1 0v-2z" />
                            <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z" />
                        </svg>
                    </>
                )}
            </button>
        </form>
    );
}

export default LoginForm;
