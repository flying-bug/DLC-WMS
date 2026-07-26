import { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './ProductCategoryModal.module.css';

const STATUS_OPTIONS = [
    { value: 'APPROVED', label: 'Đang sử dụng' },
    { value: 'INACTIVE', label: 'Ngừng sử dụng' },
];

const ProductCategoryModal = ({ isOpen, onClose, onSaved, editData = null, onError, parentOptions = [] }) => {
    const isEditMode = !!editData;

    const [form, setForm] = useState({
        parentId: '',
        code: '',
        name: '',
        status: 'APPROVED',
        description: ''
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setApiError('');
        if (isEditMode) {
            setForm({
                parentId: editData.parentId || '',
                code: editData.code || '',
                name: editData.name || '',
                status: editData.status || 'APPROVED',
                description: editData.description || '',
            });
        } else {
            setForm({ parentId: '', code: '', name: '', status: 'APPROVED', description: '' });
        }
        setErrors({});
    }, [isOpen, editData, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'code') {
            setForm(prev => ({ ...prev, [name]: value.toUpperCase() }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (apiError) setApiError('');
    };

    const validate = () => {
        const newErrors = {};
        if (!form.code.trim()) newErrors.code = 'Vui lòng nhập mã danh mục!';
        else if (form.code.trim().length > 50) newErrors.code = 'Mã không được vượt quá 50 ký tự.';

        if (!form.name.trim()) newErrors.name = 'Vui lòng nhập tên danh mục!';
        else if (form.name.trim().length > 100) newErrors.name = 'Tên không được vượt quá 100 ký tự.';

        return newErrors;
    };

    const handleSave = async (isContinue = false) => {
        setApiError('');
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setApiError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
            return;
        }

        setSubmitting(true);
        try {
            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;
            const payload = {
                parentId: form.parentId ? Number(form.parentId) : null,
                code: cleanString(form.code),
                name: cleanString(form.name),
                status: form.status,
                description: cleanString(form.description),
            };

            if (isEditMode) {
                await axiosClient.put(`/product-categories/${editData.id}`, payload);
                onSaved(true, isContinue);
            } else {
                await axiosClient.post('/product-categories', payload);
                onSaved(false, isContinue);
            }
        } catch (error) {
            const responseData = error.response?.data;
            const msg = responseData?.userMessage || responseData?.devMessage || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
            setApiError(msg);

            if (responseData?.errorCode === 'VAL400') {
                const lowerMsg = msg.toLowerCase();
                const newErrors = {};
                if (lowerMsg.includes('mã') || lowerMsg.includes('code')) newErrors.code = msg;
                else if (lowerMsg.includes('tên') || lowerMsg.includes('name')) newErrors.name = msg;
                if (Object.keys(newErrors).length > 0) {
                    setErrors(prev => ({ ...prev, ...newErrors }));
                }
            }
            if (onError) onError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Lọc bỏ danh mục hiện tại (nếu đang sửa) khỏi danh sách cha hợp lệ để tránh vòng lặp cha-con
    const filteredParentOptions = parentOptions.filter(item => item.id !== editData?.id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} dialogStyle={{ width: '600px', maxWidth: '90%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className={styles.header}>
                <h3 className={styles.headerTitle}>
                    {isEditMode ? 'Chỉnh sửa Danh mục sản phẩm' : 'Thêm Danh mục sản phẩm'}
                </h3>
                <button className={styles.iconBtn} onClick={onClose} title="Đóng">
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            {/* Body */}
            <div className={styles.body}>
                {apiError && (
                    <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fca5a5' }}>
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '15px' }}></i>
                        <span>{apiError}</span>
                    </div>
                )}

                <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Mã danh mục <span className={styles.required}>*</span></label>
                        <input
                            type="text"
                            className={`${styles.input} ${errors.code ? styles.inputError : ''}`}
                            name="code"
                            value={form.code}
                            onChange={handleChange}
                            placeholder="Ví dụ: CPU..."
                            maxLength={50}
                            autoFocus
                        />
                        {errors.code && <span className={styles.errorMsg}>{errors.code}</span>}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Tên danh mục <span className={styles.required}>*</span></label>
                        <input
                            type="text"
                            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Ví dụ: Bộ vi xử lý..."
                            maxLength={100}
                        />
                        {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Danh mục cha</label>
                        <select
                            className={styles.select}
                            name="parentId"
                            value={form.parentId}
                            onChange={handleChange}
                        >
                            <option value="">Không có</option>
                            {filteredParentOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.code} - {opt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Trạng thái</label>
                        <select
                            className={styles.select}
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className={`${styles.formGroup} ${styles.col12}`}>
                        <label className={styles.formLabel}>Mô tả</label>
                        <textarea
                            className={styles.input}
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Nhập mô tả danh mục..."
                            style={{ minHeight: '80px', resize: 'vertical', padding: '12px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <div className={styles.footerLeft}>
                    <button className={styles.btnOutline} onClick={onClose} disabled={submitting}>Hủy</button>
                </div>
                <div className={styles.footerRight}>
                    {!isEditMode && (
                        <button className={styles.btnOutline} onClick={() => handleSave(true)} disabled={submitting}>
                            {submitting ? 'Đang lưu...' : 'Lưu & Thêm tiếp'}
                        </button>
                    )}
                    <button className={styles.btnPrimary} onClick={() => handleSave(false)} disabled={submitting}>
                        {submitting ? (
                            <><i className="bi bi-hourglass-split" style={{ marginRight: '6px' }}></i> Đang lưu...</>
                        ) : (
                            <><i className="bi bi-check-lg" style={{ marginRight: '6px' }}></i> {isEditMode ? 'Cập nhật' : 'Lưu'}</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ProductCategoryModal;
