import { useState, useEffect } from 'react';
import styles from './SupplierModal.module.css';

const SupplierModal = ({ onClose, onSave, initialData = null }) => {
    const [activeTab, setActiveTab] = useState('bankAccount');
    
    // Form state
    const [formData, setFormData] = useState({
        type: 'COMPANY',
        code: '',
        tax_code: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        group_type: 'RETAIL',
        credit_limit: '',
        payment_term_days: '',
        bank_name: '',
        bank_account_number: '',
        bank_beneficiary_name: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            setErrors({ name: 'Vui lòng nhập tên nhà cung cấp!' });
            return;
        }
        if (onSave) {
            onSave(formData);
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
                        <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                                <input 
                                    type="radio" 
                                    name="type" 
                                    value="COMPANY" 
                                    checked={formData.type === 'COMPANY'}
                                    onChange={handleChange}
                                /> 
                                Tổ chức
                            </label>
                            <label className={styles.radioLabel}>
                                <input 
                                    type="radio" 
                                    name="type" 
                                    value="INDIVIDUAL" 
                                    checked={formData.type === 'INDIVIDUAL'}
                                    onChange={handleChange}
                                /> 
                                Cá nhân
                            </label>
                        </div>
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
                            <label className={styles.formLabel}>Điện thoại</label>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="text" 
                                    className={styles.input} 
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="024 3..." 
                                />
                                <i className={`fas fa-phone-alt ${styles.inputIcon}`}></i>
                            </div>
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

                        <div className={`${styles.formGroup} ${styles.col8}`}>
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
                        <div className={`${styles.formGroup} ${styles.col4}`}>
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
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button 
                            className={`${styles.tab} ${activeTab === 'bankAccount' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('bankAccount')}
                        >
                            Tài khoản ngân hàng
                        </button>
                        <button 
                            className={`${styles.tab} ${activeTab === 'paymentTerms' ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab('paymentTerms')}
                        >
                            Điều khoản thanh toán
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

                        {activeTab === 'paymentTerms' && (
                            <div className={styles.formGrid} style={{ marginBottom: 0 }}>
                                <div className={`${styles.formGroup} ${styles.col6}`}>
                                    <label className={styles.formLabel}>Hạn mức nợ (VNĐ)</label>
                                    <input 
                                        type="number" 
                                        className={styles.input} 
                                        name="credit_limit"
                                        value={formData.credit_limit}
                                        onChange={handleChange}
                                        placeholder="0" 
                                    />
                                </div>
                                <div className={`${styles.formGroup} ${styles.col6}`}>
                                    <label className={styles.formLabel}>Thời hạn thanh toán (Số ngày)</label>
                                    <input 
                                        type="number" 
                                        className={styles.input} 
                                        name="payment_term_days"
                                        value={formData.payment_term_days}
                                        onChange={handleChange}
                                        placeholder="0" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="misa-modal-footer">
                    <div className={styles.footerLeft}>
                        <button className="btn-misa-cancel" onClick={onClose}>Hủy</button>
                    </div>
                    <div className={styles.footerRight}>
                        {!initialData && (
                            <button className="btn-misa-draft" onClick={handleSave}>Lưu & Thêm tiếp</button>
                        )}
                        <button className="btn-misa-save" onClick={handleSave}>
                            {initialData ? 'Cập nhật' : 'Lưu'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupplierModal;
