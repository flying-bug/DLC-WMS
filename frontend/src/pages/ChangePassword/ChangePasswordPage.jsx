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
            setError('Vui lòng nhập mật khẩu hiện tại.');
            return;
        }

        if (!newPassword) {
            setError('Vui lòng nhập mật khẩu mới.');
            return;
        }

        if (newPassword.length < 8) {
            setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
            return;
        }

        // Regex checks for at least one letter and one number
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (!hasLetter || !hasNumber) {
            setError('Mật khẩu mới phải chứa cả chữ cái và chữ số.');
            return;
        }

        if (newPassword === currentPassword) {
            setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Xác nhận mật khẩu mới không khớp.');
            return;
        }

        setLoading(true);
        try {
            await axiosClient.post('/auth/change-password', {
                oldPassword: currentPassword,
                newPassword: newPassword
            });
            
            // Logout immediately with a success message
            forceLogout('Mật khẩu của bạn đã được thay đổi thành công. Vui lòng đăng nhập lại.');
        } catch (err) {
            console.error('Failed to change password:', err);
            setError(err.response?.data?.userMessage || err.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
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
                        <span className={styles.breadcrumbItem}>Tài khoản</span>
                        <i className="bi bi-chevron-right" />
                        <span className={styles.breadcrumbActive}>Đổi mật khẩu</span>
                    </div>

                    {/* Card */}
                    <div className={styles.card}>
                        <h1 className={styles.cardTitle}>Đổi mật khẩu</h1>
                        <p className={styles.cardSubtitle}>
                            Vui lòng nhập mật khẩu hiện tại và mật khẩu mới để bảo mật tài khoản.
                        </p>

                        {error && (
                            <div className="alert alert-danger" role="alert" style={{ fontSize: '13px', padding: '10px', marginBottom: '20px' }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className={styles.form}>
                            {/* Current Password */}
                            <div className={styles.formGroup}>
                                <label>Mật khẩu hiện tại</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type={showCurrent ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
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
                                <label>Mật khẩu mới</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
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
                                <label>Xác nhận mật khẩu mới</label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
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
                                <span>Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ cái và chữ số.</span>
                            </div>

                            {/* Actions */}
                            <div className={styles.formActions}>
                                <button type="submit" className={styles.btnPrimary} disabled={loading}>
                                    {loading ? (
                                        <i className="fas fa-spinner fa-spin" />
                                    ) : (
                                        <i className="bi bi-floppy" />
                                    )}
                                    {loading ? ' Đang cập nhật...' : ' Cập nhật mật khẩu'}
                                </button>
                                <button type="button" className={styles.btnSecondary} onClick={() => navigate('/dashboard')} disabled={loading}>
                                    Hủy bỏ
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Badge */}
                    <div className={styles.securityBadge}>
                        <i className="bi bi-shield-check" />
                        <span>Hệ thống bảo mật Duy Long v2.0 - Đã được mã hóa 256-bit</span>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default ChangePasswordPage;
