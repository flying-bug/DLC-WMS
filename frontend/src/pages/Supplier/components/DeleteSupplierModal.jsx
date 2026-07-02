const DeleteSupplierModal = ({ supplier, onClose, onDelete }) => {
    
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="misa-modal-overlay" onClick={handleBackdropClick}>
            <div className="misa-modal" style={{ width: '450px' }}>
                <div className="misa-modal-body" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', padding: '24px 24px 16px 24px' }}>
                    <div style={{ 
                        backgroundColor: '#fef3c7', 
                        color: '#d97706', 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '22px', 
                        flexShrink: 0 
                    }}>
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                            Xác nhận xóa nhà cung cấp
                        </h3>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                            Bạn có chắc chắn muốn xóa nhà cung cấp <strong>{supplier?.name}</strong> {supplier?.code ? `(${supplier.code})` : ''}?
                        </p>
                        <div style={{ fontSize: '13px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-info-circle"></i> Hành động này không thể hoàn tác.
                        </div>
                    </div>
                </div>

                <div className="misa-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#f8fafc' }}>
                    <button className="btn-misa-cancel" onClick={onClose} style={{ minWidth: '80px' }}>
                        Hủy
                    </button>
                    <button className="btn-misa-danger" onClick={() => onDelete(supplier)} style={{ minWidth: '100px' }}>
                        Xác nhận xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteSupplierModal;
