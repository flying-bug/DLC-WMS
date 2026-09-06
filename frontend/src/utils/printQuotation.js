import { numberToVietnameseWords } from './numberToVietnameseWords';
import { formatDateOnly } from './dateFormat';

export function printQuotation(orderOrOrders, options = {}) {
  const {
    customer = {},
    warehouseName = '',
    productById = new Map(),
    userById = new Map(),
  } = options;

  const orders = Array.isArray(orderOrOrders) ? orderOrOrders : [orderOrOrders];

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    if (options.onError) {
      options.onError('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in báo giá.');
    } else {
      console.error('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in báo giá.');
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

  const pagesHtml = orders.map((order) => {
    const lines = order?.lines || [];
    const customerName = order.customerName || customer.name || order.partnerName || 'Quý Khách hàng';
    const customerPhone = customer.phone || customer.phoneNumber || order.customerPhone || order.partnerPhone || 'Chưa có';
    const customerAddress = customer.address || order.deliveryAddress || order.customerAddress || order.partnerAddress || 'Chưa có';
    const taxCode = customer.taxCode || customer.taxId || order.taxCode || '';

    const salesperson = order.salespersonName || order.createdByName || userById.get(order.createdBy)?.fullName || userById.get(order.createdBy)?.username || 'Chưa rõ';
    const docDateStr = formatDateOnly(order.soDate || order.docDate || order.createdAt || new Date());
    
    const currentWarehouseName = warehouseName || order.warehouseName || (order.warehouseId ? (`Kho #${order.warehouseId}`) : '');

    let totalQty = 0;
    let totalAmount = 0;
    let totalVatAmount = 0;

    let rowsHtml = '';
    lines.forEach((line, index) => {
      const product = productById.get(line.variantId);
      const sku = line.sku || line.variantCode || product?.sku || '';
      const name = line.variantName || product?.variantName || product?.name || (product?.productName ? `${product.productName} ${product.variantName || ''}` : 'Sản phẩm');
      const unit = line.unitName || line.unit || product?.unitName || 'Chiếc';
      
      let warrantyText = line.warrantyPeriod || line.warrantyMonths || product?.warrantyMonths || '';
      if (typeof warrantyText === 'number') {
        warrantyText = warrantyText >= 12 && warrantyText % 12 === 0 ? `${warrantyText / 12} năm` : `${warrantyText} tháng`;
      }

      const qty = Number(line.quantity || 0);
      const price = Number(line.unitPrice || line.salePrice || line.unitCost || 0);
      const amount = line.lineAmount ? Number(line.lineAmount) : (qty * price);
      const vatPercent = Number(line.vatRate ?? line.vatPercent ?? 0);
      const vatAmount = amount * (vatPercent / 100);

      totalQty += qty;
      totalAmount += amount;
      totalVatAmount += vatAmount;

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(name)}</strong>
            ${sku ? `<span style="font-size: 11px; color: #64748b;"> (${escapeHtml(sku)})</span>` : ''}
          </td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center;">${escapeHtml(warrantyText || '—')}</td>
          <td style="text-align: center; font-weight: 500;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : '0'}</td>
          <td style="text-align: center;">${vatPercent}</td>
          <td style="text-align: right; font-weight: 600;">${amount ? amount.toLocaleString('vi-VN') : '0'}</td>
        </tr>
      `;
    });

    const grandTotal = order.totalAmount ? Number(order.totalAmount) : (totalAmount + totalVatAmount);
    const subTotal = order.subTotalAmount ? Number(order.subTotalAmount) : totalAmount;
    const taxTotal = order.taxAmount ? Number(order.taxAmount) : totalVatAmount;
    const wordsAmount = numberToVietnameseWords(grandTotal);

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
          <div class="doc-title">BẢNG BÁO GIÁ</div>
          <div class="doc-subtitle">(Kính gửi: Quý Khách hàng)</div>
        </div>

        <!-- INFO GRID -->
        <table class="info-grid">
          <tr>
            <td style="width: 60%;">
              <strong>Khách hàng / Đơn vị:</strong> ${escapeHtml(customerName)}<br/>
              <strong>Số điện thoại:</strong> ${escapeHtml(customerPhone)}<br/>
              <strong>Địa chỉ:</strong> ${escapeHtml(customerAddress)}<br/>
              ${taxCode ? `<strong>Mã số thuế:</strong> ${escapeHtml(taxCode)}<br/>` : ''}
            </td>
            <td style="width: 40%; text-align: right;">
              <strong>Ngày báo giá:</strong> ${escapeHtml(docDateStr)}<br/>
              <strong>Số báo giá:</strong> <span style="font-weight: 700; font-size: 14px; color: #0284c7;">${escapeHtml(order.soCode || order.docCode || '')}</span><br/>
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
              <th style="width: 42%;">Tên hàng hóa, linh kiện</th>
              <th style="width: 10%;">ĐVT</th>
              <th style="width: 8%;">BH</th>
              <th style="width: 8%;">Số lượng</th>
              <th style="width: 13%;">Đơn giá (₫)</th>
              <th style="width: 7%;">% VAT</th>
              <th style="width: 15%;">Thành tiền (₫)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="summary-row">
              <td colspan="4" style="text-align: right;">Cộng số lượng</td>
              <td style="text-align: center;">${totalQty.toLocaleString('vi-VN')}</td>
              <td colspan="2"></td>
              <td style="text-align: right;">${subTotal.toLocaleString('vi-VN')}</td>
            </tr>
            <tr class="summary-row">
              <td colspan="7" style="text-align: right;">Cộng tiền hàng</td>
              <td style="text-align: right;">${subTotal.toLocaleString('vi-VN')}</td>
            </tr>
            ${taxTotal > 0 ? `
            <tr class="summary-row">
              <td colspan="7" style="text-align: right;">Tiền thuế GTGT (VAT)</td>
              <td style="text-align: right;">${taxTotal.toLocaleString('vi-VN')}</td>
            </tr>
            ` : ''}
            <tr class="summary-row" style="background-color: #f1f5f9; font-size: 13px;">
              <td colspan="7" style="text-align: right; font-weight: 700;">Tổng cộng thanh toán (VNĐ)</td>
              <td style="text-align: right; font-weight: 800; color: #0284c7;">${grandTotal.toLocaleString('vi-VN')} ₫</td>
            </tr>
          </tbody>
        </table>

        <div class="words-row">
          <strong>Số tiền viết bằng chữ:</strong> ${escapeHtml(wordsAmount)}
        </div>

        <!-- COMMERCIAL TERMS SECTION (NO WARRANTY CLAUSES AS REQUESTED) -->
        <div class="terms-section">
          <div class="terms-title">ĐIỀU KHOẢN THƯƠNG MẠI & GHI CHÚ:</div>
          <ul class="terms-list">
            <li><strong>Hiệu lực báo giá:</strong> Báo giá có hiệu lực trong vòng 07 ngày kể từ ngày lập.</li>
            <li><strong>Thời gian giao hàng:</strong> Giao hàng tận nơi theo thỏa thuận giữa hai bên.</li>
            <li><strong>Phương thức thanh toán:</strong> Tiền mặt hoặc Chuyển khoản ngân hàng.</li>
            <li><strong>Ghi chú:</strong> Giá trên đã bao gồm các hỗ trợ kỹ thuật và cài đặt theo quy định của Duy Long Computer.</li>
          </ul>
        </div>

        <!-- 3 SIGNATURE COLUMNS -->
        <table class="signatures-table">
          <tr>
            <td style="width: 33%;">
              <div class="sign-role">Đại diện Khách hàng</div>
              <div class="sign-note">(Ký, ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(customerName !== 'Quý Khách hàng' && customerName !== 'Khách lẻ' ? customerName : '')}</div>
            </td>
            <td style="width: 33%;">
              <div class="sign-role">Người lập báo giá</div>
              <div class="sign-note">(Ký, ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(salesperson !== 'Chưa rõ' ? salesperson : '')}</div>
            </td>
            <td style="width: 34%;">
              <div class="sign-role">Đại diện Duy Long Computer</div>
              <div class="sign-note">(Ký, đóng dấu)</div>
              <div class="sign-space"></div>
              <div></div>
            </td>
          </tr>
        </table>
      </div>
    `;
  }).join('<div style="page-break-after: always;"></div>');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>In Báo Giá ${escapeHtml(orders.length === 1 ? (orders[0].soCode || orders[0].docCode || '') : 'Hàng Loạt')}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          body {
            font-family: 'Segoe UI', Arial, Roboto, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.4;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          .header-logo {
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .header-subtitle {
            font-size: 11px;
            color: #64748b;
            font-style: italic;
          }
          .company-info {
            font-size: 11.5px;
            color: #334155;
            line-height: 1.35;
          }
          .title-container {
            text-align: center;
            margin: 16px 0 12px 0;
          }
          .doc-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-subtitle {
            font-size: 12px;
            font-style: italic;
            color: #475569;
            margin-top: 2px;
          }
          .info-grid {
            width: 100%;
            margin-bottom: 14px;
            border-collapse: collapse;
          }
          .info-grid td {
            padding: 3px 0;
            vertical-align: top;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 12px;
          }
          .main-table th {
            border: 1px solid #000;
            padding: 6px 8px;
            font-size: 12px;
            font-weight: 700;
            background-color: #f8fafc;
            text-align: center;
          }
          .main-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            font-size: 12px;
          }
          .summary-row td {
            border: 1px solid #000;
            padding: 5px 8px;
            font-weight: 600;
          }
          .words-row {
            margin-top: 6px;
            font-style: italic;
            font-weight: 600;
            font-size: 12.5px;
          }
          .terms-section {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px dashed #cbd5e1;
            font-size: 11.5px;
            color: #1e293b;
            line-height: 1.45;
          }
          .terms-title {
            font-weight: 700;
            font-size: 12px;
            margin-bottom: 5px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .terms-list {
            margin: 0;
            padding-left: 16px;
          }
          .terms-list li {
            margin-bottom: 3px;
          }
          .signatures-table {
            width: 100%;
            margin-top: 25px;
            border-collapse: collapse;
            text-align: center;
          }
          .signatures-table td {
            vertical-align: top;
            font-size: 12px;
          }
          .sign-role {
            font-weight: 700;
          }
          .sign-note {
            font-size: 10.5px;
            font-style: italic;
            color: #64748b;
          }
          .sign-space {
            height: 65px;
          }
          .watermark-dl {
            position: absolute;
            top: 40%;
            left: 30%;
            font-size: 120px;
            font-weight: 900;
            color: rgba(0,0,0,0.03);
            z-index: -1;
            transform: rotate(-20deg);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
