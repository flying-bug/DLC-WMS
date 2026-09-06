import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import UnitModal from './components/UnitModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './UnitPage.module.css';

import axiosClient from '../../api/axiosClient';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const STATUS_LABELS = {
    ACTIVE: { label: 'Đang sử dụng', code: 'success' },
    INACTIVE: { label: 'Ngừng sử dụng', code: 'danger' },
};

const UnitPage = () => {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, unit: null });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchUnits = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage - 1,
                size: pageSize
            };
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status;
            
            const res = await axiosClient.get('/units', { params });
            if (res.data && res.data.content) {
                setUnits(res.data.content);
                setTotalPages(res.data.totalPages);
                setTotalElements(res.data.totalElements);
            } else {
                setUnits(res.data || []);
                setTotalPages(1);
                setTotalElements(res.data?.length || 0);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách đơn vị tính:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách đơn vị tính');
        } finally {
            setLoading(false);
        }
    }, [filters, currentPage, pageSize]);

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
        setDeleteConfirm({ isOpen: true, unit });
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setModalConfig({ isOpen: true, data: item });
    };

    const handleToggleStatus = async (item) => {
        const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
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

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <h1 className={styles.pageTitle}>Đơn vị tính</h1>
                    <button className={styles.btnPrimary} onClick={() => setModalConfig({ isOpen: true, data: null })}>
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
                        <button className={styles.btnPrimary} onClick={() => { setCurrentPage(1); fetchUnits(); }}>
                            <i className="bi bi-funnel"></i> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '220px' }}>Tên Đơn Vị Tính</th>
                                <th style={{ width: '180px' }}>Mô Tả</th>
                                <th style={{ width: '140px' }}>Trạng Thái</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && rows.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan="4">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>Không tìm thấy đơn vị tính nào</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        <td>
                                            <span className={styles.noteText}>{item.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có ghi chú</span>}</span>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${item.statusCode === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                                                {item.statusLabel}
                                            </span>
                                        </td>
                                        <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                            <i 
                                                className="bi bi-pencil" 
                                                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                                                title="Chỉnh sửa" 
                                                onClick={(e) => handleEditClick(e, item)}
                                            ></i>
                                            {item.status === 'ACTIVE' ? (
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className={styles.pagination}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Hiển thị</span>
                            <SearchableSelect
                                className="misa-select"
                                style={{ width: '70px', height: '32px', padding: '0 8px' }}
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </SearchableSelect>
                            <span>trên tổng số {totalElements} bản ghi</span>
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pageControls}>
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className={styles.pageBtn}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                    <span>Trước</span>
                                </button>

                                <div className={styles.paginationNumbers}>
                                    {getPageNumbers().map((num, idx) => (
                                        num === currentPage ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                title="Nhập số trang và nhấn Enter"
                                                onBlur={(e) => e.target.value = currentPage}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        let p = parseInt(e.target.value, 10);
                                                        if (!isNaN(p)) {
                                                            p = Math.max(1, Math.min(totalPages, p));
                                                            setCurrentPage(p);
                                                            e.target.blur();
                                                        } else {
                                                            e.target.value = currentPage;
                                                        }
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span
                                                key={idx}
                                                className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
                                                onClick={() => num !== '...' && setCurrentPage(num)}
                                            >
                                                {num}
                                            </span>
                                        )
                                    ))}
                                </div>

                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className={styles.pageBtn}
                                >
                                    <span>Sau</span>
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
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
        </AdminLayout>
    );
};

export default UnitPage;
