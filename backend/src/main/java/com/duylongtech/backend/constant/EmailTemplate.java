package com.duylongtech.backend.constant;

public class EmailTemplate {
    public static final String PASSWORD_RESET = """
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #007bff; text-align: center;">Khôi phục mật khẩu</h2>
    <p>Chào bạn,</p>
    <p>Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu cho tài khoản hệ thống Duy Long Computer Warehouse Management của bạn.</p>
    <p>Mã OTP của bạn là: <strong style="font-size: 24px; letter-spacing: 4px; color: #d9534f; display: block; text-align: center; margin: 20px 0;">%s</strong></p>
    <p>Mã OTP này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
    <p>Trân trọng,<br/><strong>DLC-WMS Admin</strong></p>
</div>
""";

    public static final String ACCOUNT_CREATED = """
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #007bff; text-align: center;">Tài khoản DLC-WMS của bạn</h2>
    <p>Chào %s,</p>
    <p>Tài khoản của bạn đã được tạo trên hệ thống Duy Long Computer Warehouse Management.</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p><strong>Tên đăng nhập:</strong> %s</p>
        <p><strong>Mật khẩu:</strong> <em>%s</em></p>
        <p><strong>Vai trò (Role):</strong> %s</p>
    </div>
    <p>Vui lòng đăng nhập và đổi mật khẩu trong lần đầu tiên sử dụng hệ thống.</p>
    <p>Trân trọng,<br/><strong>DLC-WMS Admin</strong></p>
</div>
""";

    public static final String BACKUP_REPORT = """
<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: %s; text-align: center;">Báo cáo Sao lưu Cơ sở dữ liệu</h2>
    <p>Chào Quản trị viên,</p>
    <p>Hệ thống vừa thực hiện sao lưu dữ liệu tự động với kết quả như sau:</p>
    <ul style="line-height: 1.8;">
        <li><strong>Trạng thái:</strong> <span style="color: %s; font-weight: bold;">%s</span></li>
        <li><strong>Tên file Backup:</strong> %s</li>
        <li><strong>Thời gian hoàn thành:</strong> %s</li>
        <li><strong>Kích thước file:</strong> %s</li>
        <li><strong>Đường dẫn lưu trữ:</strong> %s</li>
    </ul>
    %s
    <p>Trân trọng,<br/><strong>DLC-WMS System</strong></p>
</div>
""";

    public static final String SALES_ORDER = """
<div style="font-family: Arial, sans-serif; padding: 24px; color: #334155; max-width: 700px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
        <h2 style="color: #0f172a; margin-top: 0;">%s BÁN HÀNG</h2>
        <p style="color: #64748b; margin-top: 5px; font-size: 14px;">Mã đơn hàng: <strong>%s</strong></p>
    </div>
    <p>Kính gửi <strong>%s</strong>,</p>
    <p>Cảm ơn Quý khách đã mua sắm tại <strong>Duy Long Computer</strong>. Chúng tôi xin gửi chi tiết đơn hàng của Quý khách như sau:</p>
    
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Thông tin đơn hàng</h3>
        <table style="width: 100%%; font-size: 14px;">
            <tr><td style="padding: 4px 0; color: #64748b;">Trạng thái:</td><td style="text-align: right; font-weight: bold; color: #2563eb;">%s</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Ngày lập:</td><td style="text-align: right;">%s</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Khách hàng:</td><td style="text-align: right;">%s</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Điện thoại:</td><td style="text-align: right;">%s</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Địa chỉ giao hàng:</td><td style="text-align: right;">%s</td></tr>
        </table>
    </div>

    <table style="width: 100%%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
        <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 12px 8px; text-align: left; color: #475569;">Sản phẩm</th>
                <th style="padding: 12px 8px; text-align: center; color: #475569;">SL</th>
                <th style="padding: 12px 8px; text-align: right; color: #475569;">Đơn giá</th>
                <th style="padding: 12px 8px; text-align: right; color: #475569;">Thành tiền</th>
            </tr>
        </thead>
        <tbody>
            %s
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" style="padding: 12px 8px; text-align: right; border-top: 2px solid #e2e8f0; color: #64748b;">Tổng tiền hàng:</td>
                <td style="padding: 12px 8px; text-align: right; border-top: 2px solid #e2e8f0; font-weight: bold;">%,.0f đ</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 8px; text-align: right; color: #64748b;">Chiết khấu:</td>
                <td style="padding: 8px; text-align: right; color: #ef4444;">-%,.0f đ</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 8px; text-align: right; color: #64748b;">Phí vận chuyển:</td>
                <td style="padding: 8px; text-align: right;">+%,.0f đ</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">Tổng cộng thanh toán:</td>
                <td style="padding: 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: #2563eb;">%,.0f đ</td>
            </tr>
        </tfoot>
    </table>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">
        <p>Nếu Quý khách có bất kỳ thắc mắc nào, vui lòng liên hệ Hotline: <strong>0987.654.321</strong></p>
        <p>Trân trọng cảm ơn,<br/><strong>Duy Long Computer</strong></p>
    </div>
</div>
""";

