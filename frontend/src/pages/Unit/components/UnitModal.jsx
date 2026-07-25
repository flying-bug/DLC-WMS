import { useState, useEffect } from 'react';
import axiosClient from '../../../api/axiosClient';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './UnitModal.module.css';

const UnitModal = ({ isOpen, onClose, onSaved, editData = null, onError }) => {
    const isEditMode = !!editData;

    const [form, setForm] = useState({ 
        name: '', 
        description: '', 
        status: 'ACTIVE' 
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setApiError('');
        if (isEditMode) {
            setForm({
                name: editData.name || '',
                description: editData.description || '',
                status: editData.status || 'ACTIVE',
            });
        } else {
            setForm({ name: '', description: '', status: 'ACTIVE' });
        }
        setErrors({});
    }, [isOpen, editData, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (apiError) setApiError('');
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = 'Vui lòng nhập tên đơn vị tính!';
        else if (form.name.trim().length > 100) newErrors.name = 'Tên không được vượt quá 100 ký tự.';

        if (form.description && form.description.length > 500) newErrors.description = 'Mô tả không được vượt quá 500 ký tự.';

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
                name: cleanString(form.name),
                description: cleanString(form.description),
                status: form.status,
            };

            if (isEditMode) {
                await axiosClient.put(`/units/${editData.id}`, payload);
                onSaved(true, isContinue);
            } else {
                await axiosClient.post('/units', payload);
                onSaved(false, isContinue);
            }
        } catch (error) {
            const responseData = error.response?.data;
            const msg = responseData?.userMessage || responseData?.devMessage || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
            setApiError(msg);

            if (responseData?.errorCode === 'VAL400') {
                const lowerMsg = msg.toLowerCase();
                const newErrors = {};
                if (lowerMsg.includes('tên') || lowerMsg.includes('name')) newErrors.name = msg;
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} dialogStyle={{ width: '500px', maxWidth: '90%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className={styles.header}>
                <h3 className={styles.headerTitle}>
                    {isEditMode ? 'Chỉnh sửa Đơn vị tính' : 'Thêm Đơn vị tính'}
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
                    <div className={`${styles.formGroup} ${styles.col12}`}>
                        <label className={styles.formLabel}>Tên đơn vị tính <span className={styles.required}>*</span></label>
                        <input 
                            type="text" 
                            className={`${styles.input} ${errors.name ? styles.inputError : ''}`} 
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Ví dụ: Cái, Hộp, Chiếc..." 
                            maxLength={100}
                            autoFocus
                        />
                        {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col12}`}>
                        <label className={styles.formLabel}>Mô tả</label>
                        <textarea 
                            className={`${styles.input} ${errors.description ? styles.inputError : ''}`} 
                            style={{ resize: 'vertical', minHeight: '80px' }}
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Nhập thông tin mô tả về đơn vị tính..." 
                            rows="3"
                            maxLength={500}
                        ></textarea>
                        {errors.description && <span className={styles.errorMsg}>{errors.description}</span>}
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

export default UnitModal;
