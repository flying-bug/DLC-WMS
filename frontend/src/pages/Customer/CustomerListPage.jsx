import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CustomerQuickCreateDrawer from './components/CustomerQuickCreateDrawer';
import CustomerImportModal from './components/CustomerImportModal';
import Modal from '../../components/ui/Modal/Modal';
import Toast from '../../components/ui/Toast/Toast';
import { searchCustomers, deactivateCustomer, activateCustomer, exportCustomersToExcel } from '../../api/customerApi';
import styles from './CustomerListPage.module.css';

const CustomerListPage = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [keywordSearch, setKeywordSearch] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({ status: '', groupType: '' });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, action: '' });
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', title: '', message: '' });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const PAGE_SIZE = 10;

    const showToast = (type, title, message) => {
        setToast({ isVisible: true, type, title, message });
    };
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    // Debounce search
    const debounceRef = useRef(null);

    const handleExport = async () => {
        try {
            setLoading(true);
            await exportCustomersToExcel({ keyword: keywordSearch, ...filters }, Array.from(selectedIds));
            showToast('success', 'Thành công', 'Đã tải xuống file Excel.');
        } catch (err) {
            console.error(err);
            showToast('error', 'Lỗi', 'Có lỗi xảy ra khi xuất Excel.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const newSet = new Set(selectedIds);
            customers.forEach(item => newSet.add(item.id));
            setSelectedIds(newSet);
        } else {
            const newSet = new Set(selectedIds);
            customers.forEach(item => newSet.delete(item.id));
            setSelectedIds(newSet);
        }
    };

    const isAllCurrentPageSelected = customers.length > 0 && customers.every(item => selectedIds.has(item.id));

    const fetchCustomers = useCallback(async (keyword = keywordSearch, filterParams = filters, currentPage = page) => {
        try {
            setLoading(true);
            const response = await searchCustomers(keyword, filterParams.status, filterParams.groupType, currentPage, PAGE_SIZE);
            const payload = response.data?.data ?? response.data;
            if (payload) {
                setCustomers(payload.content || []);
                setTotalPages(payload.totalPages || 0);
                setTotalElements(payload.totalElements || 0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [keywordSearch, filters, page]);

    useEffect(() => {
        Promise.resolve().then(() => fetchCustomers(keywordSearch, filters, page));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, filters]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setKeywordSearch(value);
        setPage(0);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchCustomers(value, filters, 0);
        }, 400);
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(0);
    };

    const clearFilters = () => {
        setFilters({ status: '', groupType: '' });
        setPage(0);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    const handleToggleStatus = (customer) => {
        const action = customer.status === 'APPROVED' ? 'vô hiệu hóa' : 'kích hoạt';
        setConfirmModal({ isOpen: true, customer, action });
    };

    const executeToggleStatus = async () => {
        if (!confirmModal.customer) return;
        try {
            setLoading(true);
            if (confirmModal.customer.status === 'APPROVED') {
                await deactivateCustomer(confirmModal.customer.id);
                showToast('success', 'Thành công', `Đã vô hiệu hóa khách hàng "${confirmModal.customer.name}".`);
            } else {
                await activateCustomer(confirmModal.customer.id);
                showToast('success', 'Thành công', `Đã kích hoạt lại khách hàng "${confirmModal.customer.name}".`);
            }
            fetchCustomers(keywordSearch, page);
        } catch (error) {
            const msg = error.response?.data?.userMessage || 'Có lỗi xảy ra. Vui lòng thử lại.';
            showToast('error', 'Thao tác thất bại', msg);
        } finally {
            setConfirmModal({ isOpen: false, customer: null, action: '' });
            setLoading(false);
        }
    };

    const handleSavedSuccess = (isEdit) => {
        setIsDrawerOpen(false);
        fetchCustomers(keywordSearch, page);
        showToast('success', 'Thành công', isEdit ? 'Đã cập nhật thông tin khách hàng.' : 'Đã thêm khách hàng mới thành công.');
    };

    const startItem = page * PAGE_SIZE + 1;
    const endItem = Math.min((page + 1) * PAGE_SIZE, totalElements);

    return (
        <AdminLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <h2>Danh sách khách hàng</h2>
                    </div>
                </div>

                {/* Table Section */}
                <div className={styles.tableCard}>
                    {/* Toolbar */}
                    <div className={styles.tableToolbar}>
                        <div className={styles.toolbarLeft}>
                            <div
                                className={`${styles.filterBtn} ${isFilterOpen ? styles.activeFilter : ''}`}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <i className="fas fa-filter"></i> Lọc {Object.values(filters).some(x => x) && <span className={styles.filterDot}></span>}
                            </div>
                            <div className={styles.searchBox}>
                                <i className="fas fa-search"></i>
                                <input
                                    id="input-search"
                                    type="text"
                                    placeholder="Tìm theo tên, SĐT..."
                                    value={keywordSearch}
                                    onChange={handleSearchChange}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        <div className={styles.toolbarRight}>
                            <button className={styles.iconBtn} title="Tải lại" onClick={() => fetchCustomers(keywordSearch, page)}>
                                <i className="fas fa-sync-alt"></i>
                            </button>
                            <button className={styles.iconBtn} title="In" onClick={() => window.print()}>
                                <i className="fas fa-print"></i>
                            </button>
                            <button className={styles.iconBtn} title="Cài đặt">
                                <i className="fas fa-cog"></i>
                            </button>
                            <button className={styles.iconBtn} title="Xuất Excel" onClick={handleExport}>
                                <i className="fas fa-file-excel"></i>
                            </button>
                            <button className={styles.btnImport} title="Nhập dữ liệu từ Excel" onClick={() => setIsImportModalOpen(true)}>
                                <i className="fas fa-file-import"></i> Nhập từ Excel
                            </button>
                            <button id="btn-add-customer" className={styles.btnAdd} onClick={() => setIsDrawerOpen(true)}>
                                <i className="fas fa-plus"></i> Thêm
                            </button>
                        </div>
                    </div>

                    {/* Filter Panel (MISA Style) */}
                    {isFilterOpen && (
                        <div className={styles.filterPanel}>
                            <div className={styles.filterGroup}>
                                <label>Trạng thái</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                >
                                    <option value="">Tất cả</option>
                                    <option value="APPROVED">Đang hoạt động</option>
                                    <option value="INACTIVE">Ngừng hoạt động</option>
                                </select>
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Nhóm khách hàng</label>
                                <select
                                    value={filters.groupType}
                                    onChange={(e) => handleFilterChange('groupType', e.target.value)}
                                >
                                    <option value="">Tất cả</option>
                                    <option value="RETAIL">Khách lẻ</option>
                                    <option value="WHOLESALE">Khách thợ</option>
                                    <option value="DISTRIBUTOR">Đại lý</option>
                                </select>
                            </div>
                            <div className={styles.filterActions}>
                                <span className={styles.clearFilter} onClick={clearFilters}>Xóa bộ lọc</span>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input 
                                            type="checkbox" 
                                            className={styles.checkbox} 
                                            checked={isAllCurrentPageSelected}
                                            onChange={handleSelectAll}
                                        />
                                    </th>
                                    <th>MÃ KHÁCH HÀNG</th>
                                    <th>TÊN KHÁCH HÀNG</th>
                                    <th>ĐỊA CHỈ</th>
                                    <th>SỐ ĐIỆN THOẠI</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>ĐƠN HÀNG CUỐI</th>
                                    <th style={{ textAlign: 'center' }}>CHỨC NĂNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" className={styles.emptyRow}>Đang tải dữ liệu...</td></tr>
                                ) : customers.length === 0 ? (
                                    <tr><td colSpan="8" className={styles.emptyRow}>Chưa có dữ liệu.</td></tr>
                                ) : customers.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                className={styles.checkbox} 
                                                checked={selectedIds.has(item.id)}
                                                onChange={() => handleSelectRow(item.id)}
                                            />
                                        </td>
                                        <td className={styles.codeCell}>{item.code}</td>
                                        <td>
                                            <span
                                                className={styles.nameLink}
                                                onClick={() => navigate(`/customers/${item.id}`)}
                                                title="Xem chi tiết khách hàng"
                                            >
                                                {item.name}
                                            </span>
                                        </td>
                                        <td>{item.address || '---'}</td>
                                        <td>{item.phone}</td>
                                        <td>
                                            {item.status === 'APPROVED' ? (
                                                <div className={`${styles.statusBadge} ${styles.statusActive}`}>
                                                    <i className="far fa-check-circle"></i> Active
                                                </div>
                                            ) : (
                                                <div className={`${styles.statusBadge} ${styles.statusInactive}`}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <line x1="8" y1="12" x2="16" y2="12"></line>
                                                    </svg> Inactive
                                                </div>
                                            )}
                                        </td>
                                        <td>{item.lastOrder || '---'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.actionIconGroup}>
                                                <button
                                                    className={`${styles.actionIconBtn} ${styles.iconBtnView}`}
                                                    onClick={() => navigate(`/customers/${item.id}`)}
                                                    title="Xem chi tiết"
                                                >
                                                    <i className="far fa-eye"></i>
                                                </button>
                                                <div className={styles.actionDivider}></div>
                                                {item.status === 'APPROVED' ? (
                                                    <button
                                                        className={`${styles.actionIconBtn} ${styles.iconBtnDelete}`}
                                                        onClick={() => handleToggleStatus(item)}
                                                        title="Vô hiệu hóa"
                                                    >
                                                        <i className="far fa-times-circle"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={`${styles.actionIconBtn} ${styles.iconBtnActivate}`}
                                                        onClick={() => handleToggleStatus(item)}
                                                        title="Kích hoạt"
                                                    >
                                                        <i className="far fa-check-circle"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>
                            {totalElements > 0 ? `${startItem}-${endItem} của ${totalElements} khách hàng` : '0 khách hàng'}
                            <span className={styles.pageSize}>
                                Hiển thị
                                <select className={styles.pageSizeSelect} defaultValue={10}>
                                    <option value={10}>10 dòng / trang</option>
                                    <option value={20}>20 dòng / trang</option>
                                    <option value={50}>50 dòng / trang</option>
                                </select>
                            </span>
                        </div>
                        <div className={styles.pageControls}>
                            <div className={styles.pageNav}>
                                <button
                                    className={styles.pageNavBtn}
                                    disabled={page === 0}
                                    onClick={() => handlePageChange(page - 1)}
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i}
                                        className={`${styles.pageBtn} ${page === i ? styles.active : ''}`}
                                        onClick={() => handlePageChange(i)}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    className={styles.pageNavBtn}
                                    disabled={page >= totalPages - 1}
                                    onClick={() => handlePageChange(page + 1)}
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Drawer Tạo nhanh */}
            <CustomerQuickCreateDrawer
                isOpen={isDrawerOpen}
                editData={null}
                onClose={() => setIsDrawerOpen(false)}
                onSaved={(isEdit) => handleSavedSuccess(isEdit)}
                onError={(msg) => showToast('error', 'Lỗi', msg)}
            />

            <CustomerImportModal 
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => fetchCustomers(keywordSearch, page)}
                showToast={showToast}
            />

            {/* Toast Notification */}
            <Toast
                isVisible={toast.isVisible}
                type={toast.type}
                title={toast.title}
                message={toast.message}
                onClose={hideToast}
            />

            {/* Confirm Modal */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, customer: null, action: '' })}
            >
                <div className={styles.confirmModalContent}>
                    <div className={styles.confirmIcon}>
                        {confirmModal.action === 'vô hiệu hóa' ? (
                            <i className="fas fa-exclamation-circle" style={{ color: '#ef4444' }}></i>
                        ) : (
                            <i className="fas fa-question-circle" style={{ color: '#3b82f6' }}></i>
                        )}
                    </div>
                    <h3 className={styles.confirmTitle}>Xác nhận {confirmModal.action}</h3>
                    <p className={styles.confirmMessage}>
                        Bạn có chắc chắn muốn {confirmModal.action} khách hàng <strong>"{confirmModal.customer?.name}"</strong> không?
                    </p>
                    <div className={styles.confirmActions}>
                        <button
                            className={styles.btnCancel}
                            onClick={() => setConfirmModal({ isOpen: false, customer: null, action: '' })}
                        >
                            Hủy bỏ
                        </button>
                        <button
                            className={`${styles.btnConfirm} ${confirmModal.action === 'vô hiệu hóa' ? styles.btnConfirmDanger : ''}`}
                            onClick={executeToggleStatus}
                        >
                            Đồng ý
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default CustomerListPage;
