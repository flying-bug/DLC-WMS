const BrandDeleteModal = ({ isOpen, onClose, onConfirm, brand }) => {
    if (!isOpen || !brand) return null;

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
                            Xác nhận xóa Thương hiệu
                        </h3>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                            Bạn có chắc chắn muốn xóa thương hiệu <strong>{brand.name}</strong>? Hành động này <span style={{ color: '#ef4444', fontWeight: 'bold' }}>không thể hoàn tác</span> và có thể ảnh hưởng đến các sản phẩm liên quan trong hệ thống kho vận.
                        </p>
                        <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.4 }}>
                            <i className="fas fa-info-circle" style={{ marginTop: '2px' }}></i>
                            <span>Lưu ý: Bạn chỉ có thể xóa nếu không có lệnh xuất kho đang treo cho thương hiệu này.</span>
                        </div>
                    </div>
                </div>

                <div className="misa-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', backgroundColor: '#f8fafc' }}>
                    <button className="btn-misa-cancel" onClick={onClose} style={{ minWidth: '80px' }}>
                        Hủy
                    </button>
                    <button className="btn-misa-danger" onClick={() => onConfirm(brand.id)} style={{ minWidth: '100px' }}>
                        Xác nhận xóa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrandDeleteModal;
