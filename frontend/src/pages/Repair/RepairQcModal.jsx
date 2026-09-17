import React, { useState } from 'react';

const RepairQcModal = ({ isOpen, onClose, onSubmit }) => {
  const [qcResult, setQcResult] = useState('PASS');
  const [qcNote, setQcNote] = useState('');

  if (!isOpen) return null;

  return (
    <div className="wms-modal-overlay">
      <div className="wms-modal-content" style={{ maxWidth: '500px' }}>
        <div className="wms-modal-header">
          <h5 className="wms-modal-title">Nghiệm thu (QC) sửa chữa</h5>
          <button className="wms-modal-close" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="wms-modal-body">
          <div className="wms-form-group">
            <label>Kết quả QC</label>
            <select className="wms-input" value={qcResult} onChange={e => setQcResult(e.target.value)}>
              <option value="PASS">PASS (Đạt)</option>
              <option value="FAIL">FAIL (Không đạt)</option>
              <option value="CONDITIONAL">CONDITIONAL (Đạt có điều kiện)</option>
            </select>
          </div>
          <div className="wms-form-group">
            <label>Ghi chú QC</label>
            <textarea className="wms-input" rows="3" value={qcNote} onChange={e => setQcNote(e.target.value)}></textarea>
          </div>
        </div>
        <div className="wms-modal-footer">
          <button className="btn-misa-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-misa-primary" onClick={() => onSubmit({ qcResult, qcNote, qcChecklist: '{}' })}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
};

export default RepairQcModal;
