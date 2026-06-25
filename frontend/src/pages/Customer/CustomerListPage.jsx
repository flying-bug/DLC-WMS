import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CustomerQuickCreateDrawer from './components/CustomerQuickCreateDrawer';
import Modal from '../../components/ui/Modal/Modal';
import { searchCustomers } from '../../api/customerApi';
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

    const fetchCustomers = useCallback(async (keyword = '', currentPage = 0) => {
        try {
            setLoading(true);

            // MOCK DATA START
            const mockCustomers = [
                { id: 1, code: 'KH00001', name: 'Ng Thu Uyên', address: '123 Lê Lợi, Q.1, TP.HCM', taxCode: '0123456789', phone: '0912 345 678', status: 'APPROVED', lastOrder: '2026-06-20' },
                { id: 2, code: 'KH00002', name: 'Công ty TNHH ABC', address: '456 Nguyễn Huệ, Q.1, TP.HCM', taxCode: '0987654321', phone: '0987 654 321', status: 'APPROVED', lastOrder: '2026-06-18' },
                { id: 3, code: 'KH00003', name: 'Trần Văn Bình', address: '789 Hai Bà Trưng, Q.3, TP.HCM', taxCode: '', phone: '0901 234 567', status: 'INACTIVE', lastOrder: '2026-05-12' },
                { id: 4, code: 'KH00004', name: 'Công ty CP XYZ', address: '321 Võ Văn Tần, Q.3, TP.HCM', taxCode: '1122334455', phone: '0938 765 432', status: 'APPROVED', lastOrder: '2026-06-22' },
                { id: 5, code: 'KH00005', name: 'Lê Thị Hương', address: '654 Pasteur, Q.1, TP.HCM', taxCode: '', phone: '0945 678 901', status: 'APPROVED', lastOrder: '2026-06-01' },
                { id: 6, code: 'KH00006', name: 'DNTN Phú Thịnh', address: '987 Trần Hưng Đạo, Q.5, TP.HCM', taxCode: '5566778899', phone: '0976 543 210', status: 'INACTIVE', lastOrder: '2026-04-30' },
                { id: 7, code: 'KH00007', name: 'Nguyễn Minh Tuấn', address: '159 Điện Biên Phủ, Bình Thạnh', taxCode: '', phone: '0923 456 789', status: 'APPROVED', lastOrder: '2026-06-24' },
            ];

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            setCustomers(mockCustomers);
            setTotalPages(5);
            setTotalElements(42);
            // MOCK DATA END

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

    const executeToggleStatus = () => {
        if (!confirmModal.customer) return;

        // MOCK: Toggle status locally
        setCustomers(prev => prev.map(c =>
            c.id === confirmModal.customer.id
                ? { ...c, status: c.status === 'APPROVED' ? 'INACTIVE' : 'APPROVED' }
                : c
        ));
        setConfirmModal({ isOpen: false, customer: null, action: '' });
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
