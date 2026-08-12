import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ui/ConfirmModal/ConfirmModal';
import { exportToExcel } from '../utils/excelExport';
import styles from './UsersPage.module.css';
import SuperAdminLayout from '../components/layout/SuperAdminLayout';
import EmployeeDrawer from '../components/ui/EmployeeDrawer/EmployeeDrawer';
import Pagination from '../components/ui/Pagination/Pagination';
import { USER_EVENT } from '../auth/session';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const GENDER_LABELS = {
    male: 'Nam',
    female: 'Nữ',
    other: 'Khác',
    nam: 'Nam',
    nữ: 'Nữ',
    nu: 'Nữ',
    khác: 'Khác',
    khac: 'Khác'
};

const toVietnameseGender = (value) => {
    const key = String(value || '').trim().toLowerCase();
    return GENDER_LABELS[key] || value || '';
};

function UsersPage() {
    const navigate = useNavigate();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [usersData, setUsersData] = useState([]);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, user: null, isLocking: false });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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
            code: u.userCode || u.username || '(Chưa cấp)',
            username: u.username,
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
            dob: u.dob || '',
            gender: toVietnameseGender(u.gender) || 'Chưa cập nhật',
            address: u.address || 'Chưa cập nhật',
            idCard: u.idCard || 'Chưa cập nhật',
            startDate: u.startDate || 'Chưa cập nhật',
            contractType: u.contractType || 'Chưa cập nhật',
            imageUrl: u.imageUrl || u.avatarUrl || u.avatar || null,
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

    const openConfirmModal = (e, user) => {
        e.stopPropagation();
        setActiveMenuId(null);
        setConfirmModal({
            isOpen: true,
            user: user,
            isLocking: user.status === 'APPROVED'
        });
    };

    const executeToggleLock = async () => {
        if (!confirmModal.user) return;
        const { user, isLocking } = confirmModal;
        const nextStatus = isLocking ? 'INACTIVE' : 'APPROVED';

        try {
            await axiosClient.put(`/users/${user.id}/status`, null, {
                params: { status: nextStatus }
            });
            await fetchUsers();
            showToast('success', isLocking ? 'Khóa tài khoản thành công.' : 'Cập nhật thành công.');
        } catch (error) {
            console.error('Lỗi thay đổi trạng thái tài khoản:', error);
            const message =
                error.response?.data?.userMessage ||
                error.response?.data?.message ||
                'Thao tác thất bại.';
            showToast('error', message);
        } finally {
            setConfirmModal({ isOpen: false, user: null, isLocking: false });
        }
    };

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSaveUser = async (updatedData) => {
        try {
            const targetRoleCode = updatedData.systemRole === 'admin' ? 'SUPER_ADMIN' : 'STAFF';
            await axiosClient.put(`/users/${updatedData.id}`, {
                username: updatedData.username || updatedData.code,
                fullName: updatedData.name,
                email: updatedData.email,
                phone: (updatedData.phone || '').replace(/[\s.-]/g, ''),
                idCard: updatedData.idCard === 'Chưa cập nhật' ? 'Chưa cập nhật' : updatedData.idCard,
                dob: updatedData.dob || null,
                gender: updatedData.gender === 'Chưa cập nhật' ? null : updatedData.gender,
                startDate: updatedData.startDate === 'Chưa cập nhật' ? null : updatedData.startDate,
                position: updatedData.position === 'Chưa xác định' ? null : updatedData.position,
                department: updatedData.department === 'Chưa xác định' ? null : updatedData.department,
                address: updatedData.address === 'Chưa cập nhật' ? null : updatedData.address,
                status: updatedData.status,
                roles: [targetRoleCode]
            });
            await fetchUsers();
            showToast('success', 'Cập nhật thành công.');
            setIsDrawerOpen(false);
        } catch (error) {
            console.error('Lỗi cập nhật user:', error);
            const message =
                error.response?.data?.userMessage ||
                error.response?.data?.message ||
                'Thao tác thất bại.';
            showToast('error', message);
            throw error;
        }
    };

    const handleExport = () => {
        const headers = ['Mã nhân viên', 'Họ và tên', 'Email', 'Số điện thoại', 'Bộ phận', 'Vai trò', 'Trạng thái'];
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

    // Derived Data
    const filteredUsers = usersData.filter(u => {
        const matchSearch = searchTerm ?
            (u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase())) : true;

        const matchStatus = statusFilter === 'APPROVED' ? u.status === 'APPROVED'
                          : statusFilter === 'INACTIVE' ? u.status !== 'APPROVED'
                          : true;
        const matchRole = roleFilter ? (u.roles && u.roles.some(r => r === roleFilter || r === `ROLE_${roleFilter}`)) : true;

        return matchSearch && matchStatus && matchRole;
    });

    // Pagination Logic
    const totalItems = filteredUsers.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const totalStaff = usersData.length;
    const activeStaff = usersData.filter(u => u.status === 'APPROVED').length;
    const inactiveStaff = usersData.filter(u => u.status !== 'APPROVED').length;

    return (
        <SuperAdminLayout>
            {/* Main Content */}
            <div className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Quản lý tài khoản & Phân quyền</h1>
                        <p className={styles.pageSubtitle}>Quản lý vai trò, quyền hạn và trạng thái của nhân viên Duy Long Computer.</p>
                    </div>
                    <button type="button" className="btnPrimary" onClick={() => navigate('/users/create')}>
                        <i className="bi bi-person-plus" /> Thêm nhân viên
                    </button>
                </div>

                {/* Stat Cards */}
                <div className={styles.statsGrid}>
                    <button type="button" aria-pressed={statusFilter === ''} className={`${styles.statCard} ${statusFilter === '' ? styles.statCardActive : ''}`} onClick={() => { setStatusFilter(''); setCurrentPage(1); }}>
                        <div className={`${styles.statIcon} ${styles.iconBlue}`}><i className="bi bi-people-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>TỔNG NHÂN SỰ</span>
                            <span className={`${styles.statValue} ${styles.textBlue}`}>{totalStaff}</span>
                        </div>
                    </button>
                    <button type="button" aria-pressed={statusFilter === 'APPROVED'} className={`${styles.statCard} ${statusFilter === 'APPROVED' ? styles.statCardActive : ''}`} onClick={() => { setStatusFilter('APPROVED'); setCurrentPage(1); }}>
                        <div className={`${styles.statIcon} ${styles.iconGreen}`}><i className="bi bi-person-check-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>ĐANG LÀM VIỆC</span>
                            <span className={`${styles.statValue} ${styles.textGreen}`}>{activeStaff}</span>
                        </div>
                    </button>

                    <button type="button" aria-pressed={statusFilter === 'INACTIVE'} className={`${styles.statCard} ${statusFilter === 'INACTIVE' ? styles.statCardActive : ''}`} onClick={() => { setStatusFilter('INACTIVE'); setCurrentPage(1); }}>
                        <div className={`${styles.statIcon} ${styles.iconRed}`}><i className="bi bi-person-x-fill" /></div>
                        <div className={styles.statInfo}>
                            <span className={styles.statLabel}>KHÓA TÀI KHOẢN</span>
                            <span className={`${styles.statValue} ${styles.textRed}`}>{inactiveStaff}</span>
                        </div>
                    </button>
                </div>

                {/* Table Container */}
                <div className={styles.tableContainer}>
                    <div className={styles.filterSection}>
                        <div className={styles.searchAndPopover}>
                            <div className={styles.searchBox}>
                                <i className="bi bi-search" />
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Nhập tên, mã nhân viên hoặc email..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    aria-label="Tìm kiếm nhân viên"
                                />
                            </div>
                            <div className={styles.filterSelectGroup}>
                                <SearchableSelect
                                    className={styles.filterSelect}
                                    value={roleFilter}
                                    onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                    aria-label="Lọc theo vai trò"
                                >
                                    <option value="">Vai trò</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                    <option value="MANAGER">Quản lý</option>
                                    <option value="STAFF">Nhân viên</option>
                                </SearchableSelect>
                            </div>
                        </div>
                        <div className={styles.filterActions}>
                            <button type="button" className={styles.iconBtn} onClick={() => { setSearchTerm(''); setStatusFilter(''); setRoleFilter(''); setCurrentPage(1); }} title="Làm mới" aria-label="Làm mới bộ lọc">
                                <i className="bi bi-arrow-clockwise" />
                            </button>
                            <button type="button" className={styles.iconBtn} onClick={handleExport} title="Xuất Excel" aria-label="Xuất danh sách ra Excel">
                                <i className="bi bi-file-earmark-excel" />
                            </button>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>AVATAR</th>
                                <th>HỌ VÀ TÊN</th>
                                <th>TÀI KHOẢN NHÂN VIÊN</th>
                                <th>BỘ PHẬN</th>
                                <th>VAI TRÒ</th>
                                <th>TRẠNG THÁI</th>
                                <th>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                                        <i className="bi bi-arrow-repeat" style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '8px' }}></i>
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '50px 0' }}>
                                        <div style={{ color: 'var(--color-text-muted)' }}>
                                            Không tìm thấy nhân viên nào
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        className={`${styles.tableRow} ${activeMenuId === user.id ? styles.tableRowActive : ''}`}
                                        onClick={() => handleRowClick(user)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') handleRowClick(user);
                                        }}
                                        tabIndex={0}
                                        aria-label={`Xem chi tiết ${user.name}`}
                                    >
                                        <td data-label="AVATAR">
                                            {user.imageUrl ? (
                                                <img src={user.imageUrl} className={styles.avatarImage} alt={user.name} />
                                            ) : (
                                                <div className={`${styles.avatarCircle} ${user.avatarColorClass}`}>{user.initials}</div>
                                            )}
                                        </td>
                                        <td data-label="HỌ VÀ TÊN"><strong>{user.name}</strong><br /><span style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{user.email}</span></td>
                                        <td data-label="TÀI KHOẢN NHÂN VIÊN">{user.code}</td>
                                        <td data-label="BỘ PHẬN">{user.departmentShort}</td>
                                        <td data-label="VAI TRÒ"><span className={`${styles.roleBadge} ${user.roleClass}`}>{user.roleBadge}</span></td>
                                        <td data-label="TRẠNG THÁI"><span className={`${styles.statusBadge} ${user.statusClass}`}><i className="bi bi-circle-fill"></i> {user.statusLabel}</span></td>
                                        <td data-label="THAO TÁC" className={styles.actionCell}>
                                            <button
                                                type="button"
                                                className={styles.btnAction}
                                                onClick={(e) => toggleActionMenu(e, user.id)}
                                                aria-label={`Mở thao tác cho ${user.name}`}
                                                aria-expanded={activeMenuId === user.id}
                                                aria-haspopup="menu"
                                            >
                                                <i className="bi bi-three-dots-vertical"></i>
                                            </button>

                                            {activeMenuId === user.id && (
                                                <div role="menu" className={`${styles.actionMenu} ${index >= Math.max(paginatedUsers.length - 2, 2) ? styles.actionMenuUp : ''}`}>
                                                    <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={(e) => handleViewInfo(e, user)}>
                                                        <i className="bi bi-eye"></i> Xem thông tin chi tiết
                                                    </button>
                                                    {user.roles && user.roles.some(r => r === 'STAFF' || r === 'ROLE_STAFF') && (
                                                        <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={(e) => handleAssignPermissions(e, user.id)}>
                                                            <i className="bi bi-shield-lock"></i> Phân quyền chức năng
                                                        </button>
                                                    )}
                                                    <button type="button" role="menuitem" className={`${styles.actionMenuItem} ${user.status === 'APPROVED' ? styles.actionMenuItemDanger : styles.actionMenuItemSuccess}`} onClick={(e) => openConfirmModal(e, user)}>
                                                        <i className={`bi ${user.status === 'APPROVED' ? 'bi-lock' : 'bi-unlock'}`}></i>
                                                        {user.status === 'APPROVED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    </div>

                    <Pagination
                        page={currentPage - 1}
                        totalPages={totalPages}
                        totalElements={totalItems}
                        size={pageSize}
                        onPageChange={(p) => setCurrentPage(p + 1)}
                        onSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
                    />
                </div>
            </div>

            <EmployeeDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveUser}
                user={selectedUser}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.isLocking ? "Xác nhận khóa tài khoản" : "Xác nhận mở khóa tài khoản"}
                message={confirmModal.isLocking ? `Bạn chắc chắn muốn khóa tài khoản ${confirmModal.user?.name}?` : `Bạn chắc chắn muốn mở khóa tài khoản ${confirmModal.user?.name}?`}
                onConfirm={executeToggleLock}
                onCancel={() => setConfirmModal({ isOpen: false, user: null, isLocking: false })}
                confirmText={confirmModal.isLocking ? "Khóa" : "Mở khóa"}
                cancelText="Hủy"
                isDanger={confirmModal.isLocking}
            />
        </SuperAdminLayout>
    );
}

export default UsersPage;
