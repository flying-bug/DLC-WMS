# Phase 0: Outline & Research

## Findings

### 1. Inventory Reservation (Cơ chế Giữ Tồn Kho)
- **Decision**: Thay vì chờ lệnh sửa chữa hoàn tất (`DONE`) mới xuất kho, hệ thống tự động sinh phiếu `INVENTORY_DOCUMENTS` nháp để giữ chỗ (Reserve) linh kiện ngay khi lệnh được `CONFIRMED` (Khách hàng chốt báo giá). Khi `DONE`, phiếu kho nháp này mới được Ghi sổ (Posted) để chính thức trừ tồn.
- **Rationale**: Quá trình `UNDER_REPAIR` có thể kéo dài vài ngày đến hàng tuần. Nếu không Reserve linh kiện, một Đơn hàng bán lẻ (Sales Order) hoặc một Lệnh sửa chữa khác có thể lấy mất linh kiện đó, dẫn đến việc thiếu hụt vật tư khi kỹ thuật viên đang sửa máy, gây ách tắc và xung đột quy trình.

### 2. Hard Block Xác nhận lệnh (Thiếu hàng chặn luồng)
- **Decision**: Nếu kho không đủ linh kiện cần thay thế (`ADD`), Backend chặn hoàn toàn luồng gọi API chuyển lệnh sang trạng thái `CONFIRMED` (bắn lỗi 400).
- **Rationale**: Đảm bảo nguyên tắc kế toán và kho bãi: Không cam kết sửa chữa và xuất kho khi vật lý không có hàng. Bắt buộc nhân viên điều phối/mua hàng phải bổ sung tồn kho thông qua lệnh Nhập kho (PO) trước khi kỹ thuật viên chốt đơn và bắt đầu sửa.

### 3. Truy vết Phả hệ (Parts Traceability - Serial)
- **Decision**: Bắt buộc lưu trữ trường `serial_number_id` trong `REPAIR_LINES` khi lệnh ở trạng thái `DONE`.
- **Rationale**: Trong ngành thiết bị điện tử, các linh kiện đắt giá (Mainboard, CPU) thường xuyên phải gửi đi bảo hành chéo (RMA) với Nhà cung cấp. Hệ thống cần nắm được chính xác Máy của khách hàng (Serial A) đã tháo linh kiện hỏng (Serial B) và lắp linh kiện mới (Serial C) vào. Điều này chống thất thoát tài sản và rủi ro từ chối bảo hành hãng.

### 4. Tích hợp Sinh Hóa Đơn (Invoicing Integration)
- **Decision**: Thiết kế tham số `invoice_method` (`none`, `b4repair`, `after_repair`) trên bảng `REPAIRS`. Khi lệnh sửa chữa sang trạng thái `DONE`, nếu luồng yêu cầu thu tiền (sau sửa chữa), hệ thống tự động sinh ra Hóa đơn.
- **Rationale**: Các module về Kho thường rời rạc với Kế toán. Việc trigger sinh Hóa đơn từ trạng thái lệnh sửa chữa giúp đồng bộ công nợ khách hàng (Accounts Receivable) ngay lập tức, tránh tình trạng quên thu phí dịch vụ.

### 5. Quản lý Linh kiện thu hồi (Scrap/Recycle Management)
- **Decision**: Phân định `action_type = REMOVE` cho các linh kiện tháo dỡ. Khi lệnh hoàn thành (`DONE`), tự động sinh phiếu Nhập Kho hướng về một kho phế liệu chuyên biệt (Scrap Location).
- **Rationale**: Các linh kiện hỏng tháo từ máy khách thường không có giá trị bán mới nhưng có giá trị bảo hành hãng hoặc tái chế. Nếu không quản lý tập trung ở Scrap Location, lượng rác điện tử này sẽ làm sai lệch tồn kho sản phẩm mới hoặc bị thất thoát không thể kiểm soát.

### 6. Data Integrity & Optimistic Locking (Constitution Principle VI)
- **Decision**: Thêm `@Version` vào Entity và bảng `REPAIRS`. Ghi toàn bộ Audit Log các thao tác thay đổi Lệnh.
- **Rationale**: Trong kho có nhiều Staff thao tác cùng lúc, Optimistic Locking ngăn chặn lỗi ghi đè dữ liệu, đảm bảo tính toàn vẹn (Data Integrity) theo chuẩn dự án.

### 7. Chuẩn hóa API Response (Constitution Principle VIII)
- **Decision**: Bọc toàn bộ trả về của API vào cấu trúc `ApiResponse` (`{ status, message, data }`) và mã hóa lỗi tập trung thông qua `SystemMessage`.
- **Rationale**: Tách biệt rõ ràng tầng UI và tầng Data, không để lộ thông điệp ngoại lệ trực tiếp ra ngoài và hỗ trợ đa ngôn ngữ/thay đổi thông điệp dễ dàng về sau.
