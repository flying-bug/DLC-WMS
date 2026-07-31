import { useState, useEffect, useRef } from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './RepairSerialModal.module.css';
import * as inventoryExportApi from '../../../api/inventoryExportApi';

function RepairSerialModal({ isOpen, onClose, productName, warehouseId, variantId, initialSerialObj = null }) {
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [errorText, setErrorText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSerialObj && initialSerialObj.serialNumberId) {
        setSerials([initialSerialObj]);
      } else {
        setSerials([]);
      }
      setInputValue('');
      setErrorText('');
    }
  }, [isOpen, initialSerialObj]);

  const handleAdd = async () => {
    setErrorText('');
    const val = inputValue.trim();
    if (!val) return;

    if (serials.length >= 1) {
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryExportApi.resolveScan({ code: val, warehouseId });
      const data = res.data?.data || res.data;
      if (data.type !== 'SERIAL') {
        setErrorText('Mã quét được không phải là Số Serial.');
        setLoading(false);
        return;
      }
      if (data.variantId !== variantId) {
        setErrorText('Serial này không thuộc sản phẩm đang chọn.');
        setLoading(false);
        return;
      }
      
      setSerials([{ serialNumber: data.serialNumber, serialNumberId: data.serialNumberId }]);
      setInputValue('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 10);
    } catch (e) {
      setErrorText(e.response?.data?.userMessage || e.response?.data?.message || 'Lỗi quét Serial');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (indexToRemove) => {
    setSerials(serials.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAll = () => {
    setSerials([]);
  };

  const progressPercent = Math.min((serials.length / 1) * 100, 100);
  const isFull = serials.length >= 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} dialogClassName={styles.customModal}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>Quản lý Serial Number</h2>
          <p className={styles.headerSubtitle}>Sản phẩm: {productName}</p>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.body}>
        <div className={styles.leftCol}>
          <div className={styles.sectionTitle}>CÁCH 1: NHẬP THỦ CÔNG</div>
          <div className={styles.inputRow} style={{ marginBottom: errorText ? '12px' : '32px' }}>
            <div className={styles.inputWrapper}>
              <i className={`bi bi-keyboard ${styles.inputIcon}`}></i>
              <input 
                ref={inputRef}
                type="text" 
                className={styles.serialInput} 
                placeholder={isFull ? "Đã nhập đủ số lượng" : "Gõ Serial number..."}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (errorText) setErrorText('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
                disabled={isFull}
                style={{ backgroundColor: isFull ? '#f3f4f6' : 'white' }}
              />
            </div>
            <button 
              className={styles.addBtn} 
              onClick={handleAdd}
              disabled={isFull || loading}
              style={{ opacity: (isFull || loading) ? 0.6 : 1, cursor: (isFull || loading) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Đang kiểm tra...' : 'Thêm'}
            </button>
          </div>
          {errorText && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '20px', fontWeight: 500 }}>{errorText}</div>}

          <div className={styles.sectionTitle}>CÁCH 2: QUÉT MÃ VẠCH</div>
          <div className={styles.scanBox} style={{ opacity: isFull ? 0.6 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}>
            <i className={`bi bi-upc-scan ${styles.scanIcon}`}></i>
            <span className={styles.scanText}>{isFull ? "Đã hoàn thành" : "Bấm để bật Camera quét"}</span>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.progressTitle}>TIẾN ĐỘ NHẬP</div>
          <div className={styles.progressRow}>
            <div className={styles.progressText}>
              <span className={styles.progressNumber}>{serials.length}</span> / 1 Serial
            </div>
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBarFill} 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className={styles.serialList}>
            {serials.map((serialObj, idx) => (
              <div key={idx} className={styles.serialItem} style={{ justifyContent: 'space-between' }}>
                <div>
                  <span className={styles.serialIndex}>{idx + 1}.</span>
                  <span className={styles.serialValue}>{serialObj.serialNumber}</span>
                </div>
                <button 
                  onClick={() => handleRemove(idx)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  <i className="bi bi-trash3"></i>
                </button>
              </div>
            ))}
            {serials.length === 0 && (
              <div style={{color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginTop: '20px'}}>
                Chưa có serial nào được nhập
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.clearAllBtn} onClick={handleClearAll}>Xóa tất cả Serial</button>
        <div className={styles.footerActions}>
          <button className={styles.btnCancel} onClick={() => onClose()}>Hủy</button>
          <button className={styles.btnConfirm} onClick={() => onClose(serials[0] || null)}>Xác nhận</button>
        </div>
      </div>
    </Modal>
  );
}

export default RepairSerialModal;
