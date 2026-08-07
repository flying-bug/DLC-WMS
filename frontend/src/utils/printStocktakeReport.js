import { formatDateOnly } from './dateFormat';

export function printStocktakeReport(options = {}) {
  const {
    stocktakeCode = '',
    purpose = 'Kiểm kê vật tư hàng hóa định kỳ',
    warehouseName = 'Tất cả kho',
    stocktakeDate = new Date(),
    conclusion = '',
    lines = [],
    participants = [],
    onError = null,
  } = options;

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    if (onError) {
      onError('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in phiếu.');
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

  const formattedDate = formatDateOnly(stocktakeDate || new Date());

  // Participants list HTML
  let participantsHtml = '';
  if (Array.isArray(participants) && participants.length > 0) {
    const list = participants.map(p => `${escapeHtml(p.name || p.fullName)}${p.title ? ` (${escapeHtml(p.title)})` : ''}${p.represent ? ` - đại diện ${escapeHtml(p.represent)}` : ''}`).join('; ');
    participantsHtml = `<div style="margin-bottom: 12px; font-size: 13px;"><strong>Ban kiểm kê gồm:</strong> ${list}</div>`;
  }

  // Totals initialization
  let totalBook = 0;
  let totalCount = 0;
  let totalDiff = 0;
  let totalGood = 0;
  let totalBad = 0;
  let totalLost = 0;

  // Lines HTML
  let rowsHtml = '';
  lines.forEach((line, index) => {
    const bookQty = Number(line.bookQty || line.system_quantity || 0);
    const countQty = Number(line.countQty !== undefined ? line.countQty : (line.good100 || 0) + (line.bad || 0) + (line.lost || 0));
    const diffQty = Number(line.diffQty !== undefined ? line.diffQty : (countQty - bookQty));
    const goodQty = Number(line.good100 || line.goodQty || 0);
    const badQty = Number(line.bad || line.badQty || 0);
    const lostQty = Number(line.lost || line.lostQty || 0);

    totalBook += bookQty;
    totalCount += countQty;
    totalDiff += diffQty;
    totalGood += goodQty;
    totalBad += badQty;
    totalLost += lostQty;

    const serialList = Array.isArray(line.serials)
      ? line.serials.map(s => (typeof s === 'string' ? s : s.serialNumber)).filter(Boolean)
      : (Array.isArray(line.serialNumbers) ? line.serialNumbers : []);

    const serialText = serialList.length > 0
      ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;"><strong>Serial:</strong> ${escapeHtml(serialList.join(', '))}</div>`
      : '';

    const diffText = diffQty > 0 ? `+${diffQty.toLocaleString('vi-VN')}` : diffQty.toLocaleString('vi-VN');
    const diffColor = diffQty > 0 ? '#16a34a' : (diffQty < 0 ? '#dc2626' : '#334155');

    rowsHtml += `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>
          <strong>${escapeHtml(line.itemCode || line.sku || '')}</strong>
        </td>
        <td>
          <strong>${escapeHtml(line.itemName || line.productName || '')}</strong>
          ${line.sku && line.sku !== line.itemCode ? `<span style="font-size: 11px; color: #64748b;"> (${escapeHtml(line.sku)})</span>` : ''}
          ${serialText}
        </td>
        <td style="text-align: center;">${escapeHtml(line.unit || line.unitName || 'Chiếc')}</td>
        <td style="text-align: right;">${bookQty.toLocaleString('vi-VN')}</td>
        <td style="text-align: right; font-weight: 600;">${countQty.toLocaleString('vi-VN')}</td>
        <td style="text-align: right;">${goodQty.toLocaleString('vi-VN')}</td>
        <td style="text-align: right;">${badQty.toLocaleString('vi-VN')}</td>
        <td style="text-align: right;">${lostQty.toLocaleString('vi-VN')}</td>
        <td style="text-align: right; font-weight: 600; color: ${diffColor};">${diffText}</td>
        <td>${escapeHtml(line.action || line.note || '')}</td>
      </tr>
    `;
  });

  const totalDiffText = totalDiff > 0 ? `+${totalDiff.toLocaleString('vi-VN')}` : totalDiff.toLocaleString('vi-VN');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Bảng kiểm kê vật tư hàng hóa ${escapeHtml(stocktakeCode)}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 15mm;
        }
        body {
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          font-size: 13px;
          color: #1e293b;
          margin: 0;
          padding: 10px;
          background: #fff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .company-info h2 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #0f172a;
          text-transform: uppercase;
        }
        .company-info p {
          margin: 2px 0;
          font-size: 12px;
          color: #475569;
        }
        .doc-title {
          text-align: center;
          margin: 16px 0;
        }
        .doc-title h1 {
          margin: 0 0 6px 0;
          font-size: 20px;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .doc-title p {
          margin: 2px 0;
          font-size: 13px;
          color: #475569;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
          margin-bottom: 16px;
          background: #f8fafc;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }
        table.report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 12px;
        }
        table.report-table th, table.report-table td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
        }
        table.report-table th {
          background-color: #f1f5f9;
          color: #0f172a;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 11px;
        }
        table.report-table tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .summary-box {
          margin-top: 12px;
          font-size: 13px;
          line-height: 1.6;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          page-break-inside: avoid;
        }
        .sig-block {
          text-align: center;
          width: 23%;
        }
        .sig-block strong {
          display: block;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .sig-block span {
          font-size: 11px;
          color: #64748b;
          font-style: italic;
        }
        .sig-space {
          height: 60px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h2>CÔNG TY TNHH VẬT TƯ THIẾT BỊ DUY LONG</h2>
          <p>Hệ thống Quản lý Kho Hàng (DLC-WMS)</p>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          <div>Mẫu số: 05-VT</div>
          <div>Ngày in: ${formatDateOnly(new Date())}</div>
        </div>
      </div>

      <div class="doc-title">
        <h1>BẢNG KIỂM KÊ VẬT TƯ HÀNG HÓA</h1>
        <p><strong>Số phiếu:</strong> ${escapeHtml(stocktakeCode)} &nbsp;|&nbsp; <strong>Ngày kiểm kê:</strong> ${escapeHtml(formattedDate)}</p>
      </div>

      <div class="meta-grid">
        <div><strong>Kho kiểm kê:</strong> ${escapeHtml(warehouseName)}</div>
        <div><strong>Mục đích:</strong> ${escapeHtml(purpose)}</div>
      </div>

      ${participantsHtml}

      <table class="report-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 30px; text-align: center;">STT</th>
            <th rowspan="2" style="width: 90px;">Mã hàng</th>
            <th rowspan="2">Tên vật tư, hàng hóa</th>
            <th rowspan="2" style="width: 50px; text-align: center;">ĐVT</th>
            <th rowspan="2" style="width: 70px; text-align: right;">Sổ sách</th>
            <th colspan="4" style="text-align: center;">Kiểm kê thực tế</th>
            <th rowspan="2" style="width: 70px; text-align: right;">Chênh lệch</th>
            <th rowspan="2" style="width: 120px;">Hướng xử lý / Ghi chú</th>
          </tr>
          <tr>
            <th style="width: 60px; text-align: right;">Tổng số</th>
            <th style="width: 55px; text-align: right;">Tốt 100%</th>
            <th style="width: 55px; text-align: right;">Kém Cấp</th>
            <th style="width: 55px; text-align: right;">Hỏng/Mất</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="11" style="text-align: center; color: #64748b;">Không có dữ liệu hàng hóa</td></tr>'}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold; background-color: #e2e8f0;">
            <td colspan="4" style="text-align: right;">TỔNG CỘNG:</td>
            <td style="text-align: right;">${totalBook.toLocaleString('vi-VN')}</td>
            <td style="text-align: right;">${totalCount.toLocaleString('vi-VN')}</td>
            <td style="text-align: right;">${totalGood.toLocaleString('vi-VN')}</td>
            <td style="text-align: right;">${totalBad.toLocaleString('vi-VN')}</td>
            <td style="text-align: right;">${totalLost.toLocaleString('vi-VN')}</td>
            <td style="text-align: right;">${totalDiffText}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      ${conclusion ? `<div class="summary-box"><strong>Kết luận ban kiểm kê:</strong> ${escapeHtml(conclusion)}</div>` : ''}

      <div class="signatures">
        <div class="sig-block">
          <strong>Người lập bảng</strong>
          <span>(Ký, họ tên)</span>
          <div class="sig-space"></div>
        </div>
        <div class="sig-block">
          <strong>Thủ kho</strong>
          <span>(Ký, họ tên)</span>
          <div class="sig-space"></div>
        </div>
        <div class="sig-block">
          <strong>Ban kiểm kê</strong>
          <span>(Ký, họ tên)</span>
          <div class="sig-space"></div>
        </div>
        <div class="sig-block">
          <strong>Trưởng đơn vị / Giám đốc</strong>
          <span>(Ký, họ tên, đóng dấu)</span>
          <div class="sig-space"></div>
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
