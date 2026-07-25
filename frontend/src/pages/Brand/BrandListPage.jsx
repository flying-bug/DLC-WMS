import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import BrandModal from './components/BrandModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Modal from '../../components/ui/Modal/Modal';
import styles from './BrandListPage.module.css';

import axiosClient from '../../api/axiosClient';

const DEFAULT_COLUMNS = {
    code: true,
    name: true,
    hotline: true,
    contactEmail: true,
    description: true,
    status: true,
};

const COLUMN_OPTIONS = [
    { id: 'code', label: 'Mã Thương Hiệu' },
    { id: 'name', label: 'Tên Thương Hiệu' },
    { id: 'hotline', label: 'Điện Thoại' },
    { id: 'contactEmail', label: 'Email' },
    { id: 'description', label: 'Mô Tả' },
    { id: 'status', label: 'Trạng Thái' },
];

const STATUS_LABELS = {
    APPROVED: { label: 'Đang hoạt động', code: 'success' },
    INACTIVE: { label: 'Ngừng hoạt động', code: 'danger' },
};

const BrandListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, brand: null });

    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('dlc_brand_columns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const toggleColumn = (colId) => {
        setColumns(prev => {
            const next = { ...prev, [colId]: !prev[colId] };
            localStorage.setItem('dlc_brand_columns', JSON.stringify(next));
            return next;
        });
    };

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchBrands = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.search) params.search = filters.search;
            const res = await axiosClient.get('/brands', { params });
            let data = [];
            if (res.data && res.data.data) {
                data = res.data.data;
            }
            if (filters.status) {
                data = data.filter(b => b.status === filters.status);
            }
            setBrands(data);
            setSelectedIds([]);
        } catch (error) {
            console.error('Lỗi tải danh sách thương hiệu:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách thương hiệu');
        } finally {
            setLoading(false);
        }
    }, [filters.search, filters.status]);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    useEffect(() => {
        if (location.state?.toastMessage) {
            showToast(location.state.toastType || 'success', location.state.toastMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Derived data for table
    const rows = brands.map(item => {
        const status = STATUS_LABELS[item.status] || { label: item.status || 'Không rõ', code: 'info' };
        return {
            ...item,
            statusLabel: status.label,
            statusCode: status.code
        };
    });

    const totalItems = rows.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRows = rows.slice(startIndex, startIndex + pageSize);

    const handleExport = () => {
        const headers = ['Mã thương hiệu', 'Tên thương hiệu', 'Điện thoại', 'Email', 'Mô tả', 'Trạng thái'];
        const data = rows.map(item => [
            item.code,
            item.name,
            item.hotline || '',
            item.contactEmail || '',
            item.description || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_thuong_hieu');
        showToast('success', 'Xuất Excel thành công!');
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? paginatedRows.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleDeleteClick = (e, brand) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, brand });
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setModalConfig({
            isOpen: true,
            data: item
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.brand) return;
        try {
            await axiosClient.delete(`/brands/${deleteConfirm.brand.id}`);
            showToast('success', `Đã xóa thương hiệu ${deleteConfirm.brand.name}`);
            fetchBrands();
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi xóa thương hiệu');
            if (error.response?.status === 409) {
                // Refresh list if it was a soft delete conflict
                fetchBrands();
            }
        } finally {
            setDeleteConfirm({ isOpen: false, brand: null });
        }
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
                    <h1 className={styles.pageTitle}>Danh sách thương hiệu</h1>
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
                                placeholder="Mã hoặc tên thương hiệu..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && fetchBrands()}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="APPROVED">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setFilters({ search: '', status: '' }); setTimeout(fetchBrands, 0); }}
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
                        <button
                            className={styles.iconBtn}
                            onClick={() => setShowSettingsModal(true)}
                            title="Cấu hình hiển thị cột"
                        >
                            <i className="bi bi-gear"></i>
                        </button>
                        <button className={styles.btnPrimary} onClick={fetchBrands}>
                            <i className="bi bi-funnel"></i> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        className={styles.checkbox} 
                                        checked={paginatedRows.length > 0 && selectedIds.length === paginatedRows.length} 
                                        onChange={handleSelectAll} 
                                    />
                                </th>
                                {columns.code && <th style={{ width: '160px' }}>Mã Thương Hiệu</th>}
                                {columns.name && <th style={{ minWidth: '220px' }}>Tên Thương Hiệu</th>}
                                {columns.hotline && <th style={{ width: '150px' }}>Điện Thoại</th>}
                                {columns.contactEmail && <th style={{ width: '200px' }}>Email</th>}
                                {columns.description && <th style={{ minWidth: '150px' }}>Mô Tả</th>}
                                {columns.status && <th style={{ width: '140px' }}>Trạng Thái</th>}
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="8">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>Không tìm thấy thương hiệu nào</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map(item => (
                                    <tr key={item.id} onClick={() => navigate(`/brands/${item.id}`)} style={{ cursor: 'pointer' }}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                className={styles.checkbox} 
                                                checked={selectedIds.includes(item.id)} 
                                                onChange={(e) => handleSelectRow(e, item.id)} 
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                        </td>
                                        {columns.code && (
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <a
                                                    href="#"
                                                    className={styles.link}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        navigate(`/brands/${item.id}`);
                                                    }}
                                                >
                                                    {item.code}
                                                </a>
                                            </td>
                                        )}
                                        {columns.name && <td style={{ fontWeight: 600 }}>{item.name}</td>}
                                        {columns.hotline && <td>{item.hotline || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</td>}
                                        {columns.contactEmail && <td>{item.contactEmail || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</td>}
                                        {columns.description && (
                                            <td style={{ maxWidth: '180px' }}>
                                                <div className={styles.tooltipContainer}>
                                                    <span className={styles.noteText}>{item.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có ghi chú</span>}</span>
                                                    {item.description && <span className={styles.tooltipText}>{item.description}</span>}
                                                </div>
                                            </td>
                                        )}
                                        {columns.status && (
                                            <td>
                                                <span className={`${styles.badge} ${item.statusCode === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                                                    {item.statusLabel}
                                                </span>
                                            </td>
                                        )}
                                        <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                            <i 
                                                className="bi bi-eye" 
                                                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                                                title="Xem chi tiết" 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/brands/${item.id}`); }}
                                            ></i>
                                            <i 
                                                className="bi bi-pencil" 
                                                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                                                title="Chỉnh sửa" 
                                                onClick={(e) => handleEditClick(e, item)}
                                            ></i>
                                            <i 
                                                className="bi bi-trash" 
                                                style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }} 
                                                title="Xóa thương hiệu" 
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
                            <select
                                className="misa-select"
                                style={{ width: '70px', height: '32px', padding: '0 8px' }}
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>trên tổng số {totalItems} bản ghi</span>
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
                <BrandModal
                    initialData={modalConfig.data}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSave={async (data, isContinue = false) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;

                            const payload = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                status: data.status || 'APPROVED',
                                hotline: cleanString(data.hotline),
                                contactEmail: cleanString(data.contactEmail),
                                description: cleanString(data.description)
                            };
                            
                            if (modalConfig.data && modalConfig.data.id) {
                                await axiosClient.put(`/brands/${modalConfig.data.id}`, payload);
                                showToast('success', 'Cập nhật thương hiệu thành công!');
                                setModalConfig({ isOpen: false, data: null });
                            } else {
                                await axiosClient.post('/brands', payload);
                                showToast('success', 'Thêm mới thương hiệu thành công!');
                                if (!isContinue) {
                                    setModalConfig({ isOpen: false, data: null });
                                } else {
                                    // if isContinue, close and reopen to reset form
                                    setModalConfig({ isOpen: false, data: null });
                                    setTimeout(() => setModalConfig({ isOpen: true, data: null }), 100);
                                }
                            }
                            
                            fetchBrands();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra');
                        }
                    }}
                />
            )}

            <Modal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                ariaLabel="Thiết lập cột hiển thị"
            >
                <div className={styles.settingsModalHeader}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Thiết lập cột hiển thị</h3>
                    <button className={styles.iconBtn} style={{ border: 'none', background: 'none' }} onClick={() => setShowSettingsModal(false)}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className={styles.settingsModalBody} style={{ padding: '16px' }}>
                    <div className={styles.checkboxGrid} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {COLUMN_OPTIONS.map(col => (
                            <label key={col.id} className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={columns[col.id]}
                                    onChange={() => toggleColumn(col.id)}
                                />
                                <span className={styles.checkboxText}>{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="Xác nhận xóa"
                message={<span>Bạn có chắc chắn muốn xóa thương hiệu <strong>{deleteConfirm.brand?.name}</strong> {deleteConfirm.brand?.code ? `(${deleteConfirm.brand.code})` : ''} không? Hành động này không thể hoàn tác.</span>}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, brand: null })}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default BrandListPage;
