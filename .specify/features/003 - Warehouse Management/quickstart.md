# Quickstart Validation Guide: Warehouse Management

## Prerequisites
- Backend Spring Boot đang chạy ở `http://localhost:8080`.
- Cơ sở dữ liệu MySQL đã chạy migration đủ bảng `WAREHOUSES`, `USER_WAREHOUSE_ROLES`, `AUDIT_LOGS`.
- JWT Token hợp lệ của user có role `MANAGER`.

## Run Scenarios

### Scenario 1: Tạo kho mới
1. Gọi API `POST /api/v1/warehouses` kèm payload hợp lệ.
2. **Expected**: HTTP 201 Created. Bảng `WAREHOUSES` có record mới, bảng `USER_WAREHOUSE_ROLES` có record ghi nhận người tạo. Bảng `AUDIT_LOGS` lưu nhật ký `CREATE`.

### Scenario 2: Kiểm tra unique Code
1. Gọi API `POST /api/v1/warehouses` với `code` đã tồn tại.
2. **Expected**: HTTP 400 Bad Request kèm message "Mã kho này đã tồn tại trong hệ thống".

### Scenario 3: Soft Delete
1. Gọi API `DELETE /api/v1/warehouses/{id}` với `id` của kho rỗng (chưa phát sinh giao dịch).
2. **Expected**: Kho bị chuyển trạng thái thành `INACTIVE`. HTTP 200 OK.

### Scenario 4: Phân quyền Staff
1. Đăng nhập bằng tài khoản `STAFF`.
2. Gọi API `GET /api/v1/warehouses`.
3. **Expected**: HTTP 403 Forbidden.
