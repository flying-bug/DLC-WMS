 
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
            console.error('Lá»—i táº£i danh sÃ¡ch vai trÃ²:', error);
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
            console.error('Lá»—i táº£i danh sÃ¡ch nhÃ¢n sá»±:', error);
            showToast('error', 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch nhÃ¢n sá»±.');
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
        if (!window.confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n thu há»“i quyá»n cá»§a nhÃ¢n viÃªn nÃ y táº¡i kho?')) return;
        
        try {
            await warehouseStaffApi.revokeAccess(warehouseId, userId);
            showToast('success', 'Thu há»“i quyá»n thÃ nh cÃ´ng!');
            fetchStaffs(page);
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'CÃ³ lá»—i xáº£y ra!');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.filters}>
                    <input 
                        type="text" 
                        placeholder="TÃ¬m theo tÃªn hoáº·c email..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                    <select 
                        value={roleId} 
                        onChange={(e) => setRoleId(e.target.value)}
                        className={styles.roleSelect}
                    >
                        <option value="">-- Táº¥t cáº£ vai trÃ² --</option>
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
                        Hiá»ƒn thá»‹ cáº£ nhÃ¢n sá»± ngá»«ng hoáº¡t Ä‘á»™ng
                    </label>
                </div>
                <button className={styles.btnAssign} onClick={() => setIsAssignModalOpen(true)}>
                    <i className="fas fa-user-plus"></i> GÃ¡n quyá»n nhÃ¢n sá»±
                </button>
            </div>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Äang táº£i dá»¯ liá»‡u...</div>
                ) : staffs.length === 0 ? (
                    <div className={styles.empty}>KhÃ´ng cÃ³ nhÃ¢n sá»± nÃ o trong kho.</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>NhÃ¢n viÃªn</th>
                                <th>Email</th>
                                <th>Vai trÃ²</th>
                                <th>Tráº¡ng thÃ¡i</th>
                                <th>Thao tÃ¡c</th>
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
                                            {staff.isActive ? 'Äang hoáº¡t Ä‘á»™ng' : 'ÄÃ£ thu há»“i'}
                                        </span>
                                    </td>
                                    <td>
                                        {staff.isActive && (
                                            <button 
                                                className={styles.btnRevoke}
                                                onClick={() => handleRevoke(staff.userId)}
                                                title="Thu há»“i quyá»n"
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
                        TrÆ°á»›c
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
                        showToast('success', 'GÃ¡n quyá»n thÃ nh cÃ´ng!');
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
