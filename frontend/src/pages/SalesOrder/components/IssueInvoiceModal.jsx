import React, { useState, useEffect } from 'react';
import { lookupTaxCode } from '../../../api/taxLookupApi';

export default function IssueInvoiceModal({ isOpen, onClose, so, exportDoc, onConfirm, loading }) {
  const [buyerName, setBuyerName] = useState('');
  const [buyerLegalName, setBuyerLegalName] = useState('');
  const [buyerTaxCode, setBuyerTaxCode] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [lookingUpTax, setLookingUpTax] = useState(false);
  const [taxLookupMsg, setTaxLookupMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      const partnerName = so?.partnerName || exportDoc?.partnerName || exportDoc?.recipientName || '';
      const partnerTaxCode = so?.partnerTaxCode || exportDoc?.partnerTaxCode || '';
      const partnerAddress = so?.deliveryAddress || so?.partnerAddress || exportDoc?.recipientAddress || exportDoc?.partnerAddress || '';
      const partnerPhone = so?.partnerPhone || exportDoc?.partnerPhone || '';
      const partnerEmail = so?.partnerEmail || exportDoc?.partnerEmail || '';

      setBuyerName(partnerName);
      setBuyerLegalName(partnerName);
      setBuyerTaxCode(partnerTaxCode);
      setBuyerAddress(partnerAddress);
      setBuyerPhone(partnerPhone);
      setBuyerEmail(partnerEmail);
      setTaxLookupMsg({ type: '', text: '' });
    }
  }, [isOpen, so, exportDoc]);

  if (!isOpen || (!so && !exportDoc)) return null;

  const handleLookupTax = async () => {
    if (!buyerTaxCode || !buyerTaxCode.trim()) {
      setTaxLookupMsg({ type: 'error', text: 'Vui lòng nhập Mã số thuế trước khi tra cứu' });
      return;
    }
    setLookingUpTax(true);
    setTaxLookupMsg({ type: '', text: '' });
    try {
      const res = await lookupTaxCode(buyerTaxCode.trim());
      const data = res.data?.data;
      if (data && data.success) {
        setBuyerLegalName(data.name || buyerLegalName);
        setBuyerAddress(data.address || buyerAddress);
        setTaxLookupMsg({ type: 'success', text: `Tìm thấy: ${data.name} (${data.rawStatusText || 'Đang hoạt động'})` });
      } else {
        setTaxLookupMsg({ type: 'error', text: data?.message || 'Không tìm thấy MST' });
      }
    } catch {
      setTaxLookupMsg({ type: 'error', text: 'Tra cứu MST thất bại' });
    } finally {
      setLookingUpTax(false);
    }
  };

  const calcSubTotal = exportDoc
    ? (exportDoc.subTotalAmount ?? exportDoc.lines?.reduce((s, l) => s + (Number(l.quantityOut ?? l.quantity ?? 0) * Number(l.unitPrice ?? 0)), 0) ?? 0)
    : (so?.subTotalAmount || 0);

  const calcVat = exportDoc
    ? (exportDoc.vatAmount ?? exportDoc.lines?.reduce((s, l) => s + (Number(l.quantityOut ?? l.quantity ?? 0) * Number(l.unitPrice ?? 0) * Number(l.vatRate ?? l.vatPercent ?? 0) / 100), 0) ?? 0)
    : (so?.vatAmount || 0);

  const calcTotal = exportDoc
    ? (exportDoc.totalAmount ?? (Number(calcSubTotal) + Number(calcVat)))
    : (so?.totalAmount || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      salesOrderId: so?.id || exportDoc?.salesOrderId || undefined,
      inventoryDocumentId: exportDoc?.id || undefined,
      name: buyerName,
      legalName: buyerLegalName,
      taxCode: buyerTaxCode,
      address: buyerAddress,
      phone: buyerPhone,
      email: buyerEmail,
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '620px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(to right, #059669, #047857)', color: '#fff'
        }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="bi bi-file-earmark-text" /> Phát Hành Hóa Đơn Điện Tử (Nghị định 123 / TT 78)
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#fff' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#334155'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>Chứng từ: <strong>{exportDoc ? `PXK: ${exportDoc.docCode}` : `Đơn hàng: ${so?.soCode}`}</strong></div>
              <div>Tiền hàng đợt này: <strong>{Number(calcSubTotal).toLocaleString('vi-VN')} đ</strong></div>
              <div>Tiền thuế VAT: <strong style={{ color: '#dc2626' }}>{Number(calcVat).toLocaleString('vi-VN')} đ</strong></div>
              <div>Tổng thanh toán: <strong style={{ color: '#059669' }}>{Number(calcTotal).toLocaleString('vi-VN')} đ</strong></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Mã số thuế doanh nghiệp (nếu có)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={buyerTaxCode}
                  onChange={(e) => setBuyerTaxCode(e.target.value)}
                  placeholder="Nhập MST (VD: 0100109106)..."
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={handleLookupTax}
                  disabled={lookingUpTax || !buyerTaxCode?.trim()}
                  style={{
                    padding: '0 12px', background: '#0284c7', color: '#fff', border: 'none',
                    borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                  }}
                >
                  <i className={`bi ${lookingUpTax ? 'bi-arrow-repeat spin' : 'bi-search'}`} />
                  {lookingUpTax ? 'Đang tra...' : 'Tra cứu MST'}
                </button>
              </div>
              {taxLookupMsg.text && (
                <div style={{
                  marginTop: '4px', fontSize: '12px',
                  color: taxLookupMsg.type === 'success' ? '#166534' : '#dc2626',
                  background: taxLookupMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  padding: '4px 8px', borderRadius: '4px'
                }}>
                  {taxLookupMsg.text}
                </div>
              )}
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Tên công ty / Đơn vị mua hàng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={buyerLegalName}
                onChange={(e) => setBuyerLegalName(e.target.value)}
                placeholder="Tên pháp nhân công ty..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Họ tên người mua / Đại diện
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Họ tên người mua..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Số điện thoại liên hệ
              </label>
              <input
                type="text"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="Số điện thoại..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Email nhận hóa đơn điện tử
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                placeholder="email@company.com..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Địa chỉ xuất hóa đơn
              </label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="Địa chỉ trụ sở chính hoặc địa chỉ nhận..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px', background: '#fff', border: '1px solid #cbd5e1',
                borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#475569'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px', background: '#059669', border: 'none',
                borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              {loading ? (
                <><i className="bi bi-arrow-repeat spin" /> Đang phát hành...</>
              ) : (
                <><i className="bi bi-check2-circle" /> Xác nhận Phát hành HĐĐT</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
