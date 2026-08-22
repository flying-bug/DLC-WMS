import React, { useState, useEffect } from 'react';
import { lookupTaxCode } from '../../../api/taxLookupApi';

export default function IssueInvoiceModal({ isOpen, onClose, so, exportDoc, onConfirm, loading }) {
  const [buyerType, setBuyerType] = useState('COMPANY'); // 'COMPANY' | 'INDIVIDUAL' | 'ANONYMOUS'
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

      if (partnerTaxCode) {
        setBuyerType('COMPANY');
      } else if (partnerName) {
        setBuyerType('INDIVIDUAL');
      } else {
        setBuyerType('COMPANY');
      }

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

  const handleSelectBuyerType = (type) => {
    setBuyerType(type);
    setTaxLookupMsg({ type: '', text: '' });
    if (type === 'ANONYMOUS') {
      setBuyerLegalName('Người mua không lấy hóa đơn');
      setBuyerName('Người mua không lấy hóa đơn');
      setBuyerTaxCode('');
      setBuyerAddress('');
      setBuyerEmail('');
    } else if (type === 'INDIVIDUAL') {
      const partnerName = so?.partnerName || exportDoc?.partnerName || exportDoc?.recipientName || '';
      setBuyerLegalName(partnerName);
      setBuyerName(partnerName);
      setBuyerTaxCode('');
      setBuyerAddress(so?.deliveryAddress || so?.partnerAddress || exportDoc?.recipientAddress || '');
    } else if (type === 'COMPANY') {
      const partnerName = so?.partnerName || exportDoc?.partnerName || exportDoc?.recipientName || '';
      const partnerTaxCode = so?.partnerTaxCode || exportDoc?.partnerTaxCode || '';
      setBuyerLegalName(partnerName);
      setBuyerName(partnerName);
      setBuyerTaxCode(partnerTaxCode);
      setBuyerAddress(so?.deliveryAddress || so?.partnerAddress || exportDoc?.recipientAddress || '');
    }
  };

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
    : (so?.vatAmount || (Number(calcSubTotal) * 0.1));

  const calcTotal = exportDoc
    ? (exportDoc.totalAmount ?? (Number(calcSubTotal) + Number(calcVat)))
    : (so?.totalAmount || (Number(calcSubTotal) + Number(calcVat)));

  const displayLines = exportDoc?.lines || so?.lines || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      salesOrderId: so?.id || exportDoc?.salesOrderId || undefined,
      inventoryDocumentId: exportDoc?.id || undefined,
      name: buyerType === 'ANONYMOUS' ? 'Người mua không lấy hóa đơn' : buyerName,
      legalName: buyerType === 'ANONYMOUS' ? 'Người mua không lấy hóa đơn' : (buyerType === 'COMPANY' ? buyerLegalName : buyerName),
      taxCode: buyerType === 'COMPANY' ? buyerTaxCode : '',
      address: buyerType === 'ANONYMOUS' ? '' : buyerAddress,
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
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(to right, #059669, #047857)', color: '#fff'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="bi bi-file-earmark-text" /> Phát Hành Hóa Đơn Điện Tử
            </h3>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>Chuẩn Nghị định 123/2020/NĐ-CP & Thông tư 78/2021/TT-BTC</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#fff' }}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Summary Box */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#334155'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>Chứng từ tham chiếu: <strong>{exportDoc ? `PXK: ${exportDoc.docCode}` : `Đơn hàng: ${so?.soCode}`}</strong></div>
              <div>Tiền hàng (chưa thuế): <strong>{Number(calcSubTotal).toLocaleString('vi-VN')} đ</strong></div>
              <div>Tiền thuế VAT (10%): <strong style={{ color: '#dc2626' }}>{Number(calcVat).toLocaleString('vi-VN')} đ</strong></div>
              <div>Tổng cộng thanh toán: <strong style={{ color: '#059669', fontSize: '14px' }}>{Number(calcTotal).toLocaleString('vi-VN')} đ</strong></div>
            </div>

            {/* Chi tiết mặt hàng & S/N */}
            {displayLines.length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', color: '#475569' }}>Chi tiết hàng hóa ({displayLines.length} món):</div>
                <div style={{ maxHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {displayLines.map((line, idx) => {
                    const name = line.productName || line.variantName || line.sku || `Sản phẩm #${idx + 1}`;
                    const sn = line.serialNumbersText || (Array.isArray(line.serialNumbers) ? line.serialNumbers.join(', ') : '');
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>• <strong>{name}</strong> {sn ? <span style={{ color: '#0284c7' }}>(S/N: {sn})</span> : ''}</span>
                        <span>x{line.quantityOut || line.quantity || 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chọn Loại Khách Hàng */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Đối tượng xuất hóa đơn:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSelectBuyerType('COMPANY')}
                style={{
                  padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: buyerType === 'COMPANY' ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: buyerType === 'COMPANY' ? '#ecfdf5' : '#fff',
                  color: buyerType === 'COMPANY' ? '#065f46' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <i className="bi bi-building" /> Công ty / Doanh nghiệp
              </button>

              <button
                type="button"
                onClick={() => handleSelectBuyerType('INDIVIDUAL')}
                style={{
                  padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: buyerType === 'INDIVIDUAL' ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: buyerType === 'INDIVIDUAL' ? '#ecfdf5' : '#fff',
                  color: buyerType === 'INDIVIDUAL' ? '#065f46' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <i className="bi bi-person" /> Cá nhân mua lẻ
              </button>

              <button
                type="button"
                onClick={() => handleSelectBuyerType('ANONYMOUS')}
                style={{
                  padding: '8px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: buyerType === 'ANONYMOUS' ? '2px solid #059669' : '1px solid #cbd5e1',
                  background: buyerType === 'ANONYMOUS' ? '#ecfdf5' : '#fff',
                  color: buyerType === 'ANONYMOUS' ? '#065f46' : '#475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <i className="bi bi-person-x" /> Khách lẻ không lấy HĐ
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {buyerType === 'COMPANY' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Mã số thuế doanh nghiệp <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    value={buyerTaxCode}
                    onChange={(e) => setBuyerTaxCode(e.target.value)}
                    placeholder="Nhập MST công ty (VD: 0100109106)..."
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace' }}
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
            )}

            {buyerType === 'COMPANY' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tên công ty / Đơn vị mua hàng (theo ĐKKD) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={buyerLegalName}
                  onChange={(e) => setBuyerLegalName(e.target.value)}
                  placeholder="Tên pháp nhân công ty theo đăng ký kinh doanh..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div style={{ gridColumn: buyerType === 'COMPANY' ? '1' : 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                {buyerType === 'COMPANY' ? 'Người đại diện / Người liên hệ' : 'Họ và tên người mua hàng'}
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                disabled={buyerType === 'ANONYMOUS'}
                placeholder="Họ tên người mua..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: buyerType === 'ANONYMOUS' ? '#f1f5f9' : '#fff' }}
              />
            </div>

            {buyerType === 'COMPANY' && (
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
            )}

            {buyerType !== 'COMPANY' && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  disabled={buyerType === 'ANONYMOUS'}
                  placeholder="Số điện thoại..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: buyerType === 'ANONYMOUS' ? '#f1f5f9' : '#fff' }}
                />
              </div>
            )}

            <div style={{ gridColumn: buyerType === 'COMPANY' ? 'span 2' : '1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Email nhận hóa đơn điện tử
              </label>
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                disabled={buyerType === 'ANONYMOUS'}
                placeholder="email@example.com..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box', backgroundColor: buyerType === 'ANONYMOUS' ? '#f1f5f9' : '#fff' }}
              />
            </div>

            {buyerType !== 'ANONYMOUS' && (
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  {buyerType === 'COMPANY' ? 'Địa chỉ trụ sở chính' : 'Địa chỉ khách hàng'}
                </label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  placeholder="Địa chỉ..."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
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

