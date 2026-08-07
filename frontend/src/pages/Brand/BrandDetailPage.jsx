import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import BrandModal from './components/BrandModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Toast from '../../components/ui/Toast/Toast';
import axiosClient from '../../api/axiosClient';
import styles from './BrandDetailPage.module.css';
import { formatDateOnly } from '../../utils/dateFormat';

const BrandDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [brand, setBrand] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

    const showToast = (type, message) => setToast({ isVisible: true, type, message });
    const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

    const fetchBrand = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/brands/${id}`);
            if (res.data && res.data.data) {
                setBrand(res.data.data);
            }
        } catch (error) {
            console.error('Lỗi tải chi tiết thương hiệu:', error);
            showToast('error', error.response?.data?.userMessage || 'Không tải được thông tin chi tiết thương hiệu');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchBrand();
        }
    }, [fetchBrand, id]);

    const handleDelete = async () => {
        try {
            await axiosClient.delete(`/brands/${id}`);
            setIsDeleteModalOpen(false);
            navigate('/brands', { state: { toastMessage: `Đã xóa thương hiệu ${brand.name}`, toastType: 'success' } });
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi xóa thương hiệu');
            if (error.response?.status === 409) {
                fetchBrand();
            }
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

    if (!brand) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div className={styles.emptyState} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
                        <i className={`bi bi-exclamation-circle ${styles.emptyIcon}`} style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px' }}></i>
                        <div className={styles.emptyText} style={{ color: '#64748b', marginBottom: '24px' }}>Không tìm thấy thương hiệu này</div>
                        <button className={styles.btnPrimary} onClick={() => navigate('/brands')}>Quay lại danh sách</button>
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
                            style={{ border: 'none', background: 'none' }}
                            onClick={() => navigate('/brands')}
                        >
                            <i className="bi bi-arrow-left"></i>
                        </button>
                        <h1 className={styles.pageTitle}>Chi tiết thương hiệu: {brand.name}</h1>
                        <span className={`${styles.badge} ${brand.status === 'APPROVED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {brand.status === 'APPROVED' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
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
                        <div className={styles.detailGroup} style={{ gridColumn: 'span 2' }}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Mã thương hiệu</span>
                                <span className={styles.detailValue}>{brand.code}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Tên thương hiệu</span>
                                <span className={styles.detailValue} style={{ fontWeight: 600 }}>{brand.name}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Mô tả chi tiết</span>
                                <span className={styles.detailValue}>{brand.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có ghi chú</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailRight}>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Điện thoại liên hệ</span>
                                <span className={styles.detailRightValue}>{brand.hotline || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Email liên hệ</span>
                                <span className={styles.detailRightValue}>{brand.contactEmail || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Chưa cập nhật</span>}</span>
                            </div>
                            {brand.createdAt && (
                                <div className={styles.detailRightRow}>
                                    <span className={styles.detailRightLabel}>Ngày tạo</span>
                                    <span className={styles.detailRightValue}>{formatDateOnly(brand.createdAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isEditModalOpen && (
                <BrandModal 
                    initialData={brand}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={async (data) => {
                        try {
                            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;
                            const updateData = {
                                code: cleanString(data.code),
                                name: cleanString(data.name),
                                status: data.status || brand.status,
                                hotline: cleanString(data.hotline),
                                contactEmail: cleanString(data.contactEmail),
                                description: cleanString(data.description)
                            };
                            await axiosClient.put(`/brands/${id}`, updateData);
                            setIsEditModalOpen(false);
                            showToast('success', 'Cập nhật thương hiệu thành công!');
                            fetchBrand();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || 'Có lỗi xảy ra khi cập nhật thương hiệu');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Xác nhận xóa"
                message={<span>Bạn có chắc chắn muốn xóa thương hiệu <strong>{brand?.name}</strong> {brand?.code ? `(${brand.code})` : ''} không? Hành động này không thể hoàn tác.</span>}
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

export default BrandDetailPage;
