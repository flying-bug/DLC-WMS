import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { emitUserUpdated } from '../../auth/session';
import AdminLayout from '../../components/layout/AdminLayout';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import styles from './ProfilePage.module.css';

function ProfilePage() {
    const navigate = useNavigate();
    const userRole = sessionStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const Layout = isSuperAdmin ? SuperAdminLayout : AdminLayout;

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const roles = profile?.roles?.length ? profile.roles : [{ code: userRole, name: userRole }];
    const displayRole = roles.map((role) => role.name || role.code).join(', ');
    const fullName = profile?.fullName || profile?.username || 'NgÆ°á»i dÃ¹ng';
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
                setError(err.response?.data?.userMessage || 'KhÃ´ng thá»ƒ táº£i thÃ´ng tin cÃ¡ nhÃ¢n.');
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
            setError(err.response?.data?.userMessage || 'KhÃ´ng thá»ƒ táº£i áº£nh Ä‘áº¡i diá»‡n.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>ThÃ´ng tin cÃ¡ nhÃ¢n</h2>
                    <div className={styles.breadcrumb}>
                        <span className={styles.breadcrumbLink} onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <i className="fas fa-chevron-right"></i>
                        <span>ThÃ´ng tin cÃ¡ nhÃ¢n</span>
                    </div>
                </div>

                <div className={styles.profileCard}>
                    {loading ? (
                        <div className={styles.loadingState}>Äang táº£i thÃ´ng tin...</div>
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
                                        {uploading ? 'Äang táº£i...' : 'Äá»•i áº£nh'}
                                    </span>
                                </label>
                                <h3 className={styles.profileName}>{fullName}</h3>
                                <span className={styles.roleBadge}>{displayRole}</span>
                            </div>

                            <div className={styles.detailsSection}>
                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>Há» vÃ  tÃªn</label>
                                    <div className={styles.detailValue}>{fullName}</div>
                                </div>

                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>Email</label>
                                    <div className={styles.detailValue}>{profile?.email || '-'}</div>
                                </div>

                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>Sá»‘ Ä‘iá»‡n thoáº¡i</label>
                                    <div className={styles.detailValue}>{profile?.phone || '-'}</div>
                                </div>

                                <div className={styles.detailGroup}>
                                    <label className={styles.detailLabel}>Vai trÃ² há»‡ thá»‘ng</label>
                                    <div className={styles.detailValue}>{displayRole}</div>
                                </div>
                            </div>

                            <div className={styles.actionsSection}>
                                <button className={styles.btnPrimary} onClick={() => navigate('/change-password')}>
                                    <i className="fas fa-key"></i> Äá»•i máº­t kháº©u
                                </button>
                                <button className={styles.btnSecondary} onClick={() => navigate('/dashboard')}>
                                    Quay láº¡i Dashboard
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
