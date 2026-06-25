import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getCustomerById, deactivateCustomer } from '../../api/customerApi';
// import { getCustomerSalesHistory, getCustomerWarranties, getCustomerReceipts } from '../../api/customerApi';
import CustomerQuickCreateDrawer from './components/CustomerQuickCreateDrawer';
import styles from './CustomerDetailPage.module.css';

const TABS = {
    SALES: 'SALES',
    WARRANTY: 'WARRANTY',
    RECEIPT: 'RECEIPT'
};

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState(TABS.SALES);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Tab States
    const [salesData, setSalesData] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [warrantyData, setWarrantyData] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [receiptData, setReceiptData] = useState({ content: [], totalElements: 0, totalPages: 0, totalPaid: 0 });

    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Lấy thông tin chung khách hàng
    useEffect(() => {
        const fetchCustomerInfo = async () => {
            try {
                // MOCK DATA START
                setCustomer({
                    id: id,
                    code: 'KH00001',
                    name: 'Ng Thu Uyên',
                    phone: '0912 345 678',
                    email: 'uyen.ng@example.com',
                    address: '123 Lê Lợi, Q.1, TP.HCM',
                    taxCode: '0123456789',
                    groupType: 'RETAIL',
                    status: 'APPROVED'
                });

                // --- ORIGINAL API CALL (Commented for UI Preview) ---
                // const res = await getCustomerById(id);
                // setCustomer(res.data?.data);
            } catch (err) {
                const msg = err.response?.data?.message || '';
                if (msg.includes('CUST_VIEW_SEED_DATA_DENIED')) {
                    alert('Không thể xem chi tiết Khách vãng lai.');
                    navigate('/customers');
                } else {
                    setError('Không thể tải thông tin khách hàng.');
                }
            }
        };
        fetchCustomerInfo();
    }, [id, navigate]);

    // eslint-disable-next-line no-unused-vars
    const fetchTabData = useCallback(async (currentTab, currentPage = 0) => {
        try {
            setLoading(true);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 400));

            // MOCK DATA START
            if (currentTab === TABS.SALES) {
                setSalesData({
                    content: [
                        { orderCode: 'HD00102', orderDate: '2026-06-20T10:00:00Z', productName: 'iPhone 15 Pro Max 256GB', quantity: 1, serialNumber: 'IMEI123456789' },
                        { orderCode: 'HD00085', orderDate: '2026-05-15T14:30:00Z', productName: 'AirPods Pro Gen 2', quantity: 2, serialNumber: 'SN987654321' }
                    ],
                    totalElements: 2,
                    totalPages: 1
                });
            } else if (currentTab === TABS.WARRANTY) {
                setWarrantyData({
                    content: [
                        {
                            warrantyCode: 'BH00045', serialNumber: 'IMEI123456789', startDate: '2026-06-20T10:00:00Z', endDate: '2027-06-20T10:00:00Z', warrantyStatus: 'ACTIVE', repairs: [
                                { repairCode: 'SC001', repairStatus: 'Hoàn thành', receivedDate: '2026-08-01T09:00:00Z' }
                            ]
                        }
                    ],
                    totalElements: 1,
                    totalPages: 1
                });
            } else if (currentTab === TABS.RECEIPT) {
                setReceiptData({
                    content: [
                        { receiptCode: 'PT00120', type: 'RECEIPT', createdAt: '2026-06-20T10:05:00Z', amount: 29990000, paymentMethod: 'Chuyển khoản', status: 'Hoàn thành' },
                        { receiptCode: 'PT00095', type: 'RECEIPT', createdAt: '2026-05-15T14:35:00Z', amount: 5990000, paymentMethod: 'Tiền mặt', status: 'Hoàn thành' },
                        { receiptCode: 'PC00012', type: 'VOUCHER', createdAt: '2026-06-25T08:00:00Z', amount: 500000, paymentMethod: 'Tiền mặt', status: 'Hoàn thành' }
                    ],
                    totalElements: 3,
                    totalPages: 1,
                    totalPaid: 35470000,
                    currentDebt: 5000000
                });
            }
            // MOCK DATA END
        } catch (err) {
            console.error('Lỗi tải dữ liệu tab:', err);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        Promise.resolve().then(() => fetchTabData(activeTab, page));
    }, [activeTab, page, fetchTabData]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPage(0);
    };

    const handleDeactivate = async () => {
        if (!window.confirm(`Bạn có chắc muốn vô hiệu hóa khách hàng "${customer.name}" không?`)) return;
        try {
            await deactivateCustomer(id);
            // Refresh customer info
            const res = await getCustomerById(id);
            setCustomer(res.data?.data);
        } catch (error) {
            alert(error.response?.data?.message || 'Không thể vô hiệu hóa. Vui lòng kiểm tra lại.');
        }
    };

    const handleSavedSuccess = async () => {
        setIsDrawerOpen(false);
        const res = await getCustomerById(id);
        setCustomer(res.data?.data);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

    const getGroupLabel = (type) => {
        const map = { RETAIL: 'Khách lẻ', WHOLESALE: 'Khách thợ', DISTRIBUTOR: 'Đại lý' };
        return map[type] || type;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN');
    };

    if (error) return <AdminLayout><div style={{ padding: '24px', color: 'red' }}>{error}</div></AdminLayout>;
    if (!customer) return <AdminLayout><div style={{ padding: '24px' }}>Đang tải...</div></AdminLayout>;

    // ─────────────────────────────────────────────────────────────────────────
    // RENDERS
    // ─────────────────────────────────────────────────────────────────────────

    const renderPagination = (totalPages) => (
        <div className={styles.pagination}>
            <div className={styles.pageInfo}>
                Trang {page + 1} / {totalPages || 1}
            </div>
            <div className={styles.pageNav}>
                <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <i className="fas fa-chevron-left"></i>
                </button>
                <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <i className="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    );

    const renderSalesTab = () => (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ ĐƠN HÀNG</th>
                        <th>NGÀY MUA</th>
                        <th>SẢN PHẨM</th>
                        <th style={{ textAlign: 'center' }}>SỐ LƯỢNG</th>
                        <th>SERIAL / IMEI</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="5" className={styles.loadingState}>Đang tải...</td></tr>
                    ) : salesData.content.length === 0 ? (
                        <tr><td colSpan="5" className={styles.emptyState}>Chưa có lịch sử mua hàng</td></tr>
                    ) : salesData.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.orderCode}</td>
                            <td>{formatDate(item.orderDate)}</td>
                            <td>{item.productName}</td>
                            <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                            <td>{item.serialNumber || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {renderPagination(salesData.totalPages)}
        </>
    );

    const renderWarrantyTab = () => (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ BẢO HÀNH</th>
                        <th>SERIAL SẢN PHẨM</th>
                        <th>THỜI GIAN BH</th>
                        <th>TRẠNG THÁI</th>
                        <th>LỊCH SỬ SỬA CHỮA</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="5" className={styles.loadingState}>Đang tải...</td></tr>
                    ) : warrantyData.content.length === 0 ? (
                        <tr><td colSpan="5" className={styles.emptyState}>Chưa có lịch sử bảo hành</td></tr>
                    ) : warrantyData.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.warrantyCode}</td>
                            <td>{item.serialNumber || '-'}</td>
                            <td>{formatDate(item.startDate)} - {formatDate(item.endDate)}</td>
                            <td>{item.warrantyStatus}</td>
                            <td>
                                {item.repairs?.length > 0 ? (
                                    item.repairs.map(r => (
                                        <div key={r.repairCode} style={{ fontSize: '12px' }}>
                                            {r.repairCode} - {r.repairStatus} ({formatDate(r.receivedDate)})
                                        </div>
                                    ))
                                ) : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {renderPagination(warrantyData.totalPages)}
        </>
    );

    const renderReceiptTab = () => (
        <>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>MÃ CHỨNG TỪ</th>
                        <th>LOẠI</th>
                        <th>NGÀY GIAO DỊCH</th>
                        <th style={{ textAlign: 'right' }}>SỐ TIỀN (VNĐ)</th>
                        <th>PHƯƠNG THỨC</th>
                        <th>TRẠNG THÁI</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="6" className={styles.loadingState}>Đang tải...</td></tr>
                    ) : receiptData.content.length === 0 ? (
                        <tr><td colSpan="6" className={styles.emptyState}>Chưa có lịch sử giao dịch</td></tr>
                    ) : receiptData.content.map((item, idx) => (
                        <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.receiptCode}</td>
                            <td>
                                {item.type === 'RECEIPT' ? (
                                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Phiếu Thu</span>
                                ) : (
                                    <span style={{ color: '#dc2626', fontWeight: 600 }}>Phiếu Chi</span>
                                )}
                            </td>
                            <td>{formatDate(item.createdAt)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {item.type === 'VOUCHER' ? '-' : '+'}{formatCurrency(item.amount)}
                            </td>
                            <td>{item.paymentMethod || '-'}</td>
                            <td>{item.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {renderPagination(receiptData.totalPages)}
        </>
    );

    return (
        <AdminLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <span className={styles.backLink} onClick={() => navigate('/customers')}>
                            <i className="fas fa-arrow-left"></i> Quay lại danh sách
                        </span>
                        <h2 className={styles.title}>Hồ sơ khách hàng: {customer.name}</h2>
                    </div>
                    <div className={styles.actionBtnGroup}>
                        <button
                            className={styles.btnEdit}
                            onClick={() => setIsDrawerOpen(true)}
                        >
                            <i className="fas fa-pen"></i> Chỉnh sửa
                        </button>
                        {customer.status === 'APPROVED' && (
                            <button
                                className={styles.btnDeactivate}
                                onClick={handleDeactivate}
                            >
                                <i className="fas fa-ban"></i> Ngừng hoạt động
                            </button>
                        )}
                    </div>
                </div>

                {/* Info Cards */}
                <div className={styles.topCards}>
                    {/* Customer Info */}
                    <div className={styles.infoCard}>
                        <h3 className={styles.cardTitle}><i className="fas fa-user-circle"></i> Thông tin chung</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Mã khách hàng</span>
                                <span className={styles.infoValue} style={{ color: 'var(--color-primary)' }}>{customer.code}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Trạng thái</span>
                                <div>
                                    <span className={customer.status === 'APPROVED' ? styles.badgeActive : styles.badgeInactive}>
                                        {customer.status === 'APPROVED' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Số điện thoại</span>
                                <span className={styles.infoValue}>{customer.phone}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Nhóm khách hàng</span>
                                <span className={styles.infoValue}>{getGroupLabel(customer.groupType)}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Mã số thuế</span>
                                <span className={styles.infoValue}>{customer.taxCode || '—'}</span>
                            </div>
                            <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                                <span className={styles.infoLabel}>Email</span>
                                <span className={styles.infoValue}>{customer.email || '—'}</span>
                            </div>
                            <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                                <span className={styles.infoLabel}>Địa chỉ</span>
                                <span className={styles.infoValue}>{customer.address || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Receipt Card */}
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryRow}>
                            <div className={styles.summaryLabel}>Tổng tiền khách đã trả</div>
                            <h2 className={styles.summaryAmount}>{formatCurrency(receiptData.totalPaid)} ₫</h2>
                        </div>
                        <div className={styles.summaryDivider}></div>
                        <div className={styles.summaryRow}>
                            <div className={styles.summaryLabel}>Dư nợ hiện tại</div>
                            <h2 className={styles.summaryAmountDebt}>{formatCurrency(receiptData.currentDebt || 0)} ₫</h2>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabsContainer}>
                    <div className={styles.tabHeader}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === TABS.SALES ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange(TABS.SALES)}
                        >
                            <i className="fas fa-shopping-cart"></i> Lịch Sử Mua hàng
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === TABS.WARRANTY ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange(TABS.WARRANTY)}
                        >
                            <i className="fas fa-shield-alt"></i> Bảo hành
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === TABS.RECEIPT ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange(TABS.RECEIPT)}
                        >
                            <i className="fas fa-file-invoice-dollar"></i> Lịch sử thu chi
                        </button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === TABS.SALES && renderSalesTab()}
                        {activeTab === TABS.WARRANTY && renderWarrantyTab()}
                        {activeTab === TABS.RECEIPT && renderReceiptTab()}
                    </div>
                </div>
            </div>

            <CustomerQuickCreateDrawer
                isOpen={isDrawerOpen}
                editData={customer}
                onClose={() => setIsDrawerOpen(false)}
                onSaved={handleSavedSuccess}
            />
        </AdminLayout>
    );
};

export default CustomerDetailPage;
