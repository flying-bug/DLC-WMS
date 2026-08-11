import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SupplierModal from './components/SupplierModal';
import { exportToExcel } from '../../utils/excelExport';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import styles from './SupplierListPage.module.css';

import axiosClient from '../../api/axiosClient';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const STATUS_LABELS = {
    APPROVED: { label: 'Đang hoạt động', code: 'success' },
    INACTIVE: { label: 'Ngừng hoạt động', code: 'danger' },
};

const SupplierListPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [suppliers, setSuppliers] = useState([]);
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
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, supplier: null });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchSuppliers = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (filters.search) params.search = filters.search;
            const res = await axiosClient.get('/suppliers', { params });
            let data = [];
            if (res.data && res.data.data) {
                data = res.data.data;
            }
            if (filters.status) {
                data = data.filter(s => s.status === filters.status);
            }
            setSuppliers(data);
            setSelectedIds([]);
        } catch (error) {
            console.error('Lỗi tải danh sách nhà cung cấp:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách nhà cung cấp');
        } finally {
            setLoading(false);
        }
    }, [filters.search, filters.status]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    useEffect(() => {
        if (location.state?.toastMessage) {
            showToast(location.state.toastType || 'success', location.state.toastMessage);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    // Derived data for table
    const rows = suppliers.map(item => {
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
        const headers = ['Mã nhà cung cấp', 'Tên nhà cung cấp', 'Mã số thuế', 'Địa chỉ', 'Trạng thái'];
        const data = rows.map(item => [
            item.code,
            item.name,
            item.taxCode || '',
            item.address || '',
            item.statusLabel
        ]);
        exportToExcel(headers, data, 'Danh_sach_nha_cung_cap');
        showToast('success', 'Xuất Excel thành công!');
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? paginatedRows.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleDeleteClick = (e, supplier) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, supplier });
    };

    const handleEditClick = (e, item) => {
        e.stopPropagation();
        setModalConfig({
            isOpen: true,
            data: item
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.supplier) return;
        try {
            await axiosClient.delete(`/suppliers/${deleteConfirm.supplier.id}`);
            showToast('success', `Đã xóa nhà cung cấp ${deleteConfirm.supplier.name}`);
            fetchSuppliers();
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi xóa nhà cung cấp');
            if (error.response?.status === 409) {
                // Refresh list if it was a soft delete conflict
                fetchSuppliers();
            }
        } finally {
            setDeleteConfirm({ isOpen: false, supplier: null });
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
                    <h1 className={styles.pageTitle}>Danh sách nhà cung cấp</h1>
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
                                placeholder="Mã hoặc tên nhà cung cấp..."
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers()}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                            <SearchableSelect
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="APPROVED">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </SearchableSelect>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setFilters({ search: '', status: '' }); setTimeout(fetchSuppliers, 0); }}
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
                        <button className={styles.btnPrimary} onClick={fetchSuppliers}>
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
                                <th style={{ width: '160px' }}>Mã NCC</th>
                                <th style={{ minWidth: '220px' }}>Tên Nhà Cung Cấp</th>
                                <th style={{ width: '140px' }}>Mã Số Thuế</th>
                                <th style={{ width: '250px' }}>Địa Chỉ</th>
                                <th style={{ width: '140px' }}>Trạng Thái</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>Không tìm thấy nhà cung cấp nào</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map(item => (
                                    <tr key={item.id} onClick={() => navigate(`/suppliers/${item.id}`)} style={{ cursor: 'pointer' }}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                className={styles.checkbox} 
                                                checked={selectedIds.includes(item.id)} 
                                                onChange={(e) => handleSelectRow(e, item.id)} 
                                                onClick={(e) => e.stopPropagation()} 
                                            />
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <a
                                                href="#"
                                                className={styles.link}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    navigate(`/suppliers/${item.id}`);
                                                }}
                                            >
                                                {item.code}
                                            </a>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        <td>{item.taxCode || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</td>
                                        <td style={{ maxWidth: '250px' }}>
                                            <div className={styles.tooltipContainer}>
                                                <span className={styles.noteText}>{item.address || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có địa chỉ</span>}</span>
                                                {item.address && <span className={styles.tooltipText}>{item.address}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${item.statusCode === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                                                {item.statusLabel}
                                            </span>
                                        </td>
                                        <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                            <i 
                                                className="bi bi-eye" 
                                                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                                                title="Xem chi tiết" 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${item.id}`); }}
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
                                                title="Xóa nhà cung cấp" 
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
                <SupplierModal
                    initialData={modalConfig.data}
                    onClose={() => setModalConfig({ isOpen: false, data: null })}
                    onSave={async (data, isContinue = false) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;

                            const payload = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                groupType: cleanString(data.groupType) || 'RETAIL',
                                taxCode: cleanString(data.taxCode),
                                phone: cleanString(data.phone),
                                email: cleanString(data.email),
                                address: cleanString(data.address),
                                contactName: cleanString(data.contactName),
                                bankName: cleanString(data.bankName),
                                bankAccountNumber: cleanString(data.bankAccountNumber),
                                bankBeneficiaryName: cleanString(data.bankBeneficiaryName),
                                status: data.status || 'APPROVED'
                            };
                            
                            if (modalConfig.data && modalConfig.data.id) {
                                await axiosClient.put(`/suppliers/${modalConfig.data.id}`, payload);
                                showToast('success', 'Cập nhật nhà cung cấp thành công!');
                                setModalConfig({ isOpen: false, data: null });
                            } else {
                                await axiosClient.post('/suppliers', payload);
                                showToast('success', 'Thêm mới nhà cung cấp thành công!');
                                if (!isContinue) {
                                    setModalConfig({ isOpen: false, data: null });
                                } else {
                                    setModalConfig({ isOpen: false, data: null });
                                    setTimeout(() => setModalConfig({ isOpen: true, data: null }), 100);
                                }
                            }
                            
                            fetchSuppliers();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || error.response?.data?.message || 'Có lỗi xảy ra');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="Xác nhận xóa"
                message={<span>Bạn có chắc chắn muốn xóa nhà cung cấp <strong>{deleteConfirm.supplier?.name}</strong> {deleteConfirm.supplier?.code ? `(${deleteConfirm.supplier.code})` : ''} không? Hành động này không thể hoàn tác.</span>}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, supplier: null })}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default SupplierListPage;
