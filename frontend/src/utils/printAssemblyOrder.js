import { formatDateOnly } from './dateFormat';

export function printAssemblyOrder(orderOrOrders, options = {}) {
  const {
    productById = new Map(),
    userById = new Map(),
    warehouseById = new Map(),
  } = options;

  const orders = Array.isArray(orderOrOrders) ? orderOrOrders : [orderOrOrders];

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

  const pagesHtml = orders.map((order) => {
    const isAssembly = order.orderType !== 'DISASSEMBLY';
    const typeTitle = isAssembly ? 'PHIẾU LẮP RÁP HÀNG HÓA' : 'PHIẾU THÁO DỠ HÀNG HÓA';
    const targetProduct = productById.get(String(order.targetVariantId)) || {};
    const targetName = order.targetVariantName || order.targetProductName || targetProduct.variantName || targetProduct.productName || 'Thành phẩm';
    const targetSku = order.targetSku || targetProduct.sku || `SKU #${order.targetVariantId || ''}`;
    const warehouseName = options.warehouseName || warehouseById.get(String(order.warehouseId))?.name || order.warehouseName || 'Chưa chọn kho';
    const creatorName = order.createdByName || userById.get(String(order.createdBy))?.fullName || 'Chưa rõ';
    const orderDate = formatDateOnly(order.createdAt || order.docDate || new Date());

    const lines = order.lines || order.components || [];
    let rowsHtml = '';

    lines.forEach((line, index) => {
      const compProduct = productById.get(String(line.componentVariantId || line.variantId)) || {};
      const sku = line.sku || compProduct.sku || `SKU #${line.componentVariantId || line.variantId || index + 1}`;
      const name = line.componentVariantName || line.variantName || compProduct.variantName || compProduct.productName || 'Linh kiện';
      const unit = line.unitName || compProduct.unitName || '';
      const qty = Number(line.quantity || line.quantityNeeded || 0);
      const note = line.note || '';

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${escapeHtml(sku)}</td>
          <td>${escapeHtml(name)}</td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: center; font-weight: bold;">${qty.toLocaleString('vi-VN')}</td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `;
    });

    return `
      <div style="position: relative;">
        <table class="header-table">
          <tr>
            <td style="width: 50%;">
              <strong style="font-size: 16px;">DLC COMPUTER</strong><br/>
              <span style="font-size: 12px; color: #666;">Hệ thống quản lý kho WMS</span>
            </td>
            <td style="width: 50%; text-align: right; font-size: 13px;">
              Mã lệnh: <strong>${escapeHtml(order.orderCode)}</strong><br/>
              Ngày lập: ${escapeHtml(orderDate)}
            </td>
          </tr>
        </table>

        <div class="title">${escapeHtml(typeTitle)}</div>
        <div class="subtitle">Mã chứng từ: ${escapeHtml(order.orderCode)}</div>

        <div class="target-box">
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="width: 20%;"><strong>Thành phẩm:</strong></td>
              <td style="width: 50%;"><strong>${escapeHtml(targetName)}</strong> (SKU: ${escapeHtml(targetSku)})</td>
              <td style="width: 15%;"><strong>Số lượng:</strong></td>
              <td style="width: 15%; font-size: 16px; font-weight: bold; color: #1d4ed8;">${Number(order.quantity || 1).toLocaleString('vi-VN')}</td>
            </tr>
            <tr>
              <td><strong>Kho thao tác:</strong></td>
              <td>${escapeHtml(warehouseName)}</td>
              <td><strong>Người lập:</strong></td>
              <td>${escapeHtml(creatorName)}</td>
            </tr>
            ${order.note ? `<tr><td><strong>Ghi chú:</strong></td><td colspan="3">${escapeHtml(order.note)}</td></tr>` : ''}
          </table>
        </div>

        <h4 style="margin: 15px 0 10px 0; font-size: 14px; text-transform: uppercase;">Danh sách linh kiện ${isAssembly ? 'sử dụng' : 'thu hồi'}:</h4>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 6%;">STT</th>
              <th style="width: 18%;">Mã linh kiện</th>
              <th>Tên linh kiện / vật tư</th>
              <th style="width: 10%;">ĐVT</th>
              <th style="width: 12%;">Số lượng</th>
              <th style="width: 20%;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align: center; color: #999;">Không có chi tiết linh kiện</td></tr>'}
          </tbody>
        </table>

        <table class="signatures">
          <tr>
            <td><strong>Kỹ thuật viên thực hiện</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Thủ kho vật tư</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Quản lý sản xuất</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, đóng dấu)</span></td>
          </tr>
          <tr class="sign-space">
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td>${escapeHtml(creatorName)}</td>
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
        <title>In Lệnh Lắp Ráp ${escapeHtml(orders.length === 1 ? (orders[0].orderCode || '') : '')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 14px; color: #1e293b; }
          .header-table { width: 100%; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .title { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 5px; color: #0f172a; }
          .subtitle { text-align: center; font-size: 13px; font-style: italic; margin-bottom: 20px; color: #64748b; }
          .target-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 6px; margin-bottom: 15px; }
          .main-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .main-table th { border: 1px solid #cbd5e1; padding: 8px 10px; background-color: #f1f5f9; text-align: left; font-size: 13px; }
          .main-table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 13px; }
          .signatures { width: 100%; margin-top: 40px; }
          .signatures td { text-align: center; width: 33%; font-size: 14px; padding-top: 10px; }
          .sign-space { height: 70px; }
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
