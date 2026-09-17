import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import * as stockTransferApi from '../../api/stockTransferApi';
import styles from './WarehouseDocumentFormPage.module.css';

export default function WarehouseTransferFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data States
  const [doc, setDoc] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scanner & Modals
  const [scannerCode, setScannerCode] = useState('');
  const [scannerFeedback, setScannerFeedback] = useState('');
  const [serialModalOpen, setSerialModalOpen] = useState(false);
  const [selectedLineIdx, setSelectedLineIdx] = useState(null);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });
  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

  const scanInputRef = useRef(null);

  // Fetch document details
  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await stockTransferApi.getTransferDetail(id);
        const data = res.data?.data || res.data;
        setDoc(data);

        const initialLines = (data.lines || []).map((l, idx) => {
          const expectedQty = Number(l.quantity || 0);
          const sns = l.serialNumbers || [];
          return {
            ...l,
            lineId: l.id,
            stt: idx + 1,
            sku: l.variantSku || l.sku || '',
            productName: l.variantName || l.productName || 'Sản phẩm',
            expectedQty: expectedQty,
            actualQty: expectedQty, 
            invoiceSerials: [...sns],
            serialList: [...sns],
            unitName: l.unitName || 'Chiếc',
            trackSerial: sns.length > 0 // We infer tracking if it had serials. In a real system, checking variant.trackSerial is better.
          };
        });

        setLines(initialLines);
      } catch (err) {
        console.error('Error loading warehouse transfer document:', err);
        showToast('error', 'Không thể tải chi tiết phiếu chuyển kho');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // Handle actual quantity change
  const handleQtyChange = (idx, value) => {
    setLines((prev) => {
      const next = [...prev];
      const parsedVal = value === '' ? '' : (Number.isNaN(Number(value)) ? 0 : Math.max(0, Number(value)));
      next[idx] = {
        ...next[idx],
        actualQty: parsedVal
      };
      return next;
    });
  };

  // Handle Barcode Scanner Input
  const handleScannerSubmit = (e) => {
    e.preventDefault();
    if (!scannerCode.trim()) return;

    const code = scannerCode.trim().toUpperCase();
    let found = false;

    const nextLines = lines.map((l) => {
      const matchSku =
        (l.sku && l.sku.toUpperCase() === code) ||
        (l.variantSku && l.variantSku.toUpperCase() === code);

      if (matchSku) {
        found = true;
        const newAct = Number(l.actualQty || 0) + 1;
        setScannerFeedback(`✅ Đã tăng SL SKU: ${l.sku || code} -> ${newAct}`);
        return { ...l, actualQty: newAct };
      }

      if (l.trackSerial) { 
        found = true;
        const currentList = l.serialList || [];
        if (!currentList.includes(code)) {
          const updatedList = [...currentList, code];
          setScannerFeedback(`✅ Đã nhận Serial: ${code} (${updatedList.length}/${l.actualQty})`);
          return { ...l, serialList: updatedList };
        } else {
          setScannerFeedback(`⚠️ Serial ${code} đã được quét trước đó`);
        }
      }

      return l;
    });

    if (found) {
      setLines(nextLines);
    } else {
      setScannerFeedback(`❌ Không tìm thấy mã ${code} trong chứng từ này`);
    }

    setScannerCode('');
    if (scanInputRef.current) scanInputRef.current.focus();
  };

  // Check valid before post
  const validateBeforePost = () => {
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const act = Number(l.actualQty || 0);
      if (act < 0) {
        showToast('warning', `Dòng ${i + 1} (${l.productName}): Số lượng thực tế không được âm.`);
        return false;
      }
      
      const snCount = (l.serialList || []).length;
      if (snCount > 0 && snCount !== act) { 
        setSelectedLineIdx(i);
        setSerialModalOpen(true);
        showToast('warning', `Dòng ${i + 1} (${l.productName}): Vui lòng quét đủ ${act} mã serial (hiện có ${snCount}).`);
        return false;
      }
    }
    return true;
  };

  // Build payload
  const buildPayload = () => {
    return {
      lines: lines.map(l => ({
        lineId: l.lineId,
        variantId: l.variantId,
        serialNumbers: l.serialList || []
      }))
    };
  };

  // Process Document
  const handleProcessDocument = async () => {
    if (!validateBeforePost()) return;

    try {
      setSaving(true);
      const payload = buildPayload();
      
      if (doc.status === 'APPROVED') {
        await stockTransferApi.dispatchTransferSlip(doc.id, payload);
        showToast('success', 'Xuất kho thành công!');
      } else if (doc.status === 'IN_TRANSIT') {
        await stockTransferApi.receiveTransferSlip(doc.id, payload);
        showToast('success', 'Nhập kho thành công!');
      }

      setTimeout(() => {
        navigate('/warehouse-workspace');
      }, 800);
    } catch (err) {
      console.error('Lỗi khi xử lý kho:', err.response?.data || err);
      const resData = err.response?.data;
      const errMsg = resData?.userMessage || resData?.devMessage || resData?.message || err.message;
      showToast('error', 'Lỗi xử lý kho: ' + errMsg);
    } finally {
      setSaving(false);
      setConfirmPostOpen(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loadingContainer}>
          <i className="bi bi-arrow-repeat" style={{ fontSize: '2rem', color: 'var(--color-primary)', animation: 'spin 1s linear infinite', display: 'inline-block' }}></i>
          <span>Đang tải chi tiết phiếu chuyển kho...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!doc) {
    return (
      <AdminLayout>
        <div className={styles.emptyContainer}>
          <h2>Không tìm thấy phiếu chuyển kho</h2>
          <button type="button" className={styles.emptyStateAction} onClick={() => navigate('/warehouse-workspace')}>
            <i className="bi bi-arrow-left"></i> Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  const isDispatchMode = doc.status === 'APPROVED';
  const isReceiveMode = doc.status === 'IN_TRANSIT';
  const canProcess = isDispatchMode || isReceiveMode;
  const actionLabel = isDispatchMode ? 'Xác nhận Xuất Kho' : (isReceiveMode ? 'Xác nhận Nhập Kho' : 'Chỉ Xem');

  return (
    <AdminLayout>
      <div className={styles.pageContainer}>
        <div className={styles.topHeader}>
          <div className={styles.titleArea}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate('/warehouse-workspace')}
              title="Quay lại bàn làm việc thủ kho"
            >
              <i className="bi bi-arrow-left"></i> Quay lại
            </button>
            <span className={styles.divider}>/</span>
            <h1 className={styles.docTitle}>
              Phiếu chuyển kho: <span className={styles.docCodeText}>{doc.transferCode}</span>
              <span className={styles.statusBadge} style={{marginLeft: 10, background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: 4, fontSize: 14}}>
                {doc.status}
              </span>
            </h1>
          </div>

          <div className={styles.headerActions}>
            {canProcess && (
              <button
                type="button"
                className={styles.btnPost}
                onClick={() => setConfirmPostOpen(true)}
                disabled={saving || lines.length === 0}
              >
                <i className="bi bi-check-circle"></i> {saving ? 'Đang xử lý...' : actionLabel}
              </button>
            )}
          </div>
        </div>

        <div className={styles.mainContent}>
          <div className={styles.topContentLayout}>
            <div className={styles.cardSection} style={{ flex: 2 }}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <i className="bi bi-info-circle"></i> Thông tin chung
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.grid2Col}>
                  <div className={styles.infoField}>
                    <label>Kho Nguồn (Xuất):</label>
                    <div className={styles.fieldValue}>{doc.fromWarehouseName || '-'}</div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Kho Đích (Nhập):</label>
                    <div className={styles.fieldValue}>{doc.toWarehouseName || '-'}</div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Ngày lập phiếu:</label>
                    <div className={styles.fieldValue}>
                      {doc.transferDate ? new Date(doc.transferDate).toLocaleDateString('vi-VN') : '-'}
                    </div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Người giao hàng:</label>
                    <div className={styles.fieldValue}>{doc.deliverer || '-'}</div>
                  </div>
                  <div className={styles.infoField} style={{ gridColumn: '1 / -1' }}>
                    <label>Ghi chú:</label>
                    <div className={styles.fieldValue}>{doc.note || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            {canProcess && (
              <div className={styles.cardSection} style={{ flex: 1 }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <i className="bi bi-upc-scan"></i> Quét mã / Kiểm đếm
                  </div>
                </div>
                <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <form onSubmit={handleScannerSubmit} className={styles.scannerForm}>
                    <div className={styles.inputIconWrapper}>
                      <i className="bi bi-upc-scan"></i>
                      <input
                        ref={scanInputRef}
                        type="text"
                        className={styles.scannerInput}
                        placeholder="Quét mã SKU / Mã vạch / Serial..."
                        value={scannerCode}
                        onChange={(e) => setScannerCode(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </form>
                  {scannerFeedback && (
                    <div className={`${styles.scannerFeedback} ${scannerFeedback.includes('❌') ? styles.feedbackError : scannerFeedback.includes('⚠️') ? styles.feedbackWarning : styles.feedbackSuccess}`}>
                      {scannerFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.cardSection} style={{ marginTop: '24px' }}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <i className="bi bi-box-seam"></i> Chi tiết Hàng hóa
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '120px' }}>Mã (SKU)</th>
                    <th>Tên Hàng Hóa</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>SL Yêu Cầu</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>SL Thực Tế</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Mã Serial</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => {
                    const snCount = (l.serialList || []).length;
                    const snError = snCount > 0 && snCount !== Number(l.actualQty || 0);

                    return (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td className={styles.cellBold}>{l.sku}</td>
                        <td>{l.productName}</td>
                        <td style={{ textAlign: 'center' }}>{l.unitName}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={styles.expectedQtyLabel}>
                            {Number(l.expectedQty || 0).toLocaleString()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {canProcess ? (
                            <input
                              type="number"
                              className={styles.tableInput}
                              value={l.actualQty}
                              onChange={(e) => handleQtyChange(idx, e.target.value)}
                              min="0"
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{Number(l.actualQty || 0).toLocaleString()}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={styles.serialBtn}
                            onClick={() => {
                              setSelectedLineIdx(idx);
                              setSerialModalOpen(true);
                            }}
                          >
                            <i className="bi bi-list-ul"></i> {snCount} mã
                            {snError && <i className="bi bi-exclamation-circle text-danger ms-1" title="Số Serial không khớp Số lượng"></i>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className={styles.emptyRow}>
                        Không có hàng hóa nào trong chứng từ này
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmPostOpen}
        title="Xác nhận xử lý chứng từ"
        message={`Bạn có chắc chắn muốn ${actionLabel.toLowerCase()} phiếu chuyển kho ${doc?.transferCode} không? Sau khi xác nhận, tồn kho sẽ được cập nhật.`}
        confirmText={actionLabel}
        cancelText="Hủy bỏ"
        onConfirm={handleProcessDocument}
        onCancel={() => setConfirmPostOpen(false)}
        variant="primary"
      />

      {serialModalOpen && selectedLineIdx !== null && (
        <ManageSerialModal
          isOpen={serialModalOpen}
          onClose={() => {
            setSerialModalOpen(false);
            setSelectedLineIdx(null);
          }}
          line={lines[selectedLineIdx]}
          onUpdateSerials={(newSerials) => {
            setLines((prev) => {
              const next = [...prev];
              next[selectedLineIdx].serialList = newSerials;
              return next;
            });
          }}
          readonly={!canProcess}
        />
      )}

      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={hideToast}
      />
    </AdminLayout>
  );
}
