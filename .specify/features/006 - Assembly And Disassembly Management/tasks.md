# Tasks: Assembly and Disassembly Management

**Input**: Design documents from `.specify/features/006 - Assembly And Disassembly Management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/main/java/com/duylongtech/backend/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database migration structure

- [ ] T001 Khởi tạo branch mới `feature/backend/assembly-and-disassembly` (Bỏ qua nếu đã làm việc trên branch chuẩn)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure, database columns, entities, and DTOs that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Update `schema.sql` và tạo script Migration `V2__add_assembly_fields.sql` để bổ sung cột `cost_allocation_pct` và `quantity_produced`.
- [ ] T003 [P] Thêm các mã lỗi nghiệp vụ (VD: `ASM_INVALID_COST_PCT`, `ASM_ORDER_LOCKED`, `ASM_INSUFFICIENT_INVENTORY`) vào enum `SystemMessage.java` và cập nhật file `SYSTEM_MESSAGES.md` (Chuẩn Constitution IV).
- [ ] T004 [P] Cập nhật các Entity: `AssemblyBomLine.java` (thêm costAllocationPct) và `AssemblyOrder.java` (thêm quantityProduced).
- [ ] T005 [P] Cập nhật các DTO: `AssemblyBomLineRequest`, `AssemblyBomLineResponse`, `AssemblyOrderResponse` với các trường mới tương ứng. Đảm bảo sử dụng `@Valid` và các annotation validation (`@NotNull`, `@Min`).
- [ ] T006 Khởi tạo/Cập nhật Repository: Thêm hàm query check BOM Lock vào `AssemblyOrderRepository`, và hàm check phiếu kho (ReferenceType/ReferenceId) vào `InventoryDocumentRepository`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quản lý Định mức lắp ráp BOM (Priority: P2)

**Goal**: Bổ sung tỷ lệ phân bổ giá vốn (Cost Allocation) và cơ chế Khóa (Lock) BOM.

### Implementation for User Story 1

- [ ] T007 [US1] Cập nhật `AssemblyOrderService`: Hàm tạo/sửa BOM phải validate tổng `costAllocationPct` của các linh kiện bằng đúng 100%. Đảm bảo ghi Audit Log cho thao tác CUD (Chuẩn Constitution VI).
- [ ] T008 [US1] Cập nhật `AssemblyOrderService`: Hàm sửa BOM phải gọi repository check tồn tại Lệnh `DRAFT`/`APPROVED` sử dụng BOM đó, ném lỗi 400 (`ASM_ORDER_LOCKED`) nếu có.
- [ ] T009 [US1] Thêm các endpoint `GET /api/v1/assembly-boms` và `GET /api/v1/assembly-boms/{id}` vào `AssemblyOrderController`. Sử dụng `@Operation` của Swagger (Chuẩn Constitution VIII).
- [ ] T010 [P] [US1] Frontend: Cập nhật file API service (hoặc tạo mới) gọi API cho phần BOM.
- [ ] T011 [US1] Frontend: Cập nhật giao diện `AssemblyBomForm` (hoặc tạo mới nếu chưa có) để hiển thị cột tỷ lệ phần trăm phân bổ và hiển thị câu cảnh báo khi không đạt 100%.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Tạo và Duyệt Lệnh Lắp ráp / Tháo dỡ (Priority: P1)

**Goal**: Quản lý Lệnh, tích hợp Tracking số lượng Partial Fulfillment, và cơ chế Hard Block khi Hủy Lệnh.

### Implementation for User Story 2

- [ ] T012 [US2] Cập nhật `AssemblyOrderService`: Thêm hàm `updateOrderStatus`. Xử lý riêng logic cho trạng thái `CANCELLED` (Sử dụng hàm query ở T005 để chặn Hủy nếu có phiếu kho). Ghi Audit Log khi đổi status.
- [ ] T013 [US2] Cập nhật `AssemblyOrderController`: Thêm các endpoint `GET /api/v1/assembly-orders`, Detail, và `PUT /api/v1/assembly-orders/{id}/status`.
- [ ] T014 [P] [US2] Frontend: Cập nhật UI màn hình Danh sách Lệnh (`AssemblyOrderList`), bổ sung cột hiển thị `quantityProduced` so với `quantity` (Tiến độ thực hiện).
- [ ] T015 [US2] Frontend: Xây dựng UI Chi tiết Lệnh (`AssemblyOrderDetail`), cho phép người dùng đổi trạng thái lệnh (Duyệt, Hủy) và hiển thị Toast báo lỗi Hard Block nếu có (Dùng text từ error code).

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Thực thi lệnh qua Phiếu Nhập / Xuất Kho (Priority: P1)

**Goal**: Sinh Phiếu Nhập/Xuất kho từ Lệnh, tự động tính toán Giá vốn (Costing) và map phả hệ Serial (Genealogy Tracking).

### Implementation for User Story 3

- [ ] T016 [US3] Cài đặt hàm cốt lõi `AssemblyOrderService.generateInventoryDocument`: Xử lý phân nhánh logic Lắp ráp và Tháo dỡ. Tự động tính Unit Cost và Validate Target Serial Balance (khi tháo dỡ).
- [ ] T017 [US3] Cập nhật `AssemblyOrderController`: Thêm endpoint `POST /api/v1/assembly-orders/{id}/inventory-documents`. Bắt buộc dùng `@Valid` cho Request Body.
- [ ] T018 [US3] Frontend: Thêm cụm nút "Tạo Phiếu Xuất" / "Tạo Phiếu Nhập" vào màn hình `AssemblyOrderDetail` (Chỉ hiện khi Lệnh đã APPROVED).
- [ ] T019 [US3] Frontend: Xây dựng UI Component `GenerateInventoryDocumentModal` cho phép người dùng điền số lượng thu hồi/xuất kho thực tế và chọn Serial. Tích hợp gọi API sinh Phiếu Kho.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T020 [P] Viết Unit Tests (JUnit) cho logic tính giá vốn và kiểm tra Hard Block trong `AssemblyOrderService`. Phải đạt coverage >= 80% (Chuẩn Constitution III).
- [ ] T021 Kiểm tra và cấu hình Global Exception Handler để đảm bảo mã lỗi `ASM_INSUFFICIENT_INVENTORY` hoặc các Custom Exception được trả về đúng chuẩn JSON MISA cho UI (Chuẩn Constitution IV).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
- **Polish (Final Phase - Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1**: Độc lập (P2)
- **US2**: Phụ thuộc vào dữ liệu BOM của US1 (P1)
- **US3**: Phụ thuộc vào API Lệnh và Status của US2 (P1)
