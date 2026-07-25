import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CustomerModal from './components/CustomerModal';
import CustomerImportModal from './components/CustomerImportModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { searchCustomers, deactivateCustomer, activateCustomer, exportCustomersToExcel } from '../../api/customerApi';
import styles from './CustomerListPage.module.css';

const STATUS_LABELS = {
    APPROVED: { label: 'Đang hoạt động', code: 'success' },
    INACTIVE: { label: 'Ngừng hoạt động', code: 'danger' },
};

const GROUP_LABELS = {
    RETAIL: 'Khách lẻ',
    WHOLESALE: 'Khách thợ',
    DISTRIBUTOR: 'Đại lý'
};

const CustomerListPage = () => {
    const navigate = useNavigate();
    
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters and Pagination
    const [filters, setFilters] = useState({ search: '', status: '', groupType: '' });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    
    // Selection
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Modals & Toast
    const [modalConfig, setModalConfig] = useState({ isOpen: false, data: null });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, action: '' });

    const debounceRef = useRef(null);

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchCustomers = useCallback(async (currentFilters = filters, currentPage = page, currentSize = pageSize) => {
        try {
            setLoading(true);
            // API expects 0-indexed page
            const apiPage = Math.max(0, currentPage - 1);
            const response = await searchCustomers(
                currentFilters.search, 
                currentFilters.status, 
                currentFilters.groupType, 
                apiPage, 
                currentSize
            );
            const payload = response.data?.data ?? response.data;
            if (payload) {
                setCustomers(payload.content || []);
                setTotalPages(payload.totalPages || 0);
                setTotalElements(payload.totalElements || 0);
            }
            setSelectedIds([]);
        } catch (error) {
            console.error('Lỗi tải danh sách khách hàng:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    }, [filters, page, pageSize]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setFilters(prev => ({ ...prev, search: value }));
        setPage(1);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            await exportCustomersToExcel(
                { keyword: filters.search, status: filters.status, groupType: filters.groupType }, 
                selectedIds
            );
            showToast('success', 'Đã xuất Excel thành công.');
        } catch (err) {
            showToast('error', 'Có lỗi xảy ra khi xuất Excel.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? customers.map(row => row.id) : []);
    };

    const handleSelectRow = (e, id) => {
        e.stopPropagation();
        setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
    };

    const handleToggleStatus = (e, customer) => {
        e.stopPropagation();
        const action = customer.status === 'APPROVED' ? 'vô hiệu hóa' : 'kích hoạt';
        setConfirmModal({ isOpen: true, customer, action });
    };

    const executeToggleStatus = async () => {
        if (!confirmModal.customer) return;
        try {
            if (confirmModal.customer.status === 'APPROVED') {
                await deactivateCustomer(confirmModal.customer.id);
                showToast('success', `Đã vô hiệu hóa khách hàng "${confirmModal.customer.name}".`);
            } else {
                await activateCustomer(confirmModal.customer.id);
                showToast('success', `Đã kích hoạt lại khách hàng "${confirmModal.customer.name}".`);
            }
            fetchCustomers();
        } catch (error) {
            const msg = error.response?.data?.userMessage || 'Có lỗi xảy ra. Vui lòng thử lại.';
            showToast('error', msg);
        } finally {
            setConfirmModal({ isOpen: false, customer: null, action: '' });
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 3) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
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
                    <h1 className={styles.pageTitle}>Danh sách khách hàng</h1>
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
                                placeholder="Tên, mã, SĐT khách hàng..."
                                value={filters.search}
                                onChange={handleSearchChange}
                                onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
                            />
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                <option value="APPROVED">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </select>
                        </div>
                        <div className={styles.filterField}>
                            <span className={styles.filterLabel}>NHÓM KHÁCH</span>
                            <select
                                className={styles.filterSelect}
                                value={filters.groupType}
                                onChange={(e) => handleFilterChange('groupType', e.target.value)}
                            >
                                <option value="">Tất cả</option>
                                <option value="RETAIL">Khách lẻ</option>
                                <option value="WHOLESALE">Khách thợ</option>
                                <option value="DISTRIBUTOR">Đại lý</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => { setFilters({ search: '', status: '', groupType: '' }); setPage(1); }}
                            title="Đặt lại bộ lọc"
                        >
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setIsImportModalOpen(true)}
                            title="Nhập Excel"
                        >
                            <i className="bi bi-file-earmark-arrow-up"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={handleExport}
                            title="Xuất tệp Excel"
                        >
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                        <button className={styles.btnPrimary} onClick={() => fetchCustomers()}>
                            <i className="bi bi-funnel"></i> Lọc dữ liệu
                        </button>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className={styles.bulkActionsToolbar}>
                        <div className={styles.bulkText}>Đã chọn {selectedIds.length} khách hàng</div>
                    </div>
                )}

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        className={styles.checkbox} 
                                        checked={customers.length > 0 && selectedIds.length === customers.length} 
                                        onChange={handleSelectAll} 
                                    />
                                </th>
                                <th style={{ width: '150px' }}>Mã Khách Hàng</th>
                                <th style={{ minWidth: '200px' }}>Tên Khách Hàng</th>
                                <th style={{ width: '130px' }}>Nhóm</th>
                                <th style={{ width: '130px' }}>Điện Thoại</th>
                                <th style={{ minWidth: '200px' }}>Địa Chỉ</th>
                                <th style={{ width: '140px' }}>Trạng Thái</th>
                                <th className={styles.textCenter} style={{ width: '120px' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && customers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className={styles.textCenter} style={{ padding: '40px' }}>
                                        <div className={styles.emptyState}>Đang tải dữ liệu...</div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan="8">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>Không tìm thấy khách hàng nào</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customers.map(item => {
                                    const status = STATUS_LABELS[item.status] || { label: item.status || 'Không rõ', code: 'info' };
                                    return (
                                        <tr key={item.id} onClick={() => navigate(`/customers/${item.id}`)}>
                                            <td style={{ textAlign: 'center' }}>
                                                <input 
                                                    type="checkbox" 
                                                    className={styles.checkbox} 
                                                    checked={selectedIds.includes(item.id)} 
                                                    onChange={(e) => handleSelectRow(e, item.id)} 
                                                    onClick={(e) => e.stopPropagation()} 
                                                />
                                            </td>
                                            <td className={styles.textBlue} style={{ whiteSpace: 'nowrap' }}>{item.code}</td>
                                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                                            <td>{GROUP_LABELS[item.groupType] || item.groupType}</td>
                                            <td>{item.phone || '---'}</td>
                                            <td>
                                                <div className={styles.tooltipContainer} style={{ display: 'inline-block', maxWidth: '100%' }}>
                                                    <span className={styles.noteText}>{item.address || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có</span>}</span>
                                                    {item.address && <span className={styles.tooltipText}>{item.address}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.badge} ${status.code === 'success' ? styles.badgeSuccess : styles.badgeDanger}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }}>
                                                <i 
                                                    className="bi bi-eye" 
                                                    style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }} 
                                                    title="Xem chi tiết" 
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/customers/${item.id}`); }}
                                                ></i>
                                                <i 
                                                    className="bi bi-pencil" 
                                                    style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }} 
                                                    title="Chỉnh sửa" 
                                                    onClick={(e) => { e.stopPropagation(); setModalConfig({ isOpen: true, data: item }); }}
                                                ></i>
                                                {item.status === 'APPROVED' ? (
                                                    <i 
                                                        className="bi bi-slash-circle" 
                                                        style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }} 
                                                        title="Vô hiệu hóa" 
                                                        onClick={(e) => handleToggleStatus(e, item)}
                                                    ></i>
                                                ) : (
                                                    <i 
                                                        className="bi bi-check2-circle" 
                                                        style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px' }} 
                                                        title="Kích hoạt lại" 
                                                        onClick={(e) => handleToggleStatus(e, item)}
                                                    ></i>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
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
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
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
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className={styles.pageBtn}
                                >
                                    <i className="bi bi-chevron-left"></i>
                                    <span>Trước</span>
                                </button>

                                <div className={styles.paginationNumbers}>
                                    {getPageNumbers().map((num, idx) => (
                                        num === page ? (
                                            <input
                                                key={idx}
                                                className={`${styles.pageNumber} ${styles.active}`}
                                                style={{ width: '36px', textAlign: 'center', padding: '0', border: 'none', outline: 'none', fontWeight: 'bold' }}
                                                defaultValue={num}
                                                title="Nhập số trang và nhấn Enter"
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
                                                className={`${styles.pageNumber} ${num === '...' ? styles.dots : ''}`}
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
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CustomerModal
                isOpen={modalConfig.isOpen}
                editData={modalConfig.data}
                onClose={() => setModalConfig({ isOpen: false, data: null })}
                onSaved={(isEdit, isContinue) => {
                    showToast('success', isEdit ? 'Cập nhật khách hàng thành công!' : 'Thêm mới khách hàng thành công!');
                    fetchCustomers();
                    if (!isContinue) setModalConfig({ isOpen: false, data: null });
                }}
            />

            <CustomerImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => fetchCustomers()}
                showToast={(type, title, msg) => showToast(type, msg || title)}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={`Xác nhận ${confirmModal.action}`}
                message={<span>Bạn có chắc chắn muốn {confirmModal.action} khách hàng <strong>{confirmModal.customer?.name}</strong> {confirmModal.customer?.code ? `(${confirmModal.customer.code})` : ''} không?</span>}
                onConfirm={executeToggleStatus}
                onCancel={() => setConfirmModal({ isOpen: false, customer: null, action: '' })}
                confirmText="Đồng ý"
                cancelText="Hủy"
                confirmButtonClass={confirmModal.action === 'vô hiệu hóa' ? 'btn-misa-danger' : 'btn-misa-primary'}
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default CustomerListPage;
