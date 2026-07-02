import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CustomerQuickCreateDrawer from './components/CustomerQuickCreateDrawer';
import Modal from '../../components/ui/Modal/Modal';
import { searchCustomers, deactivateCustomer, updateCustomer } from '../../api/customerApi';
import { exportToExcel } from '../../utils/excelExport';
import styles from './CustomerListPage.module.css';

const CustomerListPage = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [keywordSearch, setKeywordSearch] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, action: '' });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;

    // Debounce search
    const debounceRef = useRef(null);

    const handleExport = () => {
        const headers = ['Mã khách hàng', 'Tên khách hàng', 'Địa chỉ', 'Mã số thuế', 'Số điện thoại', 'Trạng thái', 'Đơn hàng cuối'];
        const data = customers.map(item => [
            item.code,
            item.name,
            item.address || '',
            item.taxCode || '',
            item.phone,
            item.status === 'APPROVED' ? 'Đang hoạt động' : 'Ngừng hoạt động',
            item.lastOrder || ''
        ]);
        exportToExcel(headers, data, 'Danh_sach_khach_hang');
    };

    const fetchCustomers = useCallback(async (keyword = '', currentPage = 0) => {
        try {
            setLoading(true);
            const response = await searchCustomers(keyword, currentPage, PAGE_SIZE);
            const payload = response.data?.data ?? response.data;
            if (payload) {
                setCustomers(payload.content || []);
                setTotalPages(payload.totalPages || 0);
                setTotalElements(payload.totalElements || 0);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách khách hàng:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(() => fetchCustomers('', 0));
    }, [fetchCustomers]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setKeywordSearch(value);
        setPage(0);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchCustomers(value, 0);
        }, 400);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchCustomers(keywordSearch, newPage);
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
            } else {
                // If backend supports activating, update status or just call updateCustomer
                // Since there's no activateCustomer, we use updateCustomer
                const payload = {
                    name: confirmModal.customer.name,
                    phone: confirmModal.customer.phone,
                    email: confirmModal.customer.email,
                    address: confirmModal.customer.address,
                    groupType: confirmModal.customer.groupType,
                    status: 'APPROVED' // set active status
                };
                // wait, let's just toggle status via update
                await updateCustomer(confirmModal.customer.id, payload);
            }
            fetchCustomers(keywordSearch, page);
        } catch (error) {
            console.error('Lỗi thay đổi trạng thái khách hàng:', error);
        } finally {
            setConfirmModal({ isOpen: false, customer: null, action: '' });
            setLoading(false);
        }
    };

    const handleSavedSuccess = () => {
        setIsDrawerOpen(false);
        fetchCustomers(keywordSearch, page);
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
                            <div className={styles.dropdownBtn}>
                                Thực hiện hàng loạt <i className="fas fa-chevron-down"></i>
                            </div>
                            <div className={styles.filterBtn}>
                                <i className="fas fa-filter"></i> Lọc
                            </div>
                        </div>
                        <div className={styles.toolbarRight}>
                            <div className={styles.searchBox}>
                                <i className="fas fa-search"></i>
                                <input
                                    id="input-search"
                                    type="text"
                                    placeholder="Tìm kiếm"
                                    value={keywordSearch}
                                    onChange={handleSearchChange}
                                    autoComplete="off"
                                />
                            </div>
                            <button className={styles.iconBtn} title="Tải lại" onClick={() => fetchCustomers(keywordSearch, page)}>
                                <i className="fas fa-sync-alt"></i>
                            </button>
                            <button className={styles.iconBtn} title="In">
                                <i className="fas fa-print"></i>
                            </button>
                            <button className={styles.iconBtn} title="Cài đặt">
                                <i className="fas fa-cog"></i>
                            </button>
                            <button className={styles.iconBtn} title="Xuất Excel" onClick={handleExport}>
                                <i className="fas fa-file-excel"></i>
                            </button>
                            <button className={styles.btnImport} title="Nhập dữ liệu từ Excel">
                                <i className="fas fa-file-import"></i> Nhập từ Excel
                            </button>
                            <button id="btn-add-customer" className={styles.btnAdd} onClick={() => setIsDrawerOpen(true)}>
                                <i className="fas fa-plus"></i> Thêm
                            </button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                        <input type="checkbox" className={styles.checkbox} />
                                    </th>
                                    <th>MÃ KHÁCH HÀNG</th>
                                    <th>TÊN KHÁCH HÀNG</th>
                                    <th>ĐỊA CHỈ</th>
                                    <th>MÃ SỐ THUẾ</th>
                                    <th>SỐ ĐIỆN THOẠI</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>ĐƠN HÀNG CUỐI</th>
                                    <th style={{ textAlign: 'center' }}>CHỨC NĂNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="9" className={styles.emptyRow}>Đang tải dữ liệu...</td></tr>
                                ) : customers.length === 0 ? (
                                    <tr><td colSpan="9" className={styles.emptyRow}>Chưa có dữ liệu.</td></tr>
                                ) : customers.map((item) => (
                                    <tr key={item.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input type="checkbox" className={styles.checkbox} />
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
                                        <td>{item.taxCode || '---'}</td>
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
                onSaved={handleSavedSuccess}
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
