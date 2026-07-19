# Quickstart Validation Guide: Repair Management

## Prerequisites
- Backend Spring Boot đang chạy ở môi trường Local/Dev.
- Cơ sở dữ liệu MySQL đã có bảng `REPAIRS`, `REPAIR_LINES`, `REPAIR_FEES`.
- Có dữ liệu sẵn (Seed data) bao gồm ít nhất 1 Kho, các Linh kiện (Component Variant) hợp lệ, có tồn kho và Serial cho linh kiện.
- Dữ liệu Khách hàng (Partner) đã tồn tại trong DB.
- JWT Token hợp lệ của Staff / Manager có quyền (`repair:add`, `repair:edit`, `repair:status`).

## Run Scenarios

### Scenario 1: Tạo lệnh và Bắt buộc đối tác (Partner Validation)
1. Gọi API `POST /api/v1/repairs` với thông tin cơ bản nhưng bỏ trống `partnerId`.
2. **Expected**: HTTP 400 Bad Request. JSON trả về có cấu trúc `{ status: 400, message: "Khách hàng (Partner) là thông tin bắt buộc", code: "REP..." }`.
3. Gọi lại API và cung cấp `partnerId` hợp lệ.
4. **Expected**: HTTP 201 Created. JSON trả về `{ status: 201, data: { id: ... } }`. Lệnh được tạo thành công ở trạng thái `DRAFT`.

### Scenario 2: Validate Logic Giá Bảo Hành (Warranty Pricing)
1. Lấy ID lệnh vừa tạo ở Scenario 1. Gọi API `POST /api/v1/repairs/{id}/lines` để thêm một linh kiện, thiết lập `isFreeWarranty: true` nhưng để `unitPrice: 1500000`.
2. **Expected**: Hệ thống tự động override `unitPrice` thành `0` và lưu thành công (HTTP 201 Created).
3. Đổi trạng thái lệnh sang `QUOTATION` thông qua API `PUT /api/v1/repairs/{id}/status`.

### Scenario 3: Chặn Xác nhận khi Thiếu Tồn Kho (Hard Block)
1. Trên một lệnh đang ở trạng thái `QUOTATION`, thêm một `REPAIR_LINE` loại `ADD` yêu cầu linh kiện A (Linh kiện A hiện đang hết hàng / Tồn kho = 0).
2. Gọi API chuyển trạng thái lệnh sang `CONFIRMED`.
3. **Expected**: HTTP 400 Bad Request. Hệ thống báo lỗi "Không đủ tồn kho linh kiện để xác nhận lệnh". Trạng thái lệnh giữ nguyên là `QUOTATION`.

### Scenario 4: Giữ Kho (Reservation) và Chuyển trạng thái
1. Nhập thêm tồn kho cho Linh kiện A hoặc đổi sang linh kiện đang có sẵn tồn kho.
2. Gọi API chuyển trạng thái lệnh sang `CONFIRMED`.
3. **Expected**: HTTP 200 OK. Kiểm tra Database, hệ thống đã tự động sinh một Phiếu xuất kho `INVENTORY_DOCUMENTS` (trạng thái Draft/Waiting) để **Reserve (giữ chỗ)** linh kiện A.

### Scenario 5: Hoàn tất Sửa chữa, Trừ kho và Sinh Hóa đơn
1. Chuyển lệnh từ `CONFIRMED` -> `UNDER_REPAIR` -> `DONE`. Đảm bảo `invoiceMethod` của lệnh là `after_repair`.
2. **Expected**: HTTP 200 OK.
3. Kiểm tra DB: 
   - Phiếu xuất kho `INVENTORY_DOCUMENTS` (Giữ chỗ ở Scenario 4) tự động chuyển sang trạng thái hoàn tất (Trừ kho thực tế).
   - Hệ thống tự động sinh một bản ghi Hóa Đơn (`INVOICES`) tham chiếu tới lệnh sửa chữa này với tổng tiền bằng tổng chi phí dịch vụ/linh kiện.

### Scenario 6: Stocktake Lock (Kiểm kê kho)
1. Trong module Inventory, chuyển trạng thái hệ thống sang "Đang kiểm kê".
2. Chuyển lệnh sửa chữa sang `DONE` (có làm thay đổi tồn kho).
3. **Expected**: HTTP 400 Bad Request kèm mã lỗi `SystemMessage` báo "Kho đang kiểm kê, không thể thực hiện giao dịch". Trạng thái lệnh giữ nguyên.
