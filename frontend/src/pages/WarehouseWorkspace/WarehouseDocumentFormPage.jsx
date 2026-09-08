import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import UnpostConfirmModal from '../../components/ui/UnpostConfirmModal/UnpostConfirmModal';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import { printImportSlip } from '../../utils/printImportSlip';
import { printExportSlip } from '../../utils/printExportSlip';
import * as importApi from '../../api/inventoryImportApi';
import * as exportApi from '../../api/inventoryExportApi';
import styles from './WarehouseDocumentFormPage.module.css';

export default function WarehouseDocumentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Xác định là Phiếu Nhập hay Phiếu Xuất
  const isImport = location.pathname.includes('/imports') || !location.pathname.includes('/exports');
  const docTypeLabel = isImport ? 'Phiếu nhập kho' : 'Phiếu xuất kho';
  const qtyLabel = isImport ? 'SL Thực nhập' : 'SL Thực xuất';

  // Data States
  const [doc, setDoc] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scanner & Modals
  const [scannerCode, setScannerCode] = useState('');
  const [scannerFeedback, setScannerFeedback] = useState('');
  const [unpostModalOpen, setUnpostModalOpen] = useState(false);
  const [serialModalOpen, setSerialModalOpen] = useState(false);
  const [selectedLineIdx, setSelectedLineIdx] = useState(null);
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

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
        let res;
        if (isImport) {
          res = await importApi.getImportDetail(id);
        } else {
          res = await exportApi.getExportDetail(id);
        }
        const data = res.data?.data || res.data;
        setDoc(data);

        // Fetch audit logs for full multi-event history
        try {
          const logsRes = isImport ? await importApi.getImportSlipLogs(id) : await exportApi.getExportSlipLogs(id);
          setAuditLogs(logsRes.data?.data || []);
        } catch {
          // ignore
        }

        const isDocPosted = data.status === 'POSTED' || data.status === 'COMPLETED';

        const initialLines = (data.lines || []).map((l, idx) => {
          const exp = Number(l.expectedQuantity || l.quantity || (isImport ? l.quantityIn : l.quantityOut) || 0);
          const act = Number((isImport ? l.quantityIn : l.quantityOut) || exp);
          const sns = l.serialNumbers || (l.serialNumbersText ? l.serialNumbersText.split(/[,;\s\n]+/).filter(Boolean) : []);
          return {
            ...l,
            stt: idx + 1,
            sku: l.sku || l.productSku || '',
            productName: l.productName || l.variantName || 'Sản phẩm',
            expectedQty: exp,
            actualQty: act,
            invoiceSerials: [...sns],
            serialList: isDocPosted ? [...sns] : (sns.length > 0 ? [...sns] : []),
            unitName: l.unitName || l.baseUnitName || 'Chiếc',
            baseUnitName: l.baseUnitName || l.unitName || 'Chiếc',
            conversionRatio: l.conversionRatio || 1.0,
            conversionOperator: l.conversionOperator || '*'
          };
        });

        setLines(initialLines);
      } catch (err) {
        console.error('Error loading warehouse document:', err);
        showToast('danger', 'Không thể tải chi tiết chứng từ');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, isImport]);

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
        (l.productSku && l.productSku.toUpperCase() === code) ||
        (l.barcode && l.barcode.toUpperCase() === code);

      if (matchSku) {
        found = true;
        const newAct = Number(l.actualQty || 0) + 1;
        setScannerFeedback(`✅ Đã tăng SL SKU: ${l.sku || code} -> ${newAct}`);
        return { ...l, actualQty: newAct };
      }

      if (l.invoiceSerials && l.invoiceSerials.some((sn) => sn.toUpperCase() === code)) {
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
    }
    return true;
  };

  // Build clean payload matching backend DTO
  const buildPayload = () => {
    return {
      docCode: doc.docCode || doc.code || undefined,
      warehouseId: doc.warehouseId ? Number(doc.warehouseId) : null,
      partnerId: doc.partnerId ? Number(doc.partnerId) : null,
      docDate: doc.docDate,
      issuePurpose: doc.issuePurpose || (isImport ? 'PURCHASE' : 'OTHER'),
      referenceType: doc.referenceType,
      referenceId: doc.referenceId ? Number(doc.referenceId) : null,
      purchaseOrderId: doc.purchaseOrderId ? Number(doc.purchaseOrderId) : null,
      salesOrderId: doc.salesOrderId ? Number(doc.salesOrderId) : null,
      note: doc.note || '',
      recipientName: doc.recipientName || '',
      recipientAddress: doc.recipientAddress || '',
      lines: lines.map((l) => {
        const qty = Number(l.actualQty !== undefined && l.actualQty !== '' ? l.actualQty : (l.expectedQty || 0));
        const ratio = Number(l.conversionRatio) > 0 ? Number(l.conversionRatio) : 1;
        const op = l.conversionOperator || 'MULTIPLY';
        const baseQty = (op === 'DIVIDE' || op === '/') ? (qty / ratio) : (qty * ratio);
        const serials = l.serialList && l.serialList.length > 0 ? l.serialList : (l.invoiceSerials || []);

        return {
          variantId: Number(l.variantId),
          warehouseId: l.warehouseId ? Number(l.warehouseId) : (doc.warehouseId ? Number(doc.warehouseId) : null),
          quantityIn: isImport ? qty : undefined,
          quantityOut: !isImport ? qty : undefined,
          expectedQuantity: Number(l.expectedQty || l.expectedQuantity || qty),
          unitId: l.unitId ? Number(l.unitId) : null,
          baseUnitId: l.baseUnitId ? Number(l.baseUnitId) : null,
          conversionOperator: op,
          conversionRatio: ratio,
          baseQuantity: baseQty,
          unitCost: Number(l.unitCost || 0),
          unitPrice: Number(l.unitPrice || 0),
          vatPercent: Number(l.vatPercent || l.vatRate || 0),
          warrantyMonths: Number(l.warrantyMonths || 0),
          serialNumbers: serials,
          note: l.note || ''
        };
      })
    };
  };

  // Post document
  const handlePostDocument = async () => {
    if (!validateBeforePost()) return;

    try {
      setSaving(true);
      const payload = buildPayload();
      if (isImport) {
        await importApi.updateImportSlip(doc.id, payload);
        await importApi.postImportSlip(doc.id);
      } else {
        await exportApi.updateExportSlip(doc.id, payload);
        await exportApi.postExportSlip(doc.id);
      }

      showToast('success', 'Ghi sổ kho thành công! Thẻ kho và số lượng tồn đã được cập nhật.');
      setTimeout(() => {
        navigate('/warehouse-workspace');
      }, 800);
    } catch (err) {
      console.error('Lỗi khi ghi sổ kho:', err.response?.data || err);
      const resData = err.response?.data;
      const errMsg = resData?.userMessage || resData?.devMessage || resData?.message || err.message;
      showToast('danger', 'Lỗi ghi sổ kho: ' + errMsg);
    } finally {
      setSaving(false);
      setConfirmPostOpen(false);
    }
  };

  // Handle Unpost
  const handleConfirmUnpost = async (reason) => {
    try {
      if (isImport) {
        await importApi.unpostImportSlip(doc.id, reason);
      } else {
        await exportApi.unpostExportSlip(doc.id, reason);
      }
      showToast('success', 'Đã bỏ ghi sổ kho thành công! Phiếu chuyển về trạng thái Chưa ghi sổ.');
      setTimeout(() => {
        navigate('/warehouse-workspace');
      }, 800);
    } catch (err) {
      showToast('danger', 'Lỗi bỏ ghi sổ: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePrint = () => {
    if (!doc) return;
    if (isImport) {
      printImportSlip({ ...doc, lines });
    } else {
      printExportSlip({ ...doc, lines });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className={styles.loadingContainer}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--color-primary)' }}></i>
          <span>Đang tải chi tiết chứng từ kho...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!doc) {
    return (
      <AdminLayout>
        <div className={styles.emptyContainer}>
          <h3>Không tìm thấy chứng từ kho.</h3>
          <button type="button" className={styles.btnSecondary} onClick={() => navigate('/warehouse-workspace')}>
            <i className="fas fa-arrow-left"></i> Quay lại danh sách
          </button>
        </div>
      </AdminLayout>
    );
  }

  const isPosted = doc.status === 'POSTED' || doc.status === 'COMPLETED';
  const totalExp = lines.reduce((acc, l) => acc + (Number(l.expectedQty) || 0), 0);
  const totalAct = lines.reduce((acc, l) => acc + (Number(l.actualQty) || 0), 0);

  return (
    <AdminLayout>
      <div className={styles.pageContainer}>
        {/* TOP TITLE HEADER */}
        <div className={styles.topHeader}>
          <div className={styles.titleArea}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate('/warehouse-workspace')}
              title="Quay lại bàn làm việc thủ kho"
            >
              <i className="fas fa-arrow-left"></i> Quay lại
            </button>
            <span className={styles.divider}>/</span>
            <h1 className={styles.docTitle}>
              {docTypeLabel}: <span className={styles.docCodeText}>{doc.docCode || doc.code}</span>
              <span
                className={`${styles.statusBadge} ${
                  isPosted ? styles.statusPosted : doc.status === 'UNPOSTED' ? styles.statusUnposted : styles.statusDraft
                }`}
              >
                <i className={`fas ${isPosted ? 'fa-check' : doc.status === 'UNPOSTED' ? 'fa-undo' : 'fa-clock'}`} style={{ marginRight: 4 }}></i>
                {isPosted ? 'Đã ghi sổ' : doc.status === 'UNPOSTED' ? 'Đã bỏ ghi sổ' : 'Chưa ghi sổ'}
              </span>
            </h1>
          </div>

          <div className={styles.headerActions}>
            <button type="button" className={styles.btnSecondary} onClick={handlePrint} title="In phiếu chứng từ">
              <i className="fas fa-print"></i> In phiếu
            </button>
            {isPosted ? (
              <button
                type="button"
                className={styles.btnUnpost}
                onClick={() => setUnpostModalOpen(true)}
              >
                <i className="fas fa-undo-alt"></i> Bỏ ghi sổ
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPost}
                onClick={() => setConfirmPostOpen(true)}
                disabled={saving || lines.length === 0}
              >
                <i className="fas fa-check-circle"></i> {saving ? 'Đang ghi sổ...' : 'Xác nhận Ghi sổ kho'}
              </button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className={styles.mainContent}>
          {/* UNPOST HISTORY ALERT BANNER */}
          {doc.unpostReason && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <i className="fas fa-history" style={{ color: '#d97706', fontSize: '18px', marginTop: '2px' }}></i>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#92400e', fontSize: '14px', marginBottom: '2px' }}>
                  Lịch sử Bỏ ghi sổ:
                </div>
                <div style={{ color: '#78350f', fontSize: '13px' }}>
                  Chứng từ này từng được Bỏ ghi sổ bởi <strong>{doc.unpostedByName || 'Thủ kho'}</strong>
                  {doc.unpostedAt && ` vào lúc ${new Date(doc.unpostedAt).toLocaleString('vi-VN')}`}
                  {doc.unpostReason && ` • Lý do: "${doc.unpostReason}"`}
                </div>
              </div>
            </div>
          )}

          {/* DISCREPANCY ALERT BANNER */}
          {doc.hasDiscrepancy && doc.discrepancyNote && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626', fontSize: '18px', marginTop: '2px' }}></i>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#991b1b', fontSize: '14px', marginBottom: '2px' }}>
                  Cảnh báo Chênh lệch Kiểm nhận (Hàng thiếu / Hàng lỗi):
                </div>
                <div style={{ color: '#7f1d1d', fontSize: '13px', whiteSpace: 'pre-line' }}>
                  {doc.discrepancyNote}
                </div>
              </div>
            </div>
          )}

          {/* GENERAL INFO CARD */}
          <div className={styles.formHeaderCard}>
            <div className={styles.formLeftCol}>
              <div className={styles.formRow}>
                <span className={styles.fieldLabel}>Đối tượng / NCC / KH:</span>
                <span className={styles.fieldValueBold}>{doc.partnerName || '-'}</span>
              </div>
              <div className={styles.formRow}>
                <span className={styles.fieldLabel}>{isImport ? 'Người giao hàng:' : 'Người nhận hàng:'}</span>
                <span className={styles.fieldValue}>{doc.recipientName || doc.partnerName || '-'}</span>
              </div>
              <div className={styles.formRow}>
                <span className={styles.fieldLabel}>{isImport ? 'Kho nhập:' : 'Kho xuất:'}</span>
                <span className={styles.fieldValueBadge}>
                  <i className="fas fa-warehouse" style={{ marginRight: 4 }}></i>
                  {doc.warehouseName || doc.warehouseCode || 'Kho chính'}
                </span>
              </div>
              <div className={styles.formRow}>
                <span className={styles.fieldLabel}>Ghi chú:</span>
                <span className={styles.fieldValue}>{doc.note || '-'}</span>
              </div>
            </div>

            <div className={styles.formRightCol}>
              <div className={styles.formRow}>
                <span className={styles.fieldLabel}>Ngày chứng từ:</span>
                <span className={styles.fieldValue}>{doc.docDate || '-'}</span>
              </div>
              <div className={styles.formRow}>
                <span className={styles.fieldLabel}>Số chứng từ:</span>
                <span className={styles.fieldValueCode}>{doc.docCode || doc.code}</span>
              </div>
              <div className={styles.formRow}>
                <span className={styles.fieldLabel}>Ngày ghi sổ:</span>
                <span className={styles.fieldValue}>
                  {doc.postedAt ? new Date(doc.postedAt).toLocaleDateString('vi-VN') : isPosted ? doc.docDate || '-' : 'Chưa ghi sổ'}
                </span>
              </div>
            </div>
          </div>

          {/* SCANNER BAR */}
          {!isPosted && (
            <form onSubmit={handleScannerSubmit} className={styles.scannerBar}>
              <i className="fas fa-barcode" style={{ color: 'var(--color-primary)', fontSize: '1.25rem' }}></i>
              <input
                ref={scanInputRef}
                type="text"
                className={styles.scannerInput}
                placeholder="Quét mã vạch SKU hoặc bắn súng mã Serial/IMEI tại đây (Enter để nhận)..."
                value={scannerCode}
                onChange={(e) => setScannerCode(e.target.value)}
              />
              {scannerFeedback && (
                <span className={styles.scannerFeedback}>{scannerFeedback}</span>
              )}
            </form>
          )}

          {/* DATA GRID TABLE */}
          <div className={styles.gridCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '130px' }}>Mã hàng (SKU)</th>
                    <th>Tên hàng hóa, linh kiện</th>
                    <th style={{ width: '120px' }}>Kho</th>
                    <th style={{ width: '80px' }}>ĐVT</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>SL Yêu cầu</th>
                    <th style={{ width: '120px', textAlign: 'right', background: 'var(--color-primary-soft)', color: 'var(--color-primary-navy)' }}>
                      {qtyLabel}
                    </th>
                    <th style={{ width: '150px' }}>Serial / IMEI</th>
                    <th>Ghi chú</th>
                    <th style={{ width: '110px' }}>Đơn vị chính</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Tỷ lệ CĐ</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.id || idx} className={styles.dataRow}>
                      <td style={{ textAlign: 'center' }}>{l.stt || idx + 1}</td>
                      <td>
                        <strong style={{ color: 'var(--color-primary)' }}>{l.sku || l.productSku || '-'}</strong>
                      </td>
                      <td>{l.productName || l.variantName || '-'}</td>
                      <td>
                        <div>{l.warehouseName || l.warehouseCode || doc.warehouseName || 'Kho chính'}</div>
                        {l.locationCode && (
                          <span className={styles.subText}>Kệ: {l.locationCode}</span>
                        )}
                      </td>
                      <td>{l.unitName}</td>
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>
                        {Number(l.expectedQty).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ textAlign: 'right', background: 'var(--color-bg-subtle)' }}>
                        {!isPosted ? (
                          <input
                            type="number"
                            className={styles.qtyCellInput}
                            value={l.actualQty !== undefined && l.actualQty !== null ? l.actualQty : ''}
                            min="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            onBlur={() => {
                              if (l.actualQty === '' || l.actualQty === undefined || l.actualQty === null) {
                                handleQtyChange(idx, 0);
                              }
                            }}
                          />
                        ) : (
                          <strong style={{ color: 'var(--color-success-deep)' }}>
                            {Number(l.actualQty).toLocaleString('vi-VN')}
                          </strong>
                        )}
                      </td>
                      <td>
                        {(() => {
                          const actNum = Number(l.actualQty) || 0;
                          const snCount = (l.serialList || []).length;
                          const isMatch = snCount > 0 && snCount === actNum;
                          const isMismatch = snCount > 0 && snCount !== actNum;

                          let btnClass = styles.serialBtn;
                          if (isMatch) btnClass += ` ${styles.serialBtnSuccess}`;
                          else if (isMismatch) btnClass += ` ${styles.serialBtnWarning}`;

                          return (
                            <button
                              type="button"
                              className={btnClass}
                              title={
                                isMismatch
                                  ? `Chưa khớp: Đã nhập ${snCount} / ${actNum} serial`
                                  : isMatch
                                  ? `Đã nhập đủ ${snCount} serial`
                                  : 'Nhập / quét serial cho mặt hàng này'
                              }
                              onClick={() => {
                                setSelectedLineIdx(idx);
                                setSerialModalOpen(true);
                              }}
                            >
                              {isMatch ? (
                                <>
                                  <i className="fas fa-check-circle"></i>
                                  {snCount} serial (Đủ)
                                </>
                              ) : isMismatch ? (
                                <>
                                  <i className="fas fa-exclamation-triangle"></i>
                                  {snCount}/{actNum} serial
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-barcode"></i>
                                  {(l.invoiceSerials && l.invoiceSerials.length > 0) ? `Đối soát (${l.invoiceSerials.length})` : 'Quét serial'}
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </td>
                      <td>{l.note || '-'}</td>
                      <td>{l.baseUnitName}</td>
                      <td style={{ textAlign: 'right' }}>{Number(l.conversionRatio || 1.0).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}

                  {/* FOOTER SUMMARY ROW */}
                  <tr className={styles.tableFooterRow}>
                    <td colSpan="5" style={{ textAlign: 'right', fontWeight: '700' }}>
                      Tổng cộng:
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>
                      {totalExp.toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--color-primary)' }}>
                      {totalAct.toLocaleString('vi-VN')}
                    </td>
                    <td colSpan="4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AUDIT LOG TIMELINE */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 20px',
            marginTop: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-stream" style={{ color: '#0284c7' }}></i>
                Nhật ký thao tác & Lịch sử chứng từ ({auditLogs.length > 0 ? auditLogs.length : 1} sự kiện)
              </h4>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Lưu vết toàn bộ các lần Tạo mới, Ghi sổ và Bỏ ghi sổ
              </span>
            </div>

            {auditLogs && auditLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.map((logItem, logIdx) => {
                  const isUnpost = logItem.action === 'UNPOST' || logItem.action === 'UNPOST_IMPORT' || logItem.action === 'UNPOST_EXPORT';
                  const isPost = logItem.action === 'POST' || logItem.action === 'POST_IMPORT' || logItem.action === 'POST_EXPORT';
                  const isCreate = logItem.action === 'CREATE' || logItem.action === 'CREATE_IMPORT';
                  
                  let badgeBg = '#f1f5f9';
                  let badgeColor = '#475569';
                  let icon = 'fas fa-info-circle';
                  if (isUnpost) {
                    badgeBg = '#fef3c7';
                    badgeColor = '#92400e';
                    icon = 'fas fa-undo-alt';
                  } else if (isPost) {
                    badgeBg = '#dcfce7';
                    badgeColor = '#166534';
                    icon = 'fas fa-check-circle';
                  } else if (isCreate) {
                    badgeBg = '#e0f2fe';
                    badgeColor = '#0369a1';
                    icon = 'fas fa-plus-circle';
                  }

                  return (
                    <div
                      key={logItem.id || logIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isUnpost ? '#fffbeb' : '#f8fafc',
                        border: `1px solid ${isUnpost ? '#fde68a' : '#f1f5f9'}`,
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                        <span
                          style={{
                            background: badgeBg,
                            color: badgeColor,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '1px'
                          }}
                        >
                          <i className={icon}></i>
                          {isUnpost ? 'BỎ GHI SỔ' : isPost ? 'GHI SỔ KHO' : isCreate ? 'TẠO CHỨNG TỪ' : logItem.action}
                        </span>
                        <div>
                          <div style={{ fontWeight: 500, color: '#1e293b' }}>
                            {logItem.description || logItem.action}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Thực hiện bởi: <strong style={{ color: '#334155' }}>{logItem.user || 'Hệ thống'}</strong>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '12px', marginTop: '2px' }}>
                        {logItem.timestamp ? new Date(logItem.timestamp).toLocaleString('vi-VN') : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Người tạo chứng từ:</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', marginTop: '2px' }}>
                    {doc.createdByName || (doc.createdBy ? `User #${doc.createdBy}` : '-')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleString('vi-VN') : '-'}
                  </div>
                </div>

                {doc.postedAt && (
                  <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '12px', color: '#166534' }}>Ghi sổ kho:</div>
                    <div style={{ fontWeight: 600, color: '#14532d', fontSize: '13px', marginTop: '2px' }}>
                      {isPosted ? 'Đã ghi sổ thành công' : 'Đã từng ghi sổ'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                      {new Date(doc.postedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                )}

                {doc.unpostedAt && (
                  <div style={{ background: '#fffbeb', padding: '10px 14px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                    <div style={{ fontSize: '12px', color: '#92400e' }}>Bỏ ghi sổ bởi:</div>
                    <div style={{ fontWeight: 600, color: '#78350f', fontSize: '13px', marginTop: '2px' }}>
                      {doc.unpostedByName || 'Thủ kho'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                      {new Date(doc.unpostedAt).toLocaleString('vi-VN')} • Lý do: "{doc.unpostReason}"
                    </div>
                  </div>
                )}

                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Cập nhật lần cuối:</div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px', marginTop: '2px' }}>
                    {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString('vi-VN') : '-'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Trạng thái hiện tại: {doc.status === 'POSTED' ? 'Đã ghi sổ' : doc.status === 'UNPOSTED' ? 'Đã bỏ ghi sổ' : 'Lưu tạm'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* UNPOST CONFIRM MODAL */}
        <UnpostConfirmModal
          open={unpostModalOpen}
          onClose={() => setUnpostModalOpen(false)}
          docCode={doc.docCode || doc.code}
          onCheckDependency={() =>
            isImport ? importApi.checkImportUnpost(doc.id) : exportApi.checkExportUnpost(doc.id)
          }
          onConfirmUnpost={handleConfirmUnpost}
          docType={isImport ? 'nhập kho' : 'xuất kho'}
        />

        {/* CONFIRM POST MODAL */}
        <ConfirmModal
          isOpen={confirmPostOpen}
          title="Xác nhận Ghi sổ kho"
          message={`Xác nhận Ghi sổ cho chứng từ "${doc.docCode || doc.code}"? Số lượng tồn kho và thẻ kho sẽ được cập nhật ngay lập tức.`}
          confirmText="Ghi sổ ngay"
          onConfirm={handlePostDocument}
          onCancel={() => setConfirmPostOpen(false)}
        />

        {/* MANAGE SERIAL MODAL */}
        {serialModalOpen && selectedLineIdx !== null && (
          <ManageSerialModal
            isOpen={serialModalOpen}
            onClose={(savedSerials) => {
              if (Array.isArray(savedSerials)) {
                setLines((prev) => {
                  const next = [...prev];
                  next[selectedLineIdx].serialList = savedSerials;
                  if (savedSerials.length > 0) {
                    next[selectedLineIdx].actualQty = savedSerials.length;
                  }
                  return next;
                });
              }
              setSerialModalOpen(false);
              setSelectedLineIdx(null);
            }}
            productName={lines[selectedLineIdx]?.productName || lines[selectedLineIdx]?.variantName || 'Sản phẩm'}
            sku={lines[selectedLineIdx]?.sku}
            targetQuantity={Number(lines[selectedLineIdx]?.actualQty) > 0 ? Number(lines[selectedLineIdx]?.actualQty) : (Number(lines[selectedLineIdx]?.expectedQty) || 1)}
            currentSerials={lines[selectedLineIdx]?.serialList || []}
            invoiceSerials={lines[selectedLineIdx]?.invoiceSerials || []}
            mode={isImport ? 'import' : 'export'}
            warehouseId={doc?.warehouseId}
            variantId={lines[selectedLineIdx]?.variantId}
          />
        )}

        {/* TOAST */}
        <Toast isVisible={toast.isVisible} type={toast.type} message={toast.message} onClose={hideToast} />
      </div>
    </AdminLayout>
  );
}
