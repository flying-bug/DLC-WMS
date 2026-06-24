# Quickstart Validation Guide: Customer Management

## Prerequisites
- Backend Spring Boot đang chạy ở `http://localhost:8080`.
- Cơ sở dữ liệu MySQL đã chạy migration đủ bảng `PARTNERS`, `SERIAL_NUMBERS`, `SALES_ORDERS`, `WARRANTIES`, `REPAIRS`, `PAYMENT_RECEIPTS`.
- Có dữ liệu sẵn (Seed data) khách vãng lai `KH-0000`.
- JWT Token hợp lệ.

## Run Scenarios

### Scenario 1: Tạo mới Khách hàng qua form Quick Create
1. Gọi API `POST /api/v1/customers` với body có `name` và `phone` hợp lệ.
2. **Expected**: HTTP 201 Created. Bảng `PARTNERS` có bản ghi mới, mã khách hàng sinh tự động (VD: `KH2026060001`), gán mặc định `is_customer = true`.

### Scenario 2: Kiểm tra Validation Regex SĐT
1. Gọi API `POST /api/v1/customers` với `phone` là chuỗi không hợp lệ (VD: `"123"` hoặc `"090abc"`).
2. **Expected**: HTTP 400 Bad Request kèm theo mã lỗi Validation.

### Scenario 3: Chặn xem chi tiết Khách vãng lai
1. Lấy `id` của bản ghi `KH-0000`.
2. Gọi API `GET /api/v1/customers/{id}/warranties` hoặc các API Tab khác.
3. **Expected**: Phải áp dụng phân trang (Paginated response). Trên UI, nút "Xem chi tiết" của KH-0000 bị ẩn đi.

### Scenario 4: Ngừng hoạt động Khách hàng
1. Lấy ID của một khách hàng đang có phiếu sửa chữa (Repair) ở trạng thái `RECEIVED`.
2. Gọi API `PATCH /api/v1/customers/{id}/status` chuyển sang `INACTIVE`.
3. **Expected**: HTTP 400 Bad Request kèm câu thông báo chặn vô hiệu hóa từ hệ thống.