    public static final String DAILY_SNAPSHOT = """
<div style="font-family: Arial, sans-serif; padding: 24px; color: #334155; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid %s; padding-bottom: 15px;">
        <h2 style="color: %s; margin-top: 0; text-transform: uppercase;">Báo Cáo Chốt Sổ Kho Hàng Ngày (Daily Snapshot)</h2>
        <p style="color: #64748b; margin-top: 5px; font-size: 14px;">Ngày chốt sổ: <strong style="color: #0f172a;">%s</strong></p>
    </div>
    <p>Chào Quản trị viên,</p>
    <p>Hệ thống DLC-WMS vừa hoàn thành tiến trình chốt sổ kho cuối ngày tự động. Dưới đây là tóm tắt kết quả:</p>
    
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%%; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">Trạng thái tiến trình:</td><td style="text-align: right; font-weight: bold; color: %s;">%s</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Tổng số SP (SKU) có tồn kho:</td><td style="text-align: right; font-weight: bold;">%,d</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Tổng số lượng Serial (Trong kho):</td><td style="text-align: right; font-weight: bold;">%,d</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Tổng giá trị tồn kho (Cost):</td><td style="text-align: right; font-weight: bold; color: #2563eb;">%,.0f đ</td></tr>
        </table>
    </div>
    
    %s
    
    <p style="margin-top: 20px; font-size: 13px; color: #64748b;">Để xem chi tiết tồn kho từng sản phẩm, vui lòng truy cập Hệ thống DLC-WMS -> Báo cáo -> Tồn kho cuối ngày.</p>
    <p>Trân trọng,<br/><strong>Hệ thống tự động DLC-WMS</strong></p>
</div>
""";

    public static final String REPAIR_COMPLETED = """
<div style="font-family: Arial, sans-serif; padding: 24px; color: #334155; max-width: 700px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #16a34a; padding-bottom: 15px;">
        <h2 style="color: #0f172a; margin-top: 0;">THÔNG BÁO HOÀN TẤT SỬA CHỮA</h2>
        <p style="color: #64748b; margin-top: 5px; font-size: 14px;">Mã phiếu: <strong>%s</strong></p>
    </div>
    <p>Kính gửi <strong>%s</strong>,</p>
    <p>Duy Long Computer xin thông báo thiết bị của Quý khách đã được sửa chữa/kiểm tra hoàn tất.</p>
    
    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Chi tiết thực hiện</h3>
        <table style="width: 100%%; font-size: 14px;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 40%%;">Tình trạng tiếp nhận:</td><td style="font-weight: bold;">%s</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Nội dung sửa chữa:</td><td>%s</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Kết quả QC:</td><td style="color: #16a34a; font-weight: bold;">ĐẠT</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Tổng chi phí:</td><td style="color: #dc2626; font-weight: bold;">%,.0f đ</td></tr>
        </table>
    </div>

    <p>Quý khách vui lòng mang theo phiếu biên nhận đến cửa hàng để nhận lại thiết bị. Thời gian làm việc từ 08:00 - 17:30 các ngày trong tuần.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">
        <p>Mọi thắc mắc xin vui lòng liên hệ Hotline: <strong>0987.654.321</strong></p>
        <p>Trân trọng cảm ơn,<br/><strong>Duy Long Computer</strong></p>
    </div>
</div>
""";
}
