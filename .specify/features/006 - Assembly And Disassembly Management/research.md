# Phase 0: Outline & Research

## Findings

### 1. Phân bổ Giá vốn (Cost Allocation)
- **Decision**: Bổ sung trường `cost_allocation_pct` vào cấu trúc chi tiết của Định mức (BOM Lines) với validation tổng bằng 100%. Khi tháo dỡ, hệ thống sẽ nhân tỷ lệ này với tổng giá vốn thành phẩm để ra giá trị linh kiện thu hồi.
- **Rationale**: Đảm bảo tuân thủ nguyên tắc kế toán giá thành chuẩn ERP. Nếu chia đều giá trị (VD tháo PC chia đều tiền cho CPU và Vỏ case) sẽ dẫn đến sai lệch nghiêm trọng báo cáo tài chính Lãi/Lỗ.

### 2. Truy vết Phả hệ (Genealogy Tracking)
- **Decision**: Không tự sinh giao dịch tồn kho ngầm định trong module Order. Bắt buộc luồng Lệnh Lắp ráp/Tháo dỡ phải gọi API khởi tạo `INVENTORY_DOCUMENTS` (Phiếu Nhập/Xuất kho). Người dùng phải truyền Serial khi làm phiếu kho.
- **Rationale**: Đồ điện tử yêu cầu tracking Serial cho bảo hành. Thông qua việc sinh các phiếu Xuất (Linh kiện) và Nhập (Thành phẩm) có chung `reference_order_id`, hệ thống tự động map được "gia phả" của thiết bị (Máy tính Serial A được cấu thành từ RAM Serial B, Mainboard Serial C).

### 3. Thực thi từng phần (Partial Fulfillment)
- **Decision**: Cấu trúc Data Model của `ASSEMBLY_ORDERS` bổ sung cột `quantity_produced`. Cho phép 1 Lệnh sinh ra N Phiếu nhập/xuất kho khác nhau. Lệnh sẽ tự động cộng dồn `quantity_produced` khi các phiếu kho được Ghi sổ.
- **Rationale**: Phù hợp với thực tế vận hành: Kho không bao giờ làm xong một đơn hàng lắp ráp khổng lồ trong 1 ngày. Khả năng chia nhỏ việc xuất/nhập kho (Partial) là bắt buộc.

### 4. Cơ chế Hard Block chặn Hủy Lệnh
- **Decision**: Khi User/Manager gọi API Hủy lệnh (`PUT status = CANCELLED`), Backend bắt buộc phải query vào bảng `INVENTORY_DOCUMENTS` theo `reference_order_id`. Nếu có dữ liệu, văng exception chặn lại.
- **Rationale**: Nếu Hủy lệnh trong khi hàng đã lỡ xuất ra khỏi kho (hoặc lỡ nhập vào), hệ thống sẽ bị treo số lượng và mất kiểm soát. Chặn cứng buộc thủ kho phải làm đúng quy trình hoàn trả hàng trước khi hủy lệnh.

### 5. Toàn vẹn Phiên bản (BOM Version Integrity)
- **Decision**: Backend chặn mọi hành động chỉnh sửa chi tiết `ASSEMBLY_BOM_LINES` nếu BOM gốc đang được refer bởi các Lệnh đang `DRAFT` hoặc `APPROVED`.
- **Rationale**: Đổi công thức BOM khi lệnh đang lên kế hoạch/đang thực thi sẽ phá vỡ toàn bộ tính toán về nhu cầu vật tư và dự toán giá vốn, gây hỏng dữ liệu hệ thống. Bắt buộc phải tạo version BOM mới nếu muốn thay đổi công thức.
