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
    const supplierCode = order.partnerCode || order.supplierCode || supplier.code || '';
    const supplierPhone = order.partnerPhone || order.supplierPhone || supplier.phone || supplier.phoneNumber || 'Chưa có';
    const supplierAddress = order.partnerAddress || order.supplierAddress || supplier.address || 'Chưa có';
    const taxCode = supplier.taxCode || supplier.taxId || order.taxCode || '';

    const creatorName = order.createdByName || userById.get(order.createdBy)?.fullName || userById.get(order.createdBy)?.username || 'Chưa rõ';
    const docDateStr = formatDateOnly(order.poDate || order.docDate || order.createdAt || new Date());
    const expectedDeliveryStr = order.expectedDeliveryDate ? formatDateOnly(order.expectedDeliveryDate) : '';
    const paymentDueDateStr = order.paymentDueDate ? formatDateOnly(order.paymentDueDate) : '';

    const currentWarehouseName = warehouseName || order.warehouseName || (order.warehouseId ? (`Kho #${order.warehouseId}`) : 'Kho Tổng Duy Long');

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
            ${sku ? `<span style="font-size: 11px; color: #64748b;"> (SKU: ${escapeHtml(sku)})</span>` : ''}
            ${line.note ? `<div style="font-size: 11px; color: #64748b; font-style: italic;">Ghi chú: ${escapeHtml(line.note)}</div>` : ''}
          </td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center; font-weight: 500;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : '0'}</td>
          <td style="text-align: center;">${vatPercent}</td>
          <td style="text-align: right;">${vatAmount ? vatAmount.toLocaleString('vi-VN') : '0'}</td>
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
            <td style="width: 60%; vertical-align: top;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <div class="brand-logo-badge">DL</div>
                <div>
                  <div class="brand-name">DUY LONG COMPUTER</div>
                  <div class="brand-sub">Máy tính &amp; Linh kiện chính hãng</div>
                </div>
              </div>
              <div class="company-detail">
                <strong>Địa chỉ:</strong> Số 59 Thịnh Liệt, P. Thịnh Liệt, Q. Hoàng Mai, Hà Nội<br>
                <strong>Hotline:</strong> 0392.718.888 / 098.888.8888 | <strong>Email:</strong> duylongcomputer@gmail.com<br>
                <strong>Mã số thuế:</strong> 0103711414 | <strong>Website:</strong> duylongcomputer.vn
              </div>
            </td>
            <td style="width: 40%; vertical-align: top; text-align: right;">
              <div class="doc-meta-box">
                <div class="doc-meta-row"><strong>Mã đơn mua:</strong> <span class="doc-code">${escapeHtml(order.poCode || 'PO')}</span></div>
                <div class="doc-meta-row"><strong>Ngày đặt hàng:</strong> ${docDateStr}</div>
                <div class="doc-meta-row"><strong>Kho nhận hàng:</strong> ${escapeHtml(currentWarehouseName)}</div>
                <div class="doc-meta-row"><strong>Người lập đơn:</strong> ${escapeHtml(creatorName)}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- TITLE -->
        <div class="doc-title-container">
          <div class="doc-title">ĐƠN ĐẶT HÀNG MUA</div>
          <div class="doc-subtitle">(Kính gửi: Quý Nhà cung cấp)</div>
        </div>

        <!-- SUPPLIER INFO BOX -->
        <div class="customer-info-grid">
          <div class="info-cell">
            <span class="info-label">Nhà cung cấp:</span>
            <span class="info-value"><strong>${escapeHtml(supplierName)}</strong></span>
          </div>
          <div class="info-cell">
            <span class="info-label">Mã NCC:</span>
            <span class="info-value">${escapeHtml(supplierCode || '—')}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Điện thoại:</span>
            <span class="info-value">${escapeHtml(supplierPhone)}</span>
          </div>
          <div class="info-cell">
            <span class="info-label">Mã số thuế:</span>
            <span class="info-value">${escapeHtml(taxCode || '—')}</span>
          </div>
          <div class="info-cell" style="grid-column: span 2;">
            <span class="info-label">Địa chỉ:</span>
            <span class="info-value">${escapeHtml(supplierAddress)}</span>
          </div>
          ${expectedDeliveryStr ? `
            <div class="info-cell">
              <span class="info-label">Ngày giao dự kiến:</span>
              <span class="info-value"><strong>${expectedDeliveryStr}</strong></span>
            </div>
          ` : ''}
          ${paymentDueDateStr ? `
            <div class="info-cell">
              <span class="info-label">Hạn thanh toán:</span>
              <span class="info-value"><strong>${paymentDueDateStr}</strong></span>
            </div>
          ` : ''}
        </div>

        <!-- ITEMS TABLE -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th>Tên hàng hóa, quy cách</th>
              <th style="width: 50px;">ĐVT</th>
              <th style="width: 60px;">SL</th>
              <th style="width: 95px;">Đơn giá</th>
              <th style="width: 45px;">% VAT</th>
              <th style="width: 80px;">Tiền VAT</th>
              <th style="width: 105px;">Thành tiền (đ)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 16px;">Không có mặt hàng nào</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" style="text-align: right; font-weight: 600;">Cộng tiền hàng:</td>
              <td style="text-align: center; font-weight: 700;">${totalQty.toLocaleString('vi-VN')}</td>
              <td></td>
              <td></td>
              <td style="text-align: right; font-weight: 600;">${taxTotal ? taxTotal.toLocaleString('vi-VN') : '0'}</td>
              <td style="text-align: right; font-weight: 700; color: #0284c7;">${subTotal.toLocaleString('vi-VN')}</td>
            </tr>
            <tr class="total-row" style="background-color: #f0fdf4;">
              <td colspan="7" style="text-align: right; font-weight: 700; font-size: 13px; text-transform: uppercase;">
                Tổng giá trị đơn hàng (Đã gồm VAT):
              </td>
              <td style="text-align: right; font-weight: 800; font-size: 14px; color: #16a34a;">
                ${grandTotal.toLocaleString('vi-VN')} đ
              </td>
            </tr>
          </tfoot>
        </table>

        <!-- WORDS AMOUNT -->
        <div class="words-amount-box">
          <strong>Số tiền viết bằng chữ:</strong> <em>${wordsAmount}.</em>
        </div>

        <!-- TERMS SECTION -->
        <div class="terms-section">
          <div class="terms-title">ĐIỀU KHOẢN GIAO HÀNG &amp; THANH TOÁN:</div>
          <ol class="terms-list">
            <li><strong>Chất lượng hàng hóa:</strong> Hàng mới 100%, nguyên đai nguyên kiện, đúng thông số kỹ thuật và tiêu chuẩn chất lượng của hãng sản xuất, có đầy đủ tem nhãn và CO/CQ (nếu có).</li>
            <li><strong>Giao nhận &amp; Hóa đơn:</strong> Nhà cung cấp giao hàng đúng địa chỉ kho nhận và cung cấp đầy đủ Hóa đơn GTGT điện tử, Phiếu xuất kho khi giao hàng.</li>
            <li><strong>Thanh toán:</strong> Duy Long Computer thực hiện thanh toán chuyển khoản theo đúng thời hạn công nợ đã thỏa thuận trong hợp đồng/đơn đặt hàng.</li>
            ${order.note ? `<li><strong>Ghi chú đơn hàng:</strong> <em>${escapeHtml(order.note)}</em></li>` : ''}
          </ol>
        </div>

        <!-- SIGNATURES -->
        <table class="signatures-table">
          <tr>
            <td style="width: 33.33%;">
              <div class="sig-title">ĐẠI DIỆN NHÀ CUNG CẤP</div>
              <div class="sig-sub">(Ký, ghi rõ họ tên &amp; đóng dấu)</div>
              <div class="sig-space"></div>
              <div class="sig-name">...................................................</div>
            </td>
            <td style="width: 33.33%;">
              <div class="sig-title">NGƯỜI LẬP ĐƠN</div>
              <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
              <div class="sig-space"></div>
              <div class="sig-name">${escapeHtml(creatorName)}</div>
            </td>
            <td style="width: 33.33%;">
              <div class="sig-title">ĐẠI DIỆN DUY LONG COMPUTER</div>
              <div class="sig-sub">(Ký, đóng dấu)</div>
              <div class="sig-space"></div>
              <div class="sig-name">Ban Giám Đốc</div>
            </td>
          </tr>
        </table>

        <!-- FOOTER -->
        <div class="doc-footer">
          <div>Đơn mua hàng được khởi tạo từ Hệ thống quản trị kho DLC-WMS — DUY LONG COMPUTER</div>
          <div>Ngày in: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</div>
        </div>
      </div>
    `;
  }).join('<div class="page-break"></div>');

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Don_Mua_Hang_${orders[0]?.poCode || 'PO'}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 15mm 15mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Segoe UI', Arial, Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #1e293b;
          background-color: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page-break {
          page-break-after: always;
        }

        .watermark-dl {
          position: absolute;
          top: 35%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 160px;
          font-weight: 900;
          color: rgba(2, 132, 199, 0.04);
          pointer-events: none;
          z-index: 0;
          user-select: none;
          letter-spacing: 15px;
        }

        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          border-bottom: 2px solid #0284c7;
          padding-bottom: 10px;
        }

        .brand-logo-badge {
          background: linear-gradient(135deg, #0284c7, #0369a1);
          color: #ffffff;
          font-weight: 900;
          font-size: 18px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          letter-spacing: 1px;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: 0.5px;
        }

        .brand-sub {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
        }

        .company-detail {
          font-size: 11px;
          color: #475569;
          line-height: 1.45;
          margin-top: 4px;
        }

        .doc-meta-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 11.5px;
          display: inline-block;
          text-align: left;
        }

        .doc-meta-row {
          margin-bottom: 3px;
        }

        .doc-meta-row:last-child {
          margin-bottom: 0;
        }

        .doc-code {
          color: #0284c7;
          font-weight: 700;
          font-size: 13px;
        }

        .doc-title-container {
          text-align: center;
          margin: 12px 0 14px 0;
        }

        .doc-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .doc-subtitle {
          font-size: 12px;
          font-style: italic;
          color: #64748b;
          margin-top: 2px;
        }

        .customer-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 16px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 14px;
          font-size: 11.5px;
        }

        .info-cell {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }

        .info-label {
          color: #64748b;
          min-width: 95px;
          font-weight: 500;
        }

        .info-value {
          color: #1e293b;
          flex: 1;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 11.5px;
        }

        .items-table th {
          background-color: #0284c7;
          color: #ffffff;
          font-weight: 600;
          padding: 6px 8px;
          border: 1px solid #0284c7;
          text-align: center;
          font-size: 11px;
          text-transform: uppercase;
        }

        .items-table td {
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          vertical-align: middle;
        }

        .items-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .total-row td {
          border: 1px solid #cbd5e1;
          padding: 6px 8px;
        }

        .words-amount-box {
          background-color: #eff6ff;
          border-left: 3px solid #0284c7;
          padding: 8px 12px;
          margin-bottom: 12px;
          font-size: 11.5px;
          color: #1e3a8a;
        }

        .terms-section {
          border: 1px solid #e2e8f0;
          background-color: #fafafa;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 16px;
          font-size: 10.5px;
          color: #475569;
        }

        .terms-title {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-size: 11px;
        }

        .terms-list {
          padding-left: 16px;
          margin: 0;
          line-height: 1.45;
        }

        .terms-list li {
          margin-bottom: 2px;
        }

        .signatures-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          margin-bottom: 16px;
          text-align: center;
        }

        .signatures-table td {
          border: none;
          vertical-align: top;
          padding: 0 8px;
        }

        .sig-title {
          font-weight: 700;
          font-size: 11.5px;
          color: #0f172a;
          text-transform: uppercase;
        }

        .sig-sub {
          font-size: 10px;
          font-style: italic;
          color: #64748b;
          margin-top: 2px;
        }

        .sig-space {
          height: 60px;
        }

        .sig-name {
          font-weight: 600;
          font-size: 11.5px;
          color: #1e293b;
        }

        .doc-footer {
          border-top: 1px dashed #cbd5e1;
          padding-top: 6px;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #94a3b8;
          font-style: italic;
        }

        @media print {
          body {
            background-color: transparent;
          }
          .page-break {
            page-break-after: always;
          }
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
  printWindow.document.write(fullHtml);
  printWindow.document.close();
  return true;
}
