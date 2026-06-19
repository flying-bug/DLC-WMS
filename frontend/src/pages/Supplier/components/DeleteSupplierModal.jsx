import styles from './DeleteSupplierModal.module.css';

const DeleteSupplierModal = ({ supplier, onClose, onDelete }) => {
    
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                
                <div className={styles.body}>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>

                    <div className={styles.iconWrapper}>
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>

                    <h2 className={styles.title}>Xác nhận xóa nhà cung cấp</h2>

                    <div className={styles.messageBox}>
                        <p className={styles.message}>
                            Bạn có chắc chắn muốn xóa nhà cung cấp <strong>{supplier?.name}</strong> {supplier?.code ? `(${supplier.code})` : ''}?
                        </p>
                    </div>

                    <div className={styles.warningBox}>
                        <i className="fas fa-info-circle"></i> Hành động này không thể hoàn tác.
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.btnCancel} onClick={onClose}>
                        Hủy
                    </button>
                    <button className={styles.btnDelete} onClick={() => onDelete(supplier)}>
                        Xác nhận xóa
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DeleteSupplierModal;
