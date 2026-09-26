import { formatDateTime } from './dateFormat';
import { numberToVietnameseWords } from './numberToVietnameseWords';
import { companyHtml } from './companyProfile';

export function printPaymentReceipt(paymentOrPayments, options = {}) {
  const {
    partnerName = '..........................................................',
    salespersonName = '',
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
    const typeTitle = isReceipt ? 'THU' : 'CHI';
    const docCode = payment.code || '';
    const resolvedPartnerName = payment.partnerName || partnerName;
    
    // Determine the date to display
    const d = payment.createdAt ? new Date(payment.createdAt) : new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    const amount = Number(payment.amount || 0);
    let wordsAmount = '';
    try {
        wordsAmount = numberToVietnameseWords(amount);
        wordsAmount = wordsAmount.charAt(0).toUpperCase() + wordsAmount.slice(1);
        if (!wordsAmount.endsWith('đồng')) {
            wordsAmount += ' đồng';
        }
    } catch (e) {
        console.warn('Cannot convert amount to words', e);
    }

    return `
      <div style="position: relative; padding: 20px;">
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="width: 35%; vertical-align: top; font-weight: bold; font-size: 14px;">
              Đơn vị: ${companyHtml().name}<br/>
              Địa chỉ: ${companyHtml().address || '.................................'}
            </td>
            <td style="width: 65%; vertical-align: top; text-align: center;">
              <strong style="font-size: 16px;">Mẫu số ${isReceipt ? '01' : '02'} - TT</strong><br/>
              <span style="font-size: 13px; font-style: italic;">
                (Kèm theo Thông tư số 99/2025/TT-BTC<br/>
                ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)
              </span>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 25px;">
          <div style="font-size: 22px; font-weight: bold; margin-bottom: 5px;">PHIẾU ${typeTitle}</div>
          <div style="font-style: italic; font-size: 14px;">
            Ngày ${day} tháng ${month} năm ${year}
          </div>
        </div>

        <div style="position: absolute; top: 120px; right: 20px; font-size: 14px; text-align: right; line-height: 1.6;">
          Quyển số: ....................<br/>
          Số: <strong>${escapeHtml(docCode)}</strong><br/>
          Nợ: ..........................<br/>
          Có: ..........................
        </div>

        <table style="width: 100%; margin-bottom: 20px; line-height: 1.8; font-size: 15px;">
          <tr>
            <td>Họ và tên người ${isReceipt ? 'nộp' : 'nhận'} tiền: <span style="font-weight: bold;">${escapeHtml(resolvedPartnerName)}</span></td>
          </tr>
          <tr>
            <td>Địa chỉ: ${escapeHtml(payment.partnerAddress || '.........................................................................................................................................')}</td>
          </tr>
          <tr>
            <td>Lý do ${isReceipt ? 'nộp' : 'chi'}: ${escapeHtml(payment.note || '.........................................................................................................................................')}</td>
          </tr>
          <tr>
            <td>Số tiền: <strong>${amount.toLocaleString('vi-VN')}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (Viết bằng chữ): <em>${escapeHtml(wordsAmount)}</em></td>
          </tr>
          <tr>
            <td>Kèm theo: ................................................................ Chứng từ gốc: ${escapeHtml(payment.referenceCode || '................................................')}</td>
          </tr>
        </table>

        <table style="width: 100%; margin-top: 30px; text-align: center; font-size: 14px;">
          <tr>
            <td colspan="5" style="text-align: right; padding-bottom: 10px; font-style: italic; padding-right: 20px;">
              Ngày ${day} tháng ${month} năm ${year}
            </td>
          </tr>
          <tr>
            <td style="width: 20%;"><strong>Giám đốc</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, họ tên, đóng dấu)</span></td>
            <td style="width: 20%;"><strong>Kế toán trưởng</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, họ tên)</span></td>
            <td style="width: 20%;"><strong>Người ${isReceipt ? 'nộp' : 'nhận'} tiền</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, họ tên)</span></td>
            <td style="width: 20%;"><strong>Người lập phiếu</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, họ tên)</span></td>
            <td style="width: 20%;"><strong>Thủ quỹ</strong><br/><span style="font-size: 12px; font-style: italic;">(Ký, họ tên)</span></td>
          </tr>
          <tr style="height: 100px;">
            <td></td><td></td><td></td><td></td><td></td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td>${resolvedPartnerName !== '..........................................................' ? escapeHtml(resolvedPartnerName) : ''}</td>
            <td>${escapeHtml(salespersonName)}</td>
            <td></td>
          </tr>
        </table>

        <div style="margin-top: 40px; font-size: 14px; line-height: 1.8;">
          Đã nhận đủ số tiền (viết bằng chữ): ........................................................................................................................<br/>
          + Tỷ giá ngoại tệ (vàng bạc, đá quý): ....................................................................................................................<br/>
          + Số tiền quy đổi: .................................................................................................................................................<br/>
          <span style="font-style: italic;">(Liên gửi ra ngoài phải đóng dấu)</span><br/>
          <strong>Ghi chú:</strong> Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình, doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.
        </div>
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
          @page {
            size: A4;
            margin: 10mm;
          }
          body { font-family: 'Times New Roman', Times, serif; padding: 0; margin: 0; font-size: 15px; color: #000; }
          @media print {
            body { padding: 0; margin: 0; }
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
