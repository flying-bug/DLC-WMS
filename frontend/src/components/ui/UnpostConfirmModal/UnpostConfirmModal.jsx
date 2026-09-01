import React, { useState, useEffect } from 'react';
import styles from './UnpostConfirmModal.module.css';

export default function UnpostConfirmModal({
  open,
  onClose,
  docCode,
  onCheckDependency,
  onConfirmUnpost,
  docType = 'nhập'
}) {
  const [checking, setChecking] = useState(true);
  const [checkResult, setCheckResult] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && onCheckDependency) {
      setChecking(true);
      setCheckResult(null);
      setReason('');
      onCheckDependency()
        .then((res) => {
          const data = res.data?.data || res.data;
          setCheckResult(data);
        })
        .catch((err) => {
          setCheckResult({
            canUnpost: false,
            message: 'Không thể kiểm tra phụ thuộc: ' + (err.response?.data?.message || err.message)
          });
        })
        .finally(() => setChecking(false));
    }
  }, [open, onCheckDependency]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do bỏ ghi sổ để lưu vết Audit Log.');
      return;
    }
    try {
      setSubmitting(true);
      await onConfirmUnpost(reason);
      onClose();
    } catch (err) {
      alert('Lỗi bỏ ghi sổ: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <i className="fas fa-undo-alt" style={{ color: '#dc2626' }}></i>
            Bỏ ghi sổ Phiếu {docType}: {docCode}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        <div className={styles.modalBody}>
          {checking ? (
            <div className={styles.checkingState}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.75rem' }}></i>
              <span>Đang kiểm tra ràng buộc 6 chiều (Âm kho, Serial, Lắp ráp PC, Bảo hành)...</span>
            </div>
          ) : checkResult && !checkResult.canUnpost ? (
            <div className={styles.conflictAlert}>
              <div className={styles.conflictTitle}>
                <i className="fas fa-exclamation-triangle"></i>
                Không thể bỏ ghi sổ trực tiếp!
              </div>
              <p>{checkResult.message}</p>
              {checkResult.details && checkResult.details.length > 0 && (
                <ul className={styles.conflictList}>
                  {checkResult.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className={styles.safeAlert}>
                <i className="fas fa-check-circle"></i>
                <span>Chứng từ đủ điều kiện an toàn để bỏ ghi sổ. Tồn kho và serial sẽ được hoàn tác.</span>
              </div>

              <div className={styles.reasonGroup}>
                <label className={styles.reasonLabel}>
                  Lý do bỏ ghi sổ <span style={{ color: '#dc2626' }}>*</span> (Bắt buộc ghi nhận Audit Log):
                </label>
                <textarea
                  className={styles.reasonTextarea}
                  placeholder="Ví dụ: Nhập nhầm số lượng, sai tên nhà cung cấp, hoặc cần điều chỉnh serial..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            {checkResult && !checkResult.canUnpost ? 'Đóng' : 'Hủy bỏ'}
          </button>
          {checkResult && checkResult.canUnpost && (
            <button
              type="button"
              className={styles.btnConfirm}
              onClick={handleConfirm}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fas fa-undo-alt"></i> Xác nhận Bỏ ghi sổ
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
