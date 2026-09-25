import { numberToVietnameseWords } from './numberToVietnameseWords';
import { formatDateOnly } from './dateFormat';
import { buildRepairQuotationRows } from './repairQuotationRows';

const escapeHtml = (unsafe) => {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const money = (value) => Math.round(Number(value || 0)).toLocaleString('vi-VN');

/**
 * In bảng báo giá sửa chữa gửi khách (cùng mẫu với báo giá bán hàng).
 * options.customer: { phone, address, taxCode } lấy từ danh mục khách hàng;
 * options.resolveUnitName(line): ĐVT của linh kiện; options.preparedBy: người lập báo giá.
 */
export function printRepairQuotation(repair, options = {}) {
  const { customer = {}, resolveUnitName, preparedBy = '', onError } = options;
  if (!repair) return false;

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    const message = 'Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in báo giá.';
    if (onError) onError(message);
    else console.error(message);
    return false;
  }

  const { rows, subTotal, vatTotal, grandTotal } = buildRepairQuotationRows(repair, resolveUnitName);
  const customerName = repair.partnerName || 'Quý Khách hàng';
  const customerPhone = repair.partnerPhone || customer.phone || '';
  const customerAddress = customer.address || '';
  const taxCode = customer.taxCode || '';
  const deviceName = [repair.productName, repair.variantName && repair.variantName !== repair.productName ? repair.variantName : '']
    .filter(Boolean).join(' - ');
  const technician = repair.responsiblePerson || preparedBy || '';

  const rowsHtml = rows.length > 0
    ? rows.map((row, index) => `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(row.name)}</strong>
            ${row.code ? `<span class="muted"> (${escapeHtml(row.code)})</span>` : ''}
            ${row.isFree ? '<div class="free-tag">Miễn phí - trong bảo hành</div>' : ''}
          </td>
          <td style="text-align: center;">${escapeHtml(row.kind)}</td>
          <td style="text-align: center;">${escapeHtml(row.unit)}</td>
          <td style="text-align: center;">${row.quantity.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${row.isFree ? '0' : money(row.unitPrice)}</td>
          <td style="text-align: center;">${row.vatPercent}</td>
          <td style="text-align: right; font-weight: 600;">${money(row.amount)}</td>
        </tr>`).join('')
    : '<tr><td colspan="8" style="text-align: center; font-style: italic;">Chưa có linh kiện / dịch vụ nào</td></tr>';

  const deviceRows = [
    deviceName && ['Thiết bị', deviceName],
    repair.serialNumber && ['Số serial', repair.serialNumber],
    repair.receivedDate && ['Ngày nhận máy', formatDateOnly(repair.receivedDate)],
    repair.expectedDate && ['Ngày hẹn trả', formatDateOnly(repair.expectedDate)],
    repair.issueDescription && ['Tình trạng khách báo', repair.issueDescription],
    repair.diagnosisNote && ['Kết quả kiểm tra', repair.diagnosisNote],
    repair.underWarranty && ['Bảo hành', `Thiết bị trong bảo hành${repair.referenceCode ? ` (phiếu ${repair.referenceCode})` : ''}`],
  ].filter(Boolean);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Báo giá sửa chữa ${escapeHtml(repair.repairCode || '')}</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          body { font-family: 'Segoe UI', Arial, Roboto, sans-serif; color: #1f2937; margin: 0; font-size: 13px; line-height: 1.4; }
          .muted { font-size: 11px; color: #6b7280; }
          .header-table, .info-grid, .device-table, .main-table, .signatures-table { width: 100%; border-collapse: collapse; }
          .header-table { margin-bottom: 12px; }
          .header-logo { font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .header-subtitle { font-size: 11px; color: #6b7280; font-style: italic; }
          .company-info { font-size: 11.5px; color: #374151; line-height: 1.35; }
          .title-container { text-align: center; margin: 16px 0 12px; }
          .doc-title { font-size: 22px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .doc-subtitle { font-size: 12px; font-style: italic; color: #6b7280; margin-top: 2px; }
          .info-grid { margin-bottom: 10px; }
          .info-grid td { padding: 3px 0; vertical-align: top; }
          .section-title { font-weight: 700; font-size: 12px; text-transform: uppercase; margin: 10px 0 4px; color: #0f172a; }
          .device-table { margin-bottom: 8px; }
          .device-table td { border: 1px solid #d1d5db; padding: 4px 8px; font-size: 12px; vertical-align: top; }
          .device-table td:first-child { width: 24%; font-weight: 600; background: #f9fafb; }
          .main-table { margin: 8px 0 12px; }
          .main-table th { border: 1px solid #000; padding: 6px 8px; font-size: 12px; font-weight: 700; background: #f3f4f6; text-align: center; }
          .main-table td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
          .summary-row td { font-weight: 600; }
          .free-tag { font-size: 11px; font-style: italic; color: #047857; }
          .words-row { margin-top: 6px; font-style: italic; font-weight: 600; font-size: 12.5px; }
          .terms-section { margin-top: 18px; padding-top: 10px; border-top: 1px dashed #9ca3af; font-size: 11.5px; line-height: 1.45; }
          .terms-title { font-weight: 700; font-size: 12px; margin-bottom: 5px; text-transform: uppercase; color: #0f172a; }
          .terms-list { margin: 0; padding-left: 16px; }
          .terms-list li { margin-bottom: 3px; }
          .signatures-table { margin-top: 25px; text-align: center; }
          .signatures-table td { vertical-align: top; font-size: 12px; }
          .sign-role { font-weight: 700; }
          .sign-note { font-size: 10.5px; font-style: italic; color: #6b7280; }
          .sign-space { height: 65px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 35%; vertical-align: middle;">
              <div class="header-logo">DL</div>
              <div style="font-size: 13px; font-weight: 800; text-transform: uppercase;">DUYLONG computer</div>
              <div class="header-subtitle">Since 2003</div>
            </td>
            <td style="width: 65%; text-align: right;" class="company-info">
              Tầng 1, số 42 Lê Thanh Nghị, Phường Bách Khoa, Quận Hai Bà Trưng, TP. Hà Nội<br/>
              Điện thoại: <strong>0914.89.8889 - 0912.01.1102 - 039.271.8888 - 07.8865.8865</strong><br/>
              Email: duylongcomputer@gmail.com | Website: <strong>maytinhduylong.vn</strong>
            </td>
          </tr>
        </table>

        <div class="title-container">
          <div class="doc-title">Bảng báo giá sửa chữa</div>
          <div class="doc-subtitle">(Kính gửi: Quý Khách hàng)</div>
        </div>

        <table class="info-grid">
          <tr>
            <td style="width: 60%;">
              <strong>Khách hàng / Đơn vị:</strong> ${escapeHtml(customerName)}<br/>
              <strong>Số điện thoại:</strong> ${escapeHtml(customerPhone || 'Chưa có')}<br/>
              ${customerAddress ? `<strong>Địa chỉ:</strong> ${escapeHtml(customerAddress)}<br/>` : ''}
              ${taxCode ? `<strong>Mã số thuế:</strong> ${escapeHtml(taxCode)}<br/>` : ''}
            </td>
            <td style="width: 40%; text-align: right;">
              <strong>Ngày báo giá:</strong> ${escapeHtml(formatDateOnly(new Date()))}<br/>
              <strong>Số lệnh sửa chữa:</strong> <span style="font-weight: 700; font-size: 14px; color: #0369a1;">${escapeHtml(repair.repairCode || '')}</span><br/>
              <strong>Loại tiền:</strong> VND
            </td>
          </tr>
        </table>

        ${deviceRows.length > 0 ? `
        <div class="section-title">Thông tin thiết bị</div>
        <table class="device-table">
          ${deviceRows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}
        </table>` : ''}

        <div class="section-title">Chi tiết linh kiện & dịch vụ</div>
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 35%;">Hạng mục (Linh kiện / Dịch vụ)</th>
              <th style="width: 11%;">Loại</th>
              <th style="width: 8%;">ĐVT</th>
              <th style="width: 7%;">SL</th>
              <th style="width: 13%;">Đơn giá (₫)</th>
              <th style="width: 7%;">% VAT</th>
              <th style="width: 14%;">Thành tiền (₫)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="summary-row">
              <td colspan="7" style="text-align: right;">Cộng tiền linh kiện & dịch vụ</td>
              <td style="text-align: right;">${money(subTotal)}</td>
            </tr>
            ${vatTotal > 0 ? `
            <tr class="summary-row">
              <td colspan="7" style="text-align: right;">Tiền thuế GTGT (VAT)</td>
              <td style="text-align: right;">${money(vatTotal)}</td>
            </tr>` : ''}
            <tr class="summary-row" style="background: #f3f4f6; font-size: 13px;">
              <td colspan="7" style="text-align: right; font-weight: 700;">Tổng cộng thanh toán (VNĐ)</td>
              <td style="text-align: right; font-weight: 800; color: #0369a1;">${money(grandTotal)} ₫</td>
            </tr>
          </tbody>
        </table>

        <div class="words-row"><strong>Số tiền viết bằng chữ:</strong> ${escapeHtml(numberToVietnameseWords(Math.round(grandTotal)))}</div>

        <div class="terms-section">
          <div class="terms-title">Điều khoản & ghi chú:</div>
          <ul class="terms-list">
            <li><strong>Hiệu lực báo giá:</strong> 07 ngày kể từ ngày lập.</li>
            <li><strong>Xác nhận:</strong> Duy Long Computer chỉ tiến hành sửa chữa sau khi Quý khách đồng ý báo giá.</li>
            <li><strong>Phát sinh:</strong> Nếu trong quá trình sửa chữa phát hiện thêm lỗi, chúng tôi sẽ báo lại để Quý khách quyết định trước khi làm.</li>
            <li><strong>Thanh toán:</strong> Tiền mặt hoặc chuyển khoản khi nhận lại thiết bị.</li>
            <li><strong>Bảo hành:</strong> Linh kiện thay thế và dịch vụ được bảo hành theo chính sách sửa chữa của Duy Long Computer.</li>
          </ul>
        </div>

        <table class="signatures-table">
          <tr>
            <td style="width: 33%;">
              <div class="sign-role">Khách hàng xác nhận</div>
              <div class="sign-note">(Ký, ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(customerName !== 'Quý Khách hàng' ? customerName : '')}</div>
            </td>
            <td style="width: 33%;">
              <div class="sign-role">Kỹ thuật viên</div>
              <div class="sign-note">(Ký, ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(technician)}</div>
            </td>
            <td style="width: 34%;">
              <div class="sign-role">Đại diện Duy Long Computer</div>
              <div class="sign-note">(Ký, đóng dấu)</div>
              <div class="sign-space"></div>
            </td>
          </tr>
        </table>
        <script>
          window.onload = function () {
            window.print();
            setTimeout(function () { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
}
