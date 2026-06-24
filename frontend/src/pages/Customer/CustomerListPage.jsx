import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CustomerQuickCreateDrawer from './components/CustomerQuickCreateDrawer';
import { searchCustomers, deactivateCustomer } from '../../api/customerApi';
import styles from './CustomerListPage.module.css';

const SEED_DATA_CODE = 'KH-0000';

const CustomerListPage = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [phoneSearch, setPhoneSearch] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // null = create, object = edit
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const PAGE_SIZE = 10;

    // Debounce search để tránh gọi API liên tục khi gõ
    const debounceRef = useRef(null);

    const fetchCustomers = useCallback(async (phone = '', currentPage = 0) => {
        try {
            setLoading(true);
            const res = await searchCustomers(phone, currentPage, PAGE_SIZE);
            const pageData = res.data?.data;
            if (pageData) {
                setCustomers(pageData.content || []);
                setTotalPages(pageData.totalPages || 0);
                setTotalElements(pageData.totalElements || 0);
            }
        } catch (error) {
            console.error('Lỗi tải danh sách khách hàng:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers('', 0);
    }, [fetchCustomers]);

    // Autocomplete search: debounce 400ms
    const handlePhoneChange = (e) => {
        const value = e.target.value;
        setPhoneSearch(value);
        setPage(0);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchCustomers(value, 0);
        }, 400);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchCustomers(phoneSearch, newPage);
    };

    const handleDeactivate = async (customer) => {
        if (!window.confirm(`Bạn có chắc muốn vô hiệu hóa khách hàng "${customer.name}" không?`)) return;
        try {
            await deactivateCustomer(customer.id);
            fetchCustomers(phoneSearch, page);
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể vô hiệu hóa. Vui lòng kiểm tra lại.');
        }
    };

    const handleSavedSuccess = () => {
        setIsDrawerOpen(false);
        setEditTarget(null);
        fetchCustomers(phoneSearch, page);
    };

    const getGroupTypeLabel = (groupType) => {
        const map = { RETAIL: 'Khách lẻ', WHOLESALE: 'Khách thợ', DISTRIBUTOR: 'Đại lý' };
        return map[groupType] || groupType;
    };

    const getStatusBadge = (status) => {
        if (status === 'APPROVED') return <span className={styles.badgeActive}>Hoạt động</span>;
        return <span className={styles.badgeInactive}>Ngừng hoạt động</span>;
    };

    const isSeedData = (code) => code === SEED_DATA_CODE;

    return (
        <AdminLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <span className={styles.backLink} onClick={() => navigate('/dashboard')}>
                            <i className="fas fa-chevron-left"></i> Tất cả danh mục
                        </span>
                        <h2>Danh sách khách hàng</h2>
                    </div>
                    <button id="btn-add-customer" className={styles.btnAdd} onClick={() => { setEditTarget(null); setIsDrawerOpen(true); }}>
                        <i className="fas fa-plus"></i> Thêm mới
                    </button>
                </div>

                {/* Table Section */}
                <div className={styles.tableCard}>
                    {/* Toolbar */}
                    <div className={styles.tableToolbar}>
                        <div className={styles.toolbarLeft}>
                            <div className={styles.searchBox}>
                                <i className="fas fa-search"></i>
                                <input
                                    id="input-search-phone"
                                    type="text"
                                    placeholder="Tìm theo số điện thoại..."
                                    value={phoneSearch}
                                    onChange={handlePhoneChange}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        <div className={styles.toolbarRight}>
                            <button className={styles.iconBtn} title="Tải lại" onClick={() => fetchCustomers(phoneSearch, page)}>
                                <i className="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>MÃ KH</th>
                                    <th>TÊN KHÁCH HÀNG</th>
                                    <th>SỐ ĐIỆN THOẠI</th>
                                    <th>NHÓM</th>
                                    <th style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                    <th style={{ textAlign: 'center' }}>CHỨC NĂNG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className={styles.emptyRow}>Đang tải dữ liệu...</td></tr>
                                ) : customers.length === 0 ? (
                                    <tr><td colSpan="6" className={styles.emptyRow}>Chưa có dữ liệu.</td></tr>
                                ) : customers.map((item) => (
                                    <tr key={item.id}>
                                        <td className={styles.codeCell}>{item.code}</td>
                                        <td className={styles.nameCell}>
                                            {/* Ẩn link "Xem chi tiết" với KH-0000 theo spec CUST04 */}
                                            {isSeedData(item.code) ? (
                                                <span>{item.name}</span>
                                            ) : (
                                                <span
                                                    className={styles.nameLink}
                                                    onClick={() => navigate(`/customers/${item.id}`)}
                                                    title="Xem hồ sơ chi tiết"
                                                >
                                                    {item.name}
                                                </span>
                                            )}
                                        </td>
                                        <td>{item.phone}</td>
                                        <td>{getGroupTypeLabel(item.groupType)}</td>
                                        <td style={{ textAlign: 'center' }}>{getStatusBadge(item.status)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {!isSeedData(item.code) && (
                                                <div className={styles.actionGroup}>
                                                    <button
                                                        className={styles.actionBtnEdit}
                                                        onClick={() => { setEditTarget(item); setIsDrawerOpen(true); }}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    {item.status === 'APPROVED' && (
                                                        <button
                                                            className={styles.actionBtnDeactivate}
                                                            onClick={() => handleDeactivate(item)}
                                                            title="Vô hiệu hóa"
                                                        >
                                                            <i className="fas fa-ban"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className={styles.pagination}>
                        <div className={styles.pageInfo}>Tổng số: {totalElements} khách hàng</div>
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

            {/* Drawer Tạo nhanh / Chỉnh sửa */}
            <CustomerQuickCreateDrawer
                isOpen={isDrawerOpen}
                editData={editTarget}
                onClose={() => { setIsDrawerOpen(false); setEditTarget(null); }}
                onSaved={handleSavedSuccess}
            />
        </AdminLayout>
    );
};

export default CustomerListPage;
