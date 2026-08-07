import { numberToVietnameseWords } from './numberToVietnameseWords';
import { formatDateOnly } from './dateFormat';

export function printTransferSlip(slipOrSlips, options = {}) {
  const {
    warehouseById = new Map(),
    productById = new Map(),
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

  const pagesHtml = slips.map((slip) => {
    const lines = slip?.lines || [];

    const docDateStr = formatDateOnly(slip.transferDate || new Date());

    const fromWarehouseName = warehouseById.get(slip.fromWarehouseId)?.name || 'Chưa rõ';
    const toWarehouseName = warehouseById.get(slip.toWarehouseId)?.name || 'Chưa rõ';

    let totalQty = 0;
    let totalAmount = 0;

    let rowsHtml = '';
    lines.forEach((line, index) => {
      const product = productById.get(line.variantId) || productById.get(String(line.variantId));
      const sku = product?.sku || line.sku || '';
      const name = line.variantName || product?.variantName || product?.name || (product?.productName ? `${product.productName} - ${product.variantName || ''}` : 'Sản phẩm');
      const unit = line.unitName || product?.unitName || 'Chiếc';

      const qty = Number(line.quantity || 0);
      const price = Number(line.unitCost || line.unitPrice || line.price || 0);
      const amount = qty * price;

      totalQty += qty;
      totalAmount += amount;

      const serials = line.serialNumbers && line.serialNumbers.length > 0
        ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;"><strong>Serial:</strong> ${escapeHtml(line.serialNumbers.join(', '))}</div>`
        : '';

      let lineNote = '';
      if (line.note && line.note !== `Serial: ${line.serialNumbers?.join(', ')}`) {
        lineNote = `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(line.note)}</div>`;
      }

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(name)}</strong>
            ${sku ? `<span style="font-size: 11px; color: #64748b;"> (${escapeHtml(sku)})</span>` : ''}
            ${serials}
            ${lineNote}
          </td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center; font-weight: 500;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : ''}</td>
          <td style="text-align: right; font-weight: 600;">${amount ? amount.toLocaleString('vi-VN') : ''}</td>
        </tr>
      `;
    });

    const wordsAmount = numberToVietnameseWords(totalAmount);

    return `
        <div style="position: relative;">
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
          <div class="doc-title">PHIẾU CHUYỂN KHO</div>
          <div class="doc-subtitle">(Lưu trữ - Bàn giao)</div>
        </div>

        <!-- INFO GRID -->
        <table class="info-grid">
          <tr>
            <td style="width: 60%;">
              <strong>Kho xuất:</strong> ${escapeHtml(fromWarehouseName)}<br/>
              <strong>Kho nhập:</strong> ${escapeHtml(toWarehouseName)}<br/>
              <strong>Người giao:</strong> ${escapeHtml(slip.deliverer || '')}<br/>
              <strong>Ghi chú:</strong> ${escapeHtml(slip.note || '')}
            </td>
            <td style="width: 40%; text-align: right;">
              <strong>Ngày:</strong> ${escapeHtml(docDateStr)}<br/>
              <strong>Số phiếu:</strong> <span style="font-weight: 700; font-size: 14px;">${escapeHtml(slip.transferCode || '')}</span><br/>
              <strong>Kèm theo CT:</strong> ${escapeHtml(slip.referenceCode || slip.attachedDocument || '')}
            </td>
          </tr>
        </table>

        <!-- PRODUCT TABLE -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 40%;">Tên hàng hóa, dịch vụ</th>
              <th style="width: 10%;">ĐVT</th>
              <th style="width: 10%;">Số lượng</th>
              <th style="width: 15%;">Đơn giá</th>
              <th style="width: 20%;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right; font-weight: bold; border-right: none;">Cộng tiền hàng:</td>
              <td style="text-align: center; font-weight: 700;">${totalQty.toLocaleString('vi-VN')}</td>
              <td style="border-left: none;"></td>
              <td style="text-align: right; font-weight: 700;">${totalAmount.toLocaleString('vi-VN')}</td>
            </tr>
          </tfoot>
        </table>

        <div style="font-style: italic; font-size: 13px; margin-bottom: 30px;">
          <strong>Bằng chữ:</strong> ${wordsAmount}.
        </div>

        <!-- SIGNATURES -->
        <table class="signatures">
          <tr>
            <td>
              <strong>Người lập phiếu</strong><br/>
              <span class="sign-note">(Ký, ghi rõ họ tên)</span>
            </td>
            <td>
              <strong>Người giao hàng</strong><br/>
              <span class="sign-note">(Ký, ghi rõ họ tên)</span>
            </td>
            <td>
              <strong>Thủ kho xuất</strong><br/>
              <span class="sign-note">(Ký, đóng dấu)</span>
            </td>
            <td>
              <strong>Thủ kho nhập</strong><br/>
              <span class="sign-note">(Ký, đóng dấu)</span>
            </td>
          </tr>
        </table>
        </div>
    `;
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>In Phiếu Chuyển Kho</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { margin: 15mm; size: A4; }
          body { 
            font-family: 'Inter', sans-serif; 
            margin: 0; 
            padding: 0; 
            color: #0f172a; 
            line-height: 1.5;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .page-break { page-break-after: always; }
          .page-break:last-child { page-break-after: auto; }
          
          .watermark-dl {
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 250px;
            font-weight: 900;
            color: rgba(226, 232, 240, 0.25);
            z-index: -1;
            user-select: none;
            pointer-events: none;
          }

          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
          .header-logo { 
            display: inline-block;
            background: #0f172a;
            color: #fff;
            font-weight: 900;
            font-size: 24px;
            padding: 4px 12px;
            border-radius: 4px;
            margin-bottom: 4px;
            letter-spacing: 1px;
          }
          .header-subtitle { font-size: 11px; font-style: italic; color: #475569; letter-spacing: 0.5px; }
          .company-info { font-size: 12px; color: #334155; line-height: 1.6; }

          .title-container { text-align: center; margin: 24px 0 32px 0; }
          .doc-title { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-bottom: 4px; }
          .doc-subtitle { font-size: 13px; font-style: italic; color: #64748b; }

          .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          .info-grid td { vertical-align: top; padding: 4px 8px; line-height: 1.6; }

          .main-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          .main-table th, .main-table td { border: 1px solid #cbd5e1; padding: 10px 8px; }
          .main-table th { background-color: #f8fafc; font-weight: 600; text-align: center; color: #334155; text-transform: uppercase; font-size: 12px; border-bottom: 2px solid #94a3b8; }
          .main-table tbody tr:nth-child(even) { background-color: #f8fafc; }
          .main-table tfoot td { background-color: #f1f5f9; padding: 12px 8px; }

          .signatures { width: 100%; margin-top: 40px; page-break-inside: avoid; }
          .signatures td { width: 25%; text-align: center; vertical-align: top; }
          .signatures strong { font-size: 13px; color: #0f172a; display: block; margin-bottom: 4px; }
          .sign-note { font-size: 12px; font-style: italic; color: #64748b; }
        </style>
      </head>
      <body>
        ${pagesHtml.map(html => `<div class="page-break">${html}</div>`).join('')}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(fullHtml);
  printWindow.document.close();
  return true;
}
