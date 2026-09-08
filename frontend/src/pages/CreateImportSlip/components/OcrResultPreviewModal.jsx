import React from 'react';

export default function OcrResultPreviewModal({ open, data, onConfirm, onCancel, onQuickAdd }) {
  if (!open || !data) return null;

  const matchedItems = data.items?.filter(i => i.matchedVariantId) || [];
  const unmatchedItems = data.items?.map((item, index) => ({ ...item, originalIndex: index })).filter(i => !i.matchedVariantId) || [];

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
      backdropFilter: 'blur(4px)'
    }} onClick={onCancel}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '90%', maxWidth: '700px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text)' }}>
            📊 Kết quả trích xuất AI
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#4b5563' }}>Nhà cung cấp nhận diện:</p>
            <div style={{ fontSize: '16px', fontWeight: 600, color: data.matchedSupplierId ? 'var(--wms-success)' : 'var(--wms-danger)' }}>
              {data.matchedSupplierId ? `✅ ${data.matchedSupplierName} (Mã: ${data.matchedSupplierCode || data.supplierTaxCode})` : `⚠️ ${data.rawSupplierName || 'Không nhận diện được'} (Chưa có trong hệ thống)`}
            </div>
          </div>

          {unmatchedItems.length > 0 && (
            <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px', color: 'var(--wms-danger)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-exclamation-triangle-fill"></i> Hàng hóa chưa có trong kho ({unmatchedItems.length})
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#7f1d1d' }}>
                Hệ thống không tìm thấy mã hàng nào khớp với tên trên hóa đơn. Bạn có thể nhấn <strong>Tạo mới</strong> ngay dưới đây.
              </p>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #fca5a5', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px', color: '#991b1b' }}>Tên trên hóa đơn</th>
                    <th style={{ padding: '8px 4px', color: '#991b1b', width: '60px', textAlign: 'right' }}>SL</th>
                    <th style={{ padding: '8px 4px', width: '100px', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatchedItems.map((item) => (
                    <tr key={item.originalIndex} style={{ borderBottom: '1px solid #fecaca' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 500 }}>{item.rawProductName}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                        <button
                          onClick={() => onQuickAdd(item.originalIndex, item.rawProductName, item.unit, item.category, item.warrantyMonths)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--wms-danger)', backgroundColor: '#fff', color: 'var(--wms-danger)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
                        >
                          <i className="bi bi-plus-lg"></i> Tạo mới
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {matchedItems.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 12px', color: 'var(--wms-success)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="bi bi-check-circle-fill"></i> Hàng hóa đã khớp thành công ({matchedItems.length})
              </h4>
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 4px', color: '#4b5563' }}>Tên trên hóa đơn</th>
                    <th style={{ padding: '8px 4px', color: '#4b5563' }}>Khớp với (Hệ thống)</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-bg)' }}>
                      <td style={{ padding: '8px 4px' }}>{item.rawProductName}</td>
                      <td style={{ padding: '8px 4px', color: 'var(--wms-success)', fontWeight: 500 }}>{item.matchedProductName} - {item.matchedVariantName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: '0 0 12px 12px' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--color-border-muted)', backgroundColor: '#fff', color: 'var(--color-text-heading)', cursor: 'pointer', fontWeight: 500 }}
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--brand-gradient, var(--color-primary, var(--wms-success)))', color: '#fff', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            Tiếp tục điền vào form
          </button>
        </div>
      </div>
    </div>
  );
}
