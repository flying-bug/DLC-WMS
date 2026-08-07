import { formatDateOnly } from './dateFormat';

export function printImportSlip(slipOrSlips, options = {}) {
  const {
    supplierById = new Map(),
    customerById = new Map(),
    assemblyOrderById = new Map(),
    warehouseById = new Map(),
    productById = new Map(),
    userById = new Map(),
    isImport = true,
  } = options;

  const slips = Array.isArray(slipOrSlips) ? slipOrSlips : [slipOrSlips];

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    if (options.onError) {
        options.onError('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để in phiếu.');
    } else {
        console.error('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để in phiếu.');
    }
    return false;
  }

  const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const typeTitle = isImport ? 'NHẬP' : 'XUẤT';
  const partnerTitle = isImport ? 'Nhà cung cấp / Đối tác' : 'Khách hàng';
  const warehouseTitle = isImport ? 'Kho nhập' : 'Kho xuất';

  const sumQuantity = (lines) => lines.reduce((acc, l) => acc + Number(isImport ? l.quantityIn : l.quantityOut || 0), 0);
  const sumSubtotal = (lines) => lines.reduce((acc, l) => {
    const qty = Number(isImport ? l.quantityIn : l.quantityOut || 0);
    const price = Number(l.unitCost || l.unitPrice || 0);
    return acc + (qty * price);
  }, 0);
  const sumVat = (lines) => lines.reduce((acc, l) => {
    const qty = Number(isImport ? l.quantityIn : l.quantityOut || 0);
    const price = Number(l.unitCost || l.unitPrice || 0);
    const vatRate = Number(l.vatPercent ?? l.vatRate ?? 0);
    return acc + (qty * price * (vatRate / 100));
  }, 0);

  const pagesHtml = slips.map((slip) => {
    const lines = slip.lines || [];
    let rowsHtml = '';
    
    lines.forEach((line, index) => {
      const product = productById.get(line.variantId);
      const sku = product?.sku || `SKU #${line.variantId}`;
      const name = line.variantName || product?.variantName || product?.name || (product?.productName ? `${product.productName} ${product.variantName || ''}` : 'Sản phẩm');
      const unit = product?.unitName || '';
      const qty = Number(isImport ? line.quantityIn : line.quantityOut || 0);
      const price = Number(line.unitCost || line.unitPrice || 0);
      const amount = qty * price;
      const vatPercent = Number(line.vatPercent ?? line.vatRate ?? 0);
      const vatAmount = amount * (vatPercent / 100);

      const serialsStr = line.serialNumbers && line.serialNumbers.length > 0
        ? line.serialNumbers.join(', ')
        : '';

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${escapeHtml(sku)}</td>
          <td>${escapeHtml(name)}</td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center; font-weight: bold;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : ''}</td>
          <td style="text-align: right;">${vatPercent ? vatPercent + '%' : ''}</td>
          <td style="text-align: right;">${vatAmount ? vatAmount.toLocaleString('vi-VN') : ''}</td>
          <td style="text-align: right; font-weight: bold;">${(amount + vatAmount) ? (amount + vatAmount).toLocaleString('vi-VN') : ''}</td>
          <td>${escapeHtml(serialsStr)}</td>
        </tr>
      `;
    });

    const slipDate = formatDateOnly(slip.docDate || new Date());
    
    let partnerName = 'Chưa chọn';
    if (!slip.issuePurpose || slip.issuePurpose === 'PURCHASE') {
      partnerName = supplierById.get(slip.partnerId)?.name || 'Chưa chọn';
    } else if (slip.issuePurpose === 'RETURN' || slip.issuePurpose === 'SCRAP') {
      partnerName = customerById.get(slip.partnerId)?.name || 'Chưa chọn';
    } else if (slip.issuePurpose === 'PRODUCTION') {
      partnerName = assemblyOrderById.get(slip.referenceId)?.orderCode || 'Chưa chọn';
    }

    const warehouseName = warehouseById.get(slip.warehouseId)?.name || 'Chưa rõ';
    const salesperson = userById.get(slip.salespersonId)?.fullName || userById.get(slip.salespersonId)?.username || 'Chưa rõ';

    return `
      <div style="position: relative;">
        <table class="header-table">
          <tr>
            <td style="width: 50%;">
              <strong style="font-size: 16px;">DLC COMPUTER</strong><br/>
              <span style="font-size: 12px; color: #666;">Hệ thống quản lý kho WMS</span>
            </td>
            <td style="width: 50%; text-align: right; font-size: 13px;">
              Số phiếu: <strong>${escapeHtml(slip.docCode)}</strong><br/>
              Ngày lập: ${escapeHtml(slipDate)}
            </td>
          </tr>
        </table>

        <div class="title">PHIẾU ${escapeHtml(typeTitle)} KHO</div>
        <div class="subtitle">Liên 1: Lưu trữ - Liên 2: Bàn giao</div>

        <table class="info-table">
          <tr>
            <td style="width: 15%;"><strong>${escapeHtml(partnerTitle)}:</strong></td>
            <td style="width: 50%;">${escapeHtml(partnerName)}</td>
            <td style="width: 15%;"><strong>${escapeHtml(warehouseTitle)}:</strong></td>
            <td style="width: 20%;">${escapeHtml(warehouseName)}</td>
          </tr>
          <tr>
            <td><strong>Người giao/nhận:</strong></td>
            <td>${escapeHtml(slip.recipientName || 'Chưa rõ')}</td>
            <td><strong>Nhân viên:</strong></td>
            <td>${escapeHtml(salesperson)}</td>
          </tr>
          <tr>
            <td><strong>Ghi chú:</strong></td>
            <td colspan="3">${escapeHtml(slip.note || 'Không có')}</td>
          </tr>
        </table>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 12%;">Mã sản phẩm</th>
              <th>Tên sản phẩm</th>
              <th style="width: 8%;">ĐVT</th>
              <th style="width: 10%;">Số lượng</th>
              <th style="width: 10%;">Đơn giá</th>
              <th style="width: 7%;">% VAT</th>
              <th style="width: 10%;">Tiền VAT</th>
              <th style="width: 12%;">Thành tiền</th>
              <th style="width: 14%;">Số Serial</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="4" style="text-align: right; border: 1px solid #ddd; padding: 10px;">Tổng tiền hàng:</td>
              <td style="text-align: center; border: 1px solid #ddd; padding: 10px;">${sumQuantity(slip.lines).toLocaleString('vi-VN')}</td>
              <td style="border: 1px solid #ddd; padding: 10px;"></td>
              <td style="text-align: right; border: 1px solid #ddd; padding: 10px;">${sumSubtotal(slip.lines).toLocaleString('vi-VN')} đ</td>
              <td colspan="3" style="border: 1px solid #ddd; padding: 10px;"></td>
            </tr>
            <tr class="total-row">
              <td colspan="8" style="text-align: right; border: 1px solid #ddd; padding: 10px;">Tiền VAT:</td>
              <td style="text-align: right; border: 1px solid #ddd; padding: 10px;">${sumVat(slip.lines).toLocaleString('vi-VN')} đ</td>
              <td style="border: 1px solid #ddd; padding: 10px;"></td>
            </tr>
            <tr class="total-row">
              <td colspan="8" style="text-align: right; border: 1px solid #ddd; padding: 10px; color: #d32f2f;">Tổng thanh toán:</td>
              <td style="text-align: right; border: 1px solid #ddd; padding: 10px; color: #d32f2f;">${(sumSubtotal(slip.lines) + sumVat(slip.lines)).toLocaleString('vi-VN')} đ</td>
              <td style="border: 1px solid #ddd; padding: 10px;"></td>
            </tr>
          </tbody>
        </table>

        <table class="signatures">
          <tr>
            <td><strong>Người giao hàng</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Người nhận hàng</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Thủ kho</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, đóng dấu)</span></td>
            <td><strong>Người lập phiếu</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
          </tr>
          <tr class="sign-space">
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>${escapeHtml(salesperson)}</td>
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
        <title>In Phiếu ${escapeHtml(slips.length === 1 ? (slips[0].docCode || 'Nhập Kho') : 'Nhập Kho Hàng Loạt')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 14px; }
          .header-table { width: 100%; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { text-align: center; font-size: 13px; font-style: italic; margin-bottom: 30px; }
          .info-table { width: 100%; margin-bottom: 20px; border-collapse: separate; border-spacing: 0 8px; }
          .info-table td { font-size: 14px; }
          .main-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .main-table th { border: 1px solid #ddd; padding: 10px; background-color: #f5f5f5; text-align: left; }
          .main-table td { border: 1px solid #ddd; padding: 10px; }
          .total-row td { font-weight: bold; }
          .signatures { width: 100%; margin-top: 40px; }
          .signatures td { text-align: center; width: 25%; font-size: 14px; padding-top: 10px; }
          .sign-space { height: 80px; }
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
