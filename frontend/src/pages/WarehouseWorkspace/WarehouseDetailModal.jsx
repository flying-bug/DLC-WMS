import React from 'react';
import { printImportSlip } from '../../utils/printImportSlip';
import { printExportSlip } from '../../utils/printExportSlip';
import styles from './WarehouseFulfillModal.module.css';

export default function WarehouseDetailModal({
  open,
  onClose,
  slip,
  lines = [],
  docType = 'IMPORT',
  onOpenFulfill,
  onOpenUnpost
}) {
  if (!open || !slip) return null;

  const handlePrint = () => {
    if (docType === 'IMPORT') {
      printImportSlip({ ...slip, lines });
    } else {
      printExportSlip({ ...slip, lines });
    }
  };

  const isPosted = slip.status === 'POSTED' || slip.status === 'COMPLETED';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <i className="fas fa-file-alt" style={{ color: '#2563eb' }}></i>
            Chi tiết chứng từ kho: {slip.docCode}
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* BODY */}
        <div className={styles.modalBody}>
          {/* INFO SUMMARY GRID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.875rem'
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Số phiếu: </span>
              <strong style={{ color: '#2563eb' }}>{slip.docCode}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Ngày lập: </span>
              <strong>{slip.docDate || '-'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Loại nghiệp vụ: </span>
              <strong>{slip.issuePurpose || 'Nghiệp vụ kho'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Đối tác: </span>
              <strong>{slip.partnerName || 'Nội bộ'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Kho thực hiện: </span>
              <strong>{slip.warehouseName || 'Kho chính'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Trạng thái: </span>
              <span
                style={{
                  fontWeight: 'bold',
                  color: isPosted ? '#16a34a' : slip.status === 'UNPOSTED' ? '#dc2626' : '#d97706'
                }}
              >
                {isPosted ? 'ĐÃ GHI SỔ KHO' : slip.status === 'UNPOSTED' ? 'ĐÃ BỎ GHI SỔ' : 'CHỜ GHI SỔ'}
              </span>
            </div>
          </div>

          {slip.note && (
            <div style={{ fontSize: '0.875rem', color: '#475569', fontStyle: 'italic' }}>
              <strong>Ghi chú: </strong> {slip.note}
            </div>
          )}

          {/* TABLE OF ITEMS */}
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '8px', color: '#0f172a' }}>
              Danh sách vật tư hàng hóa & Serial ({lines.length} mặt hàng):
            </div>
            <table className={styles.itemTable}>
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>ĐVT</th>
                  <th style={{ textAlign: 'center' }}>SL Dự kiến</th>
                  <th style={{ textAlign: 'center' }}>SL Thực tế</th>
                  <th>Vị trí Kệ</th>
                  <th>Danh sách Serial / IMEI</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      Không có dòng mặt hàng nào.
                    </td>
                  </tr>
                ) : (
                  lines.map((l, idx) => {
                    const sns = l.serialNumbers || (l.serialNumbersText ? l.serialNumbersText.split(/[,;\s\n]+/).filter(Boolean) : []);
                    return (
                      <tr key={l.id || idx}>
                        <td>
                          <strong>{l.sku || l.productSku || '-'}</strong>
                        </td>
                        <td>{l.productName || l.variantName || '-'}</td>
                        <td>{l.unitName || 'Cái'}</td>
                        <td style={{ textAlign: 'center' }}>{l.expectedQuantity || l.quantity || '-'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>
                          {l.quantityIn || l.quantityOut || l.actualQuantity || '-'}
                        </td>
                        <td>{l.locationCode || l.warehouseName || '-'}</td>
                        <td>
                          {sns.length === 0 ? (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          ) : (
                            <div className={styles.serialBadgeList}>
                              {sns.map((sn, sIdx) => (
                                <span key={sIdx} className={styles.serialBadge}>
                                  {sn}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <div className={styles.modalFooter}>
          <div>
            <button
              type="button"
              className={styles.btnCancel}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handlePrint}
            >
              <i className="fas fa-print"></i> In phiếu kho
            </button>
          </div>
          <div className={styles.footerActions}>
            {!isPosted ? (
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={() => {
                  onClose();
                  if (onOpenFulfill) onOpenFulfill(slip);
                }}
              >
                <i className="fas fa-barcode"></i> Quét mã & Ghi sổ kho
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnCancel}
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => {
                  onClose();
                  if (onOpenUnpost) onOpenUnpost(slip);
                }}
              >
                <i className="fas fa-undo-alt"></i> Bỏ ghi sổ kho
              </button>
            )}
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
