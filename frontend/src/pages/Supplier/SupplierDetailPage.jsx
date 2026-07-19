import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SupplierModal from './components/SupplierModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Toast from '../../components/ui/Toast/Toast';
import axiosClient from '../../api/axiosClient';
import styles from './SupplierDetailPage.module.css';

const formatCurrency = (val) => {
    if (!val) return '0 đ';
    return `${new Intl.NumberFormat('vi-VN').format(val)} đ`;
};

const SupplierDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [supplier, setSupplier] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchSupplier = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/suppliers/${id}`);
            if (res.data && res.data.data) {
                setSupplier(res.data.data);
            }
        } catch (error) {
            console.error('Lỗi tải chi tiết NCC:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được thông tin chi tiết nhà cung cấp');
        } finally {
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
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }} 
                            onClick={() => navigate('/suppliers')}
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
                        </div>
                    </div>
                </div>
            </div>

            {isEditModalOpen && (
                <SupplierModal 
                    initialData={{
                        ...supplier,
                        tax_code: supplier.taxCode,
                        group_type: supplier.groupType,
                        bank_name: supplier.bankName,
                        bank_account_number: supplier.bankAccountNumber,
                        bank_beneficiary_name: supplier.bankBeneficiaryName
                    }}
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
                                taxCode: cleanString(data.tax_code),
                                groupType: cleanString(data.group_type) || 'RETAIL',
                                bankName: cleanString(data.bank_name),
                                bankAccountNumber: cleanString(data.bank_account_number),
                                bankBeneficiaryName: cleanString(data.bank_beneficiary_name),
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
