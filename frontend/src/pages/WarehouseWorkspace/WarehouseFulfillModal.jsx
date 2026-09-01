import React, { useState, useEffect, useRef } from 'react';
import * as importApi from '../../api/inventoryImportApi';
import * as exportApi from '../../api/inventoryExportApi';
import styles from './WarehouseFulfillModal.module.css';

export default function WarehouseFulfillModal({
  open,
  onClose,
  slip,
  docType = 'IMPORT',
  onSuccess
}) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanFeedback, setScanFeedback] = useState('');
  const scanInputRef = useRef(null);

  // Load lines when slip changes
  useEffect(() => {
    if (!open || !slip?.id) return;
    setLoading(true);
    setScanValue('');
    setScanFeedback('');

    const fetchDoc = async () => {
      try {
        let res;
        if (docType === 'IMPORT') {
          res = await importApi.getImportDetail(slip.id);
        } else {
          res = await exportApi.getExportDetail(slip.id);
        }
        const data = res.data?.data || res.data;
        const initialLines = (data.lines || []).map((l) => {
          const exp = Number(l.expectedQuantity || l.quantityIn || l.quantityOut || l.quantity || 0);
          const act = Number(l.quantityIn || l.quantityOut || exp);
          const rawSns = l.serialNumbers || (l.serialNumbersText ? l.serialNumbersText.split(/[,;\s\n]+/).filter(Boolean) : []);
          return {
            ...l,
            expectedQty: exp,
            actualQty: act,
            serialList: [...rawSns]
          };
        });
        setLines(initialLines);
      } catch (err) {
        console.error('Error loading detail for fulfillment:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [open, slip, docType]);

  // Focus scan input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 150);
    }
  }, [open]);

  if (!open || !slip) return null;

  // Handle Scanning Barcode / Serial
  const handleScanSubmit = (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code) return;

    let matched = false;

    // 1. Kiểm tra nếu khớp SKU / Barcode của một dòng
    setLines((prev) => {
      const next = [...prev];
      const targetIdx = next.findIndex(
        (l) =>
          (l.sku && l.sku.toLowerCase() === code.toLowerCase()) ||
          (l.barcode && l.barcode.toLowerCase() === code.toLowerCase())
      );

      if (targetIdx !== -1) {
        next[targetIdx].actualQty = Number(next[targetIdx].actualQty || 0) + 1;
        setScanFeedback(`✅ Đã quét khớp SKU [${next[targetIdx].sku}]: SL Thực nhận +1`);
        matched = true;
        return next;
      }

      // 2. Nếu không khớp SKU, xem như quét Serial Number
      // Tìm dòng đầu tiên chưa đủ Serial
      const serialTargetIdx = next.findIndex((l) => l.serialList.length < l.actualQty);
      const targetLineIdx = serialTargetIdx !== -1 ? serialTargetIdx : 0;

      if (next[targetLineIdx]) {
        if (!next[targetLineIdx].serialList.includes(code)) {
          next[targetLineIdx].serialList.push(code);
          if (next[targetLineIdx].serialList.length > next[targetLineIdx].actualQty) {
            next[targetLineIdx].actualQty = next[targetLineIdx].serialList.length;
          }
          setScanFeedback(`✅ Đã gán Serial [${code}] cho [${next[targetLineIdx].sku || next[targetLineIdx].productName}]`);
          matched = true;
        } else {
          setScanFeedback(`⚠️ Serial [${code}] đã được quét trước đó.`);
          matched = true;
        }
      }

      return next;
    });

    if (!matched) {
      setScanFeedback(`❓ Mã [${code}] không khớp với sản phẩm nào trong phiếu.`);
    }

    setScanValue('');
  };

  const handleQtyChange = (idx, val) => {
    if (val === '') {
      setLines((prev) => {
        const next = [...prev];
        next[idx].actualQty = '';
        return next;
      });
      return;
    }
    const cleaned = String(val).replace(/^0+(?=\d)/, '');
    const num = Math.max(0, Number(cleaned) || 0);
    setLines((prev) => {
      const next = [...prev];
      next[idx].actualQty = num;
      return next;
    });
  };


  const handleRemoveSerial = (lineIdx, snIdx) => {
    setLines((prev) => {
      const next = [...prev];
      next[lineIdx].serialList.splice(snIdx, 1);
      return next;
    });
  };

  // Submit & Post to Inventory
  const handleConfirmFulfill = async () => {
    try {
      setSubmitting(true);

      if (docType === 'IMPORT') {
        const payload = {
          ...slip,
          status: 'POSTED',
          lines: lines.map((l) => ({
            ...l,
            quantityIn: l.actualQty,
            expectedQuantity: l.expectedQty,
            serialNumbersText: l.serialList.join(', ')
          }))
        };
        await importApi.updateImportSlip(slip.id, payload);
      } else {
        await exportApi.postExportSlip(slip.id);
      }

      alert('🎉 Ghi sổ kho thành công! Hàng hóa và Serial đã được cập nhật vào kho.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert('Lỗi ghi sổ kho: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const totalExp = lines.reduce((acc, l) => acc + (Number(l.expectedQty) || 0), 0);
  const totalAct = lines.reduce((acc, l) => acc + (Number(l.actualQty) || 0), 0);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <i className="fas fa-barcode" style={{ color: '#2563eb' }}></i>
            Kiểm đếm, Quét mã & Xác nhận Ghi sổ kho: {slip.docCode}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* BODY */}
        <div className={styles.modalBody}>
          {/* BARCODE SCANNER INPUT */}
          <form onSubmit={handleScanSubmit} className={styles.scannerBar}>
            <i className={`fas fa-qrcode ${styles.scanIcon}`}></i>
            <div className={styles.scanInputWrapper}>
              <input
                ref={scanInputRef}
                type="text"
                className={styles.scanInput}
                placeholder="📷 Quét mã vạch SKU hoặc bắn mã Serial/IMEI bằng máy quét (bấm Enter để nhận)..."
                value={scanValue}
                onChange={(e) => setScanValue(e.target.value)}
              />
              {scanFeedback && <div className={styles.scanHint}>{scanFeedback}</div>}
            </div>
          </form>

          {/* TABLE OF ITEMS */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginRight: '8px' }}></i>
              Đang tải danh sách vật tư hàng hóa...
            </div>
          ) : (
            <table className={styles.itemTable}>
              <thead>
                <tr>
                  <th>Mã hàng (SKU)</th>
                  <th>Tên sản phẩm</th>
                  <th>ĐVT</th>
                  <th style={{ textAlign: 'center' }}>SL Dự kiến</th>
                  <th style={{ textAlign: 'center' }}>SL Thực đếm</th>
                  <th>Serial / IMEI đã quét</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const isMatched = l.actualQty === l.expectedQty;
                  return (
                    <tr key={l.id || idx}>
                      <td>
                        <strong>{l.sku || l.productSku || '-'}</strong>
                      </td>
                      <td>{l.productName || l.variantName || '-'}</td>
                      <td>{l.unitName || 'Cái'}</td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{l.expectedQty}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          className={styles.qtyInput}
                          value={l.actualQty}
                          min="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          onBlur={() => {
                            if (l.actualQty === '') {
                              handleQtyChange(idx, 0);
                            }
                          }}
                        />

                        <div style={{ marginTop: '2px', fontSize: '0.75rem' }}>
                          {isMatched ? (
                            <span className={styles.qtyMatch}>Khớp</span>
                          ) : (
                            <span className={styles.qtyMismatch}>
                              {l.actualQty > l.expectedQty ? `Thừa +${l.actualQty - l.expectedQty}` : `Thiếu -${l.expectedQty - l.actualQty}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {l.serialList.length === 0 ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Chưa có serial nào</span>
                        ) : (
                          <div className={styles.serialBadgeList}>
                            {l.serialList.map((sn, sIdx) => (
                              <span key={sIdx} className={styles.serialBadge}>
                                {sn}
                                <button
                                  type="button"
                                  className={styles.removeSerialBtn}
                                  onClick={() => handleRemoveSerial(idx, sIdx)}
                                  title="Xóa serial này"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.modalFooter}>
          <div className={styles.summaryText}>
            Tổng mặt hàng: <strong>{lines.length}</strong> | SL Dự kiến: <strong>{totalExp}</strong> | SL Thực tế:{' '}
            <strong style={{ color: totalAct === totalExp ? '#16a34a' : '#ea580c' }}>{totalAct}</strong>
          </div>
          <div className={styles.footerActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Đóng
            </button>
            <button
              type="button"
              className={styles.btnSubmit}
              onClick={handleConfirmFulfill}
              disabled={submitting || lines.length === 0}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Đang ghi sổ kho...
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle"></i> Xác nhận & Ghi sổ kho
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
