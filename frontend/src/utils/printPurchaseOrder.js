import { numberToVietnameseWords } from './numberToVietnameseWords';
import { formatDateOnly } from './dateFormat';

export function printPurchaseOrder(orderOrOrders, options = {}) {
  const {
    supplier = {},
    warehouseName = '',
    productById = new Map(),
    userById = new Map(),
  } = options;

  const orders = Array.isArray(orderOrOrders) ? orderOrOrders : [orderOrOrders];

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    if (options.onError) {
      options.onError('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in đơn mua hàng.');
    } else {
      console.error('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in đơn mua hàng.');
    }
    return false;
  }

  const escapeHtml = (unsafe) => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const pagesHtml = orders.map((order) => {
    const lines = order?.lines || [];
    const supplierName = order.partnerName || order.supplierName || supplier.name || 'Quý Nhà cung cấp';
    const supplierPhone = supplier.phone || supplier.phoneNumber || order.partnerPhone || order.supplierPhone || 'Chưa có';
    const supplierAddress = supplier.address || order.partnerAddress || order.supplierAddress || 'Chưa có';
    const taxCode = supplier.taxCode || supplier.taxId || order.taxCode || '';

    const creatorName = order.createdByName || userById.get(order.createdBy)?.fullName || userById.get(order.createdBy)?.username || 'Chưa rõ';
    const docDateStr = formatDateOnly(order.poDate || order.docDate || order.createdAt || new Date());
    const expectedDeliveryStr = order.expectedDeliveryDate ? formatDateOnly(order.expectedDeliveryDate) : '';
    const paymentDueDateStr = order.paymentDueDate ? formatDateOnly(order.paymentDueDate) : '';

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

      const qty = Number(line.quantity || 0);
      const price = Number(line.unitPrice || line.costPrice || line.unitCost || 0);
      const amount = line.lineAmount ? Number(line.lineAmount) : (qty * price);
      const vatPercent = Number(line.vatRate ?? line.vatPercent ?? 0);
      const vatAmount = line.vatAmount ? Number(line.vatAmount) : (amount * (vatPercent / 100));

      totalQty += qty;
      totalAmount += amount;
      totalVatAmount += vatAmount;

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(name)}</strong>
            ${sku ? `<span style="font-size: 11px; color: #64748b;"> (${escapeHtml(sku)})</span>` : ''}
            ${line.note ? `<div style="font-size: 11px; color: #64748b; font-style: italic;">Ghi chú: ${escapeHtml(line.note)}</div>` : ''}
          </td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center; font-weight: 500;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : '0'}</td>
          <td style="text-align: center;">${vatPercent}</td>
          <td style="text-align: right; font-weight: 600;">${(amount + vatAmount) ? (amount + vatAmount).toLocaleString('vi-VN') : '0'}</td>
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
          <div class="doc-title">ĐƠN ĐẶT HÀNG MUA</div>
          <div class="doc-subtitle">(Kính gửi: Quý Nhà cung cấp)</div>
        </div>

        <!-- INFO GRID -->
        <table class="info-grid">
          <tr>
            <td style="width: 58%;">
              <strong>Nhà cung cấp / Đơn vị:</strong> ${escapeHtml(supplierName)}<br/>
              <strong>Số điện thoại:</strong> ${escapeHtml(supplierPhone)}<br/>
              <strong>Địa chỉ:</strong> ${escapeHtml(supplierAddress)}<br/>
              ${taxCode ? `<strong>Mã số thuế:</strong> ${escapeHtml(taxCode)}<br/>` : ''}
            </td>
            <td style="width: 42%; text-align: right;">
              <strong>Ngày đặt hàng:</strong> ${escapeHtml(docDateStr)}<br/>
              <strong>Số đơn mua:</strong> <span style="font-weight: 700; font-size: 14px; color: #0284c7;">${escapeHtml(order.poCode || order.docCode || '')}</span><br/>
              <strong>Loại tiền:</strong> VND<br/>
              ${currentWarehouseName ? `<strong>Kho nhận hàng:</strong> ${escapeHtml(currentWarehouseName)}<br/>` : ''}
              ${expectedDeliveryStr ? `<strong>Ngày giao dự kiến:</strong> ${escapeHtml(expectedDeliveryStr)}<br/>` : ''}
              ${paymentDueDateStr ? `<strong>Hạn thanh toán:</strong> ${escapeHtml(paymentDueDateStr)}` : ''}
            </td>
          </tr>
        </table>

        <!-- PRODUCT TABLE -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 45%;">Tên hàng hóa, linh kiện</th>
              <th style="width: 10%;">ĐVT</th>
              <th style="width: 10%;">Số lượng</th>
              <th style="width: 15%;">Đơn giá (₫)</th>
              <th style="width: 7%;">% VAT</th>
              <th style="width: 18%;">Thành tiền (₫)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="summary-row">
              <td colspan="3" style="text-align: right;">Cộng số lượng</td>
              <td style="text-align: center;">${totalQty.toLocaleString('vi-VN')}</td>
              <td colspan="2"></td>
              <td style="text-align: right;">${subTotal.toLocaleString('vi-VN')}</td>
            </tr>
            <tr class="summary-row">
              <td colspan="6" style="text-align: right;">Cộng tiền hàng</td>
              <td style="text-align: right;">${subTotal.toLocaleString('vi-VN')}</td>
            </tr>
            ${taxTotal > 0 ? `
            <tr class="summary-row">
              <td colspan="6" style="text-align: right;">Tiền thuế GTGT (VAT)</td>
              <td style="text-align: right;">${taxTotal.toLocaleString('vi-VN')}</td>
            </tr>
            ` : ''}
            <tr class="summary-row" style="background-color: #f1f5f9; font-size: 13px;">
              <td colspan="6" style="text-align: right; font-weight: 700;">Tổng cộng thanh toán (VNĐ)</td>
              <td style="text-align: right; font-weight: 800; color: #0284c7;">${grandTotal.toLocaleString('vi-VN')} ₫</td>
            </tr>
          </tbody>
        </table>

        <div class="words-row">
          <strong>Số tiền viết bằng chữ:</strong> ${escapeHtml(wordsAmount)}
        </div>

        <!-- COMMERCIAL TERMS SECTION -->
        <div class="terms-section">
          <div class="terms-title">ĐIỀU KHOẢN GIAO HÀNG & GHI CHÚ:</div>
          <ul class="terms-list">
            <li><strong>Chất lượng hàng hóa:</strong> Hàng mới 100%, nguyên đai nguyên kiện, đúng tiêu chuẩn chất lượng của nhà sản xuất.</li>
            <li><strong>Chứng từ kèm theo:</strong> Nhà cung cấp giao kèm đầy đủ Phiếu xuất kho, Hóa đơn GTGT và biên bản giao nhận.</li>
            <li><strong>Phương thức thanh toán:</strong> Thanh toán chuyển khoản hoặc tiền mặt theo đúng hạn công nợ đã thỏa thuận.</li>
            ${order.note ? `<li><strong>Ghi chú:</strong> <em>${escapeHtml(order.note)}</em></li>` : ''}
          </ul>
        </div>

        <!-- 3 SIGNATURE COLUMNS -->
        <table class="signatures-table">
          <tr>
            <td style="width: 33%;">
              <div class="sign-role">Đại diện Nhà cung cấp</div>
              <div class="sign-note">(Ký, ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(supplierName !== 'Quý Nhà cung cấp' ? supplierName : '')}</div>
            </td>
            <td style="width: 33%;">
              <div class="sign-role">Người lập đơn</div>
              <div class="sign-note">(Ký, ghi rõ họ tên)</div>
              <div class="sign-space"></div>
              <div>${escapeHtml(creatorName !== 'Chưa rõ' ? creatorName : '')}</div>
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
        <title>In Don Mua Hang ${escapeHtml(orders.length === 1 ? (orders[0].poCode || orders[0].docCode || '') : 'Hang Loat')}</title>
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
