import { formatDateOnly } from './dateFormat';

export function printRepairQuotation(repair, options = {}) {
  const printWindow = options.printWindow || window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    if (options.onError) {
      options.onError('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in phiếu.');
    } else {
      console.error('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in phiếu.');
    }
    return false;
  }

  const escapeHtml = (unsafe) => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const money = (v) => Number(v || 0).toLocaleString('vi-VN') + ' ₫';
  const fmt = (v) => Number(v || 0).toLocaleString('vi-VN');

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
  let rowsHtml = '';

  if (lines.length > 0) {
    rowsHtml += `
      <tr class="category-row">
        <td colspan="7">Linh kiện thay thế</td>
      </tr>
    `;
  }
  lines.forEach((line) => {
    idx++;
    const base = Number(line.quantity || 0) * Number(line.unitPrice || 0);
    const vat = line.isFreeWarranty ? 0 : base * Number(line.vatPercent || 0) / 100;
    const total = line.isFreeWarranty ? 0 : base + vat;
    
    rowsHtml += `
      <tr>
        <td class="text-center">${idx}</td>
        <td>
          <strong>${escapeHtml(line.componentName || 'Linh kiện')}</strong>
          ${line.componentSku ? `<span class="muted-text">[${escapeHtml(line.componentSku)}]</span>` : ''}
          ${line.actionType === 'REPLACE' ? `<span class="replace-text">(Thay thế)</span>` : ''}
          ${line.isFreeWarranty ? `<span class="warranty-badge">Bảo hành</span>` : ''}
          ${line.note ? `<div class="italic-note">${escapeHtml(line.note)}</div>` : ''}
        </td>
        <td class="text-center">Cái</td>
        <td class="text-center">${fmt(line.quantity)}</td>
        <td class="text-right">${line.isFreeWarranty ? '—' : money(line.unitPrice)}</td>
        <td class="text-center">${line.isFreeWarranty ? '—' : `${line.vatPercent || 0}%`}</td>
        <td class="text-right">${line.isFreeWarranty ? `<em class="free-text">Miễn phí</em>` : money(total)}</td>
      </tr>
    `;
  });

  if (fees.length > 0) {
    rowsHtml += `
      <tr class="category-row">
        <td colspan="7">Dịch vụ / Phí</td>
      </tr>
    `;
  }
  fees.forEach((fee) => {
    idx++;
    const base = Number(fee.quantity || 1) * Number(fee.feeAmount || 0);
    const vat = fee.isFreeWarranty ? 0 : base * Number(fee.vatPercent || 0) / 100;
    const total = fee.isFreeWarranty ? 0 : base + vat;
    
    rowsHtml += `
      <tr>
        <td class="text-center">${idx}</td>
        <td>
          <strong>${escapeHtml(fee.feeName || 'Dịch vụ')}</strong>
          ${fee.isFreeWarranty ? `<span class="warranty-badge">Bảo hành</span>` : ''}
          ${fee.note ? `<div class="italic-note">${escapeHtml(fee.note)}</div>` : ''}
        </td>
        <td class="text-center">${escapeHtml(fee.unitName || 'Lần')}</td>
        <td class="text-center">${fmt(fee.quantity || 1)}</td>
        <td class="text-right">${fee.isFreeWarranty ? '—' : money(fee.feeAmount)}</td>
        <td class="text-center">${fee.isFreeWarranty ? '—' : `${fee.vatPercent || 0}%`}</td>
        <td class="text-right">${fee.isFreeWarranty ? `<em class="free-text">Miễn phí</em>` : money(total)}</td>
      </tr>
    `;
  });

  if (!hasItems) {
    rowsHtml += `
      <tr>
        <td colspan="7" class="text-center empty-row">
          Chưa có linh kiện / dịch vụ nào
        </td>
      </tr>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Báo Giá Sửa Chữa - ${escapeHtml(repair.repairCode || 'REP')}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            font-size: 14px;
            line-height: 1.6;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          .print-page-wrapper {
            padding: 10px 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #002b6b;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .company-name {
            margin: 0 0 4px;
            font-size: 18px;
            font-weight: bold;
            color: #002b6b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .company-detail {
            margin: 2px 0;
            font-size: 12px;
            color: #333;
          }
          .quote-box {
            text-align: right;
            background-color: #f0f4ff;
            border: 1px solid #c0cef0;
            border-radius: 6px;
            padding: 10px 16px;
            min-width: 180px;
          }
          .quote-label {
            margin: 2px 0;
            font-size: 12px;
            color: #555;
          }
          .quote-code {
            margin: 4px 0 0;
            font-size: 16px;
            font-weight: bold;
            color: #002b6b;
          }
          .title-block {
            text-align: center;
            margin: 4px 0 20px;
          }
          .title {
            margin: 0;
            font-size: 22px;
            font-weight: bold;
            text-transform: uppercase;
            color: #002b6b;
            letter-spacing: 1px;
          }
          .subtitle {
            margin: 4px 0 0;
            font-size: 13px;
            color: #555;
            font-style: italic;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0 32px;
            border: 1px solid #ccc;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 20px;
            background-color: #fafbff;
          }
          .info-row {
            margin: 4px 0;
            font-size: 13px;
          }
          .info-label {
            font-weight: bold;
            color: #333;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
            font-size: 13px;
          }
          .main-table th {
            border: 1px solid #555;
            padding: 7px 8px;
            background-color: #002b6b;
            color: #fff;
            text-align: center;
            font-weight: bold;
            white-space: nowrap;
          }
          .main-table td {
            border: 1px solid #888;
            padding: 6px 8px;
            vertical-align: top;
          }
          .category-row td {
            font-weight: bold;
            color: #002b6b;
            background-color: #e8eef8;
            padding: 5px 8px;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; white-space: nowrap; }
          .muted-text { font-size: 11px; color: #666; margin-left: 4px; }
          .replace-text { font-size: 11px; color: #e65100; margin-left: 4px; }
          .warranty-badge {
            display: inline-block;
            background-color: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #a5d6a7;
            border-radius: 3px;
            padding: 0 5px;
            font-size: 11px;
            margin-left: 4px;
            font-style: italic;
          }
          .italic-note { font-size: 11px; color: #666; font-style: italic; }
          .free-text { color: #2e7d32; }
          .empty-row { font-style: italic; color: #888; padding: 16px; }
          .summary-label {
            text-align: right;
            padding: 8px 12px;
            font-weight: bold;
            color: #333;
            border-bottom: 1px solid #ccc;
            border-left: 1px solid #888;
          }
          .summary-amount {
            text-align: right;
            padding: 8px 12px;
            font-weight: bold;
            white-space: nowrap;
            border-bottom: 1px solid #ccc;
            border-right: 1px solid #888;
            border-left: 1px solid #ccc;
          }
          .grand-row {
            background-color: #002b6b;
            color: #fff;
          }
          .grand-label {
            text-align: right;
            padding: 10px 12px;
            font-weight: bold;
            font-size: 14px;
            border: 1px solid #001a4a;
          }
          .grand-amount {
            text-align: right;
            padding: 10px 12px;
            font-weight: bold;
            font-size: 14px;
            color: #ffd700;
            white-space: nowrap;
            border: 1px solid #001a4a;
          }
          .terms {
            margin-top: 20px;
            margin-bottom: 20px;
            font-size: 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 10px 14px;
            background-color: #fffef0;
          }
          .terms-title {
            margin: 0 0 6px;
            font-size: 13px;
            font-weight: bold;
            color: #002b6b;
          }
          .terms-list {
            margin: 0;
            padding-left: 18px;
          }
          .sigs {
            display: flex;
            justify-content: space-around;
            margin-top: 32px;
            text-align: center;
          }
          .sig-box {
            width: 160px;
          }
          .sig-title {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 13px;
          }
          .sig-note {
            font-size: 11px;
            color: #666;
            font-style: italic;
          }
          .sig-name {
            margin-top: 70px;
            font-weight: bold;
            border-top: 1px solid #333;
            padding-top: 4px;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="print-page-wrapper">
          <!-- HEADER -->
          <div class="header">
            <div>
              <p class="company-name">Công ty TNHH Duy Long</p>
              <p class="company-detail">Địa chỉ: Số 59 Thịnh Liệt – Hoàng Mai – Hà Nội</p>
              <p class="company-detail">Điện thoại: 0392 718 888 &nbsp;|&nbsp; Email: Duylongcomputer@gmail.com</p>
              <p class="company-detail">Mã số thuế: 0103711414</p>
            </div>
            <div class="quote-box">
              <p class="quote-label">Ngày báo giá</p>
              <p class="quote-label" style="font-weight: bold; color: #333;">${formatDateOnly(new Date())}</p>
              <p class="quote-code">${escapeHtml(repair.repairCode)}</p>
            </div>
          </div>

          <!-- TITLE -->
          <div class="title-block">
            <h1 class="title">Bảng Báo Giá Sửa Chữa</h1>
            <p class="subtitle">Kính gửi: Quý Khách hàng</p>
          </div>

          <!-- INFO GRID -->
          <div class="info-grid">
            <div>
              <p class="info-row"><span class="info-label">Khách hàng:</span> ${escapeHtml(repair.partnerName || '—')}</p>
              ${repair.partnerPhone ? `<p class="info-row"><span class="info-label">Điện thoại:</span> ${escapeHtml(repair.partnerPhone)}</p>` : ''}
            </div>
            <div>
              <p class="info-row"><span class="info-label">Thiết bị:</span> ${escapeHtml(repair.productName || repair.variantName || '—')}</p>
              ${repair.serialNumber ? `<p class="info-row"><span class="info-label">Serial:</span> ${escapeHtml(repair.serialNumber)}</p>` : ''}
              ${repair.responsiblePerson ? `<p class="info-row"><span class="info-label">KTV phụ trách:</span> ${escapeHtml(repair.responsiblePerson)}</p>` : ''}
            </div>
            ${repair.issueDescription ? `
              <div style="grid-column: 1 / -1;">
                <p class="info-row"><span class="info-label">Mô tả lỗi:</span> ${escapeHtml(repair.issueDescription)}</p>
              </div>
            ` : ''}
            ${repair.receivedDate ? `
              <p class="info-row"><span class="info-label">Ngày tiếp nhận:</span> ${formatDateOnly(repair.receivedDate)}</p>
            ` : ''}
            ${repair.expectedDate ? `
              <p class="info-row"><span class="info-label">Dự kiến hoàn tất:</span> ${formatDateOnly(repair.expectedDate)}</p>
            ` : ''}
            ${repair.underWarranty ? `
              <p class="info-row" style="grid-column: 1 / -1; color: #2e7d32; font-weight: bold;">
                ✔ Thiết bị còn trong hạn bảo hành
              </p>
            ` : ''}
          </div>

          <!-- TABLE -->
          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 4%;">STT</th>
                <th style="width: 40%; text-align: left;">Linh kiện / Dịch vụ</th>
                <th style="width: 8%;">ĐVT</th>
                <th style="width: 8%;">SL</th>
                <th style="width: 14%;">Đơn giá</th>
                <th style="width: 8%;">VAT</th>
                <th style="width: 16%;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="summary-label">Tổng tiền trước thuế:</td>
                <td class="summary-amount">${money(subTotal)}</td>
              </tr>
              <tr>
                <td colspan="6" class="summary-label">Thuế VAT:</td>
                <td class="summary-amount">${money(vatTotal)}</td>
              </tr>
              <tr class="grand-row">
                <td colspan="6" class="grand-label">TỔNG THANH TOÁN:</td>
                <td class="grand-amount">${money(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- TERMS -->
          <div class="terms">
            <p class="terms-title">Điều khoản báo giá:</p>
            <ul class="terms-list">
              <li><strong>Hiệu lực báo giá:</strong> 07 ngày kể từ ngày báo giá.</li>
              <li><strong>Thanh toán:</strong> Chuyển khoản hoặc tiền mặt sau khi hoàn tất sửa chữa.</li>
              <li><strong>Bảo hành:</strong> Áp dụng theo chính sách bảo hành sửa chữa của cửa hàng.</li>
              <li><strong>Lưu ý:</strong> Giá trên chưa bao gồm các chi phí phát sinh ngoài báo giá (nếu có).</li>
            </ul>
          </div>

          <!-- SIGNATURES -->
          <div class="sigs">
            <div class="sig-box">
              <p class="sig-title">Khách hàng</p>
              <p class="sig-note">(Ký, ghi rõ họ tên)</p>
              <p class="sig-name">${escapeHtml(repair.partnerName || '')}</p>
            </div>
            <div class="sig-box">
              <p class="sig-title">Đại diện kỹ thuật</p>
              <p class="sig-note">(Ký, ghi rõ họ tên)</p>
              <p class="sig-name">${escapeHtml(repair.responsiblePerson || '................................')}</p>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
}
