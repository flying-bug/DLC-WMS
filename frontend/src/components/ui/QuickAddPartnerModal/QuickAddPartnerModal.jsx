import { useState } from 'react';
import Modal from '../Modal/Modal';
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

  if (!isOpen) return null;

  const title = type === 'customer' ? 'ThÃªm nhanh KhÃ¡ch hÃ ng' : 'ThÃªm nhanh NhÃ  cung cáº¥p';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Vui lÃ²ng nháº­p tÃªn.');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      setFormData({ code: '', name: '', phone: '', address: '', email: '' });
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.userMessage || 'CÃ³ lá»—i xáº£y ra.');
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
          <label className="misa-label">MÃ£ (Tá»± sinh náº¿u Ä‘á»ƒ trá»‘ng)</label>
          <input className="misa-input" name="code" value={formData.code} onChange={handleChange} placeholder={`MÃ£ ${type === 'customer' ? 'KH' : 'NCC'}`} />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">TÃªn <span className="required">*</span></label>
          <input className="misa-input" name="name" value={formData.name} onChange={handleChange} placeholder={`TÃªn ${type === 'customer' ? 'KhÃ¡ch hÃ ng' : 'NhÃ  cung cáº¥p'}`} required />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Sá»‘ Ä‘iá»‡n thoáº¡i</label>
          <input className="misa-input" name="phone" value={formData.phone} onChange={handleChange} placeholder="Sá»‘ Ä‘iá»‡n thoáº¡i" />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Email</label>
          <input className="misa-input" name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
        </div>
        <div className="misa-form-group" style={{ marginBottom: '16px' }}>
          <label className="misa-label">Äá»‹a chá»‰</label>
          <input className="misa-input" name="address" value={formData.address} onChange={handleChange} placeholder="Äá»‹a chá»‰ Ä‘áº§y Ä‘á»§" />
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>Há»§y</button>
          <button type="submit" className={styles.btnConfirm} disabled={saving}>
            {saving ? 'Äang lÆ°u...' : 'LÆ°u'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default QuickAddPartnerModal;
