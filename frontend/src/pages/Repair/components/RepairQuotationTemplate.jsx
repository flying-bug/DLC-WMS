import React, { forwardRef } from 'react';
import styles from './RepairQuotationTemplate.module.css';

const fmtCurrency = (value) => {
    if (value === undefined || value === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const RepairQuotationTemplate = forwardRef(({ repair }, ref) => {
    if (!repair) return null;

    const lines = (repair.lines || []).filter(l => l.actionType === 'ADD');
    const fees = repair.fees || [];
    const totalAmount = repair.totalAmount || 0;

    let idxCounter = 1;

    return (
        <div ref={ref} className={styles.printContainer}>
            <div className={styles.header}>
                <div className={styles.companyInfo}>
                    <h2>CÔNG TY TNHH Duy Long</h2>
                    <p>Địa chỉ: Số 59 Thịnh Liệt - Hoàng Mai - Hà Nội</p>
                    <p>Điện thoại: 0392718888 - Email: Duylongcomputer@gmail.com</p>
                    <p>Mã số thuế: 0103711414</p>
                </div>
                <div className={styles.quoteInfo}>
                    <p><strong>Ngày báo giá:</strong> {fmtDate(new Date())}</p>
                    <p><strong>Số báo giá:</strong> {repair.repairCode}</p>
                </div>
            </div>

            <div className={styles.title}>
                <h1>BẢNG BÁO GIÁ SỬA CHỮA</h1>
                <p>(Kính gửi: Quý Khách hàng)</p>
            </div>

            <div className={styles.customerSection}>
                <p><strong>Khách hàng / Đơn vị:</strong> {repair.partnerName}</p>
                {repair.partnerPhone && <p><strong>Điện thoại:</strong> {repair.partnerPhone}</p>}
                
                <p style={{ marginTop: '10px' }}><strong>Tên thiết bị:</strong> {repair.productName || 'N/A'}</p>
                {repair.serialNumber && <p><strong>Số Serial:</strong> {repair.serialNumber}</p>}
                {repair.issueDescription && <p><strong>Mô tả lỗi:</strong> {repair.issueDescription}</p>}
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}>STT</th>
                        <th style={{ width: '45%' }}>Linh kiện / Dịch vụ</th>
                        <th style={{ width: '10%' }}>ĐVT</th>
                        <th style={{ width: '10%' }}>Số lượng</th>
                        <th style={{ width: '15%' }}>Đơn giá</th>
                        <th style={{ width: '15%' }}>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Render Lines */}
                    {lines.map((line, idx) => {
                        const amount = line.isFreeWarranty ? 0 : (line.lineAmount || (line.quantity * (line.unitPrice || 0)));
                        const isFreeText = line.isFreeWarranty ? ' (Bảo hành)' : '';
                        return (
                            <tr key={`line-${idx}`}>
                                <td className={styles.textCenter}>{idxCounter++}</td>
                                <td>
                                    <strong>{line.componentName || 'Linh kiện chưa rõ'}</strong>
                                    {line.componentSku && <div>Mã: {line.componentSku}</div>}
                                    {isFreeText}
                                </td>
                                <td className={styles.textCenter}>Cái</td>
                                <td className={styles.textCenter}>{line.quantity}</td>
                                <td className={styles.textRight}>{line.isFreeWarranty ? '0 ₫' : fmtCurrency(line.unitPrice)}</td>
                                <td className={styles.textRight}>{fmtCurrency(amount)}</td>
                            </tr>
                        );
                    })}
                    {/* Render Fees */}
                    {fees.map((fee, idx) => {
                        const amount = fee.isFreeWarranty ? 0 : ((fee.quantity || 1) * (fee.feeAmount || 0));
                        const isFreeText = fee.isFreeWarranty ? ' (Bảo hành)' : '';
                        return (
                            <tr key={`fee-${idx}`}>
                                <td className={styles.textCenter}>{idxCounter++}</td>
                                <td>
                                    <strong>{fee.feeName || 'Dịch vụ'}</strong>
                                    {isFreeText}
                                </td>
                                <td className={styles.textCenter}>{fee.unitName || 'Lần'}</td>
                                <td className={styles.textCenter}>{fee.quantity || 1}</td>
                                <td className={styles.textRight}>{fee.isFreeWarranty ? '0 ₫' : fmtCurrency(fee.feeAmount)}</td>
                                <td className={styles.textRight}>{fmtCurrency(amount)}</td>
                            </tr>
                        );
                    })}
                    {lines.length === 0 && fees.length === 0 && (
                        <tr>
                            <td colSpan="6" className={styles.textCenter}>Chưa có linh kiện / dịch vụ nào</td>
                        </tr>
                    )}
                </tbody>
                <tfoot>
                    <tr className={styles.totalRow}>
                        <th colSpan="5">Tổng cộng thanh toán (VNĐ):</th>
                        <th className={styles.textRight} style={{ color: '#d32f2f' }}>{fmtCurrency(totalAmount)}</th>
                    </tr>
                </tfoot>
            </table>

            <div className={styles.termsSection}>
                <h4>Điều khoản:</h4>
                <ul>
                    <li><strong>Hiệu lực báo giá:</strong> 07 ngày kể từ ngày báo giá.</li>
                    <li><strong>Thanh toán:</strong> Chuyển khoản hoặc Tiền mặt sau khi hoàn tất sửa chữa.</li>
                    <li><strong>Bảo hành:</strong> Áp dụng chính sách bảo hành sửa chữa.</li>
                </ul>
            </div>

            <div className={styles.signatureSection}>
                <div className={styles.signatureBox}>
                    <h4>Khách hàng</h4>
                    <p>(Ký, ghi rõ họ tên)</p>
                </div>
                <div className={styles.signatureBox}>
                    <h4>Đại diện Kỹ thuật</h4>
                    <p>(Ký, ghi rõ họ tên)</p>
                    <div style={{ marginTop: '70px', fontWeight: 'bold' }}>
                        {repair.responsiblePerson || '...........................'}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default RepairQuotationTemplate;
