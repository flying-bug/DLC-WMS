import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './StocktakeInitModal.module.css';

function StocktakeInitModal({ onClose, warehouses = [] }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    warehouseId: 'all',
    toDate: new Date().toISOString().split('T')[0],
    isDetailBy: false,
    detailByField: 'serial'
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = () => {
    // Navigate to create page with query parameters
    const params = new URLSearchParams({
      warehouseId: formData.warehouseId,
      toDate: formData.toDate,
    });

    if (formData.isDetailBy) {
      params.append('detailBy', formData.detailByField);
    }

    navigate(`/stocktakes/create?${params.toString()}`);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Kiá»ƒm kÃª váº­t tÆ° hÃ ng hÃ³a <i className="bi bi-question-circle" style={{ fontSize: '15px', color: '#94a3b8' }}></i></h3>
          <i className={`bi bi-x-lg ${styles.closeIcon}`} onClick={onClose}></i>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kiá»ƒm kÃª kho</label>
            <select
              className={styles.selectControl}
              name="warehouseId"
              value={formData.warehouseId}
              onChange={handleChange}
            >
              <option value="all">Táº¥t cáº£</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Äáº¿n ngÃ y</label>
            <input
              type="date"
              className={styles.inputControl}
              name="toDate"
              value={formData.toDate}
              onChange={handleChange}
            />
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                name="isDetailBy"
                checked={formData.isDetailBy}
                onChange={handleChange}
              />
              Chi tiáº¿t theo
            </label>
          </div>

          <div className={styles.fieldGroup}>
            <select
              className={styles.selectControl}
              name="detailByField"
              value={formData.detailByField}
              onChange={handleChange}
              disabled={!formData.isDetailBy}
            >
              <option value="serial">Serial Number (S/N)</option>
              <option value="supplier">NhÃ  cung cáº¥p</option>
              <option value="slot">Sá»‘ LÃ´</option>
            </select>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose}>Há»§y</button>
          <button className={styles.btnSubmit} onClick={handleSubmit}>Äá»“ng Ã½</button>
        </div>

      </div>
    </div>
  );
}

export default StocktakeInitModal;
