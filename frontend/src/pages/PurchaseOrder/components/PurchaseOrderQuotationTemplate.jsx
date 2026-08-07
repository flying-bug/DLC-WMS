import React, { forwardRef } from 'react';
import styles from '../../SalesOrder/components/QuotationTemplate.module.css';
import { formatDateOnly } from '../../../utils/dateFormat';

const fmtCurrency = (value) => {
  if (value === undefined || value === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const fmtDate = formatDateOnly;

const PurchaseOrderQuotationTemplate = forwardRef(({ order }, ref) => {
  if (!order) return null;

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
          <p><strong>Ngày lập:</strong> {fmtDate(order.poDate || new Date())}</p>
          <p><strong>Số đơn mua:</strong> {order.poCode}</p>
          <p><strong>Người lập:</strong> {order.createdByName || 'N/A'}</p>
        </div>
      </div>

      <div className={styles.title}>
        <h1>ĐƠN ĐỀ NGHỊ MUA HÀNG</h1>
        <p>(Kính gửi: Quý Nhà cung cấp)</p>
      </div>

      <div className={styles.customerSection}>
        <p><strong>Nhà cung cấp:</strong> {order.partnerName || order.supplierName || ''}</p>
        {(order.partnerCode || order.supplierCode) && <p><strong>Mã NCC:</strong> {order.partnerCode || order.supplierCode}</p>}
        {(order.partnerPhone || order.supplierPhone) && <p><strong>Điện thoại:</strong> {order.partnerPhone || order.supplierPhone}</p>}
        {order.expectedDeliveryDate && <p><strong>Ngày giao dự kiến:</strong> {fmtDate(order.expectedDeliveryDate)}</p>}
        {order.paymentDueDate && <p><strong>Hạn công nợ:</strong> {fmtDate(order.paymentDueDate)}</p>}
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '5%' }}>STT</th>
            <th style={{ width: '40%' }}>Tên hàng hóa, dịch vụ</th>
            <th style={{ width: '8%' }}>ĐVT</th>
            <th style={{ width: '10%' }}>Số lượng</th>
            <th style={{ width: '13%' }}>Đơn giá</th>
            <th style={{ width: '9%' }}>VAT</th>
            <th style={{ width: '15%' }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {(order.lines || []).map((line, idx) => {
            const quantity = Number(line.quantity || 0);
            const unitPrice = Number(line.unitPrice || 0);
            const vatRate = Number(line.vatRate || 0);
            const lineAmount = Number(line.lineAmount ?? quantity * unitPrice);
            const vatAmount = Number(line.vatAmount ?? lineAmount * vatRate / 100);

            return (
              <tr key={line.id || idx}>
                <td className={styles.textCenter}>{idx + 1}</td>
                <td>
                  <strong>{line.variantName || line.productName || `#${line.variantId}`}</strong>
                  {(line.sku || line.productCode) && <div>Mã: {line.sku || line.productCode}</div>}
                  {line.note && <div>Ghi chú: {line.note}</div>}
                </td>
                <td className={styles.textCenter}>{line.unitName || line.unit || 'Cái'}</td>
                <td className={styles.textCenter}>{quantity.toLocaleString('vi-VN')}</td>
                <td className={styles.textRight}>{fmtCurrency(unitPrice)}</td>
                <td className={styles.textCenter}>{vatRate}%</td>
                <td className={styles.textRight}>{fmtCurrency(lineAmount + vatAmount)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={styles.totalRow}>
            <th colSpan="6">Cộng tiền hàng:</th>
            <th className={styles.textRight}>{fmtCurrency(order.subTotalAmount || 0)}</th>
          </tr>
          <tr className={styles.totalRow}>
            <th colSpan="6">Tiền thuế VAT:</th>
            <th className={styles.textRight}>{fmtCurrency(order.taxAmount || 0)}</th>
          </tr>
          <tr className={styles.totalRow}>
            <th colSpan="6">Tổng công nợ dự kiến (VNĐ):</th>
            <th className={styles.textRight}>{fmtCurrency(order.totalAmount || 0)}</th>
          </tr>
        </tfoot>
      </table>

      {order.note && (
        <div className={styles.termsSection}>
          <h4>Ghi chú:</h4>
          <p>{order.note}</p>
        </div>
      )}

      <div className={styles.signatureSection}>
        <div className={styles.signatureBox}>
          <h4>Nhà cung cấp</h4>
          <p>(Ký, ghi rõ họ tên)</p>
        </div>
        <div className={styles.signatureBox}>
          <h4>Người lập đơn</h4>
          <p>(Ký, ghi rõ họ tên)</p>
          <div style={{ marginTop: '70px', fontWeight: 'bold' }}>
            {order.createdByName || '...........................'}
          </div>
        </div>
      </div>
    </div>
  );
});

PurchaseOrderQuotationTemplate.displayName = 'PurchaseOrderQuotationTemplate';

export default PurchaseOrderQuotationTemplate;
