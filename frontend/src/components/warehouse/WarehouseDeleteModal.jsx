import styles from './WarehouseDeleteModal.module.css';

const WarehouseDeleteModal = ({ isOpen, onClose, onConfirm, warehouseName, warehouseCode }) => {
    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Xác nhận xóa kho</h2>
                    <button className={styles.modalClose} onClick={onClose} type="button">&times;</button>
                </div>
                
                <div className={styles.modalBody}>
                    <div className={styles.warningContainer}>
                        <i className={`fas fa-exclamation-triangle ${styles.warningIcon}`}></i>
                        <p className={styles.warningText}>Bạn có chắc chắn muốn xóa kho này?</p>
                    </div>
                    
                    <div className={styles.warehouseInfo}>
                        <span className={styles.warehouseName}>{warehouseName}</span>
                        {warehouseCode && <span className={styles.warehouseCode}> ({warehouseCode})</span>}
                    </div>
                    
                    <p className={styles.subText}>
                        Hành động này không thể hoàn tác. Hệ thống sẽ tự động chuyển trạng thái về Ngừng sử dụng nếu kho đã phát sinh giao dịch.
                    </p>
                </div>

                <div className={styles.modalFooter}>
                    <button type="button" className={styles.btnCancel} onClick={onClose}>
                        Hủy
                    </button>
                    <button type="button" className={styles.btnDelete} onClick={onConfirm}>
                        Xác nhận xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WarehouseDeleteModal;
