import { useState, useEffect } from 'react';
import { createCustomer, updateCustomer } from '../../../api/customerApi';
import styles from './CustomerQuickCreateDrawer.module.css';

const GROUP_OPTIONS = [
    { value: 'RETAIL', label: 'Khách lẻ' },
    { value: 'WHOLESALE', label: 'Khách thợ' },
    { value: 'DISTRIBUTOR', label: 'Đại lý' },
];

/**
 * Drawer tạo nhanh / chỉnh sửa Khách hàng.
 * Dùng chung cho cả Quick Create (từ màn hình giao dịch) và Edit (từ danh sách).
 *
 * @param {boolean}  isOpen   - Hiện/ẩn drawer
 * @param {object}   editData - null = tạo mới, object = chỉnh sửa
 * @param {function} onClose  - Callback đóng drawer
 * @param {function} onSaved(isEdit)  - Callback sau khi lưu thành công
 * @param {function} onError(msg)     - Callback khi có lỗi không thuộc form field (optional)
 */
const CustomerQuickCreateDrawer = ({ isOpen, editData, onClose, onSaved, onError }) => {
    const isEditMode = !!editData;

    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', groupType: 'RETAIL' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [phoneWarning, setPhoneWarning] = useState('');

    // Reset form khi mở
    useEffect(() => {
        if (!isOpen) return;
        Promise.resolve().then(() => {
            if (isEditMode) {
                setForm({
                    name: editData.name || '',
                    phone: editData.phone || '',
                    email: editData.email || '',
                    address: editData.address || '',
                    groupType: editData.groupType || 'RETAIL',
                });
                setPhoneWarning('');
            } else {
                setForm({ name: '', phone: '', email: '', address: '', groupType: 'RETAIL' });
            }
            setErrors({});
        });
    }, [isOpen, editData, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // Xóa lỗi khi user bắt đầu gõ lại
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        // Cảnh báo thay đổi SĐT (Issue #2 clarify.md)
        if (name === 'phone' && isEditMode && value !== editData.phone && value !== '') {
            setPhoneWarning('⚠ Thay đổi số điện thoại sẽ làm thay đổi thông tin định danh sở hữu thiết bị. Hành động này sẽ được ghi lại vào lịch sử.');
        } else if (name === 'phone') {
            setPhoneWarning('');
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = 'Tên khách hàng là bắt buộc.';
        else if (form.name.trim().length > 150) newErrors.name = 'Tên không được vượt quá 150 ký tự.';

        if (!form.phone.trim()) newErrors.phone = 'Số điện thoại là bắt buộc.';

        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = 'Email không đúng định dạng.';
        }
        if (form.email && form.email.length > 100) newErrors.email = 'Email không được vượt quá 100 ký tự.';
        if (form.address && form.address.length > 1000) newErrors.address = 'Địa chỉ không được vượt quá 1000 ký tự.';

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                address: form.address.trim() || null,
                groupType: form.groupType,
            };

            if (isEditMode) {
                await updateCustomer(editData.id, payload);
            } else {
                await createCustomer(payload);
            }

            onSaved(isEditMode);
        } catch (error) {
            const responseData = error.response?.data;
            // errorCode: CUST02 = SĐT đã tồn tại
            if (responseData?.errorCode === 'CUST02') {
                setErrors(prev => ({ ...prev, phone: responseData.userMessage }));
            } else if (responseData?.errorCode === 'VAL400') {
                // Lỗi @Valid — phân loại vào đúng field
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

    // Đóng khi click overlay
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
                {/* Header */}
                <div className={styles.drawerHeader}>
                    <h3 className={styles.drawerTitle}>
                        <i className={`fas ${isEditMode ? 'fa-pen' : 'fa-user-plus'}`}></i>
                        {isEditMode ? 'Chỉnh sửa khách hàng' : 'Thêm nhanh khách hàng'}
                    </h3>
                    <button id="btn-close-drawer" className={styles.closeBtn} onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Form */}
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                    <div className={styles.formBody}>
                        {/* Tên khách hàng */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="customer-name">
                                Tên khách hàng <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="customer-name"
                                type="text"
                                name="name"
                                placeholder="Nhập tên khách hàng..."
                                value={form.name}
                                onChange={handleChange}
                                className={`misa-input ${errors.name ? styles.inputError : ''}`}
                                maxLength={150}
                            />
                            {errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
                        </div>

                        {/* Số điện thoại */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="customer-phone">
                                Số điện thoại <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="customer-phone"
                                type="tel"
                                name="phone"
                                placeholder="VD: 0901234567"
                                value={form.phone}
                                onChange={handleChange}
                                className={`misa-input ${errors.phone ? styles.inputError : ''}`}
                            />
                            {errors.phone && <span className={styles.errorMsg}>{errors.phone}</span>}
                            {phoneWarning && <span className={styles.warningMsg}>{phoneWarning}</span>}
                        </div>

                        {/* Nhóm khách hàng */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="customer-group">Nhóm khách hàng</label>
                            <select
                                id="customer-group"
                                name="groupType"
                                value={form.groupType}
                                onChange={handleChange}
                                className="misa-select"
                            >
                                {GROUP_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Email */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="customer-email">Email</label>
                            <input
                                id="customer-email"
                                type="email"
                                name="email"
                                placeholder="Nhập email (không bắt buộc)"
                                value={form.email}
                                onChange={handleChange}
                                className={`misa-input ${errors.email ? styles.inputError : ''}`}
                                maxLength={100}
                            />
                            {errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
                        </div>

                        {/* Địa chỉ */}
                        <div className={styles.formGroup}>
                            <label className={styles.label} htmlFor="customer-address">Địa chỉ</label>
                            <textarea
                                id="customer-address"
                                name="address"
                                placeholder="Nhập địa chỉ (không bắt buộc)"
                                value={form.address}
                                onChange={handleChange}
                                className={`misa-textarea ${errors.address ? styles.inputError : ''}`}
                                rows={3}
                                maxLength={1000}
                            />
                            {errors.address && <span className={styles.errorMsg}>{errors.address}</span>}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className={styles.drawerFooter}>
                        <button type="button" id="btn-cancel-drawer" className="btn-misa-cancel" onClick={onClose}>
                            Hủy
                        </button>
                        <button
                            type="submit"
                            id="btn-submit-drawer"
                            className="btn-misa-save"
                            disabled={submitting}
                        >
                            {submitting
                                ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                                : <><i className="fas fa-save"></i> {isEditMode ? 'Cập nhật' : 'Tạo khách hàng'}</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerQuickCreateDrawer;
