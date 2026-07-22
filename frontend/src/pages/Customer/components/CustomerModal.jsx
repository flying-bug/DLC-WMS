import { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '../../../api/customerApi';
import styles from './CustomerModal.module.css';

const GROUP_OPTIONS = [
    { value: 'RETAIL', label: 'KhÃ¡ch láº»' },
    { value: 'WHOLESALE', label: 'KhÃ¡ch thá»£' },
    { value: 'DISTRIBUTOR', label: 'Äáº¡i lÃ½' },
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
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setApiError('');
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
        if (apiError) setApiError('');
        
        if (name === 'phone' && isEditMode && value !== editData.phone && value !== '') {
            setPhoneWarning('âš  Thay Ä‘á»•i sá»‘ Ä‘iá»‡n thoáº¡i sáº½ lÃ m thay Ä‘á»•i thÃ´ng tin Ä‘á»‹nh danh sá»Ÿ há»¯u thiáº¿t bá»‹. HÃ nh Ä‘á»™ng nÃ y sáº½ Ä‘Æ°á»£c ghi láº¡i vÃ o lá»‹ch sá»­.');
        } else if (name === 'phone') {
            setPhoneWarning('');
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = 'Vui lÃ²ng nháº­p tÃªn khÃ¡ch hÃ ng!';
        else if (form.name.trim().length > 150) newErrors.name = 'TÃªn khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 150 kÃ½ tá»±.';

        if (!form.phone.trim()) newErrors.phone = 'Vui lÃ²ng nháº­p sá»‘ Ä‘iá»‡n thoáº¡i!';

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = 'Email khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng!';
        }
        if (form.email && form.email.length > 100) newErrors.email = 'Email khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 100 kÃ½ tá»±.';
        if (form.address && form.address.length > 1000) newErrors.address = 'Äá»‹a chá»‰ khÃ´ng Ä‘Æ°á»£c vÆ°á»£t quÃ¡ 1000 kÃ½ tá»±.';

        return newErrors;
    };

    const handleSave = async (isContinue = false) => {
        setApiError('');
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setApiError('Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ cÃ¡c thÃ´ng tin báº¯t buá»™c (*)');
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
            const msg = responseData?.userMessage || responseData?.devMessage || error.message || 'CÃ³ lá»—i xáº£y ra. Vui lÃ²ng thá»­ láº¡i.';
            setApiError(msg);

            if (responseData?.errorCode === 'CUST02') {
                setErrors(prev => ({ ...prev, phone: responseData.userMessage }));
            } else if (responseData?.errorCode === 'CUST06') {
                setErrors(prev => ({ ...prev, code: responseData.userMessage }));
            } else if (responseData?.errorCode === 'VAL400') {
                const lowerMsg = msg.toLowerCase();
                const newErrors = {};
                if (lowerMsg.includes('tÃªn') || lowerMsg.includes('name')) newErrors.name = msg;
                else if (lowerMsg.includes('Ä‘iá»‡n thoáº¡i') || lowerMsg.includes('phone')) newErrors.phone = msg;
                else if (lowerMsg.includes('email')) newErrors.email = msg;
                else if (lowerMsg.includes('Ä‘á»‹a chá»‰') || lowerMsg.includes('address')) newErrors.address = msg;
                if (Object.keys(newErrors).length > 0) {
                    setErrors(prev => ({ ...prev, ...newErrors }));
                }
            }
            if (onError) onError(msg);
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
                        {isEditMode ? 'Chá»‰nh sá»­a KhÃ¡ch HÃ ng' : 'ThÃªm KhÃ¡ch HÃ ng'}
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.iconBtn} onClick={onClose} title="ÄÃ³ng">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="misa-modal-body">
                    {apiError && (
                        <div style={{ padding: '10px 14px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fca5a5' }}>
                            <i className="fas fa-exclamation-triangle" style={{ fontSize: '15px' }}></i>
                            <span>{apiError}</span>
                        </div>
                    )}
                    <div className={styles.formGrid}>
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>MÃ£ khÃ¡ch hÃ ng</label>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.code ? styles.inputError : ''}`} 
                                name="code"
                                value={form.code}
                                onChange={handleChange}
                                placeholder="Tá»± Ä‘á»™ng hoáº·c nháº­p tay..." 
                                disabled={isEditMode}
                            />
                            {errors.code && <span className={styles.errorMsg}>{errors.code}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>NhÃ³m khÃ¡ch hÃ ng</label>
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
                            <label className={styles.formLabel}>TÃªn khÃ¡ch hÃ ng <span className={styles.required}>*</span></label>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.name ? styles.inputError : ''}`} 
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="VÃ­ dá»¥: Nguyá»…n VÄƒn A..." 
                                maxLength={150}
                            />
                            {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Äiá»‡n thoáº¡i liÃªn há»‡ <span className={styles.required}>*</span></label>
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
                            <label className={styles.formLabel}>Äá»‹a chá»‰</label>
                            <textarea 
                                className={`${styles.input} ${errors.address ? styles.inputError : ''}`} 
                                style={{ resize: 'vertical', minHeight: '80px' }}
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Nháº­p Ä‘á»‹a chá»‰ chi tiáº¿t..." 
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
                        <button className="btn-misa-outline" onClick={onClose} disabled={submitting}>Há»§y</button>
                    </div>
                    <div className={styles.footerRight} style={{ display: 'flex', gap: '12px' }}>
                        {!isEditMode && (
                            <button className="btn-misa-outline" onClick={() => handleSave(true)} disabled={submitting}>
                                {submitting ? 'Äang lÆ°u...' : 'LÆ°u & ThÃªm tiáº¿p'}
                            </button>
                        )}
                        <button className="btn-misa-primary" onClick={() => handleSave(false)} disabled={submitting}>
                            {submitting ? (
                                <><i className="fas fa-spinner fa-spin"></i> Äang lÆ°u...</>
                            ) : (
                                isEditMode ? 'Cáº­p nháº­t' : 'LÆ°u'
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CustomerModal;
