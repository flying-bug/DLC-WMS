import React from 'react';
import styles from './ConfirmModal.module.css';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Xác nhận", cancelText = "Hủy bỏ", isDanger = false }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} style={{ zIndex: 1001 }} onClick={onCancel}>
      <div className={styles.modalContent} style={{ maxWidth: '400px', padding: '0' }} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} style={{ fontSize: '16px' }}>
            <i className="bi bi-exclamation-triangle" style={{ color: isDanger ? 'var(--color-danger)' : 'var(--color-warning)', marginRight: '8px' }}></i>
            {title}
          </h3>
          <button className={styles.modalClose} onClick={onCancel}>&times;</button>
        </div>
        <div className={styles.modalBody}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-strong)', lineHeight: '1.5' }}>
            {message}
          </p>
        </div>
        <div className={styles.detailFooter} style={{ justifyContent: 'flex-end', gap: '12px', padding: '16px' }}>
          <button className={styles.btnOutline} style={{ border: 'none', background: '#f1f5f9' }} onClick={onCancel}>{cancelText}</button>
          <button className={isDanger ? styles.btnDanger : styles.btnPrimary} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
