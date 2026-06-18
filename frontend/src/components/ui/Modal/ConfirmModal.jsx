import Modal from './Modal';
import styles from './ConfirmModal.module.css';

/**
 * ConfirmModal component for critical actions like delete.
 * Props:
 *   isOpen, onClose, onConfirm
 *   title (string)
 *   message (string)
 *   itemName (string)
 *   warningText (string)
 *   confirmText (string)
 *   cancelText (string)
 *   isLoading (boolean)
 */
function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Xác nhận',
    message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
    itemName = '',
    warningText = '',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    isLoading = false
}) {
    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            ariaLabel={title}
            className={styles.confirmModal}
        >
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <div className={styles.iconWrapper}>
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 className={styles.title}>{title}</h3>
                </div>

                <div className={styles.body}>
                    <p className={styles.message}>{message}</p>
                    {itemName && <p className={styles.itemName}>{itemName}</p>}
                    {warningText && <p className={styles.warningText}>{warningText}</p>}
                </div>

                <div className={styles.footer}>
                    <button 
                        className={styles.btnCancel} 
                        onClick={onClose} 
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button 
                        className={styles.btnConfirm} 
                        onClick={onConfirm} 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang xử lý...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default ConfirmModal;
