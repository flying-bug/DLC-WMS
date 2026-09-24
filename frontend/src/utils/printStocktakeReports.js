import { formatDateOnly } from './dateFormat';
import { printStocktakeReport } from './printStocktakeReport';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getReportOptions = (stocktake) => ({
  stocktakeCode: stocktake.stocktakeCode || stocktake.code || '',
  purpose: stocktake.purpose || 'Kiểm kê vật tư hàng hóa định kỳ',
  warehouseName: stocktake.warehouseName || stocktake.warehouse?.name || (stocktake.warehouseId ? `Kho #${stocktake.warehouseId}` : 'Tất cả kho'),
  stocktakeDate: stocktake.stocktakeDate || stocktake.toDate || stocktake.createdDate || stocktake.createdAt,
  conclusion: stocktake.conclusion || '',
  lines: stocktake.lines || [],
  participants: stocktake.participants || [],
});

const renderReportPage = (stocktake) => {
  const report = getReportOptions(stocktake);
  let totalBook = 0;
  let totalCount = 0;
  let totalDiff = 0;

  const rows = report.lines.map((line, index) => {
    const bookQty = Number(line.bookQty ?? line.bookQuantity ?? line.system_quantity ?? 0);
    const countQty = Number(line.countQty ?? line.actualQuantity ?? ((line.good100 || 0) + (line.bad || 0) + (line.lost || 0)));
    const diffQty = Number(line.diffQty ?? line.diffQuantity ?? (countQty - bookQty));
    totalBook += bookQty;
    totalCount += countQty;
    totalDiff += diffQty;
    const diffText = diffQty > 0 ? `+${diffQty.toLocaleString('vi-VN')}` : diffQty.toLocaleString('vi-VN');

    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${escapeHtml(line.itemCode || line.sku || line.variantSku || '')}</strong></td>
        <td>${escapeHtml(line.itemName || line.productName || line.variantName || '')}</td>
        <td class="center">${escapeHtml(line.unit || line.unitName || line.baseUnitName || 'Chiếc')}</td>
        <td class="number">${bookQty.toLocaleString('vi-VN')}</td>
        <td class="number">${countQty.toLocaleString('vi-VN')}</td>
        <td class="number">${diffText}</td>
        <td>${escapeHtml(line.action || line.note || '')}</td>
      </tr>`;
  }).join('');

  const participants = report.participants.length > 0
    ? `<p><strong>Ban kiểm kê:</strong> ${report.participants.map((person) => escapeHtml(person.name || person.fullName)).join('; ')}</p>`
    : '';
  const totalDiffText = totalDiff > 0 ? `+${totalDiff.toLocaleString('vi-VN')}` : totalDiff.toLocaleString('vi-VN');

  return `
    <section class="report-page">
      <header>
        <div><strong>CÔNG TY TNHH VẬT TƯ THIẾT BỊ DUY LONG</strong><small>Hệ thống Quản lý Kho Hàng (DLC-WMS)</small></div>
        <div class="print-date">Mẫu số: 05-VT<br>Ngày in: ${formatDateOnly(new Date())}</div>
      </header>
      <div class="title">
        <h1>BẢNG KIỂM KÊ VẬT TƯ HÀNG HÓA</h1>
        <p><strong>Số phiếu:</strong> ${escapeHtml(report.stocktakeCode)} &nbsp;|&nbsp; <strong>Ngày kiểm kê:</strong> ${escapeHtml(formatDateOnly(report.stocktakeDate || new Date()))}</p>
      </div>
      <div class="meta">
        <span><strong>Kho kiểm kê:</strong> ${escapeHtml(report.warehouseName)}</span>
        <span><strong>Mục đích:</strong> ${escapeHtml(report.purpose)}</span>
      </div>
      ${participants}
      <table>
        <thead><tr><th>STT</th><th>Mã hàng</th><th>Tên vật tư, hàng hóa</th><th>ĐVT</th><th>Sổ sách</th><th>Kiểm kê thực tế</th><th>Chênh lệch</th><th>Hướng xử lý / Ghi chú</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" class="center">Không có dữ liệu hàng hóa</td></tr>'}</tbody>
        <tfoot><tr><td colspan="4" class="number"><strong>TỔNG CỘNG:</strong></td><td class="number"><strong>${totalBook.toLocaleString('vi-VN')}</strong></td><td class="number"><strong>${totalCount.toLocaleString('vi-VN')}</strong></td><td class="number"><strong>${totalDiffText}</strong></td><td></td></tr></tfoot>
      </table>
      ${report.conclusion ? `<p><strong>Kết luận ban kiểm kê:</strong> ${escapeHtml(report.conclusion)}</p>` : ''}
      <div class="signatures">
        <div><strong>Người lập bảng</strong><em>(Ký, họ tên)</em></div>
        <div><strong>Thủ kho</strong><em>(Ký, họ tên)</em></div>
        <div><strong>Ban kiểm kê</strong><em>(Ký, họ tên)</em></div>
        <div><strong>Trưởng đơn vị / Giám đốc</strong><em>(Ký, họ tên, đóng dấu)</em></div>
      </div>
    </section>`;
};

export function printStocktakeReports(stocktakes, options = {}) {
  const reports = Array.isArray(stocktakes) ? stocktakes : [stocktakes];
  if (reports.length === 0) return false;
  if (reports.length === 1) {
    return printStocktakeReport({
      ...getReportOptions(reports[0]),
      onError: options.onError,
      printWindow: options.printWindow,
    });
  }

  const printWindow = options.printWindow || window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    options.onError?.('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup để in phiếu.');
    return false;
  }

  printWindow.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>In biên bản kiểm kê</title><style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111827; font-size: 12px; }
    .report-page { min-height: 185mm; page-break-after: always; padding: 4px; }
    .report-page:last-child { page-break-after: auto; }
    header { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 10px; }
    header strong { display: block; font-size: 15px; } header small { display: block; margin-top: 4px; color: #4b5563; }
    .print-date { text-align: right; line-height: 1.5; color: #4b5563; }
    .title { text-align: center; margin: 14px 0; } .title h1 { margin: 0 0 6px; font-size: 20px; }
    .title p, p { margin: 6px 0; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; padding: 10px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #d1d5db; }
    table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #9ca3af; padding: 6px; } th { background: #f3f4f6; }
    .center { text-align: center; } .number { text-align: right; }
    tfoot { background: #e5e7eb; }
    .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 28px; text-align: center; }
    .signatures strong, .signatures em { display: block; } .signatures em { margin-top: 4px; font-size: 11px; font-weight: normal; }
    .signatures div { min-height: 80px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style></head><body>${reports.map(renderReportPage).join('')}<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script></body></html>`);
  printWindow.document.close();
  return true;
}
