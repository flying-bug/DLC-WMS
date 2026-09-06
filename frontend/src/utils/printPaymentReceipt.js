import { formatDateOnly, formatDateTime } from './dateFormat';

export function printPaymentReceipt(paymentOrPayments, options = {}) {
  const {
    partnerName = 'Chưa rõ',
    salespersonName = 'Chưa rõ',
  } = options;

  const payments = Array.isArray(paymentOrPayments) ? paymentOrPayments : [paymentOrPayments];

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

  const pagesHtml = payments.map((payment) => {
    const isReceipt = payment.type === 'RECEIPT';
    const typeTitle = isReceipt ? 'THU TIỀN' : 'CHI TIỀN';
    const docCode = payment.code || '';
    const docDate = formatDateTime(payment.createdAt || new Date(), { withSeconds: false });
    
    const amount = Number(payment.amount || 0);
    const paymentMethodText = payment.paymentMethod === 'CASH' ? 'Tiền mặt' 
      : payment.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Khác';

    return `
      <div style="position: relative;">
        <table class="header-table">
          <tr>
            <td style="width: 50%;">
              <strong style="font-size: 16px;">DLC COMPUTER</strong><br/>
              <span style="font-size: 12px; color: #666;">Hệ thống quản lý kho WMS</span>
            </td>
            <td style="width: 50%; text-align: right; font-size: 13px;">
              Số phiếu: <strong>${escapeHtml(docCode)}</strong><br/>
              Ngày lập: ${escapeHtml(docDate)}
            </td>
          </tr>
        </table>

        <div class="title">PHIẾU ${escapeHtml(typeTitle)}</div>
        <div class="subtitle">Liên 1: Lưu trữ - Liên 2: Bàn giao</div>

        <table class="info-table">
          <tr>
            <td style="width: 25%;"><strong>Họ tên người ${isReceipt ? 'nộp' : 'nhận'} tiền:</strong></td>
            <td style="width: 75%;">${escapeHtml(partnerName)}</td>
          </tr>
          <tr>
            <td><strong>Số tiền:</strong></td>
            <td style="font-weight: bold; font-size: 16px;">${amount.toLocaleString('vi-VN')} đ</td>
          </tr>
          <tr>
            <td><strong>Lý do ${isReceipt ? 'thu' : 'chi'}:</strong></td>
            <td>${escapeHtml(payment.note || 'Không có')}</td>
          </tr>
          <tr>
            <td><strong>Hình thức:</strong></td>
            <td>${escapeHtml(paymentMethodText)}</td>
          </tr>
        </table>

        <table class="signatures">
          <tr>
            <td><strong>Người ${isReceipt ? 'nộp' : 'nhận'} tiền</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Thủ quỹ</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
            <td><strong>Người lập phiếu</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, ghi rõ họ tên)</span></td>
          </tr>
          <tr class="sign-space">
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td>${escapeHtml(salespersonName)}</td>
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
        <title>In Phiếu Thu / Chi</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; font-size: 15px; line-height: 1.6; }
          .header-table { width: 100%; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 30px; }
          .title { text-align: center; font-size: 26px; font-weight: bold; margin-bottom: 5px; }
          .subtitle { text-align: center; font-size: 13px; font-style: italic; margin-bottom: 40px; }
          .info-table { width: 100%; margin-bottom: 30px; border-collapse: separate; border-spacing: 0 12px; }
          .info-table td { font-size: 15px; vertical-align: top; }
          .signatures { width: 100%; margin-top: 50px; }
          .signatures td { text-align: center; width: 33.33%; font-size: 14px; padding-top: 10px; }
          .sign-space { height: 100px; }
          @media print {
            body { padding: 20px; }
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
