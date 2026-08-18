import { numberToVietnameseWords } from './numberToVietnameseWords';
import { formatDateOnly } from './dateFormat';

export function printExportSlip(slipOrSlips, options = {}) {
  const {
    customer = {},
    warehouseName = '',
    warehouseById = new Map(),
    productById = new Map(),
    userById = new Map(),
    isImport = false,
    printMode = 'SUMMARY', // 'SUMMARY' | 'SPLIT_BY_WAREHOUSE'
  } = options;

  const slips = Array.isArray(slipOrSlips) ? slipOrSlips : [slipOrSlips];

  const printWindow = window.open('', '_blank', 'width=900,height=800');
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

  const getWarehouseDisplayName = (whId, lineWhName) => {
    if (lineWhName) return lineWhName;
    if (!whId) return '';
    if (warehouseById instanceof Map && warehouseById.has(whId)) {
      const wh = warehouseById.get(whId);
      return wh?.name || wh?.warehouseName || `Kho #${whId}`;
    }
    if (warehouseById instanceof Map && warehouseById.has(String(whId))) {
      const wh = warehouseById.get(String(whId));
      return wh?.name || wh?.warehouseName || `Kho #${whId}`;
    }
    if (typeof warehouseById === 'object' && warehouseById[whId]) {
      return warehouseById[whId]?.name || warehouseById[whId]?.warehouseName || `Kho #${whId}`;
    }
    return `Kho #${whId}`;
  };

  const typeTitle = isImport ? 'NHẬP KHO' : 'XUẤT KHO / BÁN HÀNG';

  const renderSinglePage = (slip, linesToRender, customWhName = null, isSplit = false) => {
    const customerName = slip.customerName || customer.name || slip.partnerName || 'Khách lẻ';
    const customerPhone = customer.phone || customer.phoneNumber || slip.customerPhone || slip.partnerPhone || 'Chưa có';
    const customerAddress = customer.address || slip.customerAddress || slip.partnerAddress || 'Chưa có';
    const taxCode = customer.taxCode || customer.taxId || slip.taxCode || '';

    const salesperson = slip.salespersonName || userById.get(slip.salespersonId)?.fullName || userById.get(slip.salespersonId)?.username || 'Chưa rõ';
    const docDateStr = formatDateOnly(slip.docDate || new Date());
    
    let currentWarehouseName = customWhName || warehouseName || (slip.warehouseId ? getWarehouseDisplayName(slip.warehouseId) : '');
    if (!currentWarehouseName && !isSplit) {
      currentWarehouseName = 'Nhiều kho';
    }

    let totalQty = 0;
    let totalAmount = 0;
    let totalVatAmount = 0;

    let rowsHtml = '';
    linesToRender.forEach((line, index) => {
      const product = productById.get(line.variantId) || productById.get(String(line.variantId));
      const sku = product?.sku || line.sku || '';
      const name = line.variantName || product?.variantName || product?.name || (product?.productName ? `${product.productName} ${product.variantName || ''}` : 'Sản phẩm');
      const unit = line.unitName || product?.unitName || 'Chiếc';
      const lineWh = getWarehouseDisplayName(line.warehouseId, line.warehouseName);
      
      let warrantyText = line.warrantyPeriod || line.warrantyMonths || product?.warrantyMonths || '';
      if (typeof warrantyText === 'number') {
        warrantyText = warrantyText >= 12 && warrantyText % 12 === 0 ? `${warrantyText / 12} năm` : `${warrantyText} tháng`;
      }

      const qty = Number(isImport ? (line.quantityIn || line.quantity) : (line.quantityOut || line.quantity) || 0);
      const price = Number(line.unitPrice || line.unitCost || 0);
      const amount = qty * price;
      const vatPercent = Number(line.vatPercent ?? line.vatRate ?? 0);
      const vatAmount = amount * (vatPercent / 100);

      totalQty += qty;
      totalAmount += amount;
      totalVatAmount += vatAmount;

      const serials = line.serialNumbers && line.serialNumbers.length > 0 
        ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;"><strong>Serial:</strong> ${escapeHtml(line.serialNumbers.join(', '))}</div>`
        : '';

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(name)}</strong>
            ${sku ? `<span style="font-size: 11px; color: #64748b;"> (${escapeHtml(sku)})</span>` : ''}
            ${serials}
          </td>
          ${!isSplit ? `<td style="text-align: center; font-size: 11px; color: #1e293b;">${escapeHtml(lineWh || '—')}</td>` : ''}
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center;">${escapeHtml(warrantyText)}</td>
          <td style="text-align: center; font-weight: 500;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : ''}</td>
          <td style="text-align: center;">${vatPercent}</td>
          <td style="text-align: right; font-weight: 600;">${amount ? amount.toLocaleString('vi-VN') : ''}</td>
        </tr>
      `;
    });

    const grandTotal = totalAmount + totalVatAmount;
    const wordsAmount = numberToVietnameseWords(grandTotal);
    const colSpanTotal = isSplit ? 4 : 5;
    const colSpanSummary = isSplit ? 7 : 8;

    return `
        <div class="print-page-wrapper" style="position: relative;">
        <div class="watermark-dl">DL</div>

        <!-- HEADER -->
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

        <!-- TITLE -->
        <div class="title-container">
          <div class="doc-title">PHIẾU ${typeTitle} ${isSplit ? `<span style="font-size: 16px; color: #2563eb; display: block; margin-top: 4px;">(${escapeHtml(currentWarehouseName)})</span>` : ''}</div>
          <div class="doc-subtitle">${isSplit ? `(Bản in tách kho)` : `(Kiêm phiếu bảo hành)`}</div>
        </div>

        <!-- INFO GRID -->
        <table class="info-grid">
          <tr>
            <td style="width: 60%;">
              <strong>Tên khách hàng:</strong> ${escapeHtml(customerName)}<br/>
              <strong>Số điện thoại:</strong> ${escapeHtml(customerPhone)}<br/>
              <strong>Địa chỉ:</strong> ${escapeHtml(customerAddress)}<br/>
              <strong>Mã số thuế:</strong> ${escapeHtml(taxCode)}
            </td>
            <td style="width: 40%; text-align: right;">
              <strong>Ngày:</strong> ${escapeHtml(docDateStr)}<br/>
              <strong>Số phiếu:</strong> <span style="font-weight: 700; font-size: 14px;">${escapeHtml(slip.docCode || '')}</span><br/>
              <strong>Loại tiền:</strong> VND<br/>
              ${currentWarehouseName ? `<strong>Kho xuất:</strong> ${escapeHtml(currentWarehouseName)}` : ''}
            </td>
          </tr>
        </table>

        <!-- PRODUCT TABLE -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: ${isSplit ? '45%' : '35%'};">Tên hàng</th>
              ${!isSplit ? `<th style="width: 14%;">Kho xuất</th>` : ''}
              <th style="width: 10%;">Đơn vị tính</th>
              <th style="width: 8%;">BH</th>
              <th style="width: 8%;">Số lượng</th>
              <th style="width: 12%;">Đơn giá</th>
              <th style="width: 8%;">% VAT</th>
              <th style="width: 12%;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="summary-row">
              <td colspan="${colSpanTotal}" style="text-align: right;">Cộng</td>
              <td style="text-align: center;">${totalQty.toLocaleString('vi-VN')}</td>
              <td colspan="2"></td>
              <td style="text-align: right;">${totalAmount.toLocaleString('vi-VN')}</td>
            </tr>
            <tr class="summary-row">
              <td colspan="${colSpanSummary}" style="text-align: right;">Cộng tiền hàng</td>
              <td style="text-align: right;">${totalAmount.toLocaleString('vi-VN')}</td>
            </tr>
            ${totalVatAmount > 0 ? `
            <tr class="summary-row">
              <td colspan="${colSpanSummary}" style="text-align: right;">Tiền thuế GTGT</td>
              <td style="text-align: right;">${totalVatAmount.toLocaleString('vi-VN')}</td>
            </tr>
            ` : ''}
            <tr class="summary-row" style="background-color: #f1f5f9; font-size: 13px;">
              <td colspan="${colSpanSummary}" style="text-align: right; font-weight: 700;">Tổng tiền thanh toán</td>
              <td style="text-align: right; font-weight: 800; color: #000;">${grandTotal.toLocaleString('vi-VN')}</td>
            </tr>
          </tbody>
        </table>

        <div class="words-row">
          <strong>Số tiền viết bằng chữ:</strong> ${escapeHtml(wordsAmount)}
        </div>

        <!-- POLICY & TERMS SECTION -->
        <div class="policy-section">
          <ul class="policy-list">
            <li><strong>Thời gian nhận bảo hành:</strong> Vào buổi chiều (2h - 5h30) các ngày từ thứ 2 đến thứ 7 (trừ ngày Lễ, Tết, Chủ Nhật).</li>
            <li><strong>Địa điểm bảo hành:</strong> Duy nhất tại địa chỉ 42 Lê Thanh Nghị, HBT, Hà Nội nếu sản phẩm còn thời hạn bảo hành. Quý khách vui lòng thanh toán chi phí vận chuyển phát sinh (nếu có).</li>
            <li><strong>Khi đổi sản phẩm:</strong> Thời hạn bảo hành còn lại của sản phẩm cũ được chuyển sang sản phẩm tương đương.</li>
            <li><strong>Bảo hành tận nhà:</strong> Hỗ trợ nhận mang về bảo hành tận nhà trong vòng 15 ngày đầu đối với nội thành và hỗ trợ 1 phần chi phí với khách ở xa.</li>
            <li><strong>Laptop cũ:</strong> Pin, bàn phím, sạc và màn hình Laptop chỉ bảo hành 03 tháng. Không bảo hành phần mềm cài đặt như Windows, Office...</li>
            <li><strong>Điều kiện bảo hành:</strong> Theo tiêu chuẩn nhà sản xuất, hỏng gì đổi đấy hoặc thay thế linh kiện tương đương.</li>
            <li><strong>Trường hợp không bảo hành:</strong> Do sơ xuất, thiên tai, vào nước, ẩm mốc, oxi hóa, cháy nổ, rơi vỡ, tem niêm phong rách/sửa.</li>
            <li><strong>Ổ cứng (HDD/SSD/NVMe):</strong> <span style="font-weight: 700; text-decoration: underline;">CHỈ BẢO HÀNH ĐỔI Ổ - KHÔNG BẢO HÀNH DỮ LIỆU</span>.</li>
          </ul>
          <div style="margin-top: 4px; font-style: italic; font-weight: 600;">
            #Lời khuyên: Quý khách hàng nên bảo dưỡng máy tính định kỳ 6 tháng 1 lần để tăng độ bền và phát hiện sự cố sớm.
          </div>
        </div>

        <!-- 5 SIGNATURE COLUMNS -->
        <table class="signatures-table">
          <tr>
            <td>
              <div class="sign-role">Người mua hàng</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(customerName !== 'Khách lẻ' ? customerName : '')}</div>
            </td>
            <td>
              <div class="sign-role">Kỹ thuật</div>
              <div class="sign-note">(SĐT: 0985.6969.21)</div>
              <div class="sign-space"></div>
              <div>(Ký, họ tên)</div>
            </td>
            <td>
              <div class="sign-role">Thủ kho ${isSplit ? `<br/><span style="font-size: 10px; color: #2563eb;">${escapeHtml(currentWarehouseName)}</span>` : ''}</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div></div>
            </td>
            <td>
              <div class="sign-role">Nhân viên GH</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div></div>
            </td>
            <td>
              <div class="sign-role">Nhân viên kinh doanh</div>
              <div class="sign-note">(Ký, họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(salesperson !== 'Chưa rõ' ? salesperson : '')}</div>
            </td>
          </tr>
        </table>
        </div>
    `;
  };

  const pagesArray = [];
  slips.forEach((slip) => {
    const lines = slip?.lines || [];
    if (printMode === 'SPLIT_BY_WAREHOUSE') {
      const groups = new Map();
      lines.forEach((l) => {
        const whId = l.warehouseId || slip.warehouseId || 'DEFAULT';
        if (!groups.has(whId)) groups.set(whId, []);
        groups.get(whId).push(l);
      });

      if (groups.size === 0) {
        pagesArray.push(renderSinglePage(slip, lines, null, false));
      } else {
        groups.forEach((groupLines, whId) => {
          const customWhName = whId !== 'DEFAULT' ? getWarehouseDisplayName(whId, groupLines[0]?.warehouseName) : (warehouseName || 'Kho xuất');
          pagesArray.push(renderSinglePage(slip, groupLines, customWhName, true));
        });
      }
    } else {
      pagesArray.push(renderSinglePage(slip, lines, null, false));
    }
  });

  const pagesHtml = pagesArray.join('<div class="page-break" style="page-break-after: always; break-after: page;"></div>');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>In Phiếu ${escapeHtml(slips.length === 1 ? (slips[0].docCode || 'Xuất Kho') : 'Xuất Kho Hàng Loạt')}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm 12mm;
          }
          body {
            font-family: 'Segoe UI', Arial, Roboto, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.35;
          }
          .print-page-wrapper {
            page-break-after: always;
            break-after: page;
            padding-bottom: 20px;
          }
          .print-page-wrapper:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .watermark-dl {
            position: absolute;
            top: 45%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 260px;
            font-weight: 900;
            color: rgba(37, 99, 235, 0.03);
            z-index: -1;
            user-select: none;
            pointer-events: none;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .header-logo {
            display: inline-block;
            font-size: 28px;
            font-weight: 900;
            color: #2563eb;
            letter-spacing: -1px;
            line-height: 1;
          }
          .header-subtitle {
            font-size: 11px;
            color: #64748b;
            font-weight: 600;
          }
          .company-info {
            font-size: 11px;
            color: #334155;
            line-height: 1.4;
          }
          .title-container {
            text-align: center;
            margin: 8px 0 10px 0;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
          }
          .doc-subtitle {
            font-size: 11px;
            color: #64748b;
            font-style: italic;
          }
          .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 12px;
            line-height: 1.5;
          }
          .info-grid td {
            vertical-align: top;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .main-table th, .main-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            font-size: 11.5px;
          }
          .main-table th {
            background-color: #f8fafc;
            color: #0f172a;
            font-weight: 700;
            text-align: center;
          }
          .summary-row td {
            font-weight: 600;
            background-color: #f8fafc;
          }
          .words-row {
            font-style: italic;
            font-size: 11.5px;
            margin-bottom: 10px;
            color: #1e293b;
          }
          .policy-section {
            border: 1px dashed #94a3b8;
            background-color: #f8fafc;
            padding: 6px 10px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 10px;
            line-height: 1.35;
          }
          .policy-list {
            margin: 0;
            padding-left: 14px;
          }
          .signatures-table {
            width: 100%;
            border-collapse: collapse;
            text-align: center;
            margin-top: 10px;
          }
          .signatures-table td {
            width: 20%;
            vertical-align: top;
          }
          .sign-role {
            font-weight: 700;
            font-size: 11.5px;
            color: #0f172a;
          }
          .sign-note {
            font-size: 10px;
            color: #64748b;
            font-style: italic;
          }
          .sign-space {
            height: 45px;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
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
