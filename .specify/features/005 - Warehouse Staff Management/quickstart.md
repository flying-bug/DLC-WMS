# Quickstart Validation Guide: Warehouse Staff Management

## Prerequisites
- Backend Spring Boot đang chạy ở môi trường Local/Dev.
- Cơ sở dữ liệu MySQL đã có bảng `USER_WAREHOUSE_ROLES`, `USERS`, `ROLES`, `WAREHOUSES`, và `INVENTORY_DOCUMENTS`.
- Có dữ liệu sẵn (Seed data) bao gồm ít nhất 1 Kho, 1 Manager có quyền tại kho đó.
- JWT Token hợp lệ của Warehouse Manager.

## Run Scenarios

### Scenario 1: Gán quyền thành công (Multi-role)
1. Gọi API `POST /api/v1/warehouses/{warehouseId}/staff` với `userId` và `roleIds` (chứa array ID của Thủ kho và QC).
2. **Expected**: HTTP 200 OK. Bảng `USER_WAREHOUSE_ROLES` tạo/cập nhật các bản ghi tương ứng cho user đó, `is_active = TRUE`. Audit log ghi nhận thao tác.

### Scenario 2: Kiểm tra chặn Role cấp cao (Role Filter)
1. Gọi API `GET /api/v1/roles?module=WAREHOUSE` (hoặc Endpoint tương đương để lấy Role List).
2. **Expected**: HTTP 200 OK. Danh sách trả về không chứa các Role như `SUPER_ADMIN`, `HR_MANAGER`.

### Scenario 3: Thu hồi quyền bị chặn (Hard Block)
1. Lấy `userId` của một nhân sự đang là người tạo (`created_by`) của một phiếu kiểm kê/nhập xuất (`INVENTORY_DOCUMENTS`) có `status` là `DRAFT` hoặc `SUBMITTED`.
2. Gọi API `DELETE /api/v1/warehouses/{warehouseId}/staff/{userId}`.
3. **Expected**: HTTP 400 Bad Request kèm thông báo lỗi "Nhân viên đang là người tạo chứng từ chưa hoàn tất...". Bảng `USER_WAREHOUSE_ROLES` vẫn giữ nguyên trạng thái `is_active = TRUE`.

### Scenario 4: Thu hồi quyền hợp lệ (Soft Delete)
1. Lấy `userId` của nhân sự không vướng bận bất kỳ chứng từ dở dang nào (chứng từ đều đã `POSTED`, `CANCELLED`, hoặc user chưa tạo chứng từ nào).
2. Gọi API `DELETE /api/v1/warehouses/{warehouseId}/staff/{userId}`.
3. **Expected**: HTTP 200 OK. Dữ liệu trong `USER_WAREHOUSE_ROLES` của user đó tại kho tương ứng chuyển thành `is_active = FALSE`. KHÔNG bị xóa vật lý (No hard delete).
