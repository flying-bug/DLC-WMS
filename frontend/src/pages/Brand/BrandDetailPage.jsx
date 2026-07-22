import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import BrandModal from './components/BrandModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Toast from '../../components/ui/Toast/Toast';
import axiosClient from '../../api/axiosClient';
import styles from './BrandDetailPage.module.css';

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

    const fetchBrand = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/brands/${id}`);
            if (res.data && res.data.data) {
                setBrand(res.data.data);
            }
        } catch (error) {
            console.error('Lá»—i táº£i chi tiáº¿t thÆ°Æ¡ng hiá»‡u:', error);
            showToast('error', error.response?.data?.userMessage || 'KhÃ´ng táº£i Ä‘Æ°á»£c thÃ´ng tin chi tiáº¿t thÆ°Æ¡ng hiá»‡u');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchBrand();
        }
    }, [id]);

    const handleDelete = async () => {
        try {
            await axiosClient.delete(`/brands/${id}`);
            setIsDeleteModalOpen(false);
            navigate('/brands', { state: { toastMessage: `ÄÃ£ xÃ³a thÆ°Æ¡ng hiá»‡u ${brand.name}`, toastType: 'success' } });
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi xÃ³a thÆ°Æ¡ng hiá»‡u');
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
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Äang táº£i thÃ´ng tin...</div>
                </div>
            </AdminLayout>
        );
    }

    if (!brand) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div className={styles.emptyState}>
                        <i className={`bi bi-exclamation-circle ${styles.emptyIcon}`}></i>
                        <div className={styles.emptyText}>KhÃ´ng tÃ¬m tháº¥y thÆ°Æ¡ng hiá»‡u nÃ y</div>
                        <button className={styles.btnPrimary} onClick={() => navigate('/brands')}>Quay láº¡i danh sÃ¡ch</button>
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
                            onClick={() => navigate('/brands')}
                        >
                            <i className="bi bi-arrow-left"></i>
                        </button>
                        <h1 className={styles.pageTitle}>Chi tiáº¿t thÆ°Æ¡ng hiá»‡u: {brand.name}</h1>
                        <span className={`${styles.badge} ${brand.status === 'APPROVED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {brand.status === 'APPROVED' ? 'Äang hoáº¡t Ä‘á»™ng' : 'Ngá»«ng hoáº¡t Ä‘á»™ng'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className={styles.btnOutline} onClick={() => setIsEditModalOpen(true)}>
                            <i className="bi bi-pencil"></i> Chá»‰nh sá»­a
                        </button>
                        <button className={styles.btnOutline} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => setIsDeleteModalOpen(true)}>
                            <i className="bi bi-trash"></i> XÃ³a
                        </button>
                    </div>
                </div>

                <div className={styles.detailSection}>
                    <div className={styles.detailHeader}>
                        <i className={`bi bi-info-circle ${styles.detailIcon}`}></i>
                        <h2 className={styles.detailTitle}>ThÃ´ng tin chung</h2>
                    </div>

                    <div className={styles.detailGrid}>
                        <div className={styles.detailGroup}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>MÃ£ thÆ°Æ¡ng hiá»‡u</span>
                                <span className={styles.detailValue}>{brand.code}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>TÃªn thÆ°Æ¡ng hiá»‡u</span>
                                <span className={styles.detailValue} style={{ fontWeight: 600 }}>{brand.name}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>MÃ´ táº£</span>
                                <span className={styles.detailValue}>{brand.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>KhÃ´ng cÃ³</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailGroup}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Sá»‘ Ä‘iá»‡n thoáº¡i liÃªn há»‡</span>
                                <span className={styles.detailValue}>{brand.hotline || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Email liÃªn há»‡</span>
                                <span className={styles.detailValue}>{brand.contactEmail || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
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
                            showToast('success', 'Cáº­p nháº­t thÆ°Æ¡ng hiá»‡u thÃ nh cÃ´ng!');
                            fetchBrand();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi cáº­p nháº­t thÆ°Æ¡ng hiá»‡u');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="XÃ¡c nháº­n xÃ³a"
                message={<span>Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a thÆ°Æ¡ng hiá»‡u <strong>{brand?.name}</strong> {brand?.code ? `(${brand.code})` : ''} khÃ´ng? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.</span>}
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="XÃ³a"
                cancelText="Há»§y"
                confirmButtonClass="btn-misa-danger"
            />

            <Toast {...toast} onClose={hideToast} />
        </AdminLayout>
    );
};

export default BrandDetailPage;
