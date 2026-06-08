import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotBrandPanel from './components/ForgotBrandPanel';
import StepRequestEmail from './components/StepRequestEmail';
import StepVerifyOTP from './components/StepVerifyOTP';
import StepResetPassword from './components/StepResetPassword';
import Toast from '../../components/ui/Toast';
import styles from './ForgotPasswordPage.module.css';
import { ROUTES } from '../../constants';

/**
 * Flow quên mật khẩu — 3 bước:
 *   STEP 1 — Nhập email
 *   STEP 2 — Xác thực OTP
 *   STEP 3 — Đặt mật khẩu mới
 */
const STEPS = { REQUEST_EMAIL: 1, VERIFY_OTP: 2, RESET_PASSWORD: 3 };

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.REQUEST_EMAIL);
    const [email, setEmail] = useState('');
    const [toast, setToast] = useState({ visible: false, type: 'success', title: '', message: '' });

    const showToast = (type, title, message) => {
        setToast({ visible: true, type, title, message });
    };

    const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

    // Bước 1 → 2
    const handleEmailSubmit = (submittedEmail) => {
        setEmail(submittedEmail);
        setStep(STEPS.VERIFY_OTP);
    };

    // Bước 2 → 3
    const handleOtpVerified = (_otpCode) => {
        setStep(STEPS.RESET_PASSWORD);
    };

    // Bước 3 → toast → về login
    const handleResetSuccess = () => {
        showToast(
            'success',
            'Đổi mật khẩu thành công!',
            'Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.'
        );
        setTimeout(() => navigate(ROUTES.LOGIN), 3000);
    };

    return (
        <div className={styles.pageWrapper}>
            {/* Cột trái */}
            <ForgotBrandPanel />

            {/* Cột phải */}
            <div className={styles.formPanel}>
                <div className={styles.formInner}>
                    {/* Step indicator */}
                    <StepIndicator current={step} total={3} />

                    {/* Step content */}
                    {step === STEPS.REQUEST_EMAIL && (
                        <StepRequestEmail onNext={handleEmailSubmit} />
                    )}
                    {step === STEPS.VERIFY_OTP && (
                        <StepVerifyOTP
                            email={email}
                            onNext={handleOtpVerified}
                            onBack={() => setStep(STEPS.REQUEST_EMAIL)}
                        />
                    )}
                    {step === STEPS.RESET_PASSWORD && (
                        <StepResetPassword onSuccess={handleResetSuccess} />
                    )}
                </div>

                {/* Footer */}
                <footer className={styles.footer}>
                    © {new Date().getFullYear()} DUY LONG COMPUTER SYSTEM • PHIÊN BẢN 4.0.2
                </footer>
            </div>

            {/* Toast notification */}
            <Toast
                isVisible={toast.visible}
                type={toast.type}
                title={toast.title}
                message={toast.message}
                onClose={hideToast}
            />
        </div>
    );
}

// ── Step Indicator ────────────────────────────────────────────
function StepIndicator({ current, total }) {
    const labels = ['Xác nhận email', 'Nhập mã OTP', 'Đặt mật khẩu'];

    return (
        <div className={styles.stepIndicator} aria-label="Các bước thực hiện">
            {Array.from({ length: total }, (_, i) => {
                const n = i + 1;
                const isDone = n < current;
                const isActive = n === current;
                return (
                    <div key={n} className={styles.stepItem}>
                        <div
                            className={`${styles.stepDot} ${isActive ? styles.stepDotActive : ''} ${isDone ? styles.stepDotDone : ''}`}
                            aria-current={isActive ? 'step' : undefined}
                        >
                            {isDone ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    strokeWidth={3} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : n}
                        </div>
                        <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>
                            {labels[i]}
                        </span>
                        {n < total && <div className={`${styles.stepLine} ${isDone ? styles.stepLineDone : ''}`} />}
                    </div>
                );
            })}
        </div>
    );
}

export default ForgotPasswordPage;
