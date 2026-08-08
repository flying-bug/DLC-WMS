import { useState, useEffect, useRef } from 'react';
import Modal from '../../../components/ui/Modal/Modal';
import styles from './RepairSerialModal.module.css';
import * as inventoryExportApi from '../../../api/inventoryExportApi';
import { getAvailableSerials } from '../../../api/warehouseApi';

function RepairSerialModal({ isOpen, onClose, productName, warehouseId, variantId, initialSerialObj = null, actionType = 'ADD' }) {
  const [serials, setSerials] = useState([]);
  const [availableSerials, setAvailableSerials] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [errorText, setErrorText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialSerialObj && (initialSerialObj.serialNumberId || initialSerialObj.serialNumber)) {
        setSerials([initialSerialObj]);
      } else {
        setSerials([]);
      }
      setInputValue('');
      setErrorText('');

      if (actionType === 'ADD' && warehouseId && variantId) {
        setLoadingAvailable(true);
        getAvailableSerials(warehouseId, variantId)
          .then(res => {
            if (res.data?.success || Array.isArray(res.data?.data)) {
              setAvailableSerials(res.data?.data || res.data || []);
            }
          })
          .catch(err => console.error("Error fetching available serials", err))
          .finally(() => setLoadingAvailable(false));
      }
    }
  }, [isOpen, initialSerialObj, actionType, warehouseId, variantId]);

  const handleAdd = async () => {
    setErrorText('');
    const val = inputValue.trim();
    if (!val) return;

    if (serials.length >= 1) {
      return;
    }

    if (actionType === 'REMOVE') {
      // Đối với Loại bỏ (Remove), nhập serial mới vào kho (giống nhập kho)
      setSerials([{ serialNumber: val, serialNumberId: null }]);
      setInputValue('');
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 10);
      return;
    }

    // Đối với Thêm (Add), quét serial có sẵn trong kho (giống xuất kho)
    setLoading(true);
    try {
      const res = await inventoryExportApi.resolveScan({ code: val, warehouseId, variantId });
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

  const handleSelectAvailable = async (s) => {
    setErrorText('');
    if (serials.length >= 1) return;
    
    // Gọi resolveScan để lấy thông tin ID của serial này
    setLoading(true);
    try {
      const res = await inventoryExportApi.resolveScan({ code: s, warehouseId, variantId });
      const data = res.data?.data || res.data;
      if (data.type === 'SERIAL' && data.variantId === variantId) {
        setSerials([{ serialNumber: data.serialNumber, serialNumberId: data.serialNumberId }]);
      } else {
        setSerials([{ serialNumber: s, serialNumberId: null }]);
      }
    } catch (e) {
      // Fallback
      setSerials([{ serialNumber: s, serialNumberId: null }]);
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
              {loading ? '...' : 'Thêm'}
            </button>
          </div>
          {errorText && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '20px', fontWeight: 500 }}>{errorText}</div>}

          {actionType === 'ADD' ? (
            <>
              <div className={styles.sectionTitle}>CÁCH 2: CHỌN TỪ KHO</div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto', padding: '8px', backgroundColor: '#f8fafc', marginBottom: '20px' }}>
                {loadingAvailable ? (
                  <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', padding: '16px' }}>Đang tải...</div>
                ) : availableSerials.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableSerials.map(s => {
                      const isSelected = serials.some(item => item.serialNumber === s);
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
          <button className={styles.btnConfirm} onClick={() => {
            if (serials.length === 0 && inputValue.trim()) {
              setErrorText('Vui lòng nhấn nút "Thêm" để đưa serial vào danh sách trước khi Xác nhận.');
              return;
            }
            onClose(serials[0] || null);
          }}>Xác nhận</button>
        </div>
      </div>
    </Modal>
  );
}

export default RepairSerialModal;
