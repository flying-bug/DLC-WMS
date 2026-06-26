import { useState } from 'react';
import styles from './BrandModal.module.css';

const BrandModal = ({ onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        status: 'ACTIVE',
        email: '',
        hotline: '',
        ...initialData
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        if (!formData.name.trim()) {
            alert('Vui lòng nhập tên thương hiệu!');
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
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.headerTitle}>
                        <i className={initialData ? "fas fa-edit" : "fas fa-plus-circle"}></i>
                        {initialData ? 'Sửa Thương hiệu' : 'Thêm Thương hiệu Mới'}
                    </h2>
                    <div className={styles.headerActions}>
                        <button className={styles.iconBtn} onClick={onClose} title="Đóng">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    <div className={styles.formGrid}>
                        {/* Mã thương hiệu */}
                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Mã Thương hiệu</label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="code"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="Nhập mã thương hiệu (tự động nếu để trống)..." 
                            />
                        </div>

                        {/* Tên thương hiệu */}
                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Tên Thương hiệu <span className={styles.required}>*</span></label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Nhập tên thương hiệu..." 
                                autoFocus
                            />
                        </div>

                        {/* Trạng thái & Email Liên hệ */}
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Trạng thái</label>
                            <div className={styles.inputWrapper}>
                                <select 
                                    className={styles.select} 
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="ACTIVE">Đang hoạt động</option>
                                    <option value="INACTIVE">Ngừng hoạt động</option>
                                </select>
                                <i className={`fas fa-chevron-down ${styles.selectIcon}`}></i>
                            </div>
                        </div>
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Email Liên hệ</label>
                            <input 
                                type="email" 
                                className={styles.input} 
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="contact@brand.com" 
                            />
                        </div>

                        {/* Hotline */}
                        <div className={`${styles.formGroup} ${styles.col6}`}>
                            <label className={styles.formLabel}>Hotline</label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                name="hotline"
                                value={formData.hotline}
                                onChange={handleChange}
                                placeholder="Nhập số hotline..." 
                            />
                        </div>

                        {/* Mô tả chi tiết */}
                        <div className={`${styles.formGroup} ${styles.col12}`}>
                            <label className={styles.formLabel}>Mô tả chi tiết</label>
                            <textarea 
                                className={styles.textarea} 
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
                <div className={styles.footer}>
                    <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                    <button className={styles.btnSave} onClick={handleSave}>
                        <i className="fas fa-save"></i>
                        {initialData ? 'Cập nhật Thương hiệu' : 'Lưu Thương hiệu'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default BrandModal;
