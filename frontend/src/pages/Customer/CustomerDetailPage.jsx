import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getCustomerById, deactivateCustomer, getCustomerSalesHistory, getCustomerWarranties, getCustomerReceipts } from '../../api/customerApi';
import CustomerQuickCreateDrawer from './components/CustomerQuickCreateDrawer';
import SalesHistoryTab from './components/SalesHistoryTab';
import WarrantyTab from './components/WarrantyTab';
import ReceiptsTab from './components/ReceiptsTab';
import Toast from '../../components/ui/Toast/Toast';
import Modal from '../../components/ui/Modal/Modal';
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
    const [toast, setToast] = useState({ isVisible: false, type: 'success', title: '', message: '' });
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);

    const showToast = (type, title, message) => {
        setToast({ isVisible: true, type, title, message });
    };
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    // Lấy thông tin chung khách hàng
    useEffect(() => {
        const fetchCustomerInfo = async () => {
            try {
                const res = await getCustomerById(id);
                setCustomer(res.data?.data || res.data);
            } catch (err) {
                const errCode = err.response?.data?.errorCode || '';
                const errMsg = err.response?.data?.userMessage || '';
                if (errCode === 'CUST04' || errMsg.includes('vãng lai')) {
                    showToast('error', 'Không có quyền', 'Không thể xem chi tiết Khách vãng lai.');
                    setTimeout(() => navigate('/customers'), 1500);
                } else {
                    setError(errMsg || 'Không thể tải thông tin khách hàng.');
                }
            }
        };
        fetchCustomerInfo();
    }, [id, navigate]);

     
    const fetchTabData = useCallback(async (currentTab, currentPage = 0) => {
        try {
            setLoading(true);
            // Simulate API delay
            if (currentTab === TABS.SALES) {
                const res = await getCustomerSalesHistory(id, currentPage, 10);
                const payload = res.data?.data || res.data;
                setSalesData({
                    content: payload?.content || [],
                    totalElements: payload?.totalElements || 0,
                    totalPages: payload?.totalPages || 0
                });
            } else if (currentTab === TABS.WARRANTY) {
                const res = await getCustomerWarranties(id, currentPage, 10);
                const payload = res.data?.data || res.data;
                setWarrantyData({
                    content: payload?.content || [],
                    totalElements: payload?.totalElements || 0,
                    totalPages: payload?.totalPages || 0
                });
            } else if (currentTab === TABS.RECEIPT) {
                const res = await getCustomerReceipts(id, currentPage, 10);
                const payload = res.data?.data || res.data;
                setReceiptData({
                    content: payload?.receipts?.content || [],
                    totalElements: payload?.receipts?.totalElements || 0,
                    totalPages: payload?.receipts?.totalPages || 0,
                    totalPaid: payload?.summary?.totalPaid || 0,
                    currentDebt: 0 // Assumed 0 as not returned by the API
                });
            }
        } catch (err) {
            console.error('Lỗi tải dữ liệu tab:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        Promise.resolve().then(() => fetchTabData(activeTab, page));
    }, [activeTab, page, fetchTabData]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPage(0);
    };

    const handleDeactivate = async () => {
        setConfirmDeactivate(true);
    };

    const executeDeactivate = async () => {
        setConfirmDeactivate(false);
        try {
            await deactivateCustomer(id);
            showToast('success', 'Thành công', `Đã vô hiệu hóa khách hàng "${customer.name}".`);
            const res = await getCustomerById(id);
            setCustomer(res.data?.data || res.data);
        } catch (err) {
            const msg = err.response?.data?.userMessage || 'Không thể vô hiệu hóa. Vui lòng kiểm tra lại.';
            showToast('error', 'Thao tác thất bại', msg);
        }
    };

    const handleSavedSuccess = async () => {
        setIsDrawerOpen(false);
        showToast('success', 'Thành công', 'Đã cập nhật thông tin khách hàng.');
        const res = await getCustomerById(id);
        setCustomer(res.data?.data || res.data);
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
                        {activeTab === TABS.SALES && (
                            <SalesHistoryTab data={salesData} loading={loading} page={page} setPage={setPage} formatDate={formatDate} styles={styles} />
                        )}
                        {activeTab === TABS.WARRANTY && (
                            <WarrantyTab data={warrantyData} loading={loading} page={page} setPage={setPage} formatDate={formatDate} styles={styles} />
                        )}
                        {activeTab === TABS.RECEIPT && (
                            <ReceiptsTab data={receiptData} loading={loading} page={page} setPage={setPage} formatDate={formatDate} formatCurrency={formatCurrency} styles={styles} />
                        )}
                    </div>
                </div>
            </div>

            <CustomerQuickCreateDrawer
                isOpen={isDrawerOpen}
                editData={customer}
                onClose={() => setIsDrawerOpen(false)}
                onSaved={handleSavedSuccess}
                onError={(msg) => showToast('error', 'Lỗi', msg)}
            />

            {/* Toast Notification */}
            <Toast
                isVisible={toast.isVisible}
                type={toast.type}
                title={toast.title}
                message={toast.message}
                onClose={hideToast}
            />

            {/* Confirm Deactivate Modal */}
            <Modal
                isOpen={confirmDeactivate}
                onClose={() => setConfirmDeactivate(false)}
            >
                <div style={{ padding: '8px 4px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        <i className="fas fa-exclamation-circle" style={{ fontSize: '40px', color: '#ef4444' }}></i>
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>Xác nhận vô hiệu hóa</h3>
                    <p style={{ margin: '0 0 20px', color: '#6b7280' }}>
                        Bạn có chắc chắn muốn vô hiệu hóa khách hàng <strong>"{customer?.name}"</strong> không?
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button className="btn-misa-cancel" onClick={() => setConfirmDeactivate(false)}>Hủy bỏ</button>
                        <button className="btn-misa-save" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={executeDeactivate}>
                            <i className="fas fa-ban"></i> Vô hiệu hóa
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default CustomerDetailPage;
