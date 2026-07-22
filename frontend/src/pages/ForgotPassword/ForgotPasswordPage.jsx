import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import StepRequestEmail from './components/StepRequestEmail';
import StepVerifyOTP from './components/StepVerifyOTP';
import StepResetPassword from './components/StepResetPassword';
import Toast from '../../components/ui/Toast';
import styles from './ForgotPasswordPage.module.css';
import { ROUTES, APP_NAME, COPYRIGHT_YEAR, COMPANY_NAME } from '../../constants';

/**
 * Flow quÃªn máº­t kháº©u â€” 3 bÆ°á»›c:
 *   STEP 1 â€” Nháº­p email
 *   STEP 2 â€” XÃ¡c thá»±c OTP
 *   STEP 3 â€” Äáº·t máº­t kháº©u má»›i
 */
const STEPS = { REQUEST_EMAIL: 1, VERIFY_OTP: 2, RESET_PASSWORD: 3 };

const STEP_META = [
    { label: 'XÃ¡c nháº­n email' },
    { label: 'Nháº­p mÃ£ OTP' },
    { label: 'Äáº·t máº­t kháº©u' },
];

function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.REQUEST_EMAIL);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [toast, setToast] = useState({ visible: false, type: 'success', title: '', message: '' });

    const showToast = (type, title, message) =>
        setToast({ visible: true, type, title, message });

    const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

    const handleEmailSubmit = (submittedEmail) => {
        setEmail(submittedEmail);
        setStep(STEPS.VERIFY_OTP);
    };

    const handleOtpVerified = (verifiedOtp) => {
        setOtp(verifiedOtp);
        setStep(STEPS.RESET_PASSWORD);
    };

    const handleResetSuccess = () => {
        showToast(
            'success',
            'Äá»•i máº­t kháº©u thÃ nh cÃ´ng!',
            'Máº­t kháº©u Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t. Äang chuyá»ƒn vá» trang Ä‘Äƒng nháº­p...'
        );
        setTimeout(() => navigate(ROUTES.LOGIN), 3000);
    };

    return (
        <div className={styles.page}>
            {/* Background decoration */}
            <div className={styles.bgBlob1} aria-hidden="true" />
            <div className={styles.bgBlob2} aria-hidden="true" />

            <div className={styles.container}>
                {/* Logo */}
                <Link to={ROUTES.LOGIN} className={styles.logoLink} aria-label={`${APP_NAME} â€“ vá» trang Ä‘Äƒng nháº­p`}>
                    <div className={styles.logoBox}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                            fill="none" viewBox="0 0 24 24" stroke="var(--color-white)" strokeWidth={1.8}
                            aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <div className={styles.logoText}>
                        <span className={styles.logoName}>DUY LONG</span>
                        <span className={styles.logoSub}>WAREHOUSE MANAGEMENT</span>
                    </div>
                </Link>

                {/* Card */}
                <div className={styles.card}>
                    {/* Step indicator */}
                    <StepIndicator current={step} meta={STEP_META} />

                    {/* Step content â€” animated slide */}
                    <div className={styles.stepContent}>
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
                            <StepResetPassword email={email} otp={otp} onSuccess={handleResetSuccess} />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className={styles.footer}>
                    Â© {COPYRIGHT_YEAR} {COMPANY_NAME.toUpperCase()}. ALL RIGHTS RESERVED.
                </p>
            </div>

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

/* â”€â”€ Step Indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StepIndicator({ current, meta }) {
    return (
        <div className={styles.stepIndicator} role="list" aria-label="CÃ¡c bÆ°á»›c thá»±c hiá»‡n">
            {meta.map((item, i) => {
                const n = i + 1;
                const isDone = n < current;
                const isActive = n === current;

                return (
                    <div key={n} className={styles.stepItem} role="listitem">
                        {/* Connector trÆ°á»›c */}
                        {i > 0 && (
                            <div className={`${styles.connector} ${isDone ? styles.connectorDone : ''}`}
                                aria-hidden="true" />
                        )}

                        <div className={styles.stepDotWrapper}>
                            <div
                                className={`${styles.stepDot}
                                    ${isActive ? styles.stepDotActive : ''}
                                    ${isDone ? styles.stepDotDone : ''}`}
                                aria-current={isActive ? 'step' : undefined}
                            >
                                {isDone ? (
                                    <svg width="11" height="11" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" strokeWidth={3.5}
                                        aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                            d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : n}
                            </div>
                            <span className={`${styles.stepLabel}
                                ${isActive ? styles.stepLabelActive : ''}
                                ${isDone ? styles.stepLabelDone : ''}`}>
                                {item.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ForgotPasswordPage;
