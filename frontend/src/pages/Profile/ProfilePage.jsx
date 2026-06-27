import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import styles from './ProfilePage.module.css';

function ProfilePage() {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('role') || 'STAFF';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN';
    const displayRole = isSuperAdmin ? 'Quản trị viên' : userRole === 'MANAGER' ? 'Quản lý' : 'Nhân viên';
    const email = isSuperAdmin ? 'admin@duylong.vn' : userRole === 'MANAGER' ? 'manager@duylong.vn' : 'staff@duylong.vn';
    const phone = '0987 654 321';
    const fullName = isSuperAdmin ? 'Nguyễn Đức Long' : userRole === 'MANAGER' ? 'Trần Văn Bình' : 'Lê Hoàng Nam';

    const Layout = isSuperAdmin ? SuperAdminLayout : AdminLayout;

    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Thông tin cá nhân</h2>
                    <div className={styles.breadcrumb}>
                        <span className={styles.breadcrumbLink} onClick={() => navigate('/dashboard')}>Super Admin Dashboard</span>
                        <i className="fas fa-chevron-right"></i>
                        <span>Thông tin cá nhân</span>
                    </div>
                </div>

                <div className={styles.profileCard}>
                    <div className={styles.avatarSection}>
                        <div className={styles.avatarCircle}>
                            {userRole === 'SUPER_ADMIN' || userRole === 'ROLE_SUPER_ADMIN' ? 'SA' : userRole === 'MANAGER' ? 'MN' : 'ST'}
                        </div>
                        <h3 className={styles.profileName}>{fullName}</h3>
                        <span className={styles.roleBadge}>{displayRole}</span>
                    </div>

                    <div className={styles.detailsSection}>
                        <div className={styles.detailGroup}>
                            <label className={styles.detailLabel}>Họ và Tên</label>
                            <div className={styles.detailValue}>{fullName}</div>
                        </div>

                        <div className={styles.detailGroup}>
                            <label className={styles.detailLabel}>Email</label>
                            <div className={styles.detailValue}>{email}</div>
                        </div>

                        <div className={styles.detailGroup}>
                            <label className={styles.detailLabel}>Số điện thoại</label>
                            <div className={styles.detailValue}>{phone}</div>
                        </div>

                        <div className={styles.detailGroup}>
                            <label className={styles.detailLabel}>Vai trò hệ thống</label>
                            <div className={styles.detailValue}>{displayRole}</div>
                        </div>
                    </div>

                    <div className={styles.actionsSection}>
                        <button className={styles.btnPrimary} onClick={() => navigate('/change-password')}>
                            <i className="fas fa-key"></i> Đổi mật khẩu
                        </button>
                        <button className={styles.btnSecondary} onClick={() => navigate('/dashboard')}>
                            Quay lại Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default ProfilePage;
