import { useState, useEffect } from 'react';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';
import { useParams } from 'react-router-dom';
import useGoBack from '../../hooks/useGoBack';
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
import usePermissionGuard from '../../hooks/usePermissionGuard';

const unwrap = (response) => response?.data?.data ?? response?.data;

const SupplierDetailPage = () => {
    const goBack = useGoBack('/suppliers');
    const { id } = useParams();
    const guard = usePermissionGuard();
    
    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeHistoryTab, setActiveHistoryTab] = useState('PURCHASES');
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [debtBalance, setDebtBalance] = useState(0);
    const [purchaseError, setPurchaseError] = useState(null);
    const [paymentError, setPaymentError] = useState(null);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);
    const formatDate = (value) => value ? formatDateOnly(value) : '-';
    const formatPaymentDateTime = (value) => value ? formatDateTime(value, { withSeconds: false }) : '-';

    const fetchSupplier = async ({ silent } = {}) => {
        try {
            if (!silent) setLoading(true);
            const res = await axiosClient.get(`/suppliers/${id}`);
            if (res.data && res.data.data) {
                const supplierData = res.data.data;
                setSupplier(supplierData);
                setDebtBalance(Number(supplierData.currentDebt || 0));

                if (!silent) setHistoryLoading(true);
                setPurchaseError(null);
                setPaymentError(null);
                const [ordersRes, paymentRes, balanceRes] = await Promise.allSettled([
                    purchaseOrderApi.getPurchaseOrders({ partnerId: id }),
                    paymentApi.getPartnerPaymentHistory(id),
                    paymentApi.getPartnerDebtBalance(id)
                ]);

                if (balanceRes.status === 'fulfilled') {
                    const balanceValue = Number(unwrap(balanceRes.value));
                    setDebtBalance(Number.isFinite(balanceValue) ? balanceValue : Number(supplierData.currentDebt || 0));
                } else {
                    console.error('Lỗi tải dư nợ NCC:', balanceRes.reason);
                    setPaymentError('Không tải được dư nợ hiện tại');
                }
                if (paymentRes.status === 'fulfilled') {
                    setPaymentHistory(unwrap(paymentRes.value) || []);
                } else {
                    console.error('Lỗi tải lịch sử thu chi:', paymentRes.reason);
                    setPaymentError('Không tải được lịch sử thu chi');
                }
                if (ordersRes.status === 'fulfilled') {
                    const orders = (unwrap(ordersRes.value) || [])
                        .filter(order => ['APPROVED', 'POSTED'].includes(order.status));
                    const detailResults = await Promise.allSettled(
                        orders.map(order => purchaseOrderApi.getPurchaseOrderById(order.id))
                    );
                    const failedDetail = detailResults.some(result => result.status !== 'fulfilled');
                    if (failedDetail) {
                        console.error('Lỗi tải chi tiết một số đơn mua:', detailResults.filter(r => r.status !== 'fulfilled'));
                        setPurchaseError('Một số đơn mua không tải được, danh sách có thể chưa đầy đủ');
                    }
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
                } else {
                    console.error('Lỗi tải lịch sử mua hàng:', ordersRes.reason);
                    setPurchaseError('Không tải được lịch sử mua hàng');
                }
                if (!silent) setHistoryLoading(false);
            }
        } catch (error) {
            console.error('Lỗi tải chi tiết NCC:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được thông tin chi tiết nhà cung cấp');
        } finally {
            if (!silent) setHistoryLoading(false);
            if (!silent) setLoading(false);
        }
    };
  useRealtimeRefresh({ PARTNER: id, PURCHASE_ORDER: null, PAYMENT: null }, fetchSupplier);

    useEffect(() => {
        if (id) {
            fetchSupplier();
        }
    }, [id]);

    const handleToggleStatus = async () => {
        const nextStatus = supplier.status === 'APPROVED' ? 'INACTIVE' : 'APPROVED';
        try {
            await axiosClient.put(`/suppliers/${id}`, {
                code: supplier.code,
                name: supplier.name,
                phone: supplier.phone || null,
                email: supplier.email || null,
                address: supplier.address || null,
                taxCode: supplier.taxCode || null,
                groupType: supplier.groupType || 'RETAIL',
                bankName: supplier.bankName || null,
                bankAccountNumber: supplier.bankAccountNumber || null,
                bankBeneficiaryName: supplier.bankBeneficiaryName || null,
                contactName: supplier.contactName || null,
                status: nextStatus,
            });
            setIsStatusModalOpen(false);
            showToast('success', nextStatus === 'INACTIVE'
                ? `Đã vô hiệu hóa nhà cung cấp ${supplier.name}`
                : `Đã kích hoạt lại nhà cung cấp ${supplier.name}`);
            fetchSupplier({ silent: true });
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi cập nhật trạng thái nhà cung cấp');
            setIsStatusModalOpen(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--wms-text-muted)' }}>Đang tải thông tin...</div>
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
                        <button className={styles.btnPrimary} onClick={goBack}>Quay lại danh sách</button>
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
                            className={styles.iconBtn}
                            onClick={goBack}
                            title="Quay lại danh sách"
                            type="button"
                        >
                            <i className="bi bi-arrow-left"></i>
                        </button>
                        <h1 className={styles.pageTitle}>Chi tiết nhà cung cấp: {supplier.name}</h1>
                        <span className={`${styles.badge} ${supplier.status === 'APPROVED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {supplier.status === 'APPROVED' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className={styles.btnOutline} onClick={() => guard('supplier:edit', () => setIsEditModalOpen(true))}>
                            <i className="bi bi-pencil"></i> Chỉnh sửa
                        </button>
                        {supplier.status === 'APPROVED' ? (
                            <button className={styles.btnOutline} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => guard('supplier:edit', () => setIsStatusModalOpen(true))}>
                                <i className="bi bi-slash-circle"></i> Vô hiệu hóa
                            </button>
                        ) : (
                            <button className={styles.btnOutline} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }} onClick={() => guard('supplier:edit', () => setIsStatusModalOpen(true))}>
                                <i className="bi bi-check2-circle"></i> Kích hoạt
                            </button>
                        )}
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
                                <span className={styles.detailValue}>{supplier.taxCode || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Địa chỉ</span>
                                <span className={styles.detailValue}>{supplier.address || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailGroup}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Số điện thoại</span>
                                <span className={styles.detailValue}>{supplier.phone || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Email</span>
                                <span className={styles.detailValue}>{supplier.email || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Người liên hệ</span>
                                <span className={styles.detailValue}>{supplier.contactName || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailRight}>
                            <div style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--color-text-strong)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-bank"></i> Thông tin ngân hàng
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Ngân hàng</span>
                                <span className={styles.detailRightValue}>{supplier.bankName || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Số tài khoản</span>
                                <span className={styles.detailRightValue}>{supplier.bankAccountNumber || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Chủ tài khoản</span>
                                <span className={styles.detailRightValue}>{supplier.bankBeneficiaryName || <span style={{ color: 'var(--color-text-placeholder)', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            
                            <div style={{ borderTop: '1px solid var(--color-border)', margin: '16px 0' }}></div>
                            <div>
                                <div className={styles.detailLabel} style={{ marginBottom: '8px' }}>Dư nợ hiện tại</div>
                                <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--color-danger)' }}>{formatCurrency(debtBalance)} ₫</h2>
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
                                error={purchaseError}
                                formatDate={formatDate}
                                formatCurrency={formatCurrency}
                                styles={styles}
                            />
                        ) : (
                            <PaymentHistoryTab
                                data={paymentHistory}
                                debtBalance={debtBalance}
                                loading={historyLoading}
                                error={paymentError}
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
                isOpen={isStatusModalOpen}
                title={supplier?.status === 'APPROVED' ? 'Xác nhận vô hiệu hóa' : 'Xác nhận kích hoạt'}
                message={<span>Bạn có chắc chắn muốn {supplier?.status === 'APPROVED' ? 'vô hiệu hóa' : 'kích hoạt lại'} nhà cung cấp <strong>{supplier?.name}</strong> {supplier?.code ? `(${supplier.code})` : ''} không?</span>}
                onConfirm={handleToggleStatus}
                onCancel={() => setIsStatusModalOpen(false)}
                confirmText={supplier?.status === 'APPROVED' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                cancelText="Hủy"
                confirmButtonClass={supplier?.status === 'APPROVED' ? 'btn-misa-danger' : 'btn-misa-primary'}
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default SupplierDetailPage;
