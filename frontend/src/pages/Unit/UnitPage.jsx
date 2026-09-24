import { useState, useEffect, useCallback } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import AdminLayout from '../../components/layout/AdminLayout';
import UnitModal from './components/UnitModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './UnitPage.module.css';
import axiosClient from '../../api/axiosClient';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import Pagination from '../../components/ui/Pagination/Pagination';
import ResponsiveTable from '../../components/ui/Table/ResponsiveTable';
import usePermissionGuard from '../../hooks/usePermissionGuard';
import useSessionState from '../../hooks/useSessionState';


const STATUS_LABELS = {
    ACTIVE: { label: 'Đang sử dụng', code: 'success' },
    APPROVED: { label: 'Đang sử dụng', code: 'success' },
    INACTIVE: { label: 'Ngừng sử dụng', code: 'danger' },
};

const isActiveStatus = (status) => status === 'ACTIVE' || status === 'APPROVED';

const UnitPage = () => {
    const [units, setUnits] = useState([]);
    const guard = usePermissionGuard();
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useSessionState('filters', { search: '', status: '' });
    const [currentPage, setCurrentPage] = useSessionState('currentPage', 1);
    const [pageSize, setPageSize] = useSessionState('pageSize', 10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, unit: null });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchUnits = useCallback(async ({ silent } = {}) => {
        try {
            if (!silent) setLoading(true);
            const params = {
                page: currentPage - 1,
                size: pageSize
            };
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status;
            
            const res = await axiosClient.get('/units', { params });
            const payload = res.data?.data ?? res.data;
            if (payload && payload.content) {
                const total = payload.totalElements ?? payload.content.length;
                setUnits(payload.content);
                setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
                setTotalElements(total);
            } else {
                const content = Array.isArray(payload) ? payload : [];
                setUnits(content);
                setTotalPages(1);
                setTotalElements(content.length);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách đơn vị tính:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách đơn vị tính');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [filters, currentPage, pageSize]);
  useRealtimeRefresh(['UNIT'], fetchUnits);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUnits();
        }, 300); // debounce
        return () => clearTimeout(timer);
    }, [fetchUnits]);

    const rows = units.map(item => {
        const status = STATUS_LABELS[item.status] || { label: item.status || 'Không rõ', code: 'info' };
        return {
            ...item,
            statusLabel: status.label,
            statusCode: status.code
        };
    });

    // Handle client-side pagination if backend returns unpaginated List (fallback)
    const displayRows = totalPages === 1 && totalElements > pageSize
        ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : rows;

    const handleExport = () => {
        const headers = ['Tên đơn vị tính', 'Mô tả', 'Trạng thái'];
        const data = rows.map(item => [
            item.name,
            item.description || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_don_vi_tinh');
        showToast('success', 'Xuất Excel thành công!');
    };

    const handleDeleteClick = (e, unit) => {
        e.stopPropagation();
        guard('unit:delete', () => setDeleteConfirm({ isOpen: true, unit }));
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        guard('unit:edit', () => setModalConfig({ isOpen: true, data: item }));
    };

    const handleToggleStatus = async (item) => {
        if (!guard('unit:edit')) return;
        const newStatus = isActiveStatus(item.status) ? 'INACTIVE' : 'ACTIVE';
        try {
            await axiosClient.put(`/units/` + item.id, { ...item, status: newStatus });
            showToast('success', 'Cập nhật trạng thái thành công!');
            fetchUnits();
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái:', error);
            showToast('error', error.response?.data?.userMessage || 'Không thể cập nhật trạng thái!');
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirm.unit) return;
        try {
            await axiosClient.delete(`/units/` + deleteConfirm.unit.id);
            showToast('success', 'Xóa thành công!');
            setDeleteConfirm({ isOpen: false, unit: null });
            if (rows.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else {
                fetchUnits();
            }
        } catch (error) {
            console.error('Lỗi xóa đơn vị tính:', error);
            showToast('error', error.response?.data?.userMessage || 'Không thể xóa đơn vị tính này!');
            setDeleteConfirm({ isOpen: false, unit: null });
        }
    };

    const onModalSave = (isEdit, isContinue) => {
        showToast('success', isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        fetchUnits();
        if (!isContinue) {
            setModalConfig({ isOpen: false, data: null });
        } else {
            setModalConfig({ isOpen: true, data: null });
        }
    };

    const onModalError = (msg) => {
        showToast('error', msg);
    };

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

    const tableColumns = [
        {
            title: 'Tên Đơn Vị Tính',
            width: '220px',
            render: (_, item) => <span style={{ fontWeight: 600 }}>{item.name}</span>
        },
        {
            title: 'Mô Tả',
            width: '180px',
            render: (_, item) => (
                <span className={styles.noteText}>
                    {item.description || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Không có ghi chú</span>}
                </span>
            )
        },
        {
            title: 'Trạng Thái',
            width: '140px',
            render: (_, item) => (
                <span className={`${styles.badge} ${item.statusCode === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                    {item.statusLabel}
                </span>
            )
        }
    ];

    const renderActions = (item) => (
        <div style={{ whiteSpace: 'nowrap' }}>
            <i 
                className="bi bi-pencil" 
                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                title="Chỉnh sửa" 
                onClick={(e) => handleEditClick(e, item)}
            ></i>
            {isActiveStatus(item.status) ? (
                <i 
                    className="bi bi-slash-circle" 
                    style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                    title="Vô hiệu hoá" 
                    onClick={() => handleToggleStatus(item)}
                ></i>
            ) : (
                <i 
                    className="bi bi-check2-circle" 
                    style={{ cursor: 'pointer', color: 'var(--color-success)', fontSize: '16px', marginRight: '12px' }} 
                    title="Kích hoạt" 
                    onClick={() => handleToggleStatus(item)}
                ></i>
            )}
            <i 
                className="bi bi-trash" 
                style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }} 
                title="Xóa ĐVT" 
                onClick={(e) => handleDeleteClick(e, item)}
            ></i>
        </div>
    );

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <h1 className={styles.pageTitle}>Đơn vị tính</h1>
                    <button className={styles.btnPrimary} onClick={() => guard('unit:add', () => setModalConfig({ isOpen: true, data: null }))}>
                        <i className="bi bi-plus"></i> Thêm mới
                    </button>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.filterGroup}>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌM KIẾM</span>
                            <input
                                type="text"
                                className={styles.filterInput}
                                placeholder="Tên ĐVT..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); fetchUnits(); } }}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                            <SearchableSelect
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value })); setCurrentPage(1); }}
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="ACTIVE">Đang sử dụng</option>
                                <option value="INACTIVE">Ngừng sử dụng</option>
                            </SearchableSelect>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setFilters({ search: '', status: '' }); setCurrentPage(1); setTimeout(fetchUnits, 0); }}
                            title="Đặt lại bộ lọc"
                        >
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={handleExport}
                            title="Xuất tệp Excel"
                        >
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <ResponsiveTable
                        columns={tableColumns}
                        data={displayRows}
                        loading={loading}
                        emptyMessage="Không tìm thấy đơn vị tính nào"
                        actions={renderActions}
                    />
                </div>
            </div>

            {modalConfig.isOpen && (
                <UnitModal 
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSaved={onModalSave}
                    onError={onModalError}
                    editData={modalConfig.data}
                />
            )}

            <ConfirmModal 
                isOpen={deleteConfirm.isOpen}
                onCancel={() => setDeleteConfirm({ isOpen: false, unit: null })}
                onConfirm={executeDelete}
                title="Xác nhận xoá"
                message={<>Bạn có chắc chắn muốn xoá đơn vị tính <b>{deleteConfirm.unit?.name}</b> không? Hành động này không thể hoàn tác.</>}
                confirmText="Xóa"
                isDanger
            />

            {toast.isVisible && (
                <Toast 
                    type={toast.type}
                    message={toast.message}
                    onClose={hideToast}
                />
            )}
        <Pagination
          page={currentPage - 1}
          totalPages={Math.max(1, totalPages)}
          totalElements={totalElements}
          size={pageSize}
          onPageChange={(page) => setCurrentPage(page + 1)}
          onSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
        </AdminLayout>
    );
};

export default UnitPage;
