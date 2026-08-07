import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './StocktakeInitModal.module.css';
import { getTodayIsoDate } from '../../../utils/dateFormat';

function StocktakeInitModal({ onClose, warehouses = [] }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    warehouseId: 'all',
    toDate: getTodayIsoDate()
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    const params = new URLSearchParams({
      warehouseId: formData.warehouseId,
      toDate: formData.toDate,
    });

    navigate(`/stocktakes/create?${params.toString()}`);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            Kiểm kê vật tư hàng hóa <i className="bi bi-question-circle" style={{ fontSize: '15px', color: '#94a3b8' }}></i>
          </h3>
          <i className={`bi bi-x-lg ${styles.closeIcon}`} onClick={onClose}></i>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kiểm kê kho</label>
            <select
              className={styles.selectControl}
              name="warehouseId"
              value={formData.warehouseId}
              onChange={handleChange}
            >
              <option value="all">Tất cả kho</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Đến ngày</label>
            <input
              type="date"
              className={styles.inputControl}
              name="toDate"
              value={formData.toDate}
              onChange={handleChange}
            />
          </div>

          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            backgroundColor: '#e0f2fe',
            borderRadius: '6px',
            fontSize: '12.5px',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <i className="bi bi-info-circle-fill" style={{ fontSize: '14px', marginTop: '1px' }}></i>
            <div>
              Hệ thống tự động kích hoạt chế độ <strong>Quét Serial</strong> đối với các hàng hóa có cấu hình Quản lý Serial (<code>track_serial = true</code>).
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Hủy</button>
          <button className={styles.btnSubmit} onClick={handleSubmit}>Đồng ý</button>
        </div>

      </div>
    </div>
  );
}

export default StocktakeInitModal;
