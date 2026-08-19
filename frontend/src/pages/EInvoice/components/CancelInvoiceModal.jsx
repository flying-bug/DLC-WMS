import React, { useState } from 'react';
import * as einvoiceApi from '../../../api/einvoiceApi';

export default function CancelInvoiceModal({ invoice, isOpen, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !invoice) return null;

  const handleCancel = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hủy hóa đơn');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await einvoiceApi.cancelEInvoice(invoice.id, { reason: reason.trim() });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Hủy hóa đơn thất bại');
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
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-exclamation-triangle" /> Hủy Hóa Đơn Điện Tử
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
        </div>

        <form onSubmit={handleCancel} style={{ padding: '20px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '13px', marginBottom: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px', fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
            <div>Số hóa đơn: <strong style={{ color: '#1e293b' }}>{invoice.invoiceNumber || 'Chưa cấp số'}</strong></div>
            <div>Ký hiệu: <strong style={{ color: '#1e293b' }}>{invoice.invoiceSeries}</strong></div>
            <div>Người mua: <strong style={{ color: '#1e293b' }}>{invoice.buyerLegalName || invoice.buyerName}</strong></div>
            <div>Tổng thanh toán: <strong style={{ color: '#16a34a' }}>{Number(invoice.totalAmount || 0).toLocaleString('vi-VN')} đ</strong></div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Lý do hủy hóa đơn <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do chi tiết (sai thông tin khách hàng, điều chỉnh giá, trả hàng...)"
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1',
                borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1',
                borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569'
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px', background: '#dc2626', border: 'none',
                borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              {loading ? 'Đang hủy...' : 'Xác nhận Hủy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
