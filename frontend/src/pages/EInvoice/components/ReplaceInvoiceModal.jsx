import React, { useState, useEffect } from 'react';
import * as einvoiceApi from '../../../api/einvoiceApi';

export default function ReplaceInvoiceModal({ invoice, isOpen, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerLegalName, setBuyerLegalName] = useState('');
  const [buyerTaxCode, setBuyerTaxCode] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && invoice) {
      setReason('');
      setBuyerName(invoice.buyerName || '');
      setBuyerLegalName(invoice.buyerLegalName || '');
      setBuyerTaxCode(invoice.buyerTaxCode || '');
      setBuyerAddress(invoice.buyerAddress || '');
      setBuyerPhone(invoice.buyerPhone || '');
      setBuyerEmail(invoice.buyerEmail || '');
      setError('');
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do thay thế hóa đơn');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await einvoiceApi.replaceEInvoice(invoice.id, {
        reason: reason.trim(),
        buyerName: buyerName.trim(),
        buyerLegalName: buyerLegalName.trim(),
        buyerTaxCode: buyerTaxCode.trim(),
        buyerAddress: buyerAddress.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerEmail: buyerEmail.trim(),
      });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Thay thế hóa đơn thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '560px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--wms-border-base)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--wms-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-arrow-repeat" /> Thay Thế Hóa Đơn Điện Tử
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--wms-text-subtle)' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: 'var(--wms-danger)', fontSize: '13px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--wms-text-muted)', lineHeight: '1.6' }}>
            <div>Hóa đơn gốc bị thay thế: <strong style={{ color: 'var(--wms-text-strong)' }}>{invoice.invoiceNumber || 'Chưa cấp số'} - {invoice.invoiceSeries}</strong></div>
            <div>Tổng thanh toán: <strong style={{ color: '#16a34a' }}>{Number(invoice.totalAmount || 0).toLocaleString('vi-VN')} đ</strong> (giữ nguyên trên hóa đơn thay thế)</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--wms-text-body)', marginBottom: '6px' }}>
              Lý do thay thế hóa đơn <span style={{ color: 'var(--wms-danger)' }}>*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do chi tiết (sai MST, sai tên/địa chỉ người mua...)"
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid var(--wms-border-strong)',
                borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--wms-text-body)', marginBottom: '4px' }}>
                Mã số thuế
              </label>
              <input
                type="text"
                value={buyerTaxCode}
                onChange={(e) => setBuyerTaxCode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--wms-border-strong)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--wms-text-body)', marginBottom: '4px' }}>
                Tên đơn vị / Tên người mua (theo pháp lý)
              </label>
              <input
                type="text"
                value={buyerLegalName}
                onChange={(e) => setBuyerLegalName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--wms-border-strong)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--wms-text-body)', marginBottom: '4px' }}>
                Người liên hệ
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--wms-border-strong)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--wms-text-body)', marginBottom: '4px' }}>
                Số điện thoại
              </label>
              <input
                type="text"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--wms-border-strong)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--wms-text-body)', marginBottom: '4px' }}>
                Email nhận hóa đơn
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--wms-border-strong)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--wms-text-body)', marginBottom: '4px' }}>
                Địa chỉ
              </label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--wms-border-strong)', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px', background: '#fff', border: '1px solid var(--wms-border-strong)',
                borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--wms-text-muted)'
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px', background: 'var(--wms-primary)', border: 'none',
                borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận Thay thế'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
