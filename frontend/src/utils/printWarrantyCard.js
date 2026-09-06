import { formatDateOnly } from './dateFormat';

export function printWarrantyCard(warrantyOrWarranties, options = {}) {
  const warranties = Array.isArray(warrantyOrWarranties) ? warrantyOrWarranties : [warrantyOrWarranties];

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

  const pagesHtml = warranties.map((w) => {
    const customerName = w.partnerName || w.customerName || w.partner?.name || 'Khách lẻ';
    const customerPhone = w.partnerPhone || w.customerPhone || w.partner?.phone || 'Chưa có';
    const customerAddress = w.partnerAddress || w.partner?.address || 'Chưa có';
    const startDate = formatDateOnly(w.startDate || w.createdAt || new Date());
    const endDate = formatDateOnly(w.endDate || w.expiryDate || new Date());

    const lines = w.lines || w.items || [];
    let rowsHtml = '';

    lines.forEach((line, index) => {
      const name = line.variantName || line.productName || 'Sản phẩm';
      const sku = line.sku || line.variantCode || '-';
      const serial = line.serialNumber || line.serial || '-';
      const months = line.warrantyMonths != null ? `${line.warrantyMonths} tháng` : '---';
      const note = line.note || '';

      rowsHtml += `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td>
            <strong>${escapeHtml(name)}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">Mã SKU: ${escapeHtml(sku)}</span>
          </td>
          <td style="text-align: center; font-weight: bold; color: #0f172a;">${escapeHtml(serial)}</td>
          <td style="text-align: center; font-weight: bold;">${escapeHtml(months)}</td>
          <td>${escapeHtml(note)}</td>
        </tr>
      `;
    });

    if (lines.length === 0 && (w.productName || w.serialNumber)) {
      rowsHtml = `
        <tr>
          <td style="text-align: center;">1</td>
          <td>
            <strong>${escapeHtml(w.productName || 'Sản phẩm')}</strong><br/>
            <span style="font-size: 11px; color: #64748b;">Mã SKU: ${escapeHtml(w.sku || '-')}</span>
          </td>
          <td style="text-align: center; font-weight: bold; color: #0f172a;">${escapeHtml(w.serialNumber || '-')}</td>
          <td style="text-align: center; font-weight: bold;">${w.warrantyMonths ? `${w.warrantyMonths} tháng` : '---'}</td>
          <td>${escapeHtml(w.note || '')}</td>
        </tr>
      `;
    }

    return `
      <div style="position: relative;">
        <table class="header-table">
          <tr>
            <td style="width: 50%;">
              <strong style="font-size: 18px; color: #1e3a8a;">DLC COMPUTER</strong><br/>
              <span style="font-size: 12px; color: #475569;">Địa chỉ: Số 59 Thịnh Liệt - Hoàng Mai - Hà Nội</span><br/>
              <span style="font-size: 12px; color: #475569;">Hotline: 0392718888 - Website: duylongcomputer.com</span>
            </td>
            <td style="width: 50%; text-align: right; font-size: 13px;">
              Mã bảo hành: <strong style="font-size: 15px; color: #2563eb;">${escapeHtml(w.warrantyCode || `WRT#${w.id}`)}</strong><br/>
              Ngày bắt đầu: <strong>${escapeHtml(startDate)}</strong><br/>
              Hạn bảo hành: <strong style="color: #dc2626;">${escapeHtml(endDate)}</strong>
            </td>
          </tr>
        </table>

        <div class="title">PHIẾU BẢO HÀNH SẢN PHẨM</div>
        <div class="subtitle">(Vui lòng xuất trình phiếu này khi yêu cầu dịch vụ bảo hành)</div>

        <div class="info-box">
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="width: 15%;"><strong>Khách hàng:</strong></td>
              <td style="width: 45%;"><strong>${escapeHtml(customerName)}</strong></td>
              <td style="width: 15%;"><strong>Điện thoại:</strong></td>
              <td style="width: 25%;">${escapeHtml(customerPhone)}</td>
            </tr>
            <tr>
              <td><strong>Địa chỉ:</strong></td>
              <td colspan="3">${escapeHtml(customerAddress)}</td>
            </tr>
          </table>
        </div>

        <h4 style="margin: 16px 0 8px 0; font-size: 14px; text-transform: uppercase; color: #1e293b;">Danh sách sản phẩm được bảo hành:</h4>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 6%;">STT</th>
              <th>Tên sản phẩm / Thiết bị</th>
              <th style="width: 25%;">Số Serial / IMEI</th>
              <th style="width: 15%;">Thời hạn BH</th>
              <th style="width: 20%;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Không có danh sách sản phẩm</td></tr>'}
          </tbody>
        </table>

        <div class="terms-box">
          <strong style="font-size: 12px; text-transform: uppercase; color: #334155;">Điều kiện & Điều khoản bảo hành:</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 18px; font-size: 11px; color: #475569; line-height: 1.5;">
            <li>Sản phẩm phải còn tem bảo hành nguyên vẹn, số Serial/IMEI trùng khớp với thông tin trên hệ thống.</li>
            <li>Không bảo hành đối với các trường hợp rơi vỡ, nứt chập cháy, ngấm nước, thiên tai hoặc hỏng hóc do tác động vật lý ngoại lực.</li>
            <li>Thời gian tiếp nhận bảo hành: Từ 8h00 đến 17h30 các ngày trong tuần (trừ Lễ, Tết).</li>
          </ul>
        </div>

        <table class="signatures">
          <tr>
            <td><strong>Khách hàng</strong><br/><span style="font-size: 11px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Nhân viên kỹ thuật</strong><br/><span style="font-size: 11px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Đại diện trung tâm bảo hành</strong><br/><span style="font-size: 11px; font-style: italic;">(Ký, đóng dấu)</span></td>
          </tr>
          <tr class="sign-space">
            <td></td>
            <td></td>
            <td></td>
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
        <title>In Phieu Bao Hanh ${escapeHtml(warranties.length === 1 ? (warranties[0].warrantyCode || '') : '')}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; color: #0f172a; }
          .header-table { width: 100%; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .title { text-align: center; font-size: 22px; font-weight: bold; margin-bottom: 4px; color: #1e3a8a; letter-spacing: 0.5px; }
          .subtitle { text-align: center; font-size: 12px; font-style: italic; margin-bottom: 18px; color: #64748b; }
          .info-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; }
          .main-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          .main-table th { border: 1px solid #cbd5e1; padding: 8px 10px; background-color: #f1f5f9; text-align: left; font-size: 12px; }
          .main-table td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; }
          .terms-box { background: #fffbe6; border: 1px solid #ffe58f; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; }
          .signatures { width: 100%; margin-top: 30px; }
          .signatures td { text-align: center; width: 33%; font-size: 13px; padding-top: 8px; }
          .sign-space { height: 65px; }
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
