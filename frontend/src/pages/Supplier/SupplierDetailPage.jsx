import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import SupplierModal from './components/SupplierModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import Toast from '../../components/ui/Toast/Toast';
import axiosClient from '../../api/axiosClient';
import styles from './SupplierDetailPage.module.css';

const formatCurrency = (val) => {
    if (!val) return '0 Ä‘';
    return `${new Intl.NumberFormat('vi-VN').format(val)} Ä‘`;
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
            console.error('Lá»—i táº£i chi tiáº¿t NCC:', error);
            showToast('error', error.response?.data?.userMessage || 'KhÃ´ng táº£i Ä‘Æ°á»£c thÃ´ng tin chi tiáº¿t nhÃ  cung cáº¥p');
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
            navigate('/suppliers', { state: { toastMessage: `ÄÃ£ xÃ³a nhÃ  cung cáº¥p ${supplier.name}`, toastType: 'success' } });
        } catch (error) {
            showToast('error', error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi xÃ³a nhÃ  cung cáº¥p');
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

    if (!supplier) {
        return (
            <AdminLayout>
                <div className={styles.pageBody}>
                    <div className={styles.emptyState}>
                        <i className={`bi bi-exclamation-circle ${styles.emptyIcon}`}></i>
                        <div className={styles.emptyText}>KhÃ´ng tÃ¬m tháº¥y nhÃ  cung cáº¥p nÃ y</div>
                        <button className={styles.btnPrimary} onClick={() => navigate('/suppliers')}>Quay láº¡i danh sÃ¡ch</button>
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
                        <h1 className={styles.pageTitle}>Chi tiáº¿t nhÃ  cung cáº¥p: {supplier.name}</h1>
                        <span className={`${styles.badge} ${supplier.status === 'APPROVED' ? styles.badgeSuccess : styles.badgeDanger}`}>
                            {supplier.status === 'APPROVED' ? 'Äang hoáº¡t Ä‘á»™ng' : 'Ngá»«ng hoáº¡t Ä‘á»™ng'}
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
                                <span className={styles.detailLabel}>MÃ£ nhÃ  cung cáº¥p</span>
                                <span className={styles.detailValue}>{supplier.code}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>TÃªn nhÃ  cung cáº¥p</span>
                                <span className={styles.detailValue} style={{ fontWeight: 600 }}>{supplier.name}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>NhÃ³m nhÃ  cung cáº¥p</span>
                                <span className={styles.detailValue}>{supplier.groupType === 'WHOLESALE' ? 'BÃ¡n buÃ´n' : 'BÃ¡n láº»'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>MÃ£ sá»‘ thuáº¿</span>
                                <span className={styles.detailValue}>{supplier.taxCode || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Äá»‹a chá»‰</span>
                                <span className={styles.detailValue}>{supplier.address || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailGroup}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Sá»‘ Ä‘iá»‡n thoáº¡i</span>
                                <span className={styles.detailValue}>{supplier.phone || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Email</span>
                                <span className={styles.detailValue}>{supplier.email || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
                        </div>

                        <div className={styles.detailRight}>
                            <div style={{ marginBottom: '8px', fontWeight: 600, color: 'var(--color-text-strong)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="bi bi-bank"></i> ThÃ´ng tin ngÃ¢n hÃ ng
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>NgÃ¢n hÃ ng</span>
                                <span className={styles.detailRightValue}>{supplier.bankName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Sá»‘ tÃ i khoáº£n</span>
                                <span className={styles.detailRightValue}>{supplier.bankAccountNumber || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
                            </div>
                            <div className={styles.detailRightRow}>
                                <span className={styles.detailRightLabel}>Chá»§ tÃ i khoáº£n</span>
                                <span className={styles.detailRightValue}>{supplier.bankBeneficiaryName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>ChÆ°a cáº­p nháº­t</span>}</span>
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
                            showToast('success', 'Cáº­p nháº­t nhÃ  cung cáº¥p thÃ nh cÃ´ng!');
                            fetchSupplier();
                        } catch (error) {
                            showToast('error', error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra khi cáº­p nháº­t NCC');
                        }
                    }}
                />
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="XÃ¡c nháº­n xÃ³a"
                message={<span>Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a nhÃ  cung cáº¥p <strong>{supplier?.name}</strong> {supplier?.code ? `(${supplier.code})` : ''} khÃ´ng? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.</span>}
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

export default SupplierDetailPage;
