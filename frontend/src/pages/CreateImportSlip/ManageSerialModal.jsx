import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal/Modal';
import styles from './ManageSerialModal.module.css';
import { getAvailableSerials } from '../../api/warehouseApi';

function ManageSerialModal({ isOpen, onClose, productName, targetQuantity, initialSerials = [] }) {
  const [serials, setSerials] = useState([]);
  const [availableSerials, setAvailableSerials] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {

      setSerials([...initialSerials]);
      setInputValue('');
      setErrorText('');

      if (mode === 'export' && warehouseId && variantId) {
        setLoadingAvailable(true);
        getAvailableSerials(warehouseId, variantId)
          .then(res => {
            if (res.data?.success) {
              setAvailableSerials(res.data.data || []);
            }
          })
          .catch(err => console.error("Error fetching available serials", err))
          .finally(() => setLoadingAvailable(false));
      }
    }
  }, [isOpen, initialSerials, mode, warehouseId, variantId]);

  const handleAdd = async () => {
    setErrorText('');
    const val = inputValue.trim();
    if (!val) return;

    if (serials.length >= targetQuantity) {
      return;
    }

    if (serials.includes(val)) {
      setErrorText('Mã Serial này đã được quét!');
      return;
    }

    if (onValidateSerial) {
      setIsValidating(true);
      try {
        await onValidateSerial(val);
      } catch (err) {
        setErrorText(err.message || 'Mã Serial không hợp lệ.');
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    setSerials([...serials, val]);
    setInputValue('');

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 10);
  };

  const handleSelectAvailable = (val) => {
    setErrorText('');
    if (serials.length >= targetQuantity) return;
    if (serials.includes(val)) return;
    setSerials([...serials, val]);
  };

  const handleRemove = (indexToRemove) => {
    setSerials(serials.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClearAll = () => {
    setSerials([]);
  };

  const progressPercent = Math.min((serials.length / targetQuantity) * 100, 100);
  const isFull = serials.length >= targetQuantity;

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
              disabled={isFull || isValidating}
              style={{ opacity: (isFull || isValidating) ? 0.6 : 1, cursor: (isFull || isValidating) ? 'not-allowed' : 'pointer' }}
            >
              {isValidating ? '...' : 'Thêm'}
            </button>
          </div>
          {errorText && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '20px', fontWeight: 500 }}>{errorText}</div>}

          {mode === 'export' ? (
            <>
              <div className={styles.sectionTitle}>CÁCH 2: CHỌN TỪ KHO</div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', padding: '8px', backgroundColor: '#f8fafc' }}>
                {loadingAvailable ? (
                  <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px' }}>Đang tải...</div>
                ) : availableSerials.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableSerials.map(s => {
                      const isSelected = serials.includes(s);
                      return (
                        <div
                          key={s}
                          onClick={() => !isSelected && handleSelectAvailable(s)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: isSelected ? '#dcfce7' : 'white',
                            border: `1px solid ${isSelected ? '#86efac' : '#cbd5e1'}`,
                            borderRadius: '4px',
                            fontSize: '13px',
                            color: isSelected ? '#166534' : '#334155',
                            cursor: (isSelected || isFull) ? 'not-allowed' : 'pointer',
                            opacity: (isFull && !isSelected) ? 0.6 : 1,
                            fontWeight: isSelected ? 600 : 400
                          }}
                        >
                          {s}
                          {isSelected && <i className="bi bi-check2" style={{ marginLeft: '6px' }}></i>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px' }}>Không có Serial nào khả dụng trong kho</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className={styles.sectionTitle}>CÁCH 2: QUÉT MÃ VẠCH</div>
              <div className={styles.scanBox} style={{ opacity: isFull ? 0.6 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}>
                <i className={`bi bi-upc-scan ${styles.scanIcon}`}></i>
                <span className={styles.scanText}>{isFull ? "Đã hoàn thành" : "Bấm để bật Camera quét"}</span>
              </div>
            </>
          )}
        </div>

        <div className={styles.rightCol}>
          <div className={styles.progressTitle}>TIẾN ĐỘ NHẬP</div>
          <div className={styles.progressRow}>
            <div className={styles.progressText}>
              <span className={styles.progressNumber}>{serials.length}</span> / {targetQuantity} Serial
            </div>
            <div className={styles.progressBarContainer}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className={styles.serialList}>
            {serials.map((serial, idx) => (
              <div key={idx} className={styles.serialItem} style={{ justifyContent: 'space-between' }}>
                <div>
                  <span className={styles.serialIndex}>{idx + 1}.</span>
                  <span className={styles.serialValue}>{serial}</span>
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
          <button className={styles.btnConfirm} onClick={() => onClose(serials)}>Xác nhận</button>
        </div>
      </div>
    </Modal>
  );
}

export default ManageSerialModal;
