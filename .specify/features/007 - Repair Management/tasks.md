# Task List: Repair Management (007)

## Phase 1: Database & Backend Foundation
- [x] Khám phá mã nguồn Backend hiện tại để nắm cấu trúc Package, Entities có sẵn (Product, Partner, InventoryDocument).
- [x] Tạo file Migration Flyway `V3__create_repair_tables.sql` với bảng `REPAIRS`, `REPAIR_LINES`, `REPAIR_FEES`.
- [x] Khởi tạo Enums: `RepairStatus.java`, `RepairActionType.java`, `InvoiceMethod.java`.
- [x] Xây dựng các Entity classes: `Repair.java`, `RepairLine.java`, `RepairFee.java` mapping chính xác với Database (Bắt buộc dùng `@Version` cho Optimistic Locking).
- [x] Xây dựng Spring Data JPA Repositories: `RepairRepository`, `RepairLineRepository`, `RepairFeeRepository`.
- [x] Tạo các class DTO (Request/Response) có validate (`@Valid`, `@NotNull`) theo `contracts.md`. Gói response theo định dạng `ApiResponse`.

## Phase 2: Backend Core Business Logic
- [x] Xây dựng `RepairService.java` xử lý CRUD cơ bản và logic tính toán phí bảo hành (`unitPrice` = 0).
- [x] Triển khai `RepairWorkflowService.java` xử lý chuyển trạng thái Lệnh.
- [x] Tích hợp Hard Block: Logic chặn chuyển sang `CONFIRMED` nếu kho thiếu linh kiện `ADD`.
- [x] Tích hợp Reservation: Chuyển sang `CONFIRMED` -> Gọi logic sinh Phiếu kho nháp.
- [x] Tích hợp Hoàn thành: Chuyển sang `DONE` -> Ghi sổ phiếu kho, sinh phiếu thu hồi Scrap, gọi logic sinh Hóa đơn.
- [x] Khởi tạo `RepairController.java` expose các REST API theo tài liệu.

## Phase 3: Frontend Reusable Components (MISA Style)
- [x] Khám phá cấu trúc Frontend hiện tại (React, Vite, CSS Modules, Bootstrap 5).
- [x] Tạo UI Component: `RepairStatusBadge.jsx` và file CSS Module đi kèm.
- [x] Tạo UI Component: Bảng hiển thị danh sách linh kiện (`RepairLineTable.jsx`).
- [x] Xây dựng form nhập liệu linh kiện/phí dịch vụ.

## Phase 4: Frontend Pages & Integration
- [x] Tạo file API `repairApi.js` cấu hình Axios gọi đến Backend.
- [x] Xây dựng Page `RepairListPage.jsx` (Danh sách các lệnh sửa chữa có phân trang và lọc).
- [x] Xây dựng Page `RepairDetailPage.jsx` (Quản lý luồng trạng thái, báo giá, thêm/sửa linh kiện).
- [x] Tích hợp xử lý Exception từ Backend (đặc biệt thông báo lỗi 400 Inssufficient Inventory lên UI thông qua `SystemMessage`).
- [x] Kiểm thử e2e luồng nghiệp vụ.

## Phase 5: Testing & Documentation (Constitution Compliance)
- [x] Viết Unit Test cho Service layer (Coverage >= 80%).
- [x] Viết Component Test cho UI Components (Coverage >= 80%).
- [x] Bổ sung Annotation Swagger OpenAPI (`@Operation`, `@ApiResponse`) vào `RepairController`.
- [x] Bổ sung Audit Logs cho mọi API đổi trạng thái (`RepairWorkflowService`).
