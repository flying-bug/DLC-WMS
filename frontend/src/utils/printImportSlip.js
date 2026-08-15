import { numberToVietnameseWords } from './numberToVietnameseWords';
import { formatDateOnly } from './dateFormat';

export function printImportSlip(slipOrSlips, options = {}) {
  const {
    supplier = {},
    customer = {},
    warehouseName = '',
    supplierById = new Map(),
    customerById = new Map(),
    assemblyOrderById = new Map(),
    warehouseById = new Map(),
    productById = new Map(),
    userById = new Map(),
    isImport = true,
  } = options;

  const slips = Array.isArray(slipOrSlips) ? slipOrSlips : [slipOrSlips];

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    if (options.onError) {
      options.onError('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để in phiếu.');
    } else {
      console.error('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để in phiếu.');
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

  const getFromLookup = (collection, key) => {
    if (!collection || key === null || key === undefined) return undefined;
    if (collection instanceof Map) {
      return collection.get(key) ?? collection.get(Number(key)) ?? collection.get(String(key));
    }
    if (Array.isArray(collection)) {
      return collection.find(item => String(item?.id) === String(key) || String(item?.variantId) === String(key));
    }
    if (typeof collection === 'object') {
      return collection[key] ?? collection[Number(key)] ?? collection[String(key)];
    }
    return undefined;
  };

  const typeTitle = isImport ? 'NHẬP' : 'XUẤT';
  const partnerTitle = isImport ? 'Nhà cung cấp / Đối tác' : 'Khách hàng';
  const warehouseTitle = isImport ? 'Kho nhập' : 'Kho xuất';

  const pagesHtml = slips.map((slip) => {
    const lines = slip?.lines || [];
    let rowsHtml = '';
    let totalQty = 0;
    let totalAmount = 0;
    let totalVatAmount = 0;

    lines.forEach((line, index) => {
      const product = getFromLookup(productById, line.variantId) || getFromLookup(productById, line.productId);
      const sku = line.sku || line.variantCode || product?.sku || product?.productCode || (line.variantId ? `SKU #${line.variantId}` : '');
      const name = line.variantName || (product?.variantName && product?.variantName !== product?.productName ? `${product.productName} - ${product.variantName}` : (product?.productName || product?.variantName || product?.name || 'Sản phẩm'));
      const unit = line.unitName || line.unit || product?.unitName || 'Chiếc';
      const qty = Number((isImport ? (line.quantityIn ?? line.quantity) : (line.quantityOut ?? line.quantity)) || 0);
      const price = Number(line.unitCost || line.unitPrice || 0);
      const amount = qty * price;
      const vatPercent = Number(line.vatPercent ?? line.vatRate ?? 0);
      const vatAmount = amount * (vatPercent / 100);

      totalQty += qty;
      totalAmount += amount;
      totalVatAmount += vatAmount;

      const serials = line.serialNumbers && line.serialNumbers.length > 0
        ? `<div style="font-size: 11px; color: #475569; margin-top: 3px; word-break: break-all; line-height: 1.35;"><strong>Serial:</strong> ${escapeHtml(line.serialNumbers.join(', '))}</div>`
        : '';

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(name)}</strong>
            ${sku ? `<span style="font-size: 11px; color: #64748b;"> (${escapeHtml(sku)})</span>` : ''}
            ${serials}
            ${line.note ? `<div style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px;">Ghi chú: ${escapeHtml(line.note)}</div>` : ''}
          </td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center; font-weight: bold;">${qty.toLocaleString('vi-VN')}</td>
          <td style="text-align: right;">${price ? price.toLocaleString('vi-VN') : '0'}</td>
          <td style="text-align: center;">${vatPercent ? vatPercent + '%' : '0%'}</td>
          <td style="text-align: right;">${vatAmount ? vatAmount.toLocaleString('vi-VN') : '0'}</td>
          <td style="text-align: right; font-weight: bold;">${(amount + vatAmount) ? (amount + vatAmount).toLocaleString('vi-VN') : '0'}</td>
        </tr>
      `;
    });

    const grandTotal = totalAmount + totalVatAmount;
    const wordsAmount = numberToVietnameseWords(grandTotal);
    const slipDate = formatDateOnly(slip.docDate || slip.createdAt || new Date());

    let partnerName = supplier?.name || customer?.name || options.supplier?.name || options.customer?.name || slip.partnerName || 'Chưa chọn';
    if (!slip.issuePurpose || slip.issuePurpose === 'PURCHASE') {
      const supp = getFromLookup(supplierById, slip.partnerId) || supplier;
      partnerName = supp?.name || slip.partnerName || 'Chưa chọn';
    } else if (slip.issuePurpose === 'RETURN' || slip.issuePurpose === 'SCRAP') {
      const cust = getFromLookup(customerById, slip.partnerId) || customer;
      partnerName = cust?.name || slip.partnerName || 'Chưa chọn';
    } else if (slip.issuePurpose === 'PRODUCTION') {
      const ao = getFromLookup(assemblyOrderById, slip.referenceId);
      partnerName = ao?.orderCode || slip.partnerName || 'Chưa chọn';
    }

    const foundWarehouse = getFromLookup(warehouseById, slip.warehouseId);
    const currentWarehouseName = warehouseName || foundWarehouse?.name || slip.warehouseName || (slip.warehouseId ? `Kho #${slip.warehouseId}` : 'Chưa rõ');
    
    const userObj = getFromLookup(userById, slip.salespersonId) || getFromLookup(userById, slip.createdBy);
    const salesperson = slip.salespersonName || userObj?.fullName || userObj?.username || 'Chưa rõ';

    return `
      <div style="position: relative;">
        <!-- HEADER -->
        <table class="header-table">
          <tr>
            <td style="width: 40%; vertical-align: middle;">
              <strong style="font-size: 18px; letter-spacing: 0.5px;">DLC COMPUTER</strong><br/>
              <span style="font-size: 12px; color: #475569;">Hệ thống quản lý kho WMS</span>
            </td>
            <td style="width: 60%; text-align: right; font-size: 13px; line-height: 1.5;">
              Số phiếu: <strong style="font-size: 15px; color: #0284c7;">${escapeHtml(slip.docCode || '')}</strong><br/>
              Ngày lập: ${escapeHtml(slipDate)}
            </td>
          </tr>
        </table>

        <div class="title-container">
          <div class="doc-title">PHIẾU ${escapeHtml(typeTitle)} KHO</div>
          <div class="doc-subtitle">Liên 1: Lưu trữ - Liên 2: Bàn giao</div>
        </div>

        <table class="info-table">
          <tr>
            <td style="width: 18%;"><strong>${escapeHtml(partnerTitle)}:</strong></td>
            <td style="width: 47%;">${escapeHtml(partnerName)}</td>
            <td style="width: 15%;"><strong>${escapeHtml(warehouseTitle)}:</strong></td>
            <td style="width: 20%;">${escapeHtml(currentWarehouseName)}</td>
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
              <th style="width: 42%;">Tên hàng hóa, sản phẩm</th>
              <th style="width: 8%;">ĐVT</th>
              <th style="width: 9%;">Số lượng</th>
              <th style="width: 11%;">Đơn giá</th>
              <th style="width: 7%;">% VAT</th>
              <th style="width: 8%;">Tiền VAT</th>
              <th style="width: 12%;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; border: 1px solid #cbd5e1; padding: 8px;">Cộng tiền hàng:</td>
              <td style="text-align: center; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${totalQty.toLocaleString('vi-VN')}</td>
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: 8px;"></td>
              <td style="text-align: right; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${totalAmount.toLocaleString('vi-VN')} đ</td>
            </tr>
            ${totalVatAmount > 0 ? `
            <tr class="total-row">
              <td colspan="7" style="text-align: right; border: 1px solid #cbd5e1; padding: 8px;">Tiền thuế VAT:</td>
              <td style="text-align: right; border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${totalVatAmount.toLocaleString('vi-VN')} đ</td>
            </tr>
            ` : ''}
            <tr class="total-row" style="background-color: #f8fafc;">
              <td colspan="7" style="text-align: right; border: 1px solid #cbd5e1; padding: 8px; color: #b91c1c; font-size: 13px;">Tổng thanh toán:</td>
              <td style="text-align: right; border: 1px solid #cbd5e1; padding: 8px; color: #b91c1c; font-size: 14px; font-weight: bold;">${grandTotal.toLocaleString('vi-VN')} đ</td>
            </tr>
          </tbody>
        </table>

        <div class="words-row">
          <strong>Số tiền viết bằng chữ:</strong> ${escapeHtml(wordsAmount)}
        </div>

        <table class="signatures">
          <tr>
            <td><strong>Người giao hàng</strong><br/><span style="font-size: 11px; font-style: italic; color: #64748b;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Người nhận hàng</strong><br/><span style="font-size: 11px; font-style: italic; color: #64748b;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Thủ kho</strong><br/><span style="font-size: 11px; font-style: italic; color: #64748b;">(Ký, đóng dấu)</span></td>
            <td><strong>Người lập phiếu</strong><br/><span style="font-size: 11px; font-style: italic; color: #64748b;">(Ký, ghi rõ họ tên)</span></td>
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
            <td><strong>${escapeHtml(salesperson !== 'Chưa rõ' ? salesperson : '')}</strong></td>
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
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 10px 20px;
            font-size: 13px;
            color: #1e293b;
            line-height: 1.4;
          }
          .header-table {
            width: 100%;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 14px;
          }
          .title-container {
            text-align: center;
            margin-bottom: 16px;
          }
          .doc-title {
            font-size: 22px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .doc-subtitle {
            font-size: 12px;
            font-style: italic;
            color: #64748b;
            margin-top: 2px;
          }
          .info-table {
            width: 100%;
            margin-bottom: 14px;
            border-collapse: separate;
            border-spacing: 0 6px;
          }
          .info-table td {
            font-size: 13px;
            vertical-align: top;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          .main-table th {
            border: 1px solid #94a3b8;
            padding: 7px 6px;
            background-color: #f1f5f9;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }
          .main-table td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            font-size: 12px;
          }
          .total-row td {
            font-weight: 600;
          }
          .words-row {
            margin-top: 6px;
            font-style: italic;
            font-size: 12.5px;
            color: #334155;
          }
          .signatures {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
          }
          .signatures td {
            text-align: center;
            width: 25%;
            font-size: 12.5px;
            vertical-align: top;
          }
          .sign-space {
            height: 60px;
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

