import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SupplierModal from './components/SupplierModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Toast from '../../components/ui/Toast/Toast';
import axiosClient from '../../api/axiosClient';
import * as purchaseOrderApi from '../../api/purchaseOrderApi';
import * as paymentApi from '../../api/paymentApi';
import PurchaseHistoryTab from './components/PurchaseHistoryTab';
import PaymentHistoryTab from './components/PaymentHistoryTab';
import styles from './SupplierDetailPage.module.css';
import { formatDateOnly, formatDateTime } from '../../utils/dateFormat';

const unwrap = (response) => response?.data?.data ?? response?.data;

const SupplierDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeHistoryTab, setActiveHistoryTab] = useState('PURCHASES');
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [debtBalance, setDebtBalance] = useState(0);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);
    const formatDate = (value) => value ? formatDateOnly(value) : '-';
    const formatPaymentDateTime = (value) => value ? formatDateTime(value, { withSeconds: false }) : '-';

    const fetchSupplier = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/suppliers/${id}`);
            if (res.data && res.data.data) {
                const supplierData = res.data.data;
                setSupplier(supplierData);
                setDebtBalance(Number(supplierData.currentDebt || 0));

                setHistoryLoading(true);
                const [ordersRes, paymentRes, balanceRes] = await Promise.allSettled([
                    purchaseOrderApi.getPurchaseOrders({ partnerId: id }),
                    paymentApi.getPartnerPaymentHistory(id),
                    paymentApi.getPartnerDebtBalance(id)
                ]);

                if (balanceRes.status === 'fulfilled') {
                    setDebtBalance(Number(unwrap(balanceRes.value) || supplierData.currentDebt || 0));
                }
                if (paymentRes.status === 'fulfilled') {
                    setPaymentHistory(unwrap(paymentRes.value) || []);
                }
                if (ordersRes.status === 'fulfilled') {
                    const orders = (unwrap(ordersRes.value) || [])
                        .filter(order => ['APPROVED', 'POSTED'].includes(order.status));
                    const detailResults = await Promise.allSettled(
                        orders.map(order => purchaseOrderApi.getPurchaseOrderById(order.id))
                    );
                    const lines = detailResults.flatMap((result, index) => {
                        if (result.status !== 'fulfilled') return [];
                        const order = unwrap(result.value) || orders[index];
                        return (order.lines || []).map(line => ({
                            ...line,
                            poCode: order.poCode,
                            poDate: order.poDate,
                            status: order.status
                        }));
                    });
                    setPurchaseHistory(lines);
                }
                setHistoryLoading(false);
            }
        } catch (error) {
            console.error('Lỗi tải chi tiết NCC:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được thông tin chi tiết nhà cung cấp');
        } finally {
            setHistoryLoading(false);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchSupplier();
        }
    }, [id]);

    const handleDelete = async () => {
        try {
            await axiosClient.delete(`/suppliers/${id}`);
            setIsDeleteModalOpen(false);
            navigate('/suppliers', { state: { toastMessage: `Đã xóa nhà cung cấp ${supplier.name}`, toastType: 'success' } });
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi xóa nhà cung cấp');
            setIsDeleteModalOpen(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải thông tin...</div>
                </div>
            </AdminLayout>
        );
    }

    if (!supplier) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div className={styles.emptyState}>
                        <i className={`bi bi-exclamation-circle ${styles.emptyIcon}`}></i>
                        <div className={styles.emptyText}>Không tìm thấy nhà cung cấp này</div>
                        <button className={styles.btnPrimary} onClick={() => navigate('/suppliers')}>Quay lại danh sách</button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button 
                            className={styles.backButton}
                            onClick={() => navigate('/suppliers')}
                            title="Quay lại danh sách"
                        >
                            <i className="bi bi-arrow-left"></i>
                        </button>
                        <h1 className={styles.pageTitle}>Chi tiết nhà cung cấp: {supplier.name}</h1>
                        <span className={`${styles.badge} ${supplier.status === 'APPROVED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {supplier.status === 'APPROVED' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className={styles.btnOutline} onClick={() => setIsEditModalOpen(true)}>
                            <i className="bi bi-pencil"></i> Chỉnh sửa
                        </button>
                        <button className={styles.btnOutline} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => setIsDeleteModalOpen(true)}>
                            <i className="bi bi-trash"></i> Xóa
                        </button>
                    </div>
                </div>

                <div className={styles.detailSection}>
                    <div className={styles.detailHeader}>
                        <i className={`bi bi-info-circle ${styles.detailIcon}`}></i>
                        <h2 className={styles.detailTitle}>Thông tin chung</h2>
                    </div>

                    <div className={styles.detailGrid}>
                        <div className={styles.detailGroup}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Mã nhà cung cấp</span>
                                <span className={styles.detailValue}>{supplier.code}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Tên nhà cung cấp</span>
                                <span className={styles.detailValue} style={{ fontWeight: 600 }}>{supplier.name}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Nhóm nhà cung cấp</span>
                                <span className={styles.detailValue}>{supplier.groupType === 'WHOLESALE' ? 'Bán buôn' : 'Bán lẻ'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Mã số thuế</span>
                                <span className={styles.detailValue}>{supplier.taxCode || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Địa chỉ</span>
                                <span className={styles.detailValue}>{supplier.address || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailGroup}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Số điện thoại</span>
                                <span className={styles.detailValue}>{supplier.phone || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Email</span>
                                <span className={styles.detailValue}>{supplier.email || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Người liên hệ</span>
                                <span className={styles.detailValue}>{supplier.contactName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailRight}>
                            <div style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--color-text-strong)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-bank"></i> Thông tin ngân hàng
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Ngân hàng</span>
                                <span className={styles.detailRightValue}>{supplier.bankName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Số tài khoản</span>
                                <span className={styles.detailRightValue}>{supplier.bankAccountNumber || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Chủ tài khoản</span>
                                <span className={styles.detailRightValue}>{supplier.bankBeneficiaryName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            
                            <div style={{ borderTop: '1px solid var(--color-border)', margin: '16px 0' }}></div>
                            <div>
                                <div className={styles.detailLabel} style={{ marginBottom: '8px' }}>Dư nợ hiện tại</div>
                                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--color-danger)' }}>{formatCurrency(supplier?.currentDebt || 0)} ₫</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.historySection}>
                    <div className={styles.historyHeader}>
                        <button
                            className={`${styles.historyTabBtn} ${activeHistoryTab === 'PURCHASES' ? styles.historyTabBtnActive : ''}`}
                            onClick={() => setActiveHistoryTab('PURCHASES')}
                            type="button"
                        >
                            <i className="bi bi-cart3"></i> Lịch sử mua hàng
                        </button>
                        <button
                            className={`${styles.historyTabBtn} ${activeHistoryTab === 'PAYMENTS' ? styles.historyTabBtnActive : ''}`}
                            onClick={() => setActiveHistoryTab('PAYMENTS')}
                            type="button"
                        >
                            <i className="bi bi-receipt"></i> Lịch sử thu chi
                        </button>
                    </div>
                    <div className={styles.historyContent}>
                        {activeHistoryTab === 'PURCHASES' ? (
                            <PurchaseHistoryTab
                                data={purchaseHistory}
                                loading={historyLoading}
                                formatDate={formatDate}
                                formatCurrency={formatCurrency}
                                styles={styles}
                            />
                        ) : (
                            <PaymentHistoryTab
                                data={paymentHistory}
                                debtBalance={debtBalance}
                                loading={historyLoading}
                                formatDateTime={formatPaymentDateTime}
                                formatCurrency={formatCurrency}
                                styles={styles}
                            />
                        )}
                    </div>
                </div>
            </div>

            {isEditModalOpen && (
                <SupplierModal 
                    initialData={supplier}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={async (data) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;
                            const updateData = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                phone: cleanString(data.phone),
                                email: cleanString(data.email),
                                address: cleanString(data.address),
                                taxCode: cleanString(data.taxCode),
                                groupType: cleanString(data.groupType) || 'RETAIL',
                                bankName: cleanString(data.bankName),
                                bankAccountNumber: cleanString(data.bankAccountNumber),
                                bankBeneficiaryName: cleanString(data.bankBeneficiaryName),
                                contactName: cleanString(data.contactName),
                                status: data.status || supplier.status
                            };
                            await axiosClient.put(`/suppliers/${id}`, updateData);
                            setIsEditModalOpen(false);
                            showToast('success', 'Cập nhật nhà cung cấp thành công!');
                            fetchSupplier();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi cập nhật NCC');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Xác nhận xóa"
                message={<span>Bạn có chắc chắn muốn xóa nhà cung cấp <strong>{supplier?.name}</strong> {supplier?.code ? `(${supplier.code})` : ''} không? Hành động này không thể hoàn tác.</span>}
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default SupplierDetailPage;
