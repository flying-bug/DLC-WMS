import Modal from '../ui/Modal/Modal';
import styles from './WarehouseDeleteModal.module.css';

const WarehouseDeleteModal = ({ isOpen, onClose, onConfirm, warehouse }) => {
    if (!warehouse) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            ariaLabel="Xóa kho"
            dialogStyle={{ maxWidth: '450px', width: '100%' }}
        >
            <div className={styles.modalContent}>
                <div className={styles.modalBody}>
                    <div className={styles.header}>
                        <div className={styles.iconWrapper}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2>Xóa kho</h2>
                    </div>
                    
                    <div className={styles.content}>
                        <p>Bạn có chắc chắn muốn xóa kho này?</p>
                        <p className={styles.warehouseName}>
                            {warehouse.name} ({warehouse.code})
                        </p>
                        <p className={styles.warningText}>Hành động này không thể hoàn tác.</p>
                        <p className={styles.infoText}>Lưu ý: Hệ thống sẽ tự động chuyển trạng thái về INACTIVE nếu kho đã phát sinh giao dịch.</p>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                    <button className={styles.btnDelete} onClick={() => onConfirm(warehouse.id)}>Xóa kho</button>
                </div>
            </div>
        </Modal>
    );
};

export default WarehouseDeleteModal;
