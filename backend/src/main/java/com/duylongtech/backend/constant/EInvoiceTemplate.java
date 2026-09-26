package com.duylongtech.backend.constant;

public class EInvoiceTemplate {
    public static final String MAIN_TEMPLATE = """
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>HÓA ĐƠN GIÁ TRỊ GIA TĂNG - %s</title>
    <style>
        body { font-family: 'Times New Roman', Times, serif; padding: 30px; color: #111; max-width: 880px; margin: 0 auto; background: #f8fafc; }
        .invoice-card { background: #fff; padding: 40px; border: 2px solid #0075c0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); position: relative; }
        .watermark { position: absolute; top: 45%%; left: 20%%; font-size: 60px; color: rgba(220, 38, 38, 0.12); transform: rotate(-30deg); font-weight: bold; pointer-events: none; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0075c0; padding-bottom: 15px; margin-bottom: 20px; }
        .company-title { font-size: 18px; font-weight: bold; color: #0075c0; text-transform: uppercase; }
        .invoice-title { text-align: center; margin: 20px 0; }
        .invoice-title h1 { margin: 0; font-size: 24px; color: #dc2626; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; }
        table { width: 100%%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
        th, td { border: 1px solid #999; padding: 8px 10px; }
        th { background-color: #f0f4f8; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; font-size: 14px; }
        .sig-box { width: 250px; }
        .digital-stamp { border: 2px dashed #16a34a; border-radius: 6px; padding: 10px; margin-top: 15px; color: #16a34a; font-size: 12px; background: #f0fdf4; }
    </style>
</head>
<body>
    <div class="invoice-card">
        %s
        <div class="header">
            <div>
                <div class="company-title">%s</div>
                <div>Mã số thuế: <strong>%s</strong></div>
                <div>Địa chỉ: %s</div>
                <div>%s</div>
            </div>
            <div style="text-align: right;">
                <div>Mẫu số: <strong>%s</strong></div>
                <div>Ký hiệu: <strong>%s</strong></div>
                <div>Số HĐ: <strong style="color: #dc2626; font-size: 18px;">%s</strong></div>
            </div>
        </div>

        <div class="invoice-title">
            <h1>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h1>
            <div style="font-style: italic; margin-top: 5px;">(Khởi tạo từ hệ thống Hóa đơn điện tử DLC-WMS theo Nghị định 254/2026/NĐ-CP)</div>
            <div style="margin-top: 5px;">Ngày lập: <strong>%s</strong></div>
            <div style="color: #16a34a; margin-top: 4px; font-size: 13px;">Mã CQT: <strong>%s</strong></div>
        </div>

        <div class="info-grid">
            <div>Họ tên người mua: <strong>%s</strong></div>
            <div>Đơn bán hàng tham chiếu: <strong>%s</strong></div>
            <div style="grid-column: span 2;">Tên đơn vị: <strong>%s</strong></div>
            <div>Mã số thuế: <strong>%s</strong></div>
            <div>Điện thoại: <strong>%s</strong></div>
            <div style="grid-column: span 2;">Địa chỉ: <strong>%s</strong></div>
            <div>Hình thức thanh toán: <strong>%s</strong></div>
            <div>Đồng tiền thanh toán: <strong>%s</strong></div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 40px;">STT</th>
                    <th>Tên hàng hóa, dịch vụ</th>
                    <th style="width: 60px;">ĐVT</th>
                    <th style="width: 80px;">Số lượng</th>
                    <th style="width: 120px;">Đơn giá</th>
                    <th style="width: 130px;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                %s
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="5" class="text-right"><strong>Cộng tiền hàng:</strong></td>
                    <td class="text-right"><strong>%,.0f đ</strong></td>
                </tr>
                <tr>
                    <td colspan="5" class="text-right"><strong>Tiền thuế GTGT (VAT):</strong></td>
                    <td class="text-right" style="color: #dc2626;"><strong>%,.0f đ</strong></td>
                </tr>
                <tr>
                    <td colspan="5" class="text-right" style="font-size: 15px;"><strong>Tổng cộng thanh toán:</strong></td>
                    <td class="text-right" style="color: #16a34a; font-size: 16px;"><strong>%,.0f đ</strong></td>
                </tr>
                <tr>
                    <td colspan="6">Số tiền bằng chữ: <em>%s</em></td>
                </tr>
            </tfoot>
        </table>

        <div class="footer-signatures">
            <div class="sig-box">
                <strong>NGƯỜI MUA HÀNG</strong><br>
                <em>(Ký, ghi rõ họ tên)</em>
            </div>
            <div class="sig-box">
                <strong>NGƯỜI BÁN HÀNG</strong><br>
                <em>(Chữ ký điện tử)</em>
                <div class="digital-stamp">
                    ✔ Ký bởi: %s<br>
                    Ngày ký: %s<br>
                    Trạng thái: Hợp lệ theo Thông tư 91/2026/TT-BTC
                </div>
            </div>
        </div>
    </div>
</body>
</html>
""";
    
    public static final String ROW_TEMPLATE = """
        <tr>
            <td class="text-center">%d</td>
            <td>
                <strong>%s</strong>
                <div style="font-size: 11px; color: #64748b;">Mã SP: %s</div>
                %s
            </td>
            <td class="text-center">%s</td>
            <td class="text-right">%,.0f</td>
            <td class="text-right">%,.0f đ</td>
            <td class="text-right"><strong>%,.0f đ</strong></td>
        </tr>
    """;
    
    public static final String DEFAULT_ROW_TEMPLATE = """
        <tr>
            <td class="text-center">%d</td>
            <td>
                <strong>%s</strong>
                <div style="font-size: 11px; color: #64748b;">Mã SP: %s</div>
            </td>
            <td class="text-center">%s</td>
            <td class="text-right">%,.0f</td>
            <td class="text-right">%,.0f đ</td>
            <td class="text-right"><strong>%,.0f đ</strong></td>
        </tr>
    """;
    
    public static final String SUMMARY_ROW_TEMPLATE = """
        <tr>
            <td class="text-center">1</td>
            <td>Hàng hóa / Dịch vụ theo %s</td>
            <td class="text-center">Gói</td>
            <td class="text-right">1</td>
            <td class="text-right">%,.0f đ</td>
            <td class="text-right">%,.0f đ</td>
        </tr>
    """;
}
