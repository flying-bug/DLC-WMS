import { numberToVietnameseWords } from './numberToVietnameseWords';

export function printExportSlip(slip, options = {}) {
  const {
    customer = {},
    warehouseName = '',
    productById = new Map(),
    userById = new Map(),
    isImport = false,
  } = options;

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Trình duyệt đã chặn cửa sổ in (popup). Vui lòng cho phép mở popup để in phiếu.');
    return;
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

  const lines = slip?.lines || [];
  const typeTitle = isImport ? 'NHẬP KHO' : 'XUẤT KHO / BÁN HÀNG';
  
  // Format customer / partner info
  const customerName = slip.customerName || customer.name || slip.partnerName || 'Khách lẻ';
  const customerPhone = customer.phone || customer.phoneNumber || slip.customerPhone || slip.partnerPhone || 'Chưa có';
  const customerAddress = customer.address || slip.customerAddress || slip.partnerAddress || 'Chưa có';
  const taxCode = customer.taxCode || customer.taxId || slip.taxCode || '';

  const salesperson = slip.salespersonName || userById.get(slip.salespersonId)?.fullName || userById.get(slip.salespersonId)?.username || 'Chưa rõ';
  const docDateStr = slip.docDate ? new Date(slip.docDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');

  let totalQty = 0;
  let totalAmount = 0;
  let totalVatAmount = 0;

  let rowsHtml = '';
  lines.forEach((line, index) => {
    const product = productById.get(line.variantId);
    const sku = product?.sku || line.sku || '';
    const name = line.variantName || product?.variantName || product?.name || (product?.productName ? `${product.productName} ${product.variantName || ''}` : 'Sản phẩm');
    const unit = line.unitName || product?.unitName || 'Chiếc';
    
    // Warranty period formatting
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
        <td style="text-align: center;">${escapeHtml(unit)}</td>
        <td style="text-align: center;">${escapeHtml(warrantyText)}</td>
        <td style="text-align: center; font-weight: 500;">${qty.toLocaleString('vi-VN')}</td>
        <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : ''}</td>
        <td style="text-align: right; font-weight: 600;">${amount ? amount.toLocaleString('vi-VN') : ''}</td>
      </tr>
    `;
  });

  const grandTotal = totalAmount + totalVatAmount;
  const wordsAmount = numberToVietnameseWords(grandTotal);

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>In Phiếu ${escapeHtml(slip.docCode || 'Xuất Kho')}</title>
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
            font-size: 20px;
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
          .policy-section {
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px dashed #cbd5e1;
            font-size: 11px;
            color: #1e293b;
            line-height: 1.35;
          }
          .policy-title {
            font-weight: 700;
            font-size: 11.5px;
            margin-bottom: 4px;
            text-decoration: underline;
          }
          .policy-list {
            margin: 0;
            padding-left: 14px;
          }
          .policy-list li {
            margin-bottom: 2px;
          }
          .signatures-table {
            width: 100%;
            margin-top: 20px;
            border-collapse: collapse;
            text-align: center;
          }
          .signatures-table td {
            vertical-align: top;
            width: 20%;
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
            height: 60px;
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
          <div class="doc-title">PHIẾU ${typeTitle}</div>
          <div class="doc-subtitle">(Kiêm phiếu bảo hành)</div>
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
              <strong>Số:</strong> <span style="font-weight: 700; font-size: 14px;">${escapeHtml(slip.docCode || '')}</span><br/>
              <strong>Loại tiền:</strong> VND<br/>
              ${warehouseName ? `<strong>Kho:</strong> ${escapeHtml(warehouseName)}` : ''}
            </td>
          </tr>
        </table>

        <!-- PRODUCT TABLE -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 45%;">Tên hàng</th>
              <th style="width: 10%;">Đơn vị tính</th>
              <th style="width: 8%;">BH</th>
              <th style="width: 8%;">Số lượng</th>
              <th style="width: 12%;">Đơn giá</th>
              <th style="width: 12%;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="summary-row">
              <td colspan="4" style="text-align: right;">Cộng</td>
              <td style="text-align: center;">${totalQty.toLocaleString('vi-VN')}</td>
              <td></td>
              <td style="text-align: right;">${totalAmount.toLocaleString('vi-VN')}</td>
            </tr>
            <tr class="summary-row">
              <td colspan="6" style="text-align: right;">Cộng tiền hàng</td>
              <td style="text-align: right;">${totalAmount.toLocaleString('vi-VN')}</td>
            </tr>
            ${totalVatAmount > 0 ? `
            <tr class="summary-row">
              <td colspan="6" style="text-align: right;">Tiền thuế GTGT</td>
              <td style="text-align: right;">${totalVatAmount.toLocaleString('vi-VN')}</td>
            </tr>
            ` : ''}
            <tr class="summary-row" style="background-color: #f1f5f9; font-size: 13px;">
              <td colspan="6" style="text-align: right; font-weight: 700;">Tổng tiền thanh toán</td>
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
              <div class="sign-role">Thủ kho</div>
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
