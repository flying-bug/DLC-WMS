import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getCustomerById, deactivateCustomer, activateCustomer, getCustomerSalesHistory, getCustomerWarranties, getCustomerReceipts } from '../../api/customerApi';
import CustomerModal from './components/CustomerModal';
import SalesHistoryTab from './components/SalesHistoryTab';
import WarrantyTab from './components/WarrantyTab';
import ReceiptsTab from './components/ReceiptsTab';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
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
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Tab States
    const [salesData, setSalesData] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [warrantyData, setWarrantyData] = useState({ content: [], totalElements: 0, totalPages: 0 });
    const [receiptData, setReceiptData] = useState({ content: [], totalElements: 0, totalPages: 0, totalPaid: 0, currentDebt: 0 });

    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', title: '', message: '' });
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: '' });

    const showToast = (type, title, message) => setToast({ isVisible: true, type, title, message: message || title });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchCustomerInfo = useCallback(async () => {
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
    }, [id, navigate]);

    useEffect(() => {
        fetchCustomerInfo();
    }, [fetchCustomerInfo]);

    const fetchTabData = useCallback(async (currentTab, currentPage = 0) => {
        try {
            setLoading(true);
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
                    currentDebt: 0 
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

    const handleToggleStatus = () => {
        const action = customer.status === 'APPROVED' ? 'vô hiệu hóa' : 'kích hoạt';
        setConfirmModal({ isOpen: true, action });
    };

    const executeToggleStatus = async () => {
        setConfirmModal({ isOpen: false, action: '' });
        try {
            if (customer.status === 'APPROVED') {
                await deactivateCustomer(id);
                showToast('success', 'Thành công', `Đã vô hiệu hóa khách hàng "${customer.name}".`);
            } else {
                await activateCustomer(id);
                showToast('success', 'Thành công', `Đã kích hoạt lại khách hàng "${customer.name}".`);
            }
            fetchCustomerInfo();
        } catch (err) {
            const msg = err.response?.data?.userMessage || 'Thao tác thất bại. Vui lòng thử lại.';
            showToast('error', 'Lỗi', msg);
        }
    };

    const handleSavedSuccess = () => {
        setIsEditModalOpen(false);
        showToast('success', 'Thành công', 'Đã cập nhật thông tin khách hàng.');
        fetchCustomerInfo();
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

    if (error) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div className={styles.emptyState}>
                        <i className={`bi bi-exclamation-circle ${styles.emptyIcon}`}></i>
                        <div className={styles.emptyText}>{error}</div>
                        <button className={styles.btnPrimary} onClick={() => navigate('/customers')}>Quay lại danh sách</button>
                    </div>
                </div>
            </AdminLayout>
        );
    }
    
    if (!customer) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải thông tin...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                {/* Header Section */}
                <div className={styles.pageTitleContainer}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }} 
                            onClick={() => navigate('/customers')}
                        >
                            <i className="bi bi-arrow-left"></i>
                        </button>
                        <h1 className={styles.pageTitle}>Chi tiết khách hàng: {customer.name}</h1>
                        <span className={`${styles.badge} ${customer.status === 'APPROVED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {customer.status === 'APPROVED' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className={styles.btnOutline} onClick={() => setIsEditModalOpen(true)}>
                            <i className="bi bi-pencil"></i> Chỉnh sửa
                        </button>
                        {customer.status === 'APPROVED' ? (
                            <button className={styles.btnOutline} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={handleToggleStatus}>
                                <i className="bi bi-slash-circle"></i> Vô hiệu hóa
                            </button>
                        ) : (
                            <button className={styles.btnOutline} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }} onClick={handleToggleStatus}>
                                <i className="bi bi-check2-circle"></i> Kích hoạt
                            </button>
                        )}
                    </div>
                </div>

                {/* Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    
                    <div className={styles.detailSection} style={{ margin: 0 }}>
                        <div className={styles.detailHeader}>
                            <i className={`bi bi-info-circle ${styles.detailIcon}`}></i>
                            <h2 className={styles.detailTitle}>Thông tin chung</h2>
                        </div>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailGroup}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Mã khách hàng</span>
                                    <span className={styles.detailValue} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{customer.code}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Nhóm khách hàng</span>
                                    <span className={styles.detailValue}>{getGroupLabel(customer.groupType)}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Tên khách hàng</span>
                                    <span className={styles.detailValue} style={{ fontWeight: 600 }}>{customer.name}</span>
                                </div>
                            </div>
                            <div className={styles.detailGroup}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Số điện thoại</span>
                                    <span className={styles.detailValue}>{customer.phone || '—'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Email liên hệ</span>
                                    <span className={styles.detailValue}>{customer.email || '—'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Địa chỉ</span>
                                    <span className={styles.detailValue}>{customer.address || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.detailSection} style={{ margin: 0 }}>
                        <div className={styles.detailHeader}>
                            <i className={`bi bi-wallet2 ${styles.detailIcon}`}></i>
                            <h2 className={styles.detailTitle}>Tổng quan tài chính</h2>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Tổng tiền khách đã trả</div>
                                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--color-primary)' }}>{formatCurrency(receiptData.totalPaid)} ₫</h2>
                            </div>
                            <div style={{ borderTop: '1px solid var(--color-border)', margin: '16px 0' }}></div>
                            <div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Dư nợ hiện tại</div>
                                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--color-danger)' }}>{formatCurrency(receiptData.currentDebt || 0)} ₫</h2>
                            </div>
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
                            <i className="bi bi-cart3"></i> Lịch sử mua hàng
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === TABS.WARRANTY ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange(TABS.WARRANTY)}
                        >
                            <i className="bi bi-shield-check"></i> Bảo hành
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === TABS.RECEIPT ? styles.tabBtnActive : ''}`}
                            onClick={() => handleTabChange(TABS.RECEIPT)}
                        >
                            <i className="bi bi-receipt"></i> Lịch sử thu chi
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

            <CustomerModal
                isOpen={isEditModalOpen}
                editData={customer}
                onClose={() => setIsEditModalOpen(false)}
                onSaved={handleSavedSuccess}
                onError={(msg) => showToast('error', 'Lỗi', msg)}
            />

            <Toast
                isVisible={toast.isVisible}
                type={toast.type}
                title={toast.title}
                message={toast.message}
                onClose={hideToast}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={`Xác nhận ${confirmModal.action}`}
                message={<span>Bạn có chắc chắn muốn {confirmModal.action} khách hàng <strong>"{customer?.name}"</strong> không?</span>}
                onConfirm={executeToggleStatus}
                onCancel={() => setConfirmModal({ isOpen: false, action: '' })}
                confirmText="Đồng ý"
                cancelText="Hủy"
                confirmButtonClass={confirmModal.action === 'vô hiệu hóa' ? 'btn-misa-danger' : 'btn-misa-primary'}
            />
        </AdminLayout>
    );
};

export default CustomerDetailPage;
