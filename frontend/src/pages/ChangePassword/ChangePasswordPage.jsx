import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { forceLogout, getAuthRole } from '../../auth/session';
import AdminLayout from '../../components/layout/AdminLayout';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import styles from './ChangePasswordPage.module.css';

function ChangePasswordPage() {
    const navigate = useNavigate();
    
    // Auth context
    const userRole = getAuthRole() || 'STAFF';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const Layout = isSuperAdmin ? SuperAdminLayout : AdminLayout;

    // Form states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!currentPassword) {
            setError('Vui lÃ²ng nháº­p máº­t kháº©u hiá»‡n táº¡i.');
            return;
        }

        if (!newPassword) {
            setError('Vui lÃ²ng nháº­p máº­t kháº©u má»›i.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Máº­t kháº©u má»›i pháº£i cÃ³ Ã­t nháº¥t 8 kÃ½ tá»±.');
            return;
        }

        // Regex checks for at least one letter and one number
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (!hasLetter || !hasNumber) {
            setError('Máº­t kháº©u má»›i pháº£i chá»©a cáº£ chá»¯ cÃ¡i vÃ  chá»¯ sá»‘.');
            return;
        }

        if (newPassword === currentPassword) {
            setError('Máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c trÃ¹ng vá»›i máº­t kháº©u hiá»‡n táº¡i.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('XÃ¡c nháº­n máº­t kháº©u má»›i khÃ´ng khá»›p.');
            return;
        }

        setLoading(true);
        try {
            await axiosClient.post('/auth/change-password', {
                oldPassword: currentPassword,
                newPassword: newPassword
            });
            
            // Logout immediately with a success message
            forceLogout('Máº­t kháº©u cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c thay Ä‘á»•i thÃ nh cÃ´ng. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.');
        } catch (err) {
            console.error('Failed to change password:', err);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'CÃ³ lá»—i xáº£y ra khi Ä‘á»•i máº­t kháº©u.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className={styles.main}>
                <div className={styles.contentWrapper}>
                    {/* Breadcrumb */}
                    <div className={styles.breadcrumb}>
                        <i className="bi bi-house-door" />
                        <i className="bi bi-chevron-right" />
                        <span className={styles.breadcrumbItem}>TÃ i khoáº£n</span>
                        <i className="bi bi-chevron-right" />
                        <span className={styles.breadcrumbActive}>Äá»•i máº­t kháº©u</span>
                    </div>

                    {/* Card */}
                    <div className={styles.card}>
                        <h1 className={styles.cardTitle}>Äá»•i máº­t kháº©u</h1>
                        <p className={styles.cardSubtitle}>
                            Vui lÃ²ng nháº­p máº­t kháº©u hiá»‡n táº¡i vÃ  máº­t kháº©u má»›i Ä‘á»ƒ báº£o máº­t tÃ i khoáº£n.
                        </p>

                        {error && (
                            <div className="alert alert-danger" role="alert" style={{ fontSize: '13px', padding: '10px', marginBottom: '20px' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {/* Current Password */}
                            <div className={styles.formGroup}>
                                <label>Máº­t kháº©u hiá»‡n táº¡i</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                                        disabled={loading}
                                    />
                                    <i
                                        className={`bi ${showCurrent ? 'bi-eye' : 'bi-eye-slash'} ${styles.eyeIcon}`}
                                        onClick={() => setShowCurrent(!showCurrent)}
                                    />
                                </div>
                            </div>

                            {/* New Password */}
                            <div className={styles.formGroup}>
                                <label>Máº­t kháº©u má»›i</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                                        disabled={loading}
                                    />
                                    <i
                                        className={`bi ${showNew ? 'bi-eye' : 'bi-eye-slash'} ${styles.eyeIcon}`}
                                        onClick={() => setShowNew(!showNew)}
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className={styles.formGroup}>
                                <label>XÃ¡c nháº­n máº­t kháº©u má»›i</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                                        disabled={loading}
                                    />
                                    <i
                                        className={`bi ${showConfirm ? 'bi-eye' : 'bi-eye-slash'} ${styles.eyeIcon}`}
                                        onClick={() => setShowConfirm(!showConfirm)}
                                    />
                                </div>
                            </div>

                            {/* Info Alert */}
                            <div className={styles.infoAlert}>
                                <i className="bi bi-info-circle" />
                                <span>Máº­t kháº©u pháº£i cÃ³ Ã­t nháº¥t 8 kÃ½ tá»±, bao gá»“m chá»¯ cÃ¡i vÃ  chá»¯ sá»‘.</span>
                            </div>

                            {/* Actions */}
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                                    {loading ? (
                                        <i className="fas fa-spinner fa-spin" />
                                    ) : (
                                        <i className="bi bi-floppy" />
                                    )}
                                    {loading ? ' Äang cáº­p nháº­t...' : ' Cáº­p nháº­t máº­t kháº©u'}
                                </button>
                                <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard')} disabled={loading}>
                                    Há»§y bá»
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Badge */}
                    <div className={styles.securityBadge}>
                        <i className="bi bi-shield-check" />
                        <span>Há»‡ thá»‘ng báº£o máº­t Duy Long v2.0 - ÄÃ£ Ä‘Æ°á»£c mÃ£ hÃ³a 256-bit</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default ChangePasswordPage;
