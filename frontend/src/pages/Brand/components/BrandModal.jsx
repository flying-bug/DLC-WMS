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
        <div className="misa-modal-overlay" onClick={handleBackdropClick}>
            <div className="misa-modal">
                
                {/* Header */}
                <div className="misa-modal-header">
                    <h2>
                        <i className={initialData ? "fas fa-edit" : "fas fa-plus-circle"}></i>
                        {initialData ? 'Sửa Thương hiệu' : 'Thêm Thương hiệu Mới'}
                    </h2>
                    <button className={styles.iconBtn} onClick={onClose} title="Đóng">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="misa-modal-body">
                    {/* Mã thương hiệu */}
                    <div className="misa-form-group">
                        <label>Mã Thương hiệu</label>
                        <input 
                            type="text" 
                            className="misa-input" 
                            name="code"
                            value={formData.code}
                            onChange={handleChange}
                            placeholder="Nhập mã thương hiệu (tự động nếu để trống)..." 
                        />
                    </div>

                    {/* Tên thương hiệu */}
                    <div className="misa-form-group">
                        <label>Tên Thương hiệu <span className="required">*</span></label>
                        <input 
                            type="text" 
                            className="misa-input" 
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Nhập tên thương hiệu..." 
                            autoFocus
                        />
                    </div>

                    {/* Trạng thái & Email Liên hệ */}
                    <div className="misa-form-row">
                        <div className="misa-form-group">
                            <label>Trạng thái</label>
                            <select 
                                className="misa-select" 
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="ACTIVE">Đang hoạt động</option>
                                <option value="INACTIVE">Ngừng hoạt động</option>
                            </select>
                        </div>
                        <div className="misa-form-group">
                            <label>Email Liên hệ</label>
                            <input 
                                type="email" 
                                className="misa-input" 
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="contact@brand.com" 
                            />
                        </div>
                    </div>

                    {/* Hotline & Trống */}
                    <div className="misa-form-row">
                        <div className="misa-form-group">
                            <label>Hotline</label>
                            <input 
                                type="text" 
                                className="misa-input" 
                                name="hotline"
                                value={formData.hotline}
                                onChange={handleChange}
                                placeholder="Nhập số hotline..." 
                            />
                        </div>
                        <div className="misa-form-group" style={{ visibility: 'hidden' }}>
                            <label>Spacer</label>
                            <input className="misa-input" />
                        </div>
                    </div>

                    {/* Mô tả chi tiết */}
                    <div className="misa-form-group">
                        <label>Mô tả chi tiết</label>
                        <textarea 
                            className="misa-textarea" 
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Nhập thông tin mô tả về thương hiệu..." 
                            rows="3"
                        ></textarea>
                    </div>
                </div>

                {/* Footer */}
                <div className="misa-modal-footer">
                    <button className="btn-misa-cancel" onClick={onClose}>Hủy</button>
                    <button className="btn-misa-save" onClick={handleSave}>
                        <i className="fas fa-save"></i>
                        {initialData ? 'Cập nhật' : 'Lưu'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default BrandModal;
