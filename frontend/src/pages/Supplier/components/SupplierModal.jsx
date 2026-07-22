import { useState, useEffect } from 'react';
import styles from './SupplierModal.module.css';

const SupplierModal = ({ onClose, onSave, onSaved, initialData = null }) => {
    const [activeTab, setActiveTab] = useState('bankAccount');
    
    // Form state
    const [formData, setFormData] = useState({
        code: '',
        tax_code: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        group_type: 'RETAIL',
        bank_name: '',
        bank_account_number: '',
        bank_beneficiary_name: '',
        status: 'APPROVED'
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    useEffect(() => {
        setApiError('');
        if (initialData) {
             
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        if (apiError) setApiError('');
    };

    const handleSave = async () => {
        setApiError('');
        const newErrors = {};
        if (!formData.name || !formData.name.trim()) newErrors.name = 'Vui lòng nhập tên nhà cung cấp!';
        if (!formData.phone || !formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại!';
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setApiError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
            return;
        }
        const callback = onSave || onSaved;
        if (callback) {
            try {
                setSubmitting(true);
                await callback(formData);
            } catch (err) {
                const msg = err.response?.data?.userMessage || err.response?.data?.devMessage || err.message || 'Lỗi lưu nhà cung cấp!';
                setApiError(msg);
            } finally {
                setSubmitting(false);
            }
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="misa-modal-overlay" onClick={handleBackdropClick}>
            <div className="misa-modal" style={{ width: '800px', maxWidth: '90%' }}>
                
                {/* Header */}
                <div className="misa-modal-header">
                    <div className={styles.headerTitle}>
                        {initialData ? 'Chỉnh sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp'}
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.iconBtn} title="Hướng dẫn">
                            <i className="far fa-question-circle"></i>
                        </button>
                        <button className={styles.iconBtn} onClick={onClose} title="Đóng">
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
                    {/* General Info Grid */}
                    <div className={styles.formGrid}>
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Mã nhà cung cấp</label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="Tự động hoặc nhập tay..." 
                            />
                        </div>
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Mã số thuế</label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="tax_code"
                                value={formData.tax_code}
                                onChange={handleChange}
                            />
                        </div>

                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Tên nhà cung cấp <span className={styles.required}>*</span></label>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.name ? styles.inputError : ''}`} 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ví dụ: Công ty TNHH Duy Long" 
                            />
                            {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Điện thoại <span className={styles.required}>*</span></label>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="text" 
                                    className={`${styles.input} ${errors.phone ? styles.inputError : ''}`} 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="024 3..." 
                                />
                                <i className={`fas fa-phone-alt ${styles.inputIcon}`}></i>
                            </div>
                            {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
                        </div>
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Email</label>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="email" 
                                    className={styles.input} 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="contact@company.com" 
                                />
                                <i className={`fas fa-envelope ${styles.inputIcon}`}></i>
                            </div>
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Địa chỉ</label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Số 82 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội" 
                            />
                        </div>
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Nhóm nhà cung cấp</label>
                            <div className={styles.inputWrapper}>
                                <select 
                                    className={styles.select} 
                                    name="group_type"
                                    value={formData.group_type}
                                    onChange={handleChange}
                                >
                                    <option value="RETAIL">Sản phẩm công nghệ</option>
                                    <option value="WHOLESALE">Nhà phân phối sỉ</option>
                                    <option value="DISTRIBUTOR">Đại lý ủy quyền</option>
                                </select>
                                <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                            </div>
                        </div>
                        {initialData && (
                            <div className={`${styles.formGroup} ${styles.col6}`}>
                                <label className={styles.formLabel}>Trạng thái</label>
                                <div className={styles.inputWrapper}>
                                    <select 
                                        className={styles.select} 
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                    >
                                        <option value="APPROVED">Đang hoạt động</option>
                                        <option value="INACTIVE">Ngừng hoạt động</option>
                                    </select>
                                    <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button 
                            className={`${styles.tab} ${activeTab === 'bankAccount' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('bankAccount')}
                        >
                            Tài khoản ngân hàng
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className={styles.tabContent}>
                        {activeTab === 'bankAccount' && (
                            <div className={styles.formGrid} style={{ marginBottom: 0 }}>
                                <div className={`${styles.formGroup} ${styles.col12}`}>
                                    <label className={styles.formLabel}>Tên ngân hàng (và chi nhánh)</label>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        name="bank_name"
                                        value={formData.bank_name}
                                        onChange={handleChange}
                                        placeholder="VD: VIETCOMBANK - Chi nhánh Thạch Thất" 
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.col6}`}>
                                    <label className={styles.formLabel}>Số tài khoản</label>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        name="bank_account_number"
                                        value={formData.bank_account_number}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.col6}`}>
                                    <label className={styles.formLabel}>Tên người thụ hưởng</label>
                                    <input 
                                        type="text" 
                                        className={styles.input} 
                                        name="bank_beneficiary_name"
                                        value={formData.bank_beneficiary_name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="misa-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fff' }}>
                    <div className={styles.footerLeft}>
                        <button className="btn-misa-outline" onClick={onClose} disabled={submitting}>Hủy</button>
                    </div>
                    <div className={styles.footerRight} style={{ display: 'flex', gap: '12px' }}>
                        {!initialData && (
                            <button className="btn-misa-outline" onClick={handleSave} disabled={submitting}>
                                {submitting ? 'Đang lưu...' : 'Lưu & Thêm tiếp'}
                            </button>
                        )}
                        <button className="btn-misa-primary" onClick={handleSave} disabled={submitting}>
                            {submitting ? (
                                <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                            ) : (
                                initialData ? 'Cập nhật' : 'Lưu'
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupplierModal;
