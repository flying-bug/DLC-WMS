import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import ProductCategoryModal from './components/ProductCategoryModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './ProductCategoryPage.module.css';

import axiosClient from '../../api/axiosClient';

const STATUS_LABELS = {
    APPROVED: { label: 'Đang sử dụng', code: 'success' },
    INACTIVE: { label: 'Ngừng sử dụng', code: 'danger' },
};

const ProductCategoryPage = () => {
    const [categories, setCategories] = useState([]);
    const [parentOptions, setParentOptions] = useState([]);
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
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, category: null });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchParentOptions = useCallback(async () => {
        try {
            const res = await axiosClient.get('/product-categories?page=0&size=1000');
            setParentOptions(res.data.content || []);
        } catch (error) {
            console.error('Lỗi tải danh sách danh mục cha:', error);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage - 1,
                size: pageSize
            };
            if (filters.search) params.search = filters.search;
            if (filters.status) params.status = filters.status; // Currently API doesn't filter by status, but we send it anyway

            const res = await axiosClient.get('/product-categories', { params });
            let data = res.data.content || [];

            // Client-side fallback filter for status if API doesn't support it
            if (filters.status) {
                data = data.filter(c => c.status === filters.status);
            }

            setCategories(data);
            setTotalPages(res.data.totalPages || 1);
            setTotalElements(res.data.totalElements || data.length);
        } catch (error) {
            console.error('Lỗi tải danh mục sản phẩm:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh mục sản phẩm');
        } finally {
            setLoading(false);
        }
    }, [filters, currentPage, pageSize]);

    useEffect(() => {
        fetchParentOptions();
    }, [fetchParentOptions]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCategories();
        }, 300); // debounce
        return () => clearTimeout(timer);
    }, [fetchCategories]);

    const rows = categories.map(item => {
        const status = STATUS_LABELS[item.status] || { label: item.status || 'Không rõ', code: 'info' };
        return {
            ...item,
            statusLabel: status.label,
            statusCode: status.code
        };
    });

    const handleExport = () => {
        const headers = ['Mã danh mục', 'Tên danh mục', 'Danh mục cha', 'Trạng thái'];
        const data = rows.map(item => [
            item.code,
            item.name,
            item.parentName || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_danh_muc_san_pham');
        showToast('success', 'Xuất Excel thành công!');
    };

    const handleDeleteClick = (e, category) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, category });
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setModalConfig({ isOpen: true, data: item });
    };

    const handleToggleStatus = async (item) => {
        const newStatus = item.status === 'APPROVED' ? 'INACTIVE' : 'APPROVED';
        try {
            await axiosClient.put(`/product-categories/` + item.id, {
                parentId: item.parentId || null,
                code: item.code,
                name: item.name,
                status: newStatus
            });
            showToast('success', 'Cập nhật trạng thái thành công!');
            fetchCategories();
            fetchParentOptions(); // Refresh parent options in case this category was a parent
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái:', error);
            showToast('error', error.response?.data?.userMessage || 'Không thể cập nhật trạng thái!');
        }
    };

    const executeDelete = async () => {
        if (!deleteConfirm.category) return;
        try {
            await axiosClient.delete(`/product-categories/` + deleteConfirm.category.id);
            showToast('success', 'Xóa thành công!');
            setDeleteConfirm({ isOpen: false, category: null });
            if (rows.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else {
                fetchCategories();
            }
            fetchParentOptions(); // Refresh parent options
        } catch (error) {
            console.error('Lỗi xóa danh mục:', error);
            showToast('error', error.response?.data?.userMessage || 'Không thể xóa danh mục này!');
            setDeleteConfirm({ isOpen: false, category: null });
        }
    };

    const onModalSave = (isEdit, isContinue) => {
        showToast('success', isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        fetchCategories();
        fetchParentOptions();
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
                    <h1 className={styles.pageTitle}>Danh mục sản phẩm</h1>
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
                                placeholder="Mã hoặc Tên danh mục..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setCurrentPage(1); fetchCategories(); } }}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value })); setCurrentPage(1); }}
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="APPROVED">Đang sử dụng</option>
                                <option value="INACTIVE">Ngừng sử dụng</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setFilters({ search: '', status: '' }); setCurrentPage(1); setTimeout(fetchCategories, 0); }}
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
                        <button className={styles.btnPrimary} onClick={() => { setCurrentPage(1); fetchCategories(); }}>
                            <i className="bi bi-funnel"></i> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '160px' }}>Mã Danh Mục</th>
                                <th style={{ minWidth: '220px' }}>Tên Danh Mục</th>
                                <th style={{ minWidth: '200px' }}>Mô Tả</th>
                                <th style={{ minWidth: '200px' }}>Danh Mục Cha</th>
                                <th style={{ width: '140px' }}>Trạng Thái</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && rows.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>Không tìm thấy danh mục nào</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className={styles.link}>{item.code}</span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        <td>
                                            <span className={styles.noteText} style={{ whiteSpace: 'pre-wrap' }}>
                                                {item.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>---</span>}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.noteText}>
                                                {item.parentName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có</span>}
                                            </span>
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
                                            {item.status === 'APPROVED' ? (
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
                                                title="Xóa danh mục"
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
                <ProductCategoryModal
                    isOpen={modalConfig.isOpen}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSaved={onModalSave}
                    onError={onModalError}
                    editData={modalConfig.data}
                    parentOptions={parentOptions}
                />
            )}

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, category: null })}
                onConfirm={executeDelete}
                title="Xác nhận xoá"
                message={<>Bạn có chắc chắn muốn xoá danh mục <b>{deleteConfirm.category?.name}</b> không? Hành động này không thể hoàn tác.</>}
                confirmText="Xóa"
                confirmStyle="danger"
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

export default ProductCategoryPage;
