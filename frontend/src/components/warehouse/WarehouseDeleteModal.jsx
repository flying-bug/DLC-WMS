import Modal from '../ui/Modal/Modal';
import styles from './WarehouseDeleteModal.module.css';

const WarehouseDeleteModal = ({ isOpen, onClose, onConfirm, warehouse }) => {
    if (!warehouse) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            ariaLabel="XÃ³a kho"
            dialogStyle={{ maxWidth: '450px', width: '100%' }}
        >
            <div className={styles.modalContent}>
                <div className={styles.modalBody}>
                    <div className={styles.header}>
                        <div className={styles.iconWrapper}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2>XÃ³a kho</h2>
                    </div>
                    
                    <div className={styles.content}>
                        <p>Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a kho nÃ y?</p>
                        <p className={styles.warehouseName}>
                            {warehouse.name} ({warehouse.code})
                        </p>
                        <p className={styles.warningText}>HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.</p>
                        <p className={styles.infoText}>LÆ°u Ã½: Há»‡ thá»‘ng sáº½ tá»± Ä‘á»™ng chuyá»ƒn tráº¡ng thÃ¡i vá» INACTIVE náº¿u kho Ä‘Ã£ phÃ¡t sinh giao dá»‹ch.</p>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnCancel} onClick={onClose}>Há»§y</button>
                    <button className={styles.btnDelete} onClick={() => onConfirm(warehouse.id)}>XÃ³a kho</button>
                </div>
            </div>
        </Modal>
    );
};

export default WarehouseDeleteModal;
