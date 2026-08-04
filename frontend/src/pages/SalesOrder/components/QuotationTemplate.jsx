import React, { forwardRef } from 'react';
import styles from './QuotationTemplate.module.css';

const fmtCurrency = (value) => {
    if (value === undefined || value === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const QuotationTemplate = forwardRef(({ order }, ref) => {
    if (!order) return null;

    const totalAmount = order.totalAmount || 0;

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
                    <p><strong>Số báo giá:</strong> {order.soCode}</p>
                    <p><strong>Nhân viên:</strong> {order.createdByName || 'N/A'}</p>
                </div>
            </div>

            <div className={styles.title}>
                <h1>BẢNG BÁO GIÁ</h1>
                <p>(Kính gửi: Quý Khách hàng)</p>
            </div>

            <div className={styles.customerSection}>
                <p><strong>Khách hàng / Đơn vị:</strong> {order.partnerName || order.customerName}</p>
                {(order.partnerPhone || order.customerPhone) && <p><strong>Điện thoại:</strong> {order.partnerPhone || order.customerPhone}</p>}
                {(order.deliveryAddress || order.partnerAddress || order.customerAddress) && <p><strong>Địa chỉ:</strong> {order.deliveryAddress || order.partnerAddress || order.customerAddress}</p>}
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}>STT</th>
                        <th style={{ width: '35%' }}>Tên hàng hóa, dịch vụ</th>
                        <th style={{ width: '8%' }}>ĐVT</th>
                        <th style={{ width: '8%' }}>Số lượng</th>
                        <th style={{ width: '7%' }}>BH (T)</th>
                        <th style={{ width: '12%' }}>Đơn giá</th>
                        <th style={{ width: '10%' }}>Thuế GTGT</th>
                        <th style={{ width: '15%' }}>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {order.lines && order.lines.map((line, idx) => {
                        const lineAmount = line.lineAmount || (line.quantity * (line.unitPrice || line.salePrice || 0) * (1 + (line.vatRate || 0) / 100));
                        return (
                            <tr key={idx}>
                                <td className={styles.textCenter}>{idx + 1}</td>
                                <td>
                                    <strong>{line.variantName}</strong>
                                    {(line.sku || line.variantCode) && <div>Mã: {line.sku || line.variantCode}</div>}
                                </td>
                                <td className={styles.textCenter}>{line.unitName || line.unit || 'Cái'}</td>
                                <td className={styles.textCenter}>{line.quantity}</td>
                                <td className={styles.textCenter}>{line.warrantyMonths || 0}</td>
                                <td className={styles.textRight}>{fmtCurrency(line.unitPrice || line.salePrice)}</td>
                                <td className={styles.textCenter}>{line.vatRate || 0}%</td>
                                <td className={styles.textRight}>{fmtCurrency(lineAmount)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className={styles.totalRow}>
                        <th colSpan="7">Cộng tiền hàng:</th>
                        <th className={styles.textRight}>{fmtCurrency(order.subTotalAmount || 0)}</th>
                    </tr>
                    <tr className={styles.totalRow}>
                        <th colSpan="7">Tiền thuế VAT:</th>
                        <th className={styles.textRight}>{fmtCurrency(order.taxAmount || 0)}</th>
                    </tr>
                    <tr className={styles.totalRow}>
                        <th colSpan="7">Tổng cộng thanh toán (VNĐ):</th>
                        <th className={styles.textRight}>{fmtCurrency(order.totalAmount || 0)}</th>
                    </tr>
                </tfoot>
            </table>

            <div className={styles.termsSection}>
                <h4>Điều khoản thương mại:</h4>
                <ul>
                    <li><strong>Hiệu lực báo giá:</strong> 07 ngày kể từ ngày báo giá.</li>
                    <li><strong>Giao hàng:</strong> Tận nơi theo thỏa thuận.</li>
                    <li><strong>Thanh toán:</strong> Chuyển khoản hoặc Tiền mặt.</li>
                    <li><strong>Bảo hành:</strong> Theo tiêu chuẩn của nhà sản xuất.</li>
                </ul>
            </div>

            <div className={styles.signatureSection}>
                <div className={styles.signatureBox}>
                    <h4>Khách hàng</h4>
                    <p>(Ký, ghi rõ họ tên)</p>
                </div>
                <div className={styles.signatureBox}>
                    <h4>Người lập báo giá</h4>
                    <p>(Ký, ghi rõ họ tên)</p>
                    <div style={{ marginTop: '70px', fontWeight: 'bold' }}>
                        {order.createdByName || '...........................'}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default QuotationTemplate;
