import { useState, useEffect } from 'react';
import warehouseStaffApi from '../../../api/warehouseStaffApi';
import AssignStaffModal from './AssignStaffModal';
import Toast from '../../../components/ui/Toast/Toast';
import ResponsiveTable from '../../../components/ui/Table/ResponsiveTable';
import Pagination from '../../../components/ui/Pagination/Pagination';
import SearchFilter from '../../../components/ui/SearchFilter/SearchFilter';
import Button from '../../../components/ui/Button/Button';
import ConfirmModal from '../../../components/ui/ConfirmModal/ConfirmModal';
import styles from './WarehouseStaffList.module.css';

const WarehouseStaffList = ({ warehouseId }) => {
    const [staffs, setStaffs] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [filters, setFilters] = useState({
        search: '',
        roleId: '',
        showInactive: false
    });
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    // Pagination
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    
    // UI state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null });

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(filters.search);
        }, 400);
        return () => clearTimeout(timer);
    }, [filters.search]);

    const fetchRoles = async () => {
        try {
            const res = await warehouseStaffApi.getWarehouseRoles();
            setRoles(res.data.data || []);
        } catch (error) {
            console.error('Lỗi tải danh sách vai trò:', error);
        }
    };

    const fetchStaffs = async (pageIndex = 0, pageSize = size) => {
        setLoading(true);
        try {
            const params = {
                page: pageIndex,
                size: pageSize,
                isActive: filters.showInactive ? null : true
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filters.roleId) params.roleId = filters.roleId;
            
            const res = await warehouseStaffApi.getStaffList(warehouseId, params);
            setStaffs(res.data.data.content || []);
            setTotalPages(res.data.data.totalPages || 0);
            setTotalElements(res.data.data.totalElements || 0);
            setPage(pageIndex);
        } catch (error) {
            console.error('Lỗi tải danh sách nhân sự:', error);
            showToast('error', 'Không tải được danh sách nhân sự kho.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        fetchStaffs(0, size);
    }, [warehouseId, filters.showInactive, filters.roleId, debouncedSearch, size]);

    const handleRevoke = async () => {
        try {
            await warehouseStaffApi.revokeAccess(warehouseId, confirmModal.userId);
            showToast('success', 'Thu hồi quyền nhân sự thành công!');
            fetchStaffs(page, size);
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Không thể thu hồi quyền nhân sự!');
        } finally {
            setConfirmModal({ isOpen: false, userId: null });
        }
    };

    const columns = [
        { key: 'index', label: '#', width: '5%', align: 'center', render: (_, index) => page * size + index + 1 },
        { key: 'fullName', label: 'Tên nhân viên' },
        { key: 'email', label: 'Email' },
        { 
            key: 'roles', 
            label: 'Vai trò',
            render: (staff) => (
                <div className={styles.rolesList}>
                    {staff.roles?.map(r => (
                        <span key={r.id} className={styles.roleBadge}>{r.name}</span>
                    ))}
                </div>
            )
        },
        {
            key: 'status',
            label: 'Trạng thái',
            render: (staff) => (
                <span className={`${styles.statusBadge} ${staff.isActive ? styles.active : styles.inactive}`}>
                    {staff.isActive ? 'Đang hoạt động' : 'Đã thu hồi'}
                </span>
            )
        },
        {
            key: 'actions',
            label: 'Thao tác',
            align: 'center',
            width: '100px',
            render: (staff) => staff.isActive && (
                <div className={styles.actionButtons}>
                    <button
                        className={styles.iconBtnEdit}
                        onClick={() => {
                            setSelectedUserId(staff.userId);
                            setIsAssignModalOpen(true);
                        }}
                        title="Sửa phân quyền"
                    >
                        <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                        className={styles.iconBtnDanger}
                        onClick={() => setConfirmModal({ isOpen: true, userId: staff.userId })}
                        title="Thu hồi toàn bộ quyền"
                    >
                        <i className="bi bi-trash"></i>
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <SearchFilter onReset={() => setFilters({ search: '', roleId: '', showInactive: false })}>
                    <input 
                        type="text" 
                        className="misa-input" 
                        placeholder="Tìm theo tên hoặc email..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        style={{ width: '250px' }}
                    />
                    <select 
                        className="misa-select"
                        value={filters.roleId}
                        onChange={(e) => setFilters(prev => ({ ...prev, roleId: e.target.value }))}
                        style={{ width: '200px' }}
                    >
                        <option value="">-- Tất cả vai trò --</option>
                        {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#4b5563' }}>
                        <input 
                            type="checkbox" 
                            checked={filters.showInactive}
                            onChange={(e) => setFilters(prev => ({ ...prev, showInactive: e.target.checked }))}
                        />
                        Hiển thị cả nhân sự ngừng hoạt động
                    </label>
                </SearchFilter>
                
                <Button 
                    variant="primary" 
                    icon="bi bi-person-plus" 
                    onClick={() => {
                        setSelectedUserId(null);
                        setIsAssignModalOpen(true);
                    }}
                >
                    Thêm nhân sự
                </Button>
            </div>

            <ResponsiveTable 
                columns={columns}
                data={staffs}
                isLoading={loading}
                emptyMessage="Không có nhân sự nào trong kho."
                getRowClass={(staff) => !staff.isActive ? styles.inactiveRow : ''}
            />

            <Pagination 
                page={page}
                size={size}
                totalPages={totalPages}
                totalElements={totalElements}
                onPageChange={(p) => fetchStaffs(p, size)}
                onSizeChange={(s) => {
                    setSize(s);
                    fetchStaffs(0, s);
                }}
            />

            {isAssignModalOpen && (
                <AssignStaffModal 
                    warehouseId={warehouseId}
                    roles={roles}
                    userId={selectedUserId}
                    staffs={staffs}
                    onClose={() => {
                        setIsAssignModalOpen(false);
                        setSelectedUserId(null);
                    }}
                    onSuccess={() => {
                        setIsAssignModalOpen(false);
                        setSelectedUserId(null);
                        showToast('success', selectedUserId ? 'Cập nhật phân quyền thành công!' : 'Thêm nhân sự thành công!');
                        fetchStaffs(page, size);
                    }}
                />
            )}

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title="Xác nhận thu hồi quyền"
                message="Bạn có chắc chắn muốn thu hồi toàn bộ quyền của nhân viên này tại kho?"
                confirmText="Đồng ý thu hồi"
                cancelText="Hủy bỏ"
                onConfirm={handleRevoke}
                onCancel={() => setConfirmModal({ isOpen: false, userId: null })}
                type="danger"
            />

            <Toast 
                isVisible={toast.isVisible}
                type={toast.type}
                message={toast.message}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
};

export default WarehouseStaffList;
