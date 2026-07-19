import { useState, useEffect } from 'react';
import styles from './BrandModal.module.css';

const BrandModal = ({ onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        status: 'APPROVED',
        contactEmail: '',
        hotline: '',
        description: ''
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

    const handleSave = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Vui lòng nhập tên thương hiệu!';
        }

        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Email không đúng định dạng!';
        }

        if (formData.hotline && !/^(0[3|5|7|8|9])+([0-9]{8})$/.test(formData.hotline)) {
            newErrors.hotline = 'Số điện thoại không hợp lệ (VD: 0912345678)!';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
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
            <div className="misa-modal" style={{ width: '600px', maxWidth: '90%' }}>
                
                {/* Header */}
                <div className="misa-modal-header">
                    <div className={styles.headerTitle}>
                        {initialData ? 'Chỉnh sửa Thương Hiệu' : 'Thêm Thương Hiệu'}
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
                            <label className={styles.formLabel}>Mã thương hiệu</label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="Tự động hoặc nhập tay..." 
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
                                        <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Tên thương hiệu <span className={styles.required}>*</span></label>
                            <input 
                                type="text" 
                                className={`${styles.input} ${errors.name ? styles.inputError : ''}`} 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ví dụ: Dell, HP..." 
                            />
                            {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Điện thoại liên hệ</label>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="text" 
                                    className={`${styles.input} ${errors.hotline ? styles.inputError : ''}`} 
                                    name="hotline"
                                    value={formData.hotline}
                                    onChange={handleChange}
                                    placeholder="0912..." 
                                />
                                <i className={`fas fa-phone-alt ${styles.inputIcon}`}></i>
                            </div>
                            {errors.hotline && <span className={styles.errorMsg}>{errors.hotline}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Email liên hệ</label>
                            <div className={styles.inputWrapper}>
                                <input 
                                    type="email" 
                                    className={`${styles.input} ${errors.contactEmail ? styles.inputError : ''}`} 
                                    name="contactEmail"
                                    value={formData.contactEmail}
                                    onChange={handleChange}
                                    placeholder="contact@brand.com" 
                                />
                                <i className={`fas fa-envelope ${styles.inputIcon}`}></i>
                            </div>
                            {errors.contactEmail && <span className={styles.errorMsg}>{errors.contactEmail}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Mô tả chi tiết</label>
                            <textarea 
                                className={styles.input} 
                                style={{ resize: 'vertical', minHeight: '80px' }}
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Nhập thông tin mô tả về thương hiệu..." 
                                rows="3"
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="misa-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', backgroundColor: '#fff' }}>
                    <div className={styles.footerLeft}>
                        <button className="btn-misa-outline" onClick={onClose}>Hủy</button>
                    </div>
                    <div className={styles.footerRight} style={{ display: 'flex', gap: '12px' }}>
                        {!initialData && (
                            <button className="btn-misa-outline" onClick={() => {
                                const newErrors = {};
                                if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên thương hiệu!';
                                if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
                                onSave(formData, true);
                            }}>Lưu & Thêm tiếp</button>
                        )}
                        <button className="btn-misa-primary" onClick={handleSave}>
                            {initialData ? 'Cập nhật' : 'Lưu'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BrandModal;
