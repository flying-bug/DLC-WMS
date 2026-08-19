import { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '../../../api/customerApi';
import { lookupTaxCode } from '../../../api/taxLookupApi';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './CustomerModal.module.css';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';


const GROUP_OPTIONS = [
    { value: 'RETAIL', label: 'Khách lẻ' },
    { value: 'WHOLESALE', label: 'Khách thợ' },
    { value: 'DISTRIBUTOR', label: 'Đại lý' },
];

const CustomerModal = ({ isOpen, onClose, onSaved, onSuccess, editData = null, onError }) => {
    const isEditMode = !!editData;

    const [form, setForm] = useState({ 
        code: '',
        name: '', 
        phone: '', 
        email: '', 
        address: '', 
        taxCode: '',
        groupType: 'RETAIL' 
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [phoneWarning, setPhoneWarning] = useState('');
    const [apiError, setApiError] = useState('');
    const [lookingUpTax, setLookingUpTax] = useState(false);
    const [taxLookupMsg, setTaxLookupMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        if (!isOpen) return;
        setApiError('');
        setTaxLookupMsg({ type: '', text: '' });
        if (isEditMode) {
            setForm({
                code: editData.code || '',
                name: editData.name || '',
                phone: editData.phone || '',
                email: editData.email || '',
                address: editData.address || '',
                taxCode: editData.taxCode || '',
                groupType: editData.groupType || 'RETAIL',
            });
            setPhoneWarning('');
        } else {
            setForm({ code: '', name: '', phone: '', email: '', address: '', taxCode: '', groupType: 'RETAIL' });
        }
        setErrors({});
    }, [isOpen, editData, isEditMode]);

    const handleTaxLookup = async () => {
        if (!form.taxCode || !form.taxCode.trim()) {
            setTaxLookupMsg({ type: 'error', text: 'Vui lòng nhập Mã số thuế trước khi tra cứu' });
            return;
        }
        setLookingUpTax(true);
        setTaxLookupMsg({ type: '', text: '' });
        try {
            const res = await lookupTaxCode(form.taxCode.trim());
            const data = res.data?.data;
            if (data && data.success) {
                setForm(prev => ({
                    ...prev,
                    name: data.name || prev.name,
                    address: data.address || prev.address,
                    groupType: 'DISTRIBUTOR',
                }));
                setTaxLookupMsg({ type: 'success', text: `Tìm thấy: ${data.name} (${data.rawStatusText || 'Đang hoạt động'})` });
                setErrors(prev => ({ ...prev, name: '' }));
            } else {
                setTaxLookupMsg({ type: 'error', text: data?.message || 'Không tìm thấy thông tin công ty từ mã số thuế này' });
            }
        } catch (err) {
            setTaxLookupMsg({ type: 'error', text: 'Tra cứu mã số thuế thất bại hoặc dịch vụ tạm ngưng' });
        } finally {
            setLookingUpTax(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (apiError) setApiError('');
        
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
                code: cleanString(form.code),
                name: cleanString(form.name),
                phone: cleanString(form.phone),
                email: cleanString(form.email),
                address: cleanString(form.address),
                taxCode: cleanString(form.taxCode),
                groupType: form.groupType,
            };

            let savedRecord = null;
            if (isEditMode) {
                const res = await updateCustomer(editData.id, payload);
                savedRecord = res?.data?.data || res?.data || payload;
                if (typeof onSaved === 'function') onSaved(true, isContinue, savedRecord);
                if (typeof onSuccess === 'function') onSuccess(savedRecord, true, isContinue);
            } else {
                const res = await createCustomer(payload);
                savedRecord = res?.data?.data || res?.data || payload;
                if (typeof onSaved === 'function') onSaved(false, isContinue, savedRecord);
                if (typeof onSuccess === 'function') onSuccess(savedRecord, false, isContinue);
            }
        } catch (error) {
            const responseData = error.response?.data;
            const msg = responseData?.userMessage || responseData?.devMessage || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
            setApiError(msg);

            if (responseData?.errorCode === 'CUST02') {
                setErrors(prev => ({ ...prev, phone: responseData.userMessage }));
            } else if (responseData?.errorCode === 'CUST06') {
                setErrors(prev => ({ ...prev, code: responseData.userMessage }));
            } else if (responseData?.errorCode === 'VAL400') {
                const lowerMsg = msg.toLowerCase();
                const newErrors = {};
                if (lowerMsg.includes('tên') || lowerMsg.includes('name')) newErrors.name = msg;
                else if (lowerMsg.includes('điện thoại') || lowerMsg.includes('phone')) newErrors.phone = msg;
                else if (lowerMsg.includes('email')) newErrors.email = msg;
                else if (lowerMsg.includes('địa chỉ') || lowerMsg.includes('address')) newErrors.address = msg;
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
        <Modal isOpen={isOpen} onClose={onClose} dialogStyle={{ width: '600px', maxWidth: '90%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className={styles.header}>
                <h3 className={styles.headerTitle}>
                    {isEditMode ? 'Chỉnh sửa Khách Hàng' : 'Thêm Khách Hàng'}
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
                    {isEditMode && (
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Mã khách hàng</label>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.code ? styles.inputError : ''}`} 
                                name="code"
                                value={form.code}
                                disabled={true}
                            />
                            {errors.code && <span className={styles.errorMsg}>{errors.code}</span>}
                        </div>
                    )}

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Nhóm khách hàng</label>
                        <SearchableSelect 
                            className={styles.select} 
                            name="groupType"
                            value={form.groupType}
                            onChange={handleChange}
                        >
                            {GROUP_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </SearchableSelect>
                    </div>

                    <div className={`${styles.formGroup} ${styles.col12}`}>
                        <label className={styles.formLabel}>Mã số thuế doanh nghiệp (nếu có)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                className={styles.input}
                                name="taxCode"
                                value={form.taxCode}
                                onChange={handleChange}
                                placeholder="Ví dụ: 0100109106..." 
                                maxLength={50}
                            />
                            <button
                                type="button"
                                onClick={handleTaxLookup}
                                disabled={lookingUpTax || !form.taxCode?.trim()}
                                style={{
                                    padding: '0 14px',
                                    background: '#0284c7',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <i className={`bi ${lookingUpTax ? 'bi-arrow-repeat spin' : 'bi-search'}`} />
                                {lookingUpTax ? 'Đang tra...' : 'Tra cứu MST'}
                            </button>
                        </div>
                        {taxLookupMsg.text && (
                            <div style={{
                                marginTop: '6px', fontSize: '12px',
                                color: taxLookupMsg.type === 'success' ? '#166534' : '#dc2626',
                                background: taxLookupMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                                padding: '4px 8px', borderRadius: '4px'
                            }}>
                                {taxLookupMsg.text}
                            </div>
                        )}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col12}`}>
                        <label className={styles.formLabel}>Tên khách hàng / Đơn vị <span className={styles.required}>*</span></label>
                        <input 
                            type="text" 
                            className={`${styles.input} ${errors.name ? styles.inputError : ''}`} 
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Ví dụ: Công ty TNHH ABC hoặc Nguyễn Văn A..." 
                            maxLength={150}
                        />
                        {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Điện thoại liên hệ <span className={styles.required}>*</span></label>
                        <input 
                            type="tel" 
                            className={`${styles.input} ${errors.phone ? styles.inputError : ''}`} 
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="Ví dụ: 0912..." 
                        />
                        {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
                        {phoneWarning && <span className={styles.warningMsg}>{phoneWarning}</span>}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Email</label>
                        <input 
                            type="email" 
                            className={`${styles.input} ${errors.email ? styles.inputError : ''}`} 
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="contact@example.com" 
                            maxLength={100}
                        />
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

export default CustomerModal;
