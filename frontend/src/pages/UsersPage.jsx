import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { exportToExcel } from '../utils/excelExport';
import styles from './UsersPage.module.css';
import UserProfileDropdown from '../components/ui/UserProfileDropdown/UserProfileDropdown';
import EmployeeDrawer from '../components/ui/EmployeeDrawer/EmployeeDrawer';
import { USER_EVENT } from '../auth/session';

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

        let department = 'Kho bÃ£i';
        let departmentShort = 'Kho';
        let position = 'NhÃ¢n viÃªn kho';
        let roleBadge = 'NHÃ‚N VIÃŠN';
        let roleClass = styles.roleSecondary;

        if (isSuperAdmin) {
            department = 'PhÃ²ng Ká»¹ thuáº­t & Báº£o hÃ nh';
            departmentShort = 'Quáº£n trá»‹';
            position = 'Super Admin';
            roleBadge = 'SUPER ADMIN';
            roleClass = styles.rolePrimary;
        } else if (isManager) {
            department = 'PhÃ²ng Kinh doanh';
            departmentShort = 'Kinh doanh';
            position = 'Quáº£n lÃ½';
            roleBadge = 'QUáº¢N LÃ';
            roleClass = styles.rolePrimary;
        }

        return {
            id: u.id,
            name: u.fullName,
            initials,
            avatarColorClass,
            code: u.userCode || '(ChÆ°a cáº¥p)',
            department,
            departmentShort,
            position,
            roleBadge,
            roleClass,
            email: u.email || '',
            phone: u.phone || '',
            status: u.status,
            statusLabel: u.status === 'APPROVED' ? 'Äang hoáº¡t Ä‘á»™ng' : 'ÄÃ£ khÃ³a',
            statusClass: u.status === 'APPROVED' ? styles.statusActive : styles.statusInactive,
            dob: u.dob || 'ChÆ°a cáº­p nháº­t',
            gender: u.gender || 'ChÆ°a cáº­p nháº­t',
            address: u.address || 'ChÆ°a cáº­p nháº­t',
            idCard: u.idCard || 'ChÆ°a cáº­p nháº­t',
            startDate: u.startDate || 'ChÆ°a cáº­p nháº­t',
            contractType: u.contractType || 'ChÆ°a cáº­p nháº­t',
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
            console.error('Lá»—i láº¥y danh sÃ¡ch ngÆ°á»i dÃ¹ng:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
         
        fetchUsers();
         
    }, []);

    useEffect(() => {
        const handleUserUpdated = (event) => {
            const incomingUser = event.detail?.user;
            if (!incomingUser?.id) {
                return;
            }

            const mappedUser = mapUserToUi(incomingUser);

            setUsersData((prev) => {
                const existingIndex = prev.findIndex((item) => item.id === mappedUser.id);
                if (existingIndex === -1) {
                    return [mappedUser, ...prev];
                }

                const next = [...prev];
                next[existingIndex] = mappedUser;
                return next;
            });

            setSelectedUser((prev) => (prev && prev.id === mappedUser.id ? mappedUser : prev));
        };

        window.addEventListener(USER_EVENT, handleUserUpdated);
        return () => window.removeEventListener(USER_EVENT, handleUserUpdated);
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
                ? `Báº¡n cháº¯c cháº¯n muá»‘n khÃ³a tÃ i khoáº£n ${user.name}?`
                : `Báº¡n cháº¯c cháº¯n muá»‘n má»Ÿ khÃ³a tÃ i khoáº£n ${user.name}?`
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
            console.error('Lá»—i thay Ä‘á»•i tráº¡ng thÃ¡i tÃ i khoáº£n:', error);
            const message =
                error.response?.data?.userMessage ||
                error.response?.data?.message ||
                'CÃ³ lá»—i xáº£y ra khi thay Ä‘á»•i tráº¡ng thÃ¡i tÃ i khoáº£n.';
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
                phone: (updatedData.phone || '').replace(/[\s.-]/g, ''),
                roles: [targetRoleCode]
            });

            await fetchUsers();
            setIsDrawerOpen(false);
        } catch (error) {
            console.error('Lá»—i lÆ°u thÃ´ng tin nhÃ¢n viÃªn:', error);
            alert('CÃ³ lá»—i xáº£y ra khi cáº­p nháº­t thÃ´ng tin nhÃ¢n viÃªn.');
            throw error;
        }
    };

    const handleExport = () => {
        const headers = ['MÃ£ nhÃ¢n viÃªn', 'Há» vÃ  tÃªn', 'Email', 'Sá»‘ Ä‘iá»‡n thoáº¡i', 'Bá»™ pháº­n', 'Vai trÃ²', 'Tráº¡ng thÃ¡i'];
        const data = usersData.map(item => [
            item.code,
            item.name,
            item.email,
            item.phone,
            item.department,
            item.position,
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_nguoi_dung');
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
                        <a onClick={() => navigate('/users')} className={styles.navLinkActive}>Quáº£n lÃ½ ngÆ°á»i dÃ¹ng</a>
                        <a onClick={() => navigate('/audit-log')} className={styles.navLink}>Nháº­t kÃ½ há»‡ thá»‘ng</a>
                    </nav>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input type="text" placeholder="TÃ¬m kiáº¿m há»‡ thá»‘ng..." />
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
                        <h1 className={styles.pageTitle}>Quáº£n lÃ½ tÃ i khoáº£n & PhÃ¢n quyá»n</h1>
                        <p className={styles.pageSubtitle}>Quáº£n lÃ½ vai trÃ², quyá»n háº¡n vÃ  tráº¡ng thÃ¡i cá»§a nhÃ¢n viÃªn Duy Long Computer.</p>
                    </div>
                    <button className={styles.btnAdd} onClick={() => navigate('/users/create')}>
                        <i className="bi bi-person-plus" /> ThÃªm thÃ nh viÃªn
                    </button>
                </div>

                {/* Stat Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconBlue}`}><i className="bi bi-people-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>Tá»”NG NHÃ‚N Sá»°</span>
                            <span className={`${styles.statValue} ${styles.textBlue}`}>{totalStaff}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconGreen}`}><i className="bi bi-person-check-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>ÄANG LÃ€M VIá»†C</span>
                            <span className={`${styles.statValue} ${styles.textGreen}`}>{activeStaff}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconOrange}`}><i className="bi bi-person-lines-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>CHá»œ PHÃŠ DUYá»†T</span>
                            <span className={`${styles.statValue} ${styles.textOrange}`}>{pendingStaff}</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconRed}`}><i className="bi bi-person-x-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>KHÃ“A TÃ€I KHOáº¢N</span>
                            <span className={`${styles.statValue} ${styles.textRed}`}>{inactiveStaff}</span>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableToolbar}>
                        <div className={styles.tableSearch}>
                            <i className="bi bi-search" />
                            <input type="text" placeholder="TÃ¬m kiáº¿m theo tÃªn, mÃ£ hoáº·c email..." />
                        </div>
                        <button className={styles.btnFilter} onClick={handleExport} style={{ marginRight: '10px' }}>
                            <i className="bi bi-file-earmark-excel" /> Xuáº¥t Excel
                        </button>
                        <button className={styles.btnFilter}>
                            <i className="bi bi-funnel" /> Bá»™ lá»c
                        </button>
                    </div>

                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>AVATAR</th>
                                <th>Há»Œ VÃ€ TÃŠN</th>
                                <th>MÃƒ NHÃ‚N VIÃŠN</th>
                                <th>Bá»˜ PHáº¬N</th>
                                <th>VAI TRÃ’</th>

                                <th>TRáº NG THÃI</th>
                                <th>THAO TÃC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>Äang táº£i dá»¯ liá»‡u...</td>
                                </tr>
                            ) : usersData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>KhÃ´ng cÃ³ ngÆ°á»i dÃ¹ng nÃ o.</td>
                                </tr>
                            ) : (
                                usersData.map((user) => (
                                    <tr key={user.id} className={styles.tableRow} onClick={() => handleRowClick(user)}>
                                        <td><div className={`${styles.avatarCircle} ${user.avatarColorClass}`}>{user.initials}</div></td>
                                        <td><strong>{user.name}</strong><br /><span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{user.email}</span></td>
                                        <td>{user.code}</td>
                                        <td>{user.departmentShort}</td>
                                        <td><span className={`${styles.roleBadge} ${user.roleClass}`}>{user.roleBadge}</span></td>

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
                                                        <i className="bi bi-eye"></i> Xem thÃ´ng tin chi tiáº¿t
                                                    </div>
                                                    {user.roles && user.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF') && (
                                                        <div className={styles.actionMenuItem} onClick={(e) => handleAssignPermissions(e, user.id)}>
                                                            <i className="bi bi-shield-lock"></i> PhÃ¢n quyá»n chá»©c nÄƒng
                                                        </div>
                                                    )}
                                                    <div className={`${styles.actionMenuItem} ${user.status === 'APPROVED' ? styles.actionMenuItemDanger : styles.actionMenuItemSuccess}`} onClick={(e) => handleToggleLock(e, user)}>
                                                        <i className={`bi ${user.status === 'APPROVED' ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                        {user.status === 'APPROVED' ? 'KhÃ³a tÃ i khoáº£n' : 'Má»Ÿ khÃ³a tÃ i khoáº£n'}
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
                        <div className={styles.pageInfo}>Hiá»ƒn thá»‹ 1 Ä‘áº¿n {usersData.length} cá»§a {usersData.length} báº£n ghi</div>
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

