const fs = require('fs');

const content = \import { useState, useEffect } from 'react';
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
            console.error('L?i t?i danh sách vai trò:', error);
        }
    };

    const fetchStaffs = async (pageIndex = 1, currentSize = pageSize) => {
        setLoading(true);
        try {
            const params = {
                page: pageIndex - 1,
                size: currentSize,
                isActive: showInactive ? null : true
            };
            if (search) params.search = search;
            if (roleId) params.roleId = roleId;
            
            const res = await warehouseStaffApi.getStaffList(warehouseId, params);
            setStaffs(res.data.data.content || []);
            setTotalPages(res.data.data.totalPages || 0);
            setTotalItems(res.data.data.totalElements || 0);
            setPage(pageIndex);
        } catch (error) {
            console.error('L?i t?i danh sách nhân s?:', error);
            showToast('error', 'Không th? t?i danh sách nhân s?.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        fetchStaffs(1, pageSize);
    }, [warehouseId, showInactive, roleId, search, pageSize]);

    const handleRevoke = async (userId) => {
        if (!window.confirm('B?n có ch?c ch?n mu?n thu h?i quy?n c?a nhân viên này t?i kho?')) return;
        
        try {
            await warehouseStaffApi.revokeAccess(warehouseId, userId);
            showToast('success', 'Thu h?i quy?n thành công!');
            fetchStaffs(page, pageSize);
        } catch (error) {
            console.error(error);
            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có l?i x?y ra!');
        }
    };

    const handleRefresh = () => {
        setSearch('');
        setRoleId('');
        setShowInactive(false);
        setPage(1);
        fetchStaffs(1, pageSize);
    };

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(page - 1);
                pages.push(page);
                pages.push(page + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
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
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className={styles.filterField}>
                        <select 
                            className={styles.filterSelect}
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                        >
                            <option value="">T?t c? vai trò</option>
                            {roles.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.filterField} style={{ justifyContent: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151', height: '100%' }}>
                            <input 
                                type="checkbox" 
                                className={styles.checkbox}
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                            />
                            Hi?n th? c? nhân s? dã thu h?i
                        </label>
                    </div>
                </div>
                <div className={styles.filterActions}>
                    <button className={styles.btnOutline} onClick={handleRefresh}>
                        <i className="fas fa-sync-alt"></i> Làm m?i
                    </button>
                    <button className={styles.btnPrimary} onClick={() => setIsAssignModalOpen(true)}>
                        <i className="fas fa-user-plus"></i> Gán quy?n nhân s?
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer} style={{ flex: 1, minHeight: '300px', marginBottom: 0 }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Nhân viên</th>
                            <th>Email</th>
                            <th>Vai trò</th>
                            <th style={{ width: '150px' }}>Tr?ng thái</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className={styles.emptyState}>
                                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '8px' }}></i>
                                    <div className={styles.emptyText}>Ðang t?i d? li?u...</div>
                                </td>
                            </tr>
                        ) : staffs.length === 0 ? (
                            <tr>
                                <td colSpan="5" className={styles.emptyState}>
                                    <i className="fas fa-users-slash" style={{ fontSize: '48px', color: '#e2e8f0', marginBottom: '16px' }}></i>
                                    <div className={styles.emptyText}>Không có d? li?u nhân s? phù h?p.</div>
                                </td>
                            </tr>
                        ) : (
                            staffs.map(staff => (
                                <tr key={staff.userId} className={!staff.isActive ? styles.inactiveRow : ''}>
                                    <td>
                                        <div style={{ fontWeight: 500, color: '#111827' }}>{staff.fullName}</div>
                                    </td>
                                    <td>{staff.email}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {staff.roles.map(r => (
                                                <span key={r.id} className={styles.badge} style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
                                                    {r.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        {staff.isActive ? (
                                            <span className={${styles.badge} }>
                                                Ðang ho?t d?ng
                                            </span>
                                        ) : (
                                            <span className={${styles.badge} }>
                                                Ðã thu h?i
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        {staff.isActive && (
                                            <button 
                                                className={styles.iconBtn}
                                                onClick={() => handleRevoke(staff.userId)}
                                                title="Thu h?i quy?n"
                                                style={{ margin: '0 auto' }}
                                            >
                                                <i className="fas fa-user-times"></i>
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
                <div className={styles.pagination} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Hi?n th?</span>
                        <select 
                            className="misa-select" 
                            style={{ width: '70px', height: '32px', padding: '0 8px', border: '1px solid #d1d5db', borderRadius: '4px' }} 
                            value={pageSize} 
                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span>trên t?ng s? {totalItems} b?n ghi</span>
                    </div>
                    
                    {totalPages > 1 && (
                        <div className={styles.pageControls}>
                            <button 
                                disabled={page === 1} 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className={styles.pageBtn}
                            >
                                <i className="fas fa-chevron-left" style={{ fontSize: '10px' }}></i>
                                <span>Tru?c</span>
                            </button>
            
                            <div className={styles.paginationNumbers}>
                                {getPageNumbers().map((num, idx) => (
                                    num === page ? (
                                        <input
                                            key={idx}
                                            className={${styles.pageNumber} }
                                            style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                            defaultValue={num}
                                            title="Nh?p s? trang và nh?n Enter"
                                            onBlur={(e) => e.target.value = page}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    let p = parseInt(e.target.value, 10);
                                                    if (!isNaN(p)) {
                                                        p = Math.max(1, Math.min(totalPages, p));
                                                        setPage(p);
                                                        e.target.blur();
                                                    } else {
                                                        e.target.value = page;
                                                    }
                                                }
                                            }}
                                        />
                                    ) : (
                                        <span 
                                            key={idx} 
                                            className={${styles.pageNumber} }
                                            onClick={() => num !== '...' && setPage(num)}
                                        >
                                            {num}
                                        </span>
                                    )
                                ))}
                            </div>
            
                            <button 
                                disabled={page === totalPages} 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className={styles.pageBtn}
                            >
                                <span>Sau</span>
                                <i className="fas fa-chevron-right" style={{ fontSize: '10px' }}></i>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isAssignModalOpen && (
                <AssignStaffModal 
                    warehouseId={warehouseId}
                    roles={roles}
                    onClose={() => setIsAssignModalOpen(false)}
                    onSuccess={() => {
                        setIsAssignModalOpen(false);
                        showToast('success', 'Gán quy?n thành công!');
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
\;
fs.writeFileSync('d:/DLC-WMS/frontend/src/pages/Warehouse/components/WarehouseStaffList.jsx', content);
console.log('done');
