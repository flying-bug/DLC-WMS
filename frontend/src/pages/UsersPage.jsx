import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import styles from './UsersPage.module.css';
import UserProfileDropdown from '../components/ui/UserProfileDropdown/UserProfileDropdown';
import EmployeeDrawer from '../components/ui/EmployeeDrawer/EmployeeDrawer';

function UsersPage() {
    const navigate = useNavigate();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersData, setUsersData] = useState([]);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [loading, setLoading] = useState(false);

    const mapUserToUi = (u) => {
        const isSuperAdmin = u.roles && u.roles.some(r => r === 'SUPER_ADMIN' || r === 'ROLE_SUPER_ADMIN');
        const isManager = u.roles && u.roles.some(r => r === 'MANAGER' || r === 'ROLE_MANAGER');
        const systemRole = isSuperAdmin ? 'admin' : 'user';
        const initials = u.fullName ? u.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

        const colorClasses = [styles.bgBlue, styles.bgOrange, styles.bgGray];
        const avatarColorClass = colorClasses[u.id % colorClasses.length] || styles.bgBlue;

        let department = 'Kho bãi';
        let departmentShort = 'Kho';
        let position = 'Nhân viên kho';
        let roleBadge = 'NHÂN VIÊN';
        let roleClass = styles.roleSecondary;

        if (isSuperAdmin) {
            department = 'Phòng Kỹ thuật & Bảo hành';
            departmentShort = 'Quản trị';
            position = 'Super Admin';
            roleBadge = 'SUPER ADMIN';
            roleClass = styles.rolePrimary;
        } else if (isManager) {
            department = 'Phòng Kinh doanh';
            departmentShort = 'Kinh doanh';
            position = 'Quản lý';
            roleBadge = 'QUẢN LÝ';
            roleClass = styles.rolePrimary;
        }

        return {
            id: u.id,
            name: u.fullName,
            initials,
            avatarColorClass,
            code: u.username,
            department,
            departmentShort,
            position,
            roleBadge,
            roleClass,
            email: u.email || '',
            phone: u.phone || '',
            status: u.status,
            statusLabel: u.status === 'APPROVED' ? 'Đang hoạt động' : 'Đã khóa',
            statusClass: u.status === 'APPROVED' ? styles.statusActive : styles.statusInactive,
            dob: '1995-05-15',
            gender: 'Nam',
            address: 'Hà Nội, Việt Nam',
            idCard: '012345678901',
            startDate: '2024-02-01',
            contractType: 'Chính thức',
            systemRole,
            roles: u.roles || []
        };
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/users');
            if (res.data && res.data.data) {
                setUsersData(res.data.data.map(mapUserToUi));
            }
        } catch (error) {
            console.error('Lỗi lấy danh sách người dùng:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRowClick = (user) => {
        setSelectedUser(user);
        setIsDrawerOpen(true);
    };

    const toggleActionMenu = (e, userId) => {
        e.stopPropagation();
        setActiveMenuId(prev => prev === userId ? null : userId);
    };

    const handleViewInfo = (e, user) => {
        e.stopPropagation();
        setActiveMenuId(null);
        handleRowClick(user);
    };

    const handleAssignPermissions = (e, userId) => {
        e.stopPropagation();
        setActiveMenuId(null);
        navigate(`/users/${userId}/permissions`);
    };

    const handleToggleLock = async (e, user) => {
        e.stopPropagation();
        setActiveMenuId(null);
        const isLocking = user.status === 'APPROVED';
        const nextStatus = isLocking ? 'INACTIVE' : 'APPROVED';
        const confirmed = window.confirm(
            isLocking
                ? `Bạn chắc chắn muốn khóa tài khoản ${user.name}?`
                : `Bạn chắc chắn muốn mở khóa tài khoản ${user.name}?`
        );
        if (!confirmed) {
            return;
        }

        try {
            await axiosClient.put(`/users/${user.id}/status`, null, {
                params: { status: nextStatus }
            });
            await fetchUsers();
        } catch (error) {
            console.error('Lỗi thay đổi trạng thái tài khoản:', error);
            const message =
                error.response?.data?.userMessage ||
                error.response?.data?.message ||
                'Có lỗi xảy ra khi thay đổi trạng thái tài khoản.';
            alert(message);
        }
    };

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSaveUser = async (updatedData) => {
        try {
            // Update info and roles
            const targetRoleCode = updatedData.systemRole === 'admin' ? 'SUPER_ADMIN' : 'STAFF';
            await axiosClient.put(`/users/${updatedData.id}`, {
                fullName: updatedData.name,
                email: updatedData.email,
                phone: updatedData.phone,
                roles: [targetRoleCode]
            });

            fetchUsers();
            setIsDrawerOpen(false);
        } catch (error) {
            console.error('Lỗi lưu thông tin nhân viên:', error);
            alert('Có lỗi xảy ra khi cập nhật thông tin nhân viên.');
        }
    };

    // Calculate dynamic stats
    const totalStaff = usersData.length;
    const activeStaff = usersData.filter(u => u.status === 'APPROVED').length;
    const inactiveStaff = usersData.filter(u => u.status === 'INACTIVE').length;
    const pendingStaff = usersData.filter(u => u.status !== 'APPROVED' && u.status !== 'INACTIVE').length;

    return (
        <div className={styles.page}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a onClick={() => navigate('/users')} className={styles.navLinkActive}>Quản lý người dùng</a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLink}>Nhật ký hệ thống</a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="Tìm kiếm hệ thống..." />
                    </div>
                    <button className={styles.bellBtn}>
                        <i className="bi bi-bell" />
                        <span className={styles.bellDot}></span>
                    </button>
                    <div className={styles.userInfoContainer}>
                        <UserProfileDropdown />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Quản lý tài khoản & Phân quyền</h1>
                        <p className={styles.pageSubtitle}>Quản lý vai trò, quyền hạn và trạng thái của nhân viên Duy Long Computer.</p>
                    </div>
                    <button className={styles.btnAdd} onClick={() => navigate('/users/create')}>
                        <i className="bi bi-person-plus" /> Thêm thành viên
                    </button>
                </div>

                {/* Stat Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconBlue}`}><i className="bi bi-people-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>TỔNG NHÂN SỰ</span>
                            <span className={`${styles.statValue} ${styles.textBlue}`}>{totalStaff}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconGreen}`}><i className="bi bi-person-check-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>ĐANG LÀM VIỆC</span>
                            <span className={`${styles.statValue} ${styles.textGreen}`}>{activeStaff}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconOrange}`}><i className="bi bi-person-lines-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>CHỜ PHÊ DUYỆT</span>
                            <span className={`${styles.statValue} ${styles.textOrange}`}>{pendingStaff}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconRed}`}><i className="bi bi-person-x-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>KHÓA TÀI KHOẢN</span>
                            <span className={`${styles.statValue} ${styles.textRed}`}>{inactiveStaff}</span>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableToolbar}>
                        <div className={styles.tableSearch}>
                            <i className="bi bi-search" />
                            <input type="text" placeholder="Tìm kiếm theo tên, mã hoặc email..." />
                        </div>
                        <button className={styles.btnFilter}>
                            <i className="bi bi-funnel" /> Bộ lọc
                        </button>
                    </div>

                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>AVATAR</th>
                                <th>HỌ VÀ TÊN</th>
                                <th>MÃ NHÂN VIÊN</th>
                                <th>BỘ PHẬN</th>
                                <th>VAI TRÒ</th>
                                <th>EMAIL</th>
                                <th>TRẠNG THÁI</th>
                                <th>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu...</td>
                                </tr>
                            ) : usersData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Không có người dùng nào.</td>
                                </tr>
                            ) : (
                                usersData.map((user) => (
                                    <tr key={user.id} className={styles.tableRow} onClick={() => handleRowClick(user)}>
                                        <td><div className={`${styles.avatarCircle} ${user.avatarColorClass}`}>{user.initials}</div></td>
                                        <td><strong>{user.name}</strong><br /><span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{user.email}</span></td>
                                        <td>{user.code}</td>
                                        <td>{user.departmentShort}</td>
                                        <td><span className={`${styles.roleBadge} ${user.roleClass}`}>{user.roleBadge}</span></td>
                                        <td>{user.email}</td>
                                        <td><span className={`${styles.statusBadge} ${user.statusClass}`}><i className="bi bi-circle-fill"></i> {user.statusLabel}</span></td>
                                        <td className={styles.actionCell}>
                                            <button
                                                className={styles.btnAction}
                                                onClick={(e) => toggleActionMenu(e, user.id)}
                                            >
                                                <i className="bi bi-three-dots-vertical"></i>
                                            </button>

                                            {activeMenuId === user.id && (
                                                <div className={styles.actionMenu}>
                                                    <div className={styles.actionMenuItem} onClick={(e) => handleViewInfo(e, user)}>
                                                        <i className="bi bi-eye"></i> Xem thông tin chi tiết
                                                    </div>
                                                    {user.roles && user.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF') && (
                                                        <div className={styles.actionMenuItem} onClick={(e) => handleAssignPermissions(e, user.id)}>
                                                            <i className="bi bi-shield-lock"></i> Phân quyền chức năng
                                                        </div>
                                                    )}
                                                    <div className={`${styles.actionMenuItem} ${user.status === 'APPROVED' ? styles.actionMenuItemDanger : styles.actionMenuItemSuccess}`} onClick={(e) => handleToggleLock(e, user)}>
                                                        <i className={`bi ${user.status === 'APPROVED' ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                        {user.status === 'APPROVED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>Hiển thị 1 đến {usersData.length} của {usersData.length} bản ghi</div>
                        <div className={styles.pageControls}>
                            <button className={styles.pageBtn}><i className="bi bi-chevron-left" /></button>
                            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
                            <button className={styles.pageBtn}><i className="bi bi-chevron-right" /></button>
                        </div>
                    </div>
                </div>
            </main>

            <EmployeeDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                user={selectedUser}
                onSave={handleSaveUser}
            />
        </div>
    );
}

export default UsersPage;

