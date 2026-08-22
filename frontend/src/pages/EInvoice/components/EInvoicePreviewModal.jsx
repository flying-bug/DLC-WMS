import React, { useState, useEffect, useRef } from 'react';
import { getBaseURL } from '../../../api/axiosClient';
import { getEInvoicePreviewHtml } from '../../../api/einvoiceApi';

export default function EInvoicePreviewModal({ invoice, isOpen, onClose }) {
  const iframeRef = useRef(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const previewUrl = invoice?.transactionUuid
    ? `${getBaseURL()}/einvoices/preview/${invoice.transactionUuid}`
    : (invoice?.viewUrl || '');

  useEffect(() => {
    if (!isOpen || !invoice) {
      setHtmlContent('');
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadPreview = async () => {
      try {
        if (invoice.transactionUuid) {
          const res = await getEInvoicePreviewHtml(invoice.transactionUuid);
          if (isMounted) {
            const data = typeof res.data === 'string' ? res.data : (typeof res === 'string' ? res : '');
            setHtmlContent(data);
          }
        } else if (invoice.viewUrl) {
          const response = await fetch(invoice.viewUrl);
          const text = await response.text();
          if (isMounted) {
            setHtmlContent(text);
          }
        } else {
          if (isMounted) {
            setError('Không tìm thấy thông tin định danh của hóa đơn điện tử');
          }
        }
      } catch (err) {
        console.error('Failed to load invoice preview HTML:', err);
        // Fallback: Nếu fetch API trả về lỗi nhưng có URL trực tiếp, dùng URL trực tiếp
        if (isMounted) {
          setError(err.response?.data?.userMessage || 'Không thể tải bản thể hiện hóa đơn');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else if (htmlContent) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 300);
      }
    } else if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    if (htmlContent) {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
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

        {/* Modal Body: iframe / Loading / Error */}
        <div style={{ flex: 1, backgroundColor: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
          {loading ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', color: '#64748b', gap: '12px'
            }}>
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Đang tải...</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Đang tải bản thể hiện hóa đơn điện tử...</div>
            </div>
          ) : error ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', color: '#ef4444', gap: '10px', padding: '20px'
            }}>
              <i className="bi bi-exclamation-triangle" style={{ fontSize: '36px' }} />
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{error}</div>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: '#2563eb', fontSize: '13px', textDecoration: 'underline', marginTop: '6px'
                  }}
                >
                  Nhấn vào đây để thử mở trực tiếp bằng đường dẫn
                </a>
              )}
            </div>
          ) : htmlContent ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              title="Bản thể hiện Hóa đơn điện tử"
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
            />
          ) : previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              title="Bản thể hiện Hóa đơn điện tử"
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
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

