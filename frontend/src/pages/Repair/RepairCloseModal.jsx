import React, { useState } from 'react';

const RepairCloseModal = ({ isOpen, onClose, onSubmit, customerPayAmount }) => {
  const [paymentStatus, setPaymentStatus] = useState('DEBT_RECORDED');

  if (!isOpen) return null;

  return (
    <div className="wms-modal-overlay">
      <div className="wms-modal-content" style={{ maxWidth: '500px' }}>
        <div className="wms-modal-header">
          <h5 className="wms-modal-title">Đóng phiếu sửa chữa</h5>
          <button className="wms-modal-close" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="wms-modal-body">
          <p>Phải thu khách hàng: <strong>{customerPayAmount?.toLocaleString()} đ</strong></p>
          <div className="wms-form-group">
            <label>Trạng thái thanh toán</label>
            <select className="wms-input" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
              <option value="PAID">Đã thanh toán (Thu tiền ngay)</option>
              <option value="DEBT_RECORDED">Ghi nợ khách hàng</option>
              <option value="NO_CHARGE">Không thu phí / Khách từ chối</option>
            </select>
          </div>
        </div>
        <div className="wms-modal-footer">
          <button className="btn-misa-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-misa-primary" onClick={() => onSubmit(paymentStatus)}>Đóng phiếu</button>
        </div>
      </div>
    </div>
  );
};

export default RepairCloseModal;
