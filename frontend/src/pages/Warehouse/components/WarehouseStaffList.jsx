 
import { useState, useEffect } from 'react';
import warehouseStaffApi from '../../../api/warehouseStaffApi';
import AssignStaffModal from './AssignStaffModal';
import Toast from '../../../components/ui/Toast/Toast';
import styles from './WarehouseStaffList.module.css';

const WarehouseStaffList = ({ warehouseId }) => {
    const [staffs, setStaffs] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [roleId, setRoleId] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    // UI state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    const fetchRoles = async () => {
        try {
            const res = await warehouseStaffApi.getWarehouseRoles();
            setRoles(res.data.data || []);
        } catch (error) {
            console.error('Lỗi tải danh sách vai trò:', error);
        }
    };

    const fetchStaffs = async (pageIndex = 0) => {
        setLoading(true);
        try {
            const params = {
                page: pageIndex,
                size: 10,
                isActive: showInactive ? null : true
            };
            if (search) params.search = search;
            if (roleId) params.roleId = roleId;
            
            const res = await warehouseStaffApi.getStaffList(warehouseId, params);
            setStaffs(res.data.data.content || []);
            setTotalPages(res.data.data.totalPages || 0);
            setPage(pageIndex);
        } catch (error) {
            console.error('Lỗi tải danh sách nhân sự:', error);
            showToast('error', 'Không thể tải danh sách nhân sự.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        fetchStaffs(0);
         
    }, [warehouseId, showInactive, roleId, search]);

    const handleRevoke = async (userId) => {
        if (!window.confirm('Bạn có chắc chắn muốn thu hồi quyền của nhân viên này tại kho?')) return;
        
        try {
            await warehouseStaffApi.revokeAccess(warehouseId, userId);
            showToast('success', 'Thu hồi quyền thành công!');
            fetchStaffs(page);
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra!');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <input 
                        type="text" 
                        placeholder="Tìm theo tên hoặc email..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                    <select 
                        value={roleId} 
                        onChange={(e) => setRoleId(e.target.value)}
                        className={styles.roleSelect}
                    >
                        <option value="">-- Tất cả vai trò --</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                    <label className={styles.checkboxLabel}>
                        <input 
                            type="checkbox" 
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                        />
                        Hiển thị cả nhân sự ngừng hoạt động
                    </label>
                </div>
                <button className={styles.btnAssign} onClick={() => setIsAssignModalOpen(true)}>
                    <i className="fas fa-user-plus"></i> Gán quyền nhân sự
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Đang tải dữ liệu...</div>
                ) : staffs.length === 0 ? (
                    <div className={styles.empty}>Không có nhân sự nào trong kho.</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Nhân viên</th>
                                <th>Email</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffs.map(staff => (
                                <tr key={staff.userId} className={!staff.isActive ? styles.inactiveRow : ''}>
                                    <td>{staff.fullName}</td>
                                    <td>{staff.email}</td>
                                    <td>
                                        <div className={styles.rolesList}>
                                            {staff.roles.map(r => (
                                                <span key={r.id} className={styles.roleBadge}>{r.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${staff.isActive ? styles.active : styles.inactive}`}>
                                            {staff.isActive ? 'Đang hoạt động' : 'Đã thu hồi'}
                                        </span>
                                    </td>
                                    <td>
                                        {staff.isActive && (
                                            <button 
                                                className={styles.btnRevoke}
                                                onClick={() => handleRevoke(staff.userId)}
                                                title="Thu hồi quyền"
                                            >
                                                <i className="fas fa-user-times"></i>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button 
                        disabled={page === 0} 
                        onClick={() => fetchStaffs(page - 1)}
                        className={styles.pageBtn}
                    >
                        Trước
                    </button>
                    <span className={styles.pageInfo}>Trang {page + 1} / {totalPages}</span>
                    <button 
                        disabled={page >= totalPages - 1} 
                        onClick={() => fetchStaffs(page + 1)}
                        className={styles.pageBtn}
                    >
                        Sau
                    </button>
                </div>
            )}

            {isAssignModalOpen && (
                <AssignStaffModal 
                    warehouseId={warehouseId}
                    roles={roles}
                    onClose={() => setIsAssignModalOpen(false)}
                    onSuccess={() => {
                        setIsAssignModalOpen(false);
                        showToast('success', 'Gán quyền thành công!');
                        fetchStaffs(page);
                    }}
                />
            )}

            <Toast 
                isVisible={toast.isVisible}
                type={toast.type}
                message={toast.message}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />
        </div>
    );
};

export default WarehouseStaffList;
