import { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '../../../api/customerApi';
import styles from './CustomerModal.module.css';

const GROUP_OPTIONS = [
    { value: 'RETAIL', label: 'Khách lẻ' },
    { value: 'WHOLESALE', label: 'Khách thợ' },
    { value: 'DISTRIBUTOR', label: 'Đại lý' },
];

const CustomerModal = ({ isOpen, onClose, onSaved, editData = null, onError }) => {
    const isEditMode = !!editData;

    const [form, setForm] = useState({ 
        code: '',
        name: '', 
        phone: '', 
        email: '', 
        address: '', 
        groupType: 'RETAIL' 
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [phoneWarning, setPhoneWarning] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        if (isEditMode) {
            setForm({
                code: editData.code || '',
                name: editData.name || '',
                phone: editData.phone || '',
                email: editData.email || '',
                address: editData.address || '',
                groupType: editData.groupType || 'RETAIL',
            });
            setPhoneWarning('');
        } else {
            setForm({ code: '', name: '', phone: '', email: '', address: '', groupType: 'RETAIL' });
        }
        setErrors({});
    }, [isOpen, editData, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        
        if (name === 'phone' && isEditMode && value !== editData.phone && value !== '') {
            setPhoneWarning('⚠ Thay đổi số điện thoại sẽ làm thay đổi thông tin định danh sở hữu thiết bị. Hành động này sẽ được ghi lại vào lịch sử.');
        } else if (name === 'phone') {
            setPhoneWarning('');
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = 'Vui lòng nhập tên khách hàng!';
        else if (form.name.trim().length > 150) newErrors.name = 'Tên không được vượt quá 150 ký tự.';

        if (!form.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại!';

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = 'Email không đúng định dạng!';
        }
        if (form.email && form.email.length > 100) newErrors.email = 'Email không được vượt quá 100 ký tự.';
        if (form.address && form.address.length > 1000) newErrors.address = 'Địa chỉ không được vượt quá 1000 ký tự.';

        return newErrors;
    };

    const handleSave = async (isContinue = false) => {
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        try {
            const cleanString = (str) => (str && str.trim() !== '') ? str.trim() : null;
            const payload = {
                code: cleanString(form.code),
                name: cleanString(form.name),
                phone: cleanString(form.phone),
                email: cleanString(form.email),
                address: cleanString(form.address),
                groupType: form.groupType,
            };

            if (isEditMode) {
                await updateCustomer(editData.id, payload);
                onSaved(true, isContinue);
            } else {
                await createCustomer(payload);
                onSaved(false, isContinue);
            }
        } catch (error) {
            const responseData = error.response?.data;
            if (responseData?.errorCode === 'CUST02') {
                setErrors(prev => ({ ...prev, phone: responseData.userMessage }));
            } else if (responseData?.errorCode === 'CUST06') {
                setErrors(prev => ({ ...prev, code: responseData.userMessage }));
            } else if (responseData?.errorCode === 'VAL400') {
                const msg = responseData.userMessage || '';
                const newErrors = {};
                if (msg.toLowerCase().includes('tên') || msg.toLowerCase().includes('name')) newErrors.name = msg;
                else if (msg.toLowerCase().includes('điện thoại') || msg.toLowerCase().includes('phone')) newErrors.phone = msg;
                else if (msg.toLowerCase().includes('email')) newErrors.email = msg;
                else if (msg.toLowerCase().includes('địa chỉ') || msg.toLowerCase().includes('address')) newErrors.address = msg;
                if (Object.keys(newErrors).length > 0) {
                    setErrors(prev => ({ ...prev, ...newErrors }));
                } else if (onError) {
                    onError(msg);
                }
            } else {
                const msg = responseData?.userMessage || 'Có lỗi xảy ra. Vui lòng thử lại.';
                if (onError) onError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="misa-modal-overlay" onClick={handleBackdropClick}>
            <div className="misa-modal" style={{ width: '600px', maxWidth: '90%' }}>
                
                {/* Header */}
                <div className="misa-modal-header">
                    <div className={styles.headerTitle}>
                        {isEditMode ? 'Chỉnh sửa Khách Hàng' : 'Thêm Khách Hàng'}
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.iconBtn} onClick={onClose} title="Đóng">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="misa-modal-body">
                    <div className={styles.formGrid}>
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Mã khách hàng</label>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.code ? styles.inputError : ''}`} 
                                name="code"
                                value={form.code}
                                onChange={handleChange}
                                placeholder="Tự động hoặc nhập tay..." 
                                disabled={isEditMode}
                            />
                            {errors.code && <span className={styles.errorMsg}>{errors.code}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Nhóm khách hàng</label>
                            <div className={styles.inputWrapper}>
                                <select 
                                    className={styles.select} 
                                    name="groupType"
                                    value={form.groupType}
                                    onChange={handleChange}
                                >
                                    {GROUP_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                            </div>
                        </div>

                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Tên khách hàng <span className={styles.required}>*</span></label>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.name ? styles.inputError : ''}`} 
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Ví dụ: Nguyễn Văn A..." 
                                maxLength={150}
                            />
                            {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Điện thoại liên hệ <span className={styles.required}>*</span></label>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="tel" 
                                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`} 
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="0912..." 
                                />
                                <i className={`fas fa-phone-alt ${styles.inputIcon}`}></i>
                            </div>
                            {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
                            {phoneWarning && <span className={styles.warningMsg}>{phoneWarning}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Email</label>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="email" 
                                    className={`${styles.input} ${errors.email ? styles.inputError : ''}`} 
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="contact@example.com" 
                                    maxLength={100}
                                />
                                <i className={`fas fa-envelope ${styles.inputIcon}`}></i>
                            </div>
                            {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Địa chỉ</label>
                            <textarea 
                                className={`${styles.input} ${errors.address ? styles.inputError : ''}`} 
                                style={{ resize: 'vertical', minHeight: '80px' }}
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Nhập địa chỉ chi tiết..." 
                                rows="3"
                                maxLength={1000}
                            ></textarea>
                            {errors.address && <span className={styles.errorMsg}>{errors.address}</span>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="misa-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fff' }}>
                    <div className={styles.footerLeft}>
                        <button className="btn-misa-outline" onClick={onClose} disabled={submitting}>Hủy</button>
                    </div>
                    <div className={styles.footerRight} style={{ display: 'flex', gap: '12px' }}>
                        {!isEditMode && (
                            <button className="btn-misa-outline" onClick={() => handleSave(true)} disabled={submitting}>
                                {submitting ? 'Đang lưu...' : 'Lưu & Thêm tiếp'}
                            </button>
                        )}
                        <button className="btn-misa-primary" onClick={() => handleSave(false)} disabled={submitting}>
                            {submitting ? (
                                <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                            ) : (
                                isEditMode ? 'Cập nhật' : 'Lưu'
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CustomerModal;
