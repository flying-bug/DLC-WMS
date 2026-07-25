import { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './SupplierModal.module.css';

const SupplierModal = ({ onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        status: 'APPROVED',
        groupType: 'RETAIL',
        taxCode: '',
        phone: '',
        email: '',
        address: '',
        contactName: '',
        bankName: '',
        bankAccountNumber: '',
        bankBeneficiaryName: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
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
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Vui lòng nhập tên nhà cung cấp!';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email không đúng định dạng!';
        }

        if (formData.phone && !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(formData.phone)) {
            newErrors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)!';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return false;
        }

        setErrors({});
        return true;
    };

    const handleSave = () => {
        if (validate()) {
            if (onSave) onSave(formData);
        }
    };

    const handleSaveNext = () => {
        if (validate()) {
            if (onSave) onSave(formData, true);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} dialogStyle={{ width: '800px', maxWidth: '95%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className={styles.header}>
                <h3 className={styles.headerTitle}>
                    {initialData ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                </h3>
                <button className={styles.iconBtn} onClick={onClose} title="Đóng">
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>

            {/* Body */}
            <div className={styles.body}>
                <div className={styles.formGrid}>
                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Mã nhà cung cấp</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="Tự động sinh nếu để trống" 
                            disabled={!!initialData}
                        />
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        {initialData && (
                            <>
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
                                    <i className={`bi bi-chevron-down ${styles.selectIcon}`}></i>
                                </div>
                            </>
                        )}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col12}`}>
                        <label className={styles.formLabel}>Tên nhà cung cấp <span className={styles.required}>*</span></label>
                        <input 
                            type="text" 
                            className={`${styles.input} ${errors.name ? styles.inputError : ''}`} 
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ví dụ: Công ty TNHH MTV..." 
                        />
                        {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                    </div>
                    
                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Nhóm nhà cung cấp</label>
                        <div className={styles.inputWrapper}>
                            <select 
                                className={styles.select} 
                                name="groupType"
                                value={formData.groupType}
                                onChange={handleChange}
                            >
                                <option value="RETAIL">Bán lẻ</option>
                                <option value="WHOLESALE">Bán buôn</option>
                            </select>
                            <i className={`bi bi-chevron-down ${styles.selectIcon}`}></i>
                        </div>
                    </div>
                    
                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Mã số thuế</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            name="taxCode"
                            value={formData.taxCode}
                            onChange={handleChange}
                            placeholder="Nhập mã số thuế..." 
                        />
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Điện thoại</label>
                        <div className={styles.inputWrapper}>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.phone ? styles.inputError : ''}`} 
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="09xx..." 
                            />
                            <i className={`bi bi-telephone ${styles.inputIcon}`}></i>
                        </div>
                        {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
                    </div>

                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Email</label>
                        <div className={styles.inputWrapper}>
                            <input 
                                type="email" 
                                className={`${styles.input} ${errors.email ? styles.inputError : ''}`} 
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="contact@supplier.com" 
                            />
                            <i className={`bi bi-envelope ${styles.inputIcon}`}></i>
                        </div>
                        {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
                    </div>
                    
                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Người liên hệ</label>
                        <div className={styles.inputWrapper}>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="contactName"
                                value={formData.contactName}
                                onChange={handleChange}
                                placeholder="Nhập tên người liên hệ..." 
                            />
                            <i className={`bi bi-person ${styles.inputIcon}`}></i>
                        </div>
                    </div>
                    
                    <div className={`${styles.formGroup} ${styles.col6}`}>
                        <label className={styles.formLabel}>Địa chỉ</label>
                        <div className={styles.inputWrapper}>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Nhập địa chỉ..." 
                            />
                            <i className={`bi bi-geo-alt ${styles.inputIcon}`}></i>
                        </div>
                    </div>
                    
                    {/* Bank Info section */}
                    <div className={`${styles.formGroup} ${styles.col12}`} style={{ marginTop: '8px', marginBottom: '0' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-strong)', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
                            <i className="bi bi-bank" style={{ marginRight: '8px' }}></i>
                            Thông tin ngân hàng
                        </div>
                    </div>
                    
                    <div className={`${styles.formGroup} ${styles.col4}`}>
                        <label className={styles.formLabel}>Tên ngân hàng</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            name="bankName"
                            value={formData.bankName}
                            onChange={handleChange}
                            placeholder="Vietcombank, Techcombank..." 
                        />
                    </div>
                    
                    <div className={`${styles.formGroup} ${styles.col4}`}>
                        <label className={styles.formLabel}>Số tài khoản</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            name="bankAccountNumber"
                            value={formData.bankAccountNumber}
                            onChange={handleChange}
                            placeholder="Nhập số tài khoản..." 
                        />
                    </div>
                    
                    <div className={`${styles.formGroup} ${styles.col4}`}>
                        <label className={styles.formLabel}>Tên chủ thẻ</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            name="bankBeneficiaryName"
                            value={formData.bankBeneficiaryName}
                            onChange={handleChange}
                            placeholder="Nhập tên chủ thẻ..." 
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
                <div className={styles.footerLeft}>
                    <button className={styles.btnOutline} onClick={onClose}>Hủy</button>
                </div>
                <div className={styles.footerRight}>
                    {!initialData && (
                        <button className={styles.btnOutline} onClick={handleSaveNext}>
                            Lưu & Thêm tiếp
                        </button>
                    )}
                    <button className={styles.btnPrimary} onClick={handleSave}>
                        <i className="bi bi-check-lg" style={{ marginRight: '6px' }}></i>
                        {initialData ? 'Cập nhật' : 'Lưu'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default SupplierModal;
