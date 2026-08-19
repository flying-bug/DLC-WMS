import React, { useRef } from 'react';
import { getBaseURL } from '../../../api/axiosClient';

export default function EInvoicePreviewModal({ invoice, isOpen, onClose }) {
  const iframeRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const previewUrl = invoice.transactionUuid
    ? `${getBaseURL()}/einvoices/preview/${invoice.transactionUuid}`
    : (invoice.viewUrl || '');

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      window.open(previewUrl, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '960px',
        height: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(to right, #1e40af, #2563eb)', color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="bi bi-receipt" style={{ fontSize: '20px' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Hóa Đơn Điện Tử: {invoice.invoiceNumber || 'Bản nháp'} ({invoice.invoiceSeries || '1C26TLL'})
              </h3>
              <span style={{ fontSize: '12px', opacity: 0.85 }}>
                Mã CQT: {invoice.cqtCode || 'Đang cấp mã'} | Provider: {invoice.provider || 'XINVOICE'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleOpenNewTab}
              title="Mở toàn màn hình trong tab mới"
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                display: 'inline-flex', alignItems: 'center', gap: '5px'
              }}
            >
              <i className="bi bi-box-arrow-up-right" /> Mở tab mới
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="In hoặc Lưu file PDF"
              style={{
                background: '#10b981', border: 'none', color: '#fff',
                padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px'
              }}
            >
              <i className="bi bi-printer" /> In / Tải PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none', fontSize: '24px',
                cursor: 'pointer', color: '#fff', marginLeft: '6px', lineHeight: 1
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body: iframe */}
        <div style={{ flex: 1, backgroundColor: '#f1f5f9', position: 'relative' }}>
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              title="Bản thể hiện Hóa đơn điện tử"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
              Không có đường dẫn bản thể hiện hóa đơn
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
