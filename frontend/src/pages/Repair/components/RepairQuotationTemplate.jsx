import React, { forwardRef } from 'react';
import { formatDateOnly } from '../../../utils/dateFormat';

const money = (v) => Number(v || 0).toLocaleString('vi-VN') + ' ₫';
const fmt = (v) => Number(v || 0).toLocaleString('vi-VN');

const RepairQuotationTemplate = forwardRef(({ repair }, ref) => {
    if (!repair) return null;

    const lines = (repair.lines || []).filter(l => ['ADD', 'REPLACE'].includes(l.actionType));
    const fees = repair.fees || [];
    const hasItems = lines.length > 0 || fees.length > 0;

    // Tính tổng
    const subLinesNoVat = lines.reduce((s, l) => s + (l.isFreeWarranty ? 0 : Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0);
    const subFeesNoVat = fees.reduce((s, f) => s + (f.isFreeWarranty ? 0 : Number(f.quantity || 1) * Number(f.feeAmount || 0)), 0);
    const subTotal = subLinesNoVat + subFeesNoVat;

    const vatLines = lines.reduce((s, l) => {
        if (l.isFreeWarranty) return s;
        const base = Number(l.quantity || 0) * Number(l.unitPrice || 0);
        return s + base * Number(l.vatPercent || 0) / 100;
    }, 0);
    const vatFees = fees.reduce((s, f) => {
        if (f.isFreeWarranty) return s;
        const base = Number(f.quantity || 1) * Number(f.feeAmount || 0);
        return s + base * Number(f.vatPercent || 0) / 100;
    }, 0);
    const vatTotal = vatLines + vatFees;
    const grandTotal = Number(repair.totalAmount || (subTotal + vatTotal));

    let idx = 0;

    const s = {
        page: {
            padding: '32px 40px',
            backgroundColor: '#ffffff',
            color: '#1a1a1a',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '14px',
            lineHeight: '1.6',
            maxWidth: '210mm',
            margin: '0 auto',
            boxSizing: 'border-box',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '3px solid #002b6b',
            paddingBottom: '16px',
            marginBottom: '24px',
        },
        companyName: {
            margin: '0 0 4px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#002b6b',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
        },
        companyDetail: { margin: '2px 0', fontSize: '12px', color: '#333' },
        quoteBox: {
            textAlign: 'right',
            backgroundColor: '#f0f4ff',
            border: '1px solid #c0cef0',
            borderRadius: '6px',
            padding: '10px 16px',
            minWidth: '180px',
        },
        quoteLabel: { margin: '2px 0', fontSize: '12px', color: '#555' },
        quoteCode: { margin: '4px 0 0', fontSize: '16px', fontWeight: 'bold', color: '#002b6b' },
        titleBlock: { textAlign: 'center', margin: '4px 0 20px' },
        title: { margin: '0', fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', color: '#002b6b', letterSpacing: '1px' },
        subtitle: { margin: '4px 0 0', fontSize: '13px', color: '#555', fontStyle: 'italic' },
        infoGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 32px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            backgroundColor: '#fafbff',
        },
        infoRow: { margin: '4px 0', fontSize: '13px' },
        infoLabel: { fontWeight: 'bold', color: '#333' },
        table: { width: '100%', borderCollapse: 'collapse', marginBottom: '0', fontSize: '13px' },
        th: { border: '1px solid #555', padding: '7px 8px', backgroundColor: '#002b6b', color: '#fff', textAlign: 'center', fontWeight: 'bold', whiteSpace: 'nowrap' },
        td: { border: '1px solid #888', padding: '6px 8px', verticalAlign: 'top' },
        tdR: { border: '1px solid #888', padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'top' },
        tdC: { border: '1px solid #888', padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' },
        categoryRow: { backgroundColor: '#e8eef8' },
        summaryTable: { width: '320px', marginLeft: 'auto', borderCollapse: 'collapse', marginTop: '0', fontSize: '13px' },
        sumTd: { border: '1px solid #888', padding: '6px 12px' },
        sumTdR: { border: '1px solid #888', padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 'bold' },
        grandRow: { backgroundColor: '#002b6b', color: '#fff' },
        grandTd: { border: '1px solid #001a4a', padding: '8px 12px', fontWeight: 'bold', fontSize: '14px' },
        grandTdR: { border: '1px solid #001a4a', padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: '#ffd700', whiteSpace: 'nowrap' },
        terms: { marginTop: '20px', marginBottom: '20px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', padding: '10px 14px', backgroundColor: '#fffef0' },
        termsTitle: { margin: '0 0 6px', fontSize: '13px', fontWeight: 'bold', color: '#002b6b' },
        termsList: { margin: '0', paddingLeft: '18px' },
        sigs: { display: 'flex', justifyContent: 'space-around', marginTop: '32px', textAlign: 'center' },
        sigBox: { width: '160px' },
        sigTitle: { fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' },
        sigNote: { fontSize: '11px', color: '#666', fontStyle: 'italic' },
        sigName: { marginTop: '70px', fontWeight: 'bold', borderTop: '1px solid #333', paddingTop: '4px', fontSize: '13px' },
        warrantyBadge: { display: 'inline-block', backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', borderRadius: '3px', padding: '0 5px', fontSize: '11px', marginLeft: '4px', fontStyle: 'italic' },
    };

    return (
        <div ref={ref} style={s.page}>
            {/* HEADER */}
            <div style={s.header}>
                <div>
                    <p style={s.companyName}>Công ty TNHH Duy Long</p>
                    <p style={s.companyDetail}>Địa chỉ: Số 59 Thịnh Liệt – Hoàng Mai – Hà Nội</p>
                    <p style={s.companyDetail}>Điện thoại: 0392 718 888 &nbsp;|&nbsp; Email: Duylongcomputer@gmail.com</p>
                    <p style={s.companyDetail}>Mã số thuế: 0103711414</p>
                </div>
                <div style={s.quoteBox}>
                    <p style={s.quoteLabel}>Ngày báo giá</p>
                    <p style={{ ...s.quoteLabel, fontWeight: 'bold', color: '#333' }}>{formatDateOnly(new Date())}</p>
                    <p style={s.quoteCode}>{repair.repairCode}</p>
                </div>
            </div>

            {/* TITLE */}
            <div style={s.titleBlock}>
                <h1 style={s.title}>Bảng Báo Giá Sửa Chữa</h1>
                <p style={s.subtitle}>Kính gửi: Quý Khách hàng</p>
            </div>

            {/* INFO GRID */}
            <div style={s.infoGrid}>
                <div>
                    <p style={s.infoRow}><span style={s.infoLabel}>Khách hàng:</span> {repair.partnerName || '—'}</p>
                    {repair.partnerPhone && <p style={s.infoRow}><span style={s.infoLabel}>Điện thoại:</span> {repair.partnerPhone}</p>}
                </div>
                <div>
                    <p style={s.infoRow}><span style={s.infoLabel}>Thiết bị:</span> {repair.productName || repair.variantName || '—'}</p>
                    {repair.serialNumber && <p style={s.infoRow}><span style={s.infoLabel}>Serial:</span> {repair.serialNumber}</p>}
                    {repair.responsiblePerson && <p style={s.infoRow}><span style={s.infoLabel}>KTV phụ trách:</span> {repair.responsiblePerson}</p>}
                </div>
                {repair.issueDescription && (
                    <div style={{ gridColumn: '1 / -1' }}>
                        <p style={s.infoRow}><span style={s.infoLabel}>Mô tả lỗi:</span> {repair.issueDescription}</p>
                    </div>
                )}
                {repair.receivedDate && (
                    <p style={s.infoRow}><span style={s.infoLabel}>Ngày tiếp nhận:</span> {formatDateOnly(repair.receivedDate)}</p>
                )}
                {repair.expectedDate && (
                    <p style={s.infoRow}><span style={s.infoLabel}>Dự kiến hoàn tất:</span> {formatDateOnly(repair.expectedDate)}</p>
                )}
                {repair.underWarranty && (
                    <p style={{ ...s.infoRow, gridColumn: '1 / -1', color: '#2e7d32', fontWeight: 'bold' }}>
                        ✔ Thiết bị còn trong hạn bảo hành
                    </p>
                )}
            </div>

            {/* TABLE */}
            <table style={s.table}>
                <thead>
                    <tr>
                        <th style={{ ...s.th, width: '4%' }}>STT</th>
                        <th style={{ ...s.th, width: '40%', textAlign: 'left' }}>Linh kiện / Dịch vụ</th>
                        <th style={{ ...s.th, width: '8%' }}>ĐVT</th>
                        <th style={{ ...s.th, width: '8%' }}>SL</th>
                        <th style={{ ...s.th, width: '14%' }}>Đơn giá</th>
                        <th style={{ ...s.th, width: '8%' }}>VAT</th>
                        <th style={{ ...s.th, width: '16%' }}>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Linh kiện */}
                    {lines.length > 0 && (
                        <tr style={s.categoryRow}>
                            <td colSpan={7} style={{ ...s.td, fontWeight: 'bold', color: '#002b6b', backgroundColor: '#e8eef8', padding: '5px 8px' }}>
                                Linh kiện thay thế
                            </td>
                        </tr>
                    )}
                    {lines.map((line, i) => {
                        idx++;
                        const base = Number(line.quantity || 0) * Number(line.unitPrice || 0);
                        const vat = line.isFreeWarranty ? 0 : base * Number(line.vatPercent || 0) / 100;
                        const total = line.isFreeWarranty ? 0 : base + vat;
                        return (
                            <tr key={`line-${i}`}>
                                <td style={{ ...s.tdC }}>{idx}</td>
                                <td style={s.td}>
                                    <strong>{line.componentName || 'Linh kiện'}</strong>
                                    {line.componentSku && <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>[{line.componentSku}]</span>}
                                    {line.actionType === 'REPLACE' && <span style={{ fontSize: '11px', color: '#e65100', marginLeft: '4px' }}>(Thay thế)</span>}
                                    {line.isFreeWarranty && <span style={s.warrantyBadge}>Bảo hành</span>}
                                    {line.note && <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>{line.note}</div>}
                                </td>
                                <td style={s.tdC}>Cái</td>
                                <td style={s.tdC}>{fmt(line.quantity)}</td>
                                <td style={s.tdR}>{line.isFreeWarranty ? '—' : money(line.unitPrice)}</td>
                                <td style={s.tdC}>{line.isFreeWarranty ? '—' : `${line.vatPercent || 0}%`}</td>
                                <td style={s.tdR}>{line.isFreeWarranty ? <em style={{ color: '#2e7d32' }}>Miễn phí</em> : money(total)}</td>
                            </tr>
                        );
                    })}

                    {/* Dịch vụ */}
                    {fees.length > 0 && (
                        <tr style={s.categoryRow}>
                            <td colSpan={7} style={{ ...s.td, fontWeight: 'bold', color: '#002b6b', backgroundColor: '#e8eef8', padding: '5px 8px' }}>
                                Dịch vụ / Phí
                            </td>
                        </tr>
                    )}
                    {fees.map((fee, i) => {
                        idx++;
                        const base = Number(fee.quantity || 1) * Number(fee.feeAmount || 0);
                        const vat = fee.isFreeWarranty ? 0 : base * Number(fee.vatPercent || 0) / 100;
                        const total = fee.isFreeWarranty ? 0 : base + vat;
                        return (
                            <tr key={`fee-${i}`}>
                                <td style={s.tdC}>{idx}</td>
                                <td style={s.td}>
                                    <strong>{fee.feeName || 'Dịch vụ'}</strong>
                                    {fee.isFreeWarranty && <span style={s.warrantyBadge}>Bảo hành</span>}
                                    {fee.note && <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>{fee.note}</div>}
                                </td>
                                <td style={s.tdC}>{fee.unitName || 'Lần'}</td>
                                <td style={s.tdC}>{fmt(fee.quantity || 1)}</td>
                                <td style={s.tdR}>{fee.isFreeWarranty ? '—' : money(fee.feeAmount)}</td>
                                <td style={s.tdC}>{fee.isFreeWarranty ? '—' : `${fee.vatPercent || 0}%`}</td>
                                <td style={s.tdR}>{fee.isFreeWarranty ? <em style={{ color: '#2e7d32' }}>Miễn phí</em> : money(total)}</td>
                            </tr>
                        );
                    })}

                    {!hasItems && (
                        <tr>
                            <td colSpan={7} style={{ ...s.tdC, fontStyle: 'italic', color: '#888', padding: '16px' }}>
                                Chưa có linh kiện / dịch vụ nào
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* SUMMARY */}
            <table style={s.summaryTable}>
                <tbody>
                    <tr>
                        <td style={s.sumTd}>Tổng tiền trước thuế:</td>
                        <td style={s.sumTdR}>{money(subTotal)}</td>
                    </tr>
                    <tr>
                        <td style={s.sumTd}>Thuế VAT:</td>
                        <td style={s.sumTdR}>{money(vatTotal)}</td>
                    </tr>
                    <tr style={s.grandRow}>
                        <td style={s.grandTd}>TỔNG THANH TOÁN:</td>
                        <td style={s.grandTdR}>{money(grandTotal)}</td>
                    </tr>
                </tbody>
            </table>

            {/* TERMS */}
            <div style={s.terms}>
                <p style={s.termsTitle}>Điều khoản báo giá:</p>
                <ul style={s.termsList}>
                    <li><strong>Hiệu lực báo giá:</strong> 07 ngày kể từ ngày báo giá.</li>
                    <li><strong>Thanh toán:</strong> Chuyển khoản hoặc tiền mặt sau khi hoàn tất sửa chữa.</li>
                    <li><strong>Bảo hành:</strong> Áp dụng theo chính sách bảo hành sửa chữa của cửa hàng.</li>
                    <li><strong>Lưu ý:</strong> Giá trên chưa bao gồm các chi phí phát sinh ngoài báo giá (nếu có).</li>
                </ul>
            </div>

            {/* SIGNATURES */}
            <div style={s.sigs}>
                <div style={s.sigBox}>
                    <p style={s.sigTitle}>Khách hàng</p>
                    <p style={s.sigNote}>(Ký, ghi rõ họ tên)</p>
                    <p style={s.sigName}>{repair.partnerName || ''}</p>
                </div>
                <div style={s.sigBox}>
                    <p style={s.sigTitle}>Đại diện kỹ thuật</p>
                    <p style={s.sigNote}>(Ký, ghi rõ họ tên)</p>
                    <p style={s.sigName}>{repair.responsiblePerson || '................................'}</p>
                </div>
            </div>
        </div>
    );
});

RepairQuotationTemplate.displayName = 'RepairQuotationTemplate';
export default RepairQuotationTemplate;
