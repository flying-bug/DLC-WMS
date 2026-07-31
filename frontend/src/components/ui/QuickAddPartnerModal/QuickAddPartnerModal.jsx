import { useState } from 'react';
import Modal from '../Modal/Modal';
import Toast from '../Toast/Toast';
import styles from './QuickAddPartnerModal.module.css';

function QuickAddPartnerModal({ isOpen, onClose, type = 'customer', onSave }) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    address: '',
    email: '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

  if (!isOpen) return null;

  const title = type === 'customer' ? 'Thêm nhanh Khách hàng' : 'Thêm nhanh Nhà cung cấp';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setToast({ isVisible: true, type: 'error', message: 'Vui lòng nhập tên đối tác.' });
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      setFormData({ code: '', name: '', phone: '', address: '', email: '' });
    } catch (error) {
      console.error(error);
      setToast({ isVisible: true, type: 'error', message: error.response?.data?.userMessage || 'Có lỗi xảy ra.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} dialogClassName={styles.customModal}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>{title}</h3>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>
      <form onSubmit={handleSubmit} className={styles.body}>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Mã (Tự sinh nếu để trống)</label>
          <input className="misa-input" name="code" value={formData.code} onChange={handleChange} placeholder={`Mã ${type === 'customer' ? 'KH' : 'NCC'}`} />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Tên <span className="required">*</span></label>
          <input className="misa-input" name="name" value={formData.name} onChange={handleChange} placeholder={`Tên ${type === 'customer' ? 'Khách hàng' : 'Nhà cung cấp'}`} required />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Số điện thoại</label>
          <input className="misa-input" name="phone" value={formData.phone} onChange={handleChange} placeholder="Số điện thoại" />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Email</label>
          <input className="misa-input" name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Địa chỉ</label>
          <input className="misa-input" name="address" value={formData.address} onChange={handleChange} placeholder="Địa chỉ đầy đủ" />
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>Hủy</button>
          <button type="submit" className={styles.btnConfirm} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>

      {toast.isVisible && (
          <Toast
              type={toast.type}
              message={toast.message}
              onClose={() => setToast({ ...toast, isVisible: false })}
          />
      )}
    </Modal>
  );
}

export default QuickAddPartnerModal;
