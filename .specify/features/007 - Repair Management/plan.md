# Implementation Plan: Repair Management

**Branch**: `[007-repair-management]` | **Date**: 2026-07-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/features/007 - Repair Management/spec.md`, `data-model.md`, `contracts.md`, and `constitution.md`.

## Summary

Triển khai tính năng Quản lý Sửa chữa (Repair Management) cho hệ thống WMS, tuân thủ chặt chẽ kiến trúc Component-based (phong cách MISA) và các nguyên tắc Simplicity (YAGNI) từ Constitution. Tính năng bao gồm toàn bộ vòng đời tiếp nhận thiết bị, báo giá, giữ kho (Reservation), và tính phí. Hệ thống tích hợp sâu với module Inventory và Invoicing.

## Technical Context

**Language/Version**: Java 17, Spring Boot 3 / React (Vite)
**Primary Dependencies**: Spring Data JPA, Hibernate, MySQL 8, Flyway / React Router, Axios, Bootstrap 5, CSS Modules
**Target Platform**: Web application (Frontend + Backend)

## Project Structure & Constitution Compliance

Dự án tuân thủ nghiêm ngặt **Constitution**:
- **Layered Architecture & SOLID**: Mọi component từ Controller -> Service -> Repository phải đảm bảo Single Responsibility và không cross-dependency.
- **Frontend (MISA Style)**: Tách biệt Reusable UI Components (`src/components/ui`) và Page Components (`src/pages`). Sử dụng CSS Modules, không dùng Global CSS ngoài tokens. Áp dụng Bootstrap 5 Grid. Quản lý state bằng React Hooks.
- **Backend (YAGNI & Security)**: Bám sát convention của Spring Boot. Các Exception kế thừa và sử dụng SystemMessage chuẩn. Áp dụng JWT và RBAC mặc định.
- **Data Integrity**: Áp dụng `@Version` (Optimistic Locking) cho các entity. Mọi thao tác CUD phải gọi `AuditLogService`.
- **Test-First**: Bắt buộc >=80% Test Coverage cho cả Backend (JUnit/Mockito) và Frontend (Vitest).
- **REST & Swagger**: Controller phải có `@Operation` và trả về đúng envelope format.

### Phân rã Cấu trúc Code (Code Breakdown)

```text
backend/
├── src/main/resources/db/migration/ 
│   └── V3__create_repair_tables.sql (Tạo REPAIRS, REPAIR_LINES, REPAIR_FEES)
├── src/main/java/com/duylongtech/backend/
│   ├── constant/
│   │   ├── RepairStatus.java (Enum: DRAFT, QUOTATION, CONFIRMED, UNDER_REPAIR, DONE, CANCELLED)
│   │   └── RepairActionType.java (Enum: ADD, REMOVE)
│   ├── entity/ (Repair, RepairLine, RepairFee) -> Mapping JPA theo data-model.md
│   ├── dto/ 
│   │   ├── request/ (RepairRequest, RepairLineRequest - Áp dụng @Valid, @NotNull)
│   │   └── response/ (RepairResponse, RepairLineResponse)
│   ├── repository/ (RepairRepository, RepairLineRepository)
│   ├── service/ 
│   │   ├── RepairService.java (CRUD cơ bản và Validation Giá bảo hành)
│   │   └── RepairWorkflowService.java (Xử lý chuyển trạng thái, gọi InventoryService để Reserve/Done và InvoiceService để xuất hóa đơn)
│   └── controller/ (RepairController -> mapping theo contracts.md)

frontend/
├── src/
│   ├── components/
│   │   ├── ui/ (Sử dụng lại/Tạo mới DataTable, Modal, StatusBadge theo chuẩn MISA)
│   │   └── repair/ (RepairLineTable.jsx, RepairFeeTable.jsx, RepairStatusBadge.jsx)
│   ├── pages/Repair/
│   │   ├── RepairListPage.jsx (Component Page: Danh sách lệnh + Lọc, sử dụng CSS Modules)
│   │   ├── RepairDetailPage.jsx (Component Page: Chi tiết lệnh, form báo giá và chuyển trạng thái)
│   │   └── RepairListPage.module.css / RepairDetailPage.module.css
│   └── services/repairApi.js (Gọi API Axios)
```

## Implementation Phases

### Phase 1: Database & Backend Foundation
1. Tạo script Flyway `V3__create_repair_tables.sql` dựa trên `data-model.md`.
2. Khởi tạo JPA Entities (`Repair`, `RepairLine`, `RepairFee`) với các ràng buộc chuẩn xác.
3. Cấu hình Enums (`RepairStatus`, `RepairActionType`).
4. Xây dựng Repositories và các API CRUD cơ bản (DRAFT) ở Service & Controller.

### Phase 2: Backend Core Business Logic
1. Triển khai API thêm/sửa Linh kiện (`REPAIR_LINES`) và tính toán phí. Áp dụng logic `isFreeWarranty` -> giá = 0.
2. Xây dựng `RepairWorkflowService` xử lý đổi trạng thái (`PUT /status`).
3. Tích hợp Inventory: Khi đổi sang `CONFIRMED`, gọi logic sinh phiếu xuất kho nháp (Reservation). Chặn (Hard Block) ném Exception 400 nếu kho thiếu linh kiện `ADD`.
4. Khi đổi sang `DONE`, trigger hoàn tất phiếu kho (trừ tồn thực tế), nhập kho Scrap (nếu có `REMOVE`) và gọi InvoiceService sinh hóa đơn.

### Phase 3: Frontend Reusable Components (MISA Style)
1. Cấu hình CSS Modules cho các file UI.
2. Xây dựng `RepairStatusBadge.jsx` tái sử dụng, map màu sắc theo trạng thái (Draft: xám, Quotation: vàng, Confirmed: xanh dương, Under_Repair: cam, Done: xanh lá).
3. Xây dựng layout form nhập liệu chi tiết linh kiện `RepairLineForm.jsx` (Bootstrap 5 Grid).

### Phase 4: Frontend Pages & Integration
1. Xây dựng `RepairListPage.jsx` gọi API `GET /api/v1/repairs`, hiển thị lên `DataTable`.
2. Xây dựng `RepairDetailPage.jsx` cho phép xem chi tiết, Thêm Line/Fee, và có các nút bấm Action chuyển trạng thái (VD: "Chốt báo giá", "Xác nhận", "Hoàn thành").
3. Tích hợp thông báo lỗi 400 (đặc biệt lỗi Thiếu tồn kho) lên UI cho người dùng.

### Phase 5: Testing & Documentation (Bắt buộc theo Constitution)
1. Viết Unit Test và Integration Test cho Backend (đảm bảo Coverage >= 80%).
2. Viết Component Test cho Frontend (Vitest + Testing Library).
3. Thêm `@Operation` và `@ApiResponse` vào Controller để generate Swagger Docs.

## Verification
- Chạy các test case định nghĩa tại `quickstart.md`.
- Chạy pipeline kiểm tra Test Coverage.
- Đảm bảo UI Responsive, không vỡ layout khi dùng CSS Modules.
