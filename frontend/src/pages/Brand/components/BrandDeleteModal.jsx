import styles from './BrandDeleteModal.module.css';

const BrandDeleteModal = ({ isOpen, onClose, onConfirm, brand }) => {
    if (!isOpen || !brand) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.body}>
                    <div className={styles.iconContainer}>
                        <div className={styles.alertIcon}>
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                    </div>
                    <div className={styles.content}>
                        <h2 className={styles.title}>Xác nhận xóa Thương hiệu</h2>
                        <p className={styles.message}>
                            Bạn có chắc chắn muốn xóa thương hiệu <strong>{brand.name}</strong>? Hành động này <span className={styles.dangerText}>không thể hoàn tác</span> và có thể ảnh hưởng đến các sản phẩm liên quan trong hệ thống kho vận.
                        </p>
                    </div>
                </div>
                
                <div className={styles.noticeBox}>
                    <i className="bi bi-info-circle"></i>
                    <p>Lưu ý: Bạn chỉ có thể xóa nếu không có lệnh xuất kho đang treo cho thương hiệu này.</p>
                </div>

                <div className={styles.footer}>
                    <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
                    <button className={styles.btnConfirm} onClick={() => onConfirm(brand.id)}>
                        <i className="bi bi-x-square"></i> Xác nhận xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrandDeleteModal;
