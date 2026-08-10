import { formatDateOnly } from './dateFormat';

export function printAssemblyOrder(order, options = {}) {
  const {
    warehouseName = 'Chưa rõ',
    productById = new Map(),
    variantById = new Map(),
  } = options;

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

  const isAssembly = order.orderType === 'ASSEMBLY';
  const typeTitle = isAssembly ? 'LỆNH LẮP RÁP' : 'LỆNH THÁO DỠ';
  const docDate = formatDateOnly(order.executionDate || new Date());
  
  const targetSkuInfo = variantById.get(String(order.targetSku || order.targetVariantId));
  const targetProductName = targetSkuInfo ? 
    (targetSkuInfo.variantName && targetSkuInfo.variantName !== targetSkuInfo.productName 
      ? `${targetSkuInfo.productName} - ${targetSkuInfo.variantName}`
      : targetSkuInfo.productName) 
    : 'Sản phẩm chưa rõ';
    
  let rowsHtml = '';
  
  if (order.lines && order.lines.length > 0) {
    order.lines.forEach((line, index) => {
      const variant = variantById.get(String(line.componentVariantId));
      const sku = variant?.sku || variant?.code || '';
      const name = variant ? 
        (variant.variantName && variant.variantName !== variant.productName 
          ? `${variant.productName} - ${variant.variantName}`
          : variant.productName) 
        : 'Linh kiện chưa rõ';
      const unit = variant?.unitName || '';
      const qty = Number(line.quantityRequired || line.quantity || 0);

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${escapeHtml(sku)}</td>
          <td>${escapeHtml(name)}</td>
          <td style="text-align: center;">${escapeHtml(unit)}</td>
          <td style="text-align: right; font-weight: bold;">${qty.toLocaleString('vi-VN')}</td>
          <td>${escapeHtml(line.note || '')}</td>
        </tr>
      `;
    });
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>In ${typeTitle}</title>
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
          .signatures { width: 100%; margin-top: 40px; }
          .signatures td { text-align: center; width: 33.33%; font-size: 14px; padding-top: 10px; }
          .sign-space { height: 80px; }
        </style>
      </head>
      <body>
        <div style="position: relative;">
          <table class="header-table">
            <tr>
              <td style="width: 50%;">
                <strong style="font-size: 16px;">DLC COMPUTER</strong><br/>
                <span style="font-size: 12px; color: #666;">Hệ thống quản lý kho WMS</span>
              </td>
              <td style="width: 50%; text-align: right; font-size: 13px;">
                Số lệnh: <strong>${escapeHtml(order.orderCode)}</strong><br/>
                Ngày lập: ${escapeHtml(docDate)}
              </td>
            </tr>
          </table>

          <div class="title">${escapeHtml(typeTitle)}</div>
          <div class="subtitle">Liên 1: Lưu trữ - Liên 2: Bàn giao xưởng</div>

          <table class="info-table">
            <tr>
              <td style="width: 20%;"><strong>Thành phẩm:</strong></td>
              <td style="width: 80%; font-weight: bold; font-size: 15px;">${escapeHtml(targetProductName)}</td>
            </tr>
            <tr>
              <td><strong>Số lượng ${isAssembly ? 'lắp ráp' : 'tháo dỡ'}:</strong></td>
              <td style="font-weight: bold;">${Number(order.quantity || 1).toLocaleString('vi-VN')}</td>
            </tr>
            <tr>
              <td><strong>Kho thao tác:</strong></td>
              <td>${escapeHtml(warehouseName)}</td>
            </tr>
            <tr>
              <td><strong>Ghi chú lệnh:</strong></td>
              <td>${escapeHtml(order.note || 'Không có')}</td>
            </tr>
          </table>

          <div style="font-weight: bold; margin-bottom: 10px; margin-top: 20px;">Danh sách linh kiện xuất nhập theo lệnh:</div>
          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 5%;">STT</th>
                <th style="width: 15%;">Mã linh kiện</th>
                <th>Tên linh kiện</th>
                <th style="width: 10%;">ĐVT</th>
                <th style="width: 15%;">Số lượng</th>
                <th style="width: 20%;">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="text-align:center;">Chưa có linh kiện</td></tr>'}
            </tbody>
          </table>

          <table class="signatures">
            <tr>
              <td><strong>Quản đốc / Người lập lệnh</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
              <td><strong>Thủ kho</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
              <td><strong>Nhân viên kỹ thuật</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            </tr>
            <tr class="sign-space">
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </table>
        </div>
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
