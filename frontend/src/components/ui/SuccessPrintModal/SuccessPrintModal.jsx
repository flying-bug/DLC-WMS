import React from 'react';
import styles from './SuccessPrintModal.module.css';

const SuccessPrintModal = ({
  isOpen,
  title = "Lưu và ghi sổ thành công!",
  message = "Phiếu đã được ghi sổ vào hệ thống thành công.",
  docCode = "",
  printBtnText = "In phiếu",
  onPrint,
  onPrintSummary,
  onViewList,
  onCreateNew,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrintSummary = () => {
    if (onPrintSummary) onPrintSummary();
    else if (onPrint) onPrint('SUMMARY');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose || onViewList}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.iconContainer}>
          <i className="bi bi-check-circle-fill"></i>
        </div>

        <h3 className={styles.modalTitle}>{title}</h3>
        
        {docCode && (
          <div className={styles.docCodeBadge}>
            Mã phiếu: <strong>{docCode}</strong>
          </div>
        )}

        <p className={styles.modalMessage}>{message}</p>

        <div className={styles.actionGroup}>
          <div className={styles.printButtonsRow}>
            {(onPrintSummary || onPrint) && (
              <button className={styles.btnPrint} onClick={handlePrintSummary}>
                <i className="bi bi-printer"></i> {printBtnText}
              </button>
            )}

          </div>

          {onViewList && (
            <button className={styles.btnList} onClick={onViewList}>
              <i className="bi bi-list-ul"></i> Xem danh sách
            </button>
          )}

          {onCreateNew && (
            <button className={styles.btnNew} onClick={onCreateNew}>
              <i className="bi bi-plus-lg"></i> Tạo phiếu mới
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessPrintModal;
