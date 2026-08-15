import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { emitUserUpdated } from '../../auth/session';
import AdminLayout from '../../components/layout/AdminLayout';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../utils/dateFormat';
import { compressImage } from '../../utils/imageCompressor';
import styles from './ProfilePage.module.css';

const ROLE_LABELS = {
    role_super_admin: 'Quản trị hệ thống',
    super_admin: 'Quản trị hệ thống',
    role_manager: 'Quản lý',
    manager: 'Quản lý',
    role_staff: 'Nhân viên',
    staff: 'Nhân viên',
    admin: 'Quản trị viên',
    'super admin': 'Quản trị hệ thống'
};

const DEPARTMENT_LABELS = {
    warehouse: 'Kho bãi',
    technical: 'Kỹ thuật - Bảo hành',
    admin: 'Kế toán - Hành chính'
};

const POSITION_LABELS = {
    manager: 'Quản lý kho',
    staff: 'Nhân viên kho',
    technician: 'Kỹ thuật viên'
};

const FULL_NAME_REGEX = /^[\p{L}][\p{L}\s'.-]{1,99}$/u;
const PHONE_REGEX = /^(?:\+84|0)(?:3[2-9]|5[5689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;

const toVietnameseLabel = (value, labels) => {
    if (!value) {
        return '';
    }
    const text = String(value).trim();
    return labels[text.toLowerCase()] || text;
};

function ProfilePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const isEditing = location.pathname.endsWith('/edit');
    const userRole = sessionStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const Layout = isSuperAdmin ? SuperAdminLayout : AdminLayout;

    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({ fullName: '', phone: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const roles = profile?.roles?.length ? profile.roles : [{ code: userRole, name: userRole }];
    const displayRole = roles.map((role) => toVietnameseLabel(role.name || role.code, ROLE_LABELS)).join(', ');
    const fullName = profile?.fullName || profile?.username || 'Người dùng';
    const isActive = profile?.active ?? profile?.isActive;
    const displayStatus = isActive == null ? '-' : isActive ? 'Đang hoạt động' : 'Không hoạt động';
    const statusClass = isActive == null ? styles.statusNeutral : isActive ? styles.statusActive : styles.statusInactive;
    const readOnlyDetails = [
        ['Tên đăng nhập', profile?.username],
        ['Email', profile?.email],
        ['Vai trò hệ thống', displayRole],
        ['Trạng thái tài khoản', displayStatus],
        ['Bộ phận', toVietnameseLabel(profile?.department, DEPARTMENT_LABELS)],
        ['Chức danh', toVietnameseLabel(profile?.position, POSITION_LABELS)],
        ['Ngày tạo tài khoản', formatDateTime(profile?.createdAt, { withSeconds: false })]
    ];
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
                const user = response.data?.data || null;
                setProfile(user);
                setFormData({
                    fullName: user?.fullName || '',
                    phone: user?.phone || ''
                });
            } catch (err) {
                showToast('error', err.response?.data?.userMessage || 'Không thể tải thông tin cá nhân.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [showToast]);

    useEffect(() => {
        if (location.state?.profileSaved) {
            showToast('success', 'Cập nhật thông tin cá nhân thành công.');
            navigate('/profile', { replace: true });
        }
    }, [location.state, navigate, showToast]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        const fullName = formData.fullName.trim().replace(/\s+/g, ' ');
        const phone = formData.phone.trim().replace(/[\s.-]/g, '');
        if (!fullName) {
            showToast('warning', 'Vui lòng nhập họ và tên.');
            return;
        }
        if (!FULL_NAME_REGEX.test(fullName)) {
            showToast('warning', 'Họ và tên phải có 2-100 ký tự và không chứa số hoặc ký tự đặc biệt.');
            return;
        }
        if (!phone) {
            showToast('warning', 'Vui lòng nhập số điện thoại.');
            return;
        }
        if (!PHONE_REGEX.test(phone)) {
            showToast('warning', 'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam.');
            return;
        }
        try {
            setSaving(true);
            const response = await axiosClient.put('/users/me', {
                fullName,
                phone
            });
            const updatedProfile = response.data?.data || null;
            setProfile(updatedProfile);
            emitUserUpdated({ type: 'profile-updated', user: updatedProfile });
            navigate('/profile', { replace: true, state: { profileSaved: true } });
        } catch (err) {
            showToast('error', err.response?.data?.userMessage || 'Không thể cập nhật thông tin cá nhân.');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }

        // 1. Optimistic Preview: Hiển thị ảnh ngay lập tức cho người dùng
        const previousAvatarUrl = profile?.avatarUrl;
        const localPreviewUrl = URL.createObjectURL(file);
        setProfile((prev) => (prev ? { ...prev, avatarUrl: localPreviewUrl } : prev));

        try {
            setUploading(true);

            // 2. Nén ảnh ở Client (Avatar chỉ cần tối đa 400x400 px, giảm từ nhiều MB xuống ~30KB-50KB)
            const compressedFile = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });

            const avatarData = new FormData();
            avatarData.append('file', compressedFile);

            const response = await axiosClient.put('/users/me/avatar', avatarData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const updatedProfile = response.data?.data || null;
            setProfile(updatedProfile);
            emitUserUpdated({ type: 'avatar-updated', user: updatedProfile });
            showToast('success', 'Cập nhật ảnh đại diện thành công.');
        } catch (err) {
            // Khôi phục lại avatar cũ nếu upload lỗi
            setProfile((prev) => (prev ? { ...prev, avatarUrl: previousAvatarUrl } : prev));
            showToast('error', err.response?.data?.userMessage || 'Không thể tải ảnh đại diện.');
        } finally {
            setUploading(false);
        }
    };

    const cancelEdit = () => {
        setFormData({
            fullName: profile?.fullName || '',
            phone: profile?.phone || ''
        });
        navigate('/profile');
    };

    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2>{isEditing ? 'Chỉnh sửa hồ sơ' : 'Thông tin cá nhân'}</h2>
                        <p>{isEditing ? 'Cập nhật thông tin liên hệ của bạn.' : 'Xem thông tin tài khoản và thông tin nhân sự.'}</p>
                    </div>
                    <div className={styles.breadcrumb}>
                        <span className={styles.breadcrumbLink} onClick={() => navigate('/dashboard')}>Dashboard</span>
                        <i className="fas fa-chevron-right"></i>
                        <span>{isEditing ? 'Chỉnh sửa hồ sơ' : 'Thông tin cá nhân'}</span>
                    </div>
                </div>

                <section className={styles.profileCard}>
                    {loading ? (
                        <div className={styles.loadingState}>Đang tải thông tin...</div>
                    ) : (
                        <>
                            <div className={styles.hero}>
                                <div className={styles.avatarWrap}>
                                    {isEditing ? (
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
                                                {uploading ? 'Đang tải...' : 'Đổi ảnh'}
                                            </span>
                                        </label>
                                    ) : (
                                        <span className={styles.avatarCircle}>
                                            {profile?.avatarUrl ? (
                                                <img src={profile.avatarUrl} alt={fullName} className={styles.avatarImage} />
                                            ) : initials}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.heroInfo}>
                                    <h3>{fullName}</h3>
                                    <div className={styles.badgeRow}>
                                        <span className={styles.roleBadge}>{displayRole}</span>
                                        <span className={`${styles.statusBadge} ${statusClass}`}>
                                            {displayStatus}
                                        </span>
                                    </div>
                                </div>

                                {!isEditing && (
                                    <div className={styles.heroActions}>
                                        <button className={styles.btnSecondary} type="button" onClick={() => navigate('/change-password')}>
                                            <i className="fas fa-key"></i> Đổi mật khẩu
                                        </button>
                                        <button className={styles.btnPrimary} type="button" onClick={() => navigate('/profile/edit')}>
                                            <i className="fas fa-pen"></i> Chỉnh sửa
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isEditing ? (
                                <form className={styles.formPanel} onSubmit={handleProfileSubmit} noValidate>
                                    <div className={styles.fieldGrid}>
                                        <div className={styles.detailGroup}>
                                            <label className={styles.detailLabel} htmlFor="fullName">Họ và tên</label>
                                            <input
                                                id="fullName"
                                                name="fullName"
                                                className={styles.detailInput}
                                                value={formData.fullName}
                                                onChange={handleInputChange}
                                                disabled={saving}
                                                minLength={2}
                                                maxLength={100}
                                                pattern="^[\p{L}][\p{L}\s'.-]{1,99}$"
                                                title="Họ và tên phải có 2-100 ký tự và không chứa số hoặc ký tự đặc biệt."
                                                required
                                            />
                                        </div>

                                        <div className={styles.detailGroup}>
                                            <label className={styles.detailLabel} htmlFor="phone">Số điện thoại</label>
                                            <input
                                                id="phone"
                                                name="phone"
                                                className={styles.detailInput}
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                disabled={saving}
                                                inputMode="tel"
                                                placeholder="VD: 0912345678"
                                                title="Nhập số di động Việt Nam, ví dụ 0912345678 hoặc +84912345678."
                                                required
                                            />
                                        </div>

                                        {readOnlyDetails.map(([label, value]) => (
                                            <div className={styles.detailGroup} key={label}>
                                                <label className={styles.detailLabel}>{label}</label>
                                                <div className={styles.detailValue}>{value || '-'}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={styles.formActions}>
                                        <button className={styles.btnPrimary} type="submit" disabled={saving}>
                                            <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                                            {saving ? 'Đang lưu...' : 'Lưu thông tin'}
                                        </button>
                                        <button className={styles.btnSecondary} type="button" onClick={cancelEdit} disabled={saving}>
                                            Hủy thay đổi
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className={styles.infoGrid}>
                                    <div className={styles.detailGroup}>
                                        <label className={styles.detailLabel}>Họ và tên</label>
                                        <div className={styles.detailValue}>{fullName}</div>
                                    </div>
                                    <div className={styles.detailGroup}>
                                        <label className={styles.detailLabel}>Số điện thoại</label>
                                        <div className={styles.detailValue}>{profile?.phone || '-'}</div>
                                    </div>
                                    {readOnlyDetails.map(([label, value]) => (
                                        <div className={styles.detailGroup} key={label}>
                                            <label className={styles.detailLabel}>{label}</label>
                                            <div className={styles.detailValue}>{value || '-'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!isEditing && (
                                <div className={styles.actionsSection}>
                                    <button className={styles.btnGhost} type="button" onClick={() => navigate('/dashboard')}>
                                        Quay lại Dashboard
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </Layout>
    );
}

export default ProfilePage;
