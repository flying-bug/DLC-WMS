import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal/Modal';
import styles from './ManageSerialModal.module.css';

function ManageSerialModal({ isOpen, onClose, productName, targetQuantity, initialSerials = [] }) {
  const [serials, setSerials] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [errorText, setErrorText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
       
      setSerials([...initialSerials]);
      setInputValue('');
      setErrorText('');
    }
  }, [isOpen, initialSerials]);

  const handleAdd = () => {
    setErrorText('');
    const val = inputValue.trim();
    if (!val) return;

    if (serials.length >= targetQuantity) {
      return;
    }

    if (serials.includes(val)) {
      setErrorText('MÃ£ Serial nÃ y Ä‘Ã£ Ä‘Æ°á»£c quÃ©t!');
      return;
    }

    setSerials([...serials, val]);
    setInputValue('');
    
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 10);
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
          <h2 className={styles.headerTitle}>Quáº£n lÃ½ Serial Number</h2>
          <p className={styles.headerSubtitle}>Sáº£n pháº©m: {productName}</p>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>

      <div className={styles.body}>
        <div className={styles.leftCol}>
          <div className={styles.sectionTitle}>CÃCH 1: NHáº¬P THá»¦ CÃ”NG</div>
          <div className={styles.inputRow} style={{ marginBottom: errorText ? '12px' : '32px' }}>
            <div className={styles.inputWrapper}>
              <i className={`bi bi-keyboard ${styles.inputIcon}`}></i>
              <input 
                ref={inputRef}
                type="text" 
                className={styles.serialInput} 
                placeholder={isFull ? "ÄÃ£ nháº­p Ä‘á»§ sá»‘ lÆ°á»£ng" : "GÃµ Serial number..."}
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
              disabled={isFull}
              style={{ opacity: isFull ? 0.6 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}
            >
              ThÃªm
            </button>
          </div>
          {errorText && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '20px', fontWeight: 500 }}>{errorText}</div>}

          <div className={styles.sectionTitle}>CÃCH 2: QUÃ‰T MÃƒ Váº CH</div>
          <div className={styles.scanBox} style={{ opacity: isFull ? 0.6 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}>
            <i className={`bi bi-upc-scan ${styles.scanIcon}`}></i>
            <span className={styles.scanText}>{isFull ? "ÄÃ£ hoÃ n thÃ nh" : "Báº¥m Ä‘á»ƒ báº­t Camera quÃ©t"}</span>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.progressTitle}>TIáº¾N Äá»˜ NHáº¬P</div>
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
                ChÆ°a cÃ³ serial nÃ o Ä‘Æ°á»£c nháº­p
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.clearAllBtn} onClick={handleClearAll}>XÃ³a táº¥t cáº£ Serial</button>
        <div className={styles.footerActions}>
          <button className={styles.btnCancel} onClick={() => onClose()}>Há»§y</button>
          <button className={styles.btnConfirm} onClick={() => onClose(serials)}>XÃ¡c nháº­n</button>
        </div>
      </div>
    </Modal>
  );
}

export default ManageSerialModal;
