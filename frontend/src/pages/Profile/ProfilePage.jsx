import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { emitUserUpdated } from '../../auth/session';
import AdminLayout from '../../components/layout/AdminLayout';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import styles from './ProfilePage.module.css';

function ProfilePage() {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const Layout = isSuperAdmin ? SuperAdminLayout : AdminLayout;

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const roles = profile?.roles?.length ? profile.roles : [{ code: userRole, name: userRole }];
    const displayRole = roles.map((role) => role.name || role.code).join(', ');
    const fullName = profile?.fullName || profile?.username || 'Nguoi dung';
    const initials = useMemo(() => {
        return fullName
            .split(' ')
            .filter(Boolean)
            .slice(-2)
            .map((part) => part[0])
            .join('')
            .toUpperCase() || 'U';
    }, [fullName]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await axiosClient.get('/users/me');
                setProfile(response.data?.data || null);
            } catch (err) {
                setError(err.response?.data?.userMessage || 'Khong the tai thong tin ca nhan.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploading(true);
            setError('');
            const response = await axiosClient.put('/users/me/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const updatedProfile = response.data?.data || null;
            setProfile(updatedProfile);
            emitUserUpdated({ type: 'avatar-updated', user: updatedProfile });
        } catch (err) {
            setError(err.response?.data?.userMessage || 'Khong the tai anh dai dien.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Thong tin ca nhan</h2>
                    <div className={styles.breadcrumb}>
                        <span className={styles.breadcrumbLink} onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <i className="fas fa-chevron-right"></i>
                        <span>Thong tin ca nhan</span>
                    </div>
                </div>

                <div className={styles.profileCard}>
                    {loading ? (
                        <div className={styles.loadingState}>Dang tai thong tin...</div>
                    ) : (
                        <>
                            {error && <div className={styles.errorState}>{error}</div>}

                            <div className={styles.avatarSection}>
                                <label className={styles.avatarUpload}>
                                    <span className={styles.avatarCircle}>
                                        {profile?.avatarUrl ? (
                                            <img src={profile.avatarUrl} alt={fullName} className={styles.avatarImage} />
                                        ) : initials}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/gif"
                                        onChange={handleAvatarChange}
                                        disabled={uploading}
                                    />
                                    <span className={styles.avatarAction}>
                                        <i className={uploading ? 'fas fa-spinner fa-spin' : 'fas fa-camera'}></i>
                                        {uploading ? 'Dang tai...' : 'Doi anh'}
                                    </span>
                                </label>
                                <h3 className={styles.profileName}>{fullName}</h3>
                                <span className={styles.roleBadge}>{displayRole}</span>
                            </div>

                            <div className={styles.detailsSection}>
                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>Ho va ten</label>
                                    <div className={styles.detailValue}>{fullName}</div>
                                </div>

                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>Email</label>
                                    <div className={styles.detailValue}>{profile?.email || '-'}</div>
                                </div>

                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>So dien thoai</label>
                                    <div className={styles.detailValue}>{profile?.phone || '-'}</div>
                                </div>

                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>Vai tro he thong</label>
                                    <div className={styles.detailValue}>{displayRole}</div>
                                </div>
                            </div>

                            <div className={styles.actionsSection}>
                                <button className={styles.btnPrimary} onClick={() => navigate('/change-password')}>
                                    <i className="fas fa-key"></i> Doi mat khau
                                </button>
                                <button className={styles.btnSecondary} onClick={() => navigate('/dashboard')}>
                                    Quay lai Dashboard
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
}

export default ProfilePage;
