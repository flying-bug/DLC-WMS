# Quickstart Validation Guide: Assembly and Disassembly Management

## Prerequisites
- Backend Spring Boot đang chạy ở môi trường Local/Dev.
- Cơ sở dữ liệu MySQL đã có bảng `ASSEMBLY_BOMS`, `ASSEMBLY_BOM_LINES`, `ASSEMBLY_ORDERS`, `ASSEMBLY_ORDER_LINES`, và `INVENTORY_DOCUMENTS`.
- Có dữ liệu sẵn (Seed data) bao gồm ít nhất 1 Kho, các Thành phẩm (Product) và Linh kiện (Component Variant) hợp lệ, có tồn kho và Serial cho linh kiện.
- JWT Token hợp lệ của Warehouse Manager / Thủ kho có quyền (`assembly:add`, `assembly:edit`).

## Run Scenarios

### Scenario 1: Tạo BOM và Validate tỷ lệ phân bổ
1. Gọi API `POST /api/v1/assembly-boms` với `lines` có tổng `costAllocationPct` không bằng 100.
2. **Expected**: HTTP 400 Bad Request kèm thông báo lỗi "Tổng tỷ lệ phân bổ giá vốn phải bằng 100%".
3. Gọi lại API với tổng `costAllocationPct` = 100.
4. **Expected**: HTTP 201 Created. BOM được tạo thành công ở trạng thái `APPROVED`.

### Scenario 2: Validate khóa BOM (Version Integrity)
1. Tạo một Lệnh lắp ráp `POST /api/v1/assembly-orders` sử dụng `bomId` vừa tạo.
2. Gọi API `PUT /api/v1/assembly-boms/{bomId}` để cố gắng sửa linh kiện của BOM.
3. **Expected**: HTTP 400 Bad Request kèm thông báo lỗi "BOM đang được sử dụng, không thể chỉnh sửa".

### Scenario 3: Sinh Phiếu kho & Validate Giá vốn (Costing)
1. Cập nhật Lệnh sang trạng thái `APPROVED`: `PUT /api/v1/assembly-orders/{id}/status`.
2. Gọi API `POST /api/v1/assembly-orders/{id}/inventory-documents` (Loại xuất linh kiện), truyền vào `serialNumbers` của linh kiện. Ghi sổ phiếu xuất.
3. Gọi API `POST /api/v1/assembly-orders/{id}/inventory-documents` (Loại nhập thành phẩm).
4. **Expected**: HTTP 201 Created. Kiểm tra database, Phiếu nhập thành phẩm tự động có giá vốn (Unit Cost) bằng đúng tổng giá vốn của các linh kiện đã xuất.

### Scenario 4: Chặn Hủy Lệnh (Hard Block)
1. Lấy `id` của Lệnh vừa sinh Phiếu kho thành công ở Scenario 3.
2. Gọi API `PUT /api/v1/assembly-orders/{id}/status` với body `{"status": "CANCELLED"}`.
3. **Expected**: HTTP 400 Bad Request kèm thông báo lỗi "Không thể hủy lệnh vì đã có Phiếu kho liên quan được Ghi sổ". Trạng thái lệnh giữ nguyên.

### Scenario 5: Chặn tháo dỡ không có tồn kho
1. Tạo một Lệnh tháo dỡ cho Thành phẩm A.
2. Gọi API sinh Phiếu xuất tháo dỡ cho Thành phẩm A. Thành phẩm A hiện có Tồn kho = 0.
3. **Expected**: HTTP 400 Bad Request. Hệ thống báo lỗi "Thành phẩm đem tháo dỡ không có tồn kho hợp lệ".
