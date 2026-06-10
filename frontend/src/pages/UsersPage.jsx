import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UsersPage.module.css';
import UserProfileDropdown from '../components/ui/UserProfileDropdown/UserProfileDropdown';
import EmployeeDrawer from '../components/ui/EmployeeDrawer/EmployeeDrawer';

const MOCK_USERS = [
    {
        id: '1',
        name: 'An Nguyễn',
        initials: 'AN',
        avatarColorClass: styles.bgBlue,
        code: 'DLC-2024-001',
        department: 'Phòng Kỹ thuật & Bảo hành',
        departmentShort: 'Kỹ thuật',
        position: 'Trưởng nhóm Kỹ thuật',
        roleBadge: 'TRƯỞNG NHÓM',
        roleClass: styles.rolePrimary,
        email: 'an.nguyen@duylong.vn',
        phone: '0987 654 321',
        status: 'active',
        statusLabel: 'Đang hoạt động',
        statusClass: styles.statusActive,
        dob: '1995-05-15',
        gender: 'Nam',
        address: '123 Đường ABC, Quận 1, TP. HCM',
        idCard: '012345678901',
        startDate: '2024-02-01',
        contractType: 'Chính thức',
        systemRole: 'admin'
    },
    {
        id: '2',
        name: 'Bình Trần',
        initials: 'BT',
        avatarColorClass: styles.bgOrange,
        code: 'DLC-2024-012',
        department: 'Phòng Kinh doanh',
        departmentShort: 'Kinh doanh',
        position: 'Nhân viên kinh doanh',
        roleBadge: 'NHÂN VIÊN',
        roleClass: styles.roleSecondary,
        email: 'binh.tran@duylong.vn',
        phone: '0901 234 567',
        status: 'pending',
        statusLabel: 'Chờ duyệt',
        statusClass: styles.statusPending,
        dob: '1998-10-20',
        gender: 'Nam',
        address: '456 Đường XYZ, Quận 3, TP. HCM',
        idCard: '098765432109',
        startDate: '2024-03-01',
        contractType: 'Thử việc',
        systemRole: 'user'
    },
    {
        id: '3',
        name: 'Hùng Lê',
        initials: 'HL',
        avatarColorClass: styles.bgGray,
        code: 'DLC-2023-088',
        department: 'Kho bãi',
        departmentShort: 'Kho',
        position: 'Nhân viên kho',
        roleBadge: 'NHÂN VIÊN',
        roleClass: styles.roleSecondary,
        email: 'hung.le@duylong.vn',
        phone: '0912 345 678',
        status: 'inactive',
        statusLabel: 'Ngừng hoạt động',
        statusClass: styles.statusInactive,
        dob: '1990-01-01',
        gender: 'Nam',
        address: '789 Đường DEF, Quận Tân Bình, TP. HCM',
        idCard: '011122233344',
        startDate: '2023-05-15',
        contractType: 'Thời vụ',
        systemRole: 'user'
    }
];
function UsersPage() {
    const navigate = useNavigate();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersData, setUsersData] = useState(MOCK_USERS);
    const [activeMenuId, setActiveMenuId] = useState(null); // Track which row's menu is open

    const handleRowClick = (user) => {
        setSelectedUser(user);
        setIsDrawerOpen(true);
    };


    const toggleActionMenu = (e, userId) => {
        e.stopPropagation(); // Ngăn sự kiện click lan ra row (tránh mở drawer)
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

    const handleToggleLock = (e, userId) => {
        e.stopPropagation();
        setActiveMenuId(null);
        setUsersData(prev => prev.map(u => {
            if (u.id === userId) {
                return {
                    ...u,
                    status: u.status === 'Đang hoạt động' ? 'Đã khóa' : 'Đang hoạt động'
                };
            }
            return u;
        }));
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSaveUser = (updatedData) => {
        setUsersData(prev => prev.map(u => u.id === updatedData.id ? updatedData : u));
        setIsDrawerOpen(false);
    };

    return (
        <div className={styles.page}>
            {/* Top Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.brandName}>Duy Long Computer</div>
                    <nav className={styles.navLinks}>
                        <a href="#" className={styles.navLinkActive}>Quản lý người dùng</a>
                        <a href="#" className={styles.navLink}>Nhật ký hệ thống</a>
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
                            <span className={`${styles.statValue} ${styles.textBlue}`}>10</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconGreen}`}><i className="bi bi-person-check-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>ĐANG LÀM VIỆC</span>
                            <span className={`${styles.statValue} ${styles.textGreen}`}>8</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconOrange}`}><i className="bi bi-person-lines-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>CHỜ PHÊ DUYỆT</span>
                            <span className={`${styles.statValue} ${styles.textOrange}`}>1</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconRed}`}><i className="bi bi-person-x-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>NGHỈ VIỆC</span>
                            <span className={`${styles.statValue} ${styles.textRed}`}>1</span>
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
                            {usersData.map((user) => (
                                <tr key={user.id} className={styles.tableRow} onClick={() => handleRowClick(user)}>
                                    <td><div className={`${styles.avatarCircle} ${user.avatarColorClass}`}>{user.initials}</div></td>
                                    <td><strong>{user.name}</strong><br /><span style={{ fontSize: '12px', color: '#64748b' }}>{user.email}</span></td>
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
                                                <div className={styles.actionMenuItem} onClick={(e) => handleAssignPermissions(e, user.id)}>
                                                    <i className="bi bi-shield-lock"></i> Phân quyền chức năng
                                                </div>
                                                <div className={`${styles.actionMenuItem} ${user.status === 'Đang hoạt động' ? styles.actionMenuItemDanger : styles.actionMenuItemSuccess}`} onClick={(e) => handleToggleLock(e, user.id)}>
                                                    <i className={`bi ${user.status === 'Đang hoạt động' ? 'bi-lock' : 'bi-unlock'}`}></i> 
                                                    {user.status === 'Đang hoạt động' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>Hiển thị 1 đến 3 của 42 bản ghi</div>
                        <div className={styles.pageControls}>
                            <button className={styles.pageBtn}><i className="bi bi-chevron-left" /></button>
                            <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
                            <button className={styles.pageBtn}>2</button>
                            <span className={styles.pageDots}>...</span>
                            <button className={styles.pageBtn}>4</button>
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
