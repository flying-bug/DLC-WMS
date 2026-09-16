import { useState, useEffect } from 'react';
import warehouseStaffApi from '../../../api/warehouseStaffApi';
import AssignStaffModal from './AssignStaffModal';
import Toast from '../../../components/ui/Toast/Toast';
import styles from './WarehouseStaffList.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../../components/ui/Pagination/Pagination';


const WarehouseStaffList = ({ warehouseId }) => {
    const [staffs, setStaffs] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [roleId, setRoleId] = useState('');
    
    // Pagination (0-indexed backend, 1-indexed frontend)
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    
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

    const fetchStaffs = async (pageIndex = 1, currentSize = pageSize) => {
        setLoading(true);
        try {
            const params = {
                page: pageIndex - 1,
                size: currentSize,
                isActive: true
            };
            if (search) params.search = search;
            if (roleId) params.roleId = roleId;
            
            const res = await warehouseStaffApi.getStaffList(warehouseId, params);
            const payload = res.data.data;
            const totalItems = payload.totalElements || 0;
            setStaffs(payload.content || []);
            setTotalPages(Math.max(1, Math.ceil(totalItems / currentSize)));
            setTotalItems(totalItems);
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
        fetchStaffs(page, pageSize);
    }, [warehouseId, roleId, search, pageSize, page]);

    const handleRevoke = async (userId) => {
        if (!window.confirm('Bạn có chắc chắn muốn thu hồi quyền của nhân viên này tại kho?')) return;
        
        try {
            await warehouseStaffApi.revokeAccess(warehouseId, userId);
            showToast('success', 'Thu hồi quyền thành công!');
            fetchStaffs(page, pageSize);
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra!');
        }
    };

    const handleRefresh = () => {
        setSearch('');
        setRoleId('');
        setPage(1);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {/* Filter Section */}
            <div className={styles.filterSection} style={{ marginBottom: '16px', border: 'none', padding: 0 }}>
                <div className={styles.filterGroup}>
                    <div className={styles.filterField}>
                        <input 
                            type="text" 
                            className={styles.filterInput} 
                            placeholder="Tên, email nhân viên..." 
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className={styles.filterField}>
                        <SearchableSelect 
                            className={styles.filterSelect}
                            value={roleId}
                            onChange={(e) => { setRoleId(e.target.value); setPage(1); }}
                        >
                            <option value="">Tất cả vai trò</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </SearchableSelect>
                    </div>
                </div>
                <div className={styles.filterActions}>
                    <button className={styles.btnOutline} onClick={handleRefresh}>
                        <i className="bi bi-arrow-repeat"></i> Làm mới
                    </button>
                    <button className={styles.btnPrimary} onClick={() => setIsAssignModalOpen(true)}>
                        <i className="bi bi-person-plus"></i> Thêm nhân sự kho
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nhân viên</th>
                            <th>Email</th>
                            <th>Vai trò</th>
                            <th style={{ width: '150px' }}>Trạng thái</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className={styles.emptyState}>
                                    <i className="bi bi-arrow-repeat" style={{ fontSize: '24px', color: 'var(--color-text-placeholder)', marginBottom: '8px', animation: 'spin 1s linear infinite', display: 'inline-block' }}></i>
                                    <div className={styles.emptyText}>Đang tải dữ liệu...</div>
                                </td>
                            </tr>
                        ) : staffs.length === 0 ? (
                            <tr>
                                <td colSpan="5" className={styles.emptyState}>
                                    <i className="bi bi-person-dash" style={{ fontSize: '48px', color: 'var(--wms-border-base)', marginBottom: '16px' }}></i>
                                    <div className={styles.emptyText}>Không có dữ liệu nhân sự phù hợp.</div>
                                </td>
                            </tr>
                        ) : (
                            staffs.map(staff => (
                                <tr key={staff.userId} className={!staff.isActive ? styles.inactiveRow : ''}>
                                    <td>
                                        <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{staff.fullName}</div>
                                    </td>
                                    <td>{staff.email}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {staff.roles.map(r => (
                                                <span key={r.id} className={styles.badge} style={{ backgroundColor: '#e0f2fe', color: 'var(--color-info-hover)', border: '1px solid #bae6fd' }}>
                                                    {r.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        {staff.isActive ? (
                                            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
                                                Đang hoạt động
                                            </span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeDanger}`}>
                                                Đã thu hồi
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {staff.isActive && (
                                            <button 
                                                className={styles.iconBtn}
                                                onClick={() => handleRevoke(staff.userId)}
                                                title="Thu hồi quyền"
                                                style={{ margin: '0 auto' }}
                                            >
                                                <i className="bi bi-person-x"></i>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && totalItems > 0 && (
                <Pagination
                    page={page - 1}
                    totalPages={Math.max(1, totalPages)}
                    totalElements={totalItems}
                    size={pageSize}
                    onPageChange={(p) => setPage(p + 1)}
                    onSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
                />
            )}

            {isAssignModalOpen && (
                <AssignStaffModal 
                    warehouseId={warehouseId}
                    roles={roles}
                    onClose={() => setIsAssignModalOpen(false)}
                    onSuccess={() => {
                        setIsAssignModalOpen(false);
                        showToast('success', 'Gán quyền thành công!');
                        fetchStaffs(page, pageSize);
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
