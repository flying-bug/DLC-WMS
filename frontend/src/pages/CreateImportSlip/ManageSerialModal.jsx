import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal/Modal';
import styles from './ManageSerialModal.module.css';

export default function ManageSerialModal({
  isOpen,
  onClose,
  productName = 'Sản phẩm',
  sku = '',
  targetQuantity = 1,
  initialSerials = [],
  currentSerials = [],
  invoiceSerials = [],
  mode = 'import'
}) {
  // Danh sách Hóa đơn NCC / Kế toán đã nhập sẵn
  const [expectedSerials, setExpectedSerials] = useState([]);
  // Danh sách Thủ kho ĐÃ QUÉT THỰC TẾ TRÊN HỘP
  const [verifiedSerials, setVerifiedSerials] = useState([]);

  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('verified'); // 'verified' | 'expected'

  const inputRef = useRef(null);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // 1. Danh sách serial ĐÃ QUÉT TRƯỚC ĐÓ
      const currentArr = Array.isArray(currentSerials) && currentSerials.length > 0
        ? currentSerials.filter(Boolean)
        : (Array.isArray(initialSerials) ? initialSerials.filter(Boolean) : []);

      // 2. Danh sách serial theo HÓA ĐƠN NCC
      const invArr = Array.isArray(invoiceSerials) && invoiceSerials.length > 0
        ? invoiceSerials.filter(Boolean)
        : [];

      setVerifiedSerials([...currentArr]);
      setExpectedSerials([...invArr]);
      setInputValue('');

      if (currentArr.length > 0) {
        setFeedback({
          type: 'success',
          message: `✅ Đã nạp ${currentArr.length} Serial đã quét trước đó. Bạn có thể quét thêm hoặc chỉnh sửa.`
        });
      } else if (invArr.length > 0) {
        setFeedback({
          type: 'info',
          message: `📋 Hóa đơn NCC có ${invArr.length} Serial. Vui lòng dùng máy quét bắn từng hộp thực tế để đối soát!`
        });
      } else {
        setFeedback({
          type: 'info',
          message: '📷 Bắn súng mã vạch hoặc gõ Serial thực tế trên từng vỏ hộp.'
        });
      }

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialSerials, currentSerials, invoiceSerials]);

  if (!isOpen) return null;

  // Xử lý quét từng Serial hoặc dán hàng loạt
  const handleScanSubmit = (e) => {
    e?.preventDefault();
    const val = inputValue.trim();
    if (!val) return;

    // Tách các serial nếu dán nhiều mã cùng lúc
    const scannedCodes = val.split(/[\s,;\n\t]+/).filter(Boolean);
    if (scannedCodes.length === 0) return;

    let newVerified = [...verifiedSerials];
    let lastMsg = '';
    let lastType = 'success';

    for (const code of scannedCodes) {
      if (newVerified.includes(code)) {
        lastType = 'info';
        lastMsg = `ℹ️ Serial [${code}] đã được quét trước đó.`;
        continue;
      }

      newVerified.push(code);

      // Đối chiếu với danh sách Kế toán / Hóa đơn
      const isMatchInvoice = expectedSerials.includes(code);
      if (newVerified.length > targetQuantity && targetQuantity > 0) {
        lastType = 'warning';
        lastMsg = `⚠️ Đã nhận [${code}] (${newVerified.length}/${targetQuantity} - Vượt số lượng ban đầu)`;
      } else if (isMatchInvoice) {
        lastType = 'success';
        lastMsg = `✅ Đã kiểm khớp: [${code}] (Có trên hóa đơn NCC)`;
      } else if (expectedSerials.length > 0) {
        lastType = 'warning';
        lastMsg = `⚠️ CẢNH BÁO: Serial [${code}] KHÔNG CÓ trên hóa đơn NCC! Đã ghi nhận theo thực tế kho.`;
      } else {
        lastType = 'success';
        lastMsg = `✅ Đã quét thực tế: [${code}]`;
      }
    }

    setVerifiedSerials(newVerified);
    setFeedback({ type: lastType, message: lastMsg });
    setInputValue('');

    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleRemoveVerified = (idxToRemove) => {
    setVerifiedSerials((prev) => prev.filter((_, idx) => idx !== idxToRemove));
    setFeedback({ type: 'info', message: 'Đã xóa Serial khỏi danh sách thực nhận.' });
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ Serial đã quét thực tế không?')) {
      setVerifiedSerials([]);
      setFeedback({ type: 'info', message: 'Đã xóa toàn bộ Serial đã quét.' });
    }
  };

  // Xác nhận lưu số lượng thực tế
  const handleConfirm = () => {
    onClose(verifiedSerials);
  };

  const progressPercent = Math.min(
    (verifiedSerials.length / (targetQuantity || 1)) * 100,
    100
  );

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(null)} dialogClassName={styles.customModal}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.headerTitle}>
            <i className="fas fa-barcode"></i> Quản lý & Đối soát Serial Number Thực Tế
          </h2>
          <p className={styles.headerSubtitle}>
            Sản phẩm: <strong>{productName}</strong> | SKU: <strong>{sku || '-'}</strong> | Cần kiểm:{' '}
            <strong>{targetQuantity} chiếc</strong>
          </p>
        </div>
        <button type="button" className={styles.closeBtn} onClick={() => onClose(null)}>
          &times;
        </button>
      </div>

      {/* BODY */}
      <div className={styles.body}>
        {/* LEFT COLUMN: SCANNER & ENTRY */}
        <div className={styles.leftCol}>
          <div className={styles.sectionTitle}>1. BẮN MÃ VẠCH / QUÉT THỰC TẾ TRÊN HỘP</div>

          <form onSubmit={handleScanSubmit} className={styles.scannerBox}>
            <div className={styles.inputWrapper}>
              <i className={`fas fa-qrcode ${styles.inputIcon}`}></i>
              <input
                ref={inputRef}
                type="text"
                className={styles.serialInput}
                placeholder="📷 Bắn súng mã vạch hoặc gõ Serial thực tế..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.addBtn}>
              <i className="fas fa-plus"></i> Nhận
            </button>
          </form>

          {/* FEEDBACK BANNER */}
          {feedback && (
            <div
              className={`${styles.feedbackBanner} ${
                feedback.type === 'success'
                  ? styles.feedbackSuccess
                  : feedback.type === 'warning'
                  ? styles.feedbackWarning
                  : feedback.type === 'error'
                  ? styles.feedbackError
                  : styles.feedbackInfo
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* HINT & RULES */}
          <div className={styles.scanHintCard}>
            <div style={{ fontWeight: '700', marginBottom: '6px', color: '#1e293b' }}>
              <i className="fas fa-shield-alt" style={{ color: '#2563eb', marginRight: '6px' }}></i>
              Nguyên tắc kiểm đếm Zero-Trust:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>
                <strong>Bắt buộc quét thực tế:</strong> Chỉ những chiếc được bắn súng mã vạch mới được ghi nhận vào kho.
              </li>
              <li>
                <strong>Tự động đối soát:</strong> Nếu NCC giao sai mã serial khác với hóa đơn, hệ thống sẽ cảnh báo cam và nhận mã thực tế để đảm bảo bảo hành.
              </li>
              <li>
                <strong>Hỗ trợ dán nhiều mã:</strong> Bạn có thể copy/paste nhiều serial cùng lúc (cách nhau bởi phẩy hoặc xuống dòng).
              </li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: VERIFICATION LIST */}
        <div className={styles.rightCol}>
          {/* PROGRESS */}
          <div className={styles.progressRow}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
                Tiến độ quét thực tế
              </div>
              <div className={styles.progressText}>
                <span className={styles.progressNumber}>{verifiedSerials.length}</span> / {targetQuantity} Serial
              </div>
            </div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          {/* SUB-TABS: THỰC NHẬN vs HÓA ĐƠN */}
          <div className={styles.tabHeader}>
            <button
              type="button"
              className={`${styles.subTabBtn} ${activeSubTab === 'verified' ? styles.activeSubTab : ''}`}
              onClick={() => setActiveSubTab('verified')}
            >
              Thực nhận ({verifiedSerials.length})
            </button>
            {expectedSerials.length > 0 && (
              <button
                type="button"
                className={`${styles.subTabBtn} ${activeSubTab === 'expected' ? styles.activeSubTab : ''}`}
                onClick={() => setActiveSubTab('expected')}
              >
                Theo Hóa đơn NCC ({expectedSerials.length})
              </button>
            )}
          </div>

          {/* LIST */}
          <div className={styles.serialList}>
            {activeSubTab === 'verified' ? (
              verifiedSerials.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.8125rem', textAlign: 'center', padding: '32px' }}>
                  <i className="fas fa-barcode" style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'block' }}></i>
                  Chưa quét chiếc nào. Hãy dùng máy quét bắn mã trên vỏ hộp!
                </div>
              ) : (
                verifiedSerials.map((sn, idx) => {
                  const isMatchInvoice = expectedSerials.includes(sn);
                  return (
                    <div key={idx} className={styles.serialItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.serialIndex}>{idx + 1}.</span>
                        <span className={styles.serialValue}>{sn}</span>
                        {expectedSerials.length > 0 && (
                          <span className={isMatchInvoice ? styles.tagMatch : styles.tagMismatch}>
                            {isMatchInvoice ? '✓ Khớp HĐ' : '⚠️ Khác HĐ'}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemoveVerified(idx)}
                        title="Xóa mã này để quét lại"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  );
                })
              )
            ) : (
              /* TAB EXPECTED (HÓA ĐƠN NCC) */
              expectedSerials.map((sn, idx) => {
                const isScanned = verifiedSerials.includes(sn);
                return (
                  <div key={idx} className={styles.serialItem} style={{ background: isScanned ? '#f0fdf4' : '#ffffff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.serialIndex}>{idx + 1}.</span>
                      <span className={styles.serialValue}>{sn}</span>
                      <span className={isScanned ? styles.tagMatch : styles.tagPending}>
                        {isScanned ? '✓ Đã kiểm' : '⏳ Chưa thấy'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className={styles.footer}>
        <div className={styles.footerSummary}>
          Đã quét thực tế: <strong style={{ color: '#2563eb' }}>{verifiedSerials.length}</strong> / {targetQuantity} Serial{' '}
          {verifiedSerials.length < targetQuantity && (
            <span style={{ color: '#c2410c' }}>(Còn thiếu {targetQuantity - verifiedSerials.length} chiếc)</span>
          )}
        </div>

        <div className={styles.footerActions}>
          {verifiedSerials.length > 0 && (
            <button
              type="button"
              className={styles.btnCancel}
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              onClick={handleClearAll}
            >
              Xóa quét lại
            </button>
          )}
          <button type="button" className={styles.btnCancel} onClick={() => onClose(null)}>
            Hủy
          </button>
          <button type="button" className={styles.btnConfirm} onClick={handleConfirm}>
            <i className="fas fa-check"></i> Xác nhận SL thực nhận ({verifiedSerials.length})
          </button>
        </div>
      </div>
    </Modal>
  );
}
