# Tasks: Warehouse Management

**Input**: Design documents from `.specify/features/003 - Warehouse Management/`

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

**Purpose**: Project initialization and basic structure

- [x] T001 Khởi tạo branch mới `feature/003-warehouse-management`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Thêm các mã lỗi nghiệp vụ (Warehouse) vào `backend/src/main/java/com/duylongtech/backend/constant/SystemMessage.java`
- [x] T003 [P] Tạo entity `Warehouse` tại `backend/src/main/java/com/duylongtech/backend/entity/Warehouse.java`
- [x] T004 [P] Tạo entity `UserWarehouseRole` tại `backend/src/main/java/com/duylongtech/backend/entity/UserWarehouseRole.java`
- [x] T005 Tạo `WarehouseRepository` tại `backend/src/main/java/com/duylongtech/backend/repository/WarehouseRepository.java`
- [x] T006 Tạo `UserWarehouseRoleRepository` tại `backend/src/main/java/com/duylongtech/backend/repository/UserWarehouseRoleRepository.java`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Tạo mới kho (Priority: P1) 🎯 MVP

**Goal**: Cho phép Manager tạo mới thông tin một kho lưu trữ vật lý.

**Independent Test**: Gọi API POST `/api/v1/warehouses` thành công và ghi nhận vào bảng UserWarehouseRole.

### Implementation for User Story 1

- [x] T007 [P] [US1] Tạo `WarehouseRequest` DTO tại `backend/src/main/java/com/duylongtech/backend/dto/request/WarehouseRequest.java`
- [x] T008 [P] [US1] Tạo `WarehouseResponse` DTO tại `backend/src/main/java/com/duylongtech/backend/dto/response/WarehouseResponse.java`
- [x] T009 [US1] Cài đặt `WarehouseService.createWarehouse` (xử lý logic lưu Owner) tại `backend/src/main/java/com/duylongtech/backend/service/WarehouseService.java`
- [x] T010 [US1] Tạo endpoint POST trong `WarehouseController.java` tại `backend/src/main/java/com/duylongtech/backend/controller/WarehouseController.java`
- [x] T011 [P] [US1] Khởi tạo API service axios `createWarehouse` tại `frontend/src/api/warehouseApi.js`
- [x] T012 [US1] Xây dựng component UI `WarehouseFormModal.jsx` (chế độ Tạo mới) tại `frontend/src/components/warehouse/WarehouseFormModal.jsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Xem danh sách và chi tiết (Priority: P1)

**Goal**: Manager có thể xem tổng quan danh sách kho và click vào để xem chi tiết (cùng 3 thẻ metrics tồn kho).

**Independent Test**: Truy cập trang danh sách kho và xem thông tin thẻ metrics.

### Implementation for User Story 2

- [x] T013 [P] [US2] Thêm hàm Query JPQL tổng hợp Metric vào `backend/src/main/java/com/duylongtech/backend/repository/InventoryBalanceRepository.java`
- [x] T014 [P] [US2] Tạo `WarehouseDetailResponse` DTO tại `backend/src/main/java/com/duylongtech/backend/dto/response/WarehouseDetailResponse.java`
- [x] T015 [US2] Cài đặt `WarehouseService.getWarehouses` và `getWarehouseDetail` tại `backend/src/main/java/com/duylongtech/backend/service/WarehouseService.java`
- [x] T016 [US2] Thêm 2 endpoint GET vào `backend/src/main/java/com/duylongtech/backend/controller/WarehouseController.java`
- [x] T017 [P] [US2] Thêm hàm `getWarehouses` và `getWarehouseDetail` vào `frontend/src/api/warehouseApi.js`
- [x] T018 [US2] Xây dựng trang `WarehouseList.jsx` (Data Table phân trang) tại `frontend/src/pages/warehouse/WarehouseList.jsx`
- [x] T019 [US2] Xây dựng trang `WarehouseDetail.jsx` (Hiển thị 3 Metric Cards) tại `frontend/src/pages/warehouse/WarehouseDetail.jsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Chỉnh sửa thông tin kho (Priority: P2)

**Goal**: Sửa đổi Tên, Địa chỉ kho (bảo vệ trường Code và Type).

**Independent Test**: Gửi PUT request và kiểm tra Code/Type không bị thay đổi trong DB.

### Implementation for User Story 3

- [x] T020 [US3] Cài đặt `WarehouseService.updateWarehouse` (logic Read-only Code/Type) tại `backend/src/main/java/com/duylongtech/backend/service/WarehouseService.java`
- [x] T021 [US3] Thêm endpoint PUT vào `backend/src/main/java/com/duylongtech/backend/controller/WarehouseController.java`
- [x] T022 [P] [US3] Thêm hàm `updateWarehouse` vào `frontend/src/api/warehouseApi.js`
- [x] T023 [US3] Mở rộng `WarehouseFormModal.jsx` hỗ trợ chế độ Edit (Disable input field Code & Type).

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Vô hiệu hóa (Soft Delete) (Priority: P2)

**Goal**: Xóa kho an toàn (chuyển trạng thái INACTIVE nếu có giao dịch).

**Independent Test**: Xóa 1 kho đang chứa hàng và bắt được lỗi báo chuyển INACTIVE.

### Implementation for User Story 4

- [x] T024 [US4] Cài đặt `WarehouseService.deleteWarehouse` (Kiểm tra transactions) tại `backend/src/main/java/com/duylongtech/backend/service/WarehouseService.java`
- [x] T025 [US4] Thêm endpoint DELETE vào `backend/src/main/java/com/duylongtech/backend/controller/WarehouseController.java`
- [x] T026 [P] [US4] Thêm hàm `deleteWarehouse` vào `frontend/src/api/warehouseApi.js`
- [x] T027 [US4] Gắn nút Action Xóa vào bảng dữ liệu của trang `WarehouseList.jsx` và tích hợp API.

---
## Phase 7: User Story 5 - Truy vết Audit Logs (Priority: P3)

**Goal**: Lưu vết tự động mọi hành động CRUD và hiển thị danh sách lịch sử thay đổi trong tab chi tiết kho.

**Independent Test**: Thay đổi thông tin kho, sau đó gọi API GET `/{id}/logs` để kiểm tra log có sinh ra đúng người, đúng giờ và đúng JSON detail hay không.

### Implementation for User Story 5

- [x] T028 [P] [US5] Tạo entity `AuditLog` tại `backend/src/main/java/com/duylongtech/backend/entity/AuditLog.java`
- [x] T029 [P] [US5] Tạo `AuditLogRepository` tại `backend/src/main/java/com/duylongtech/backend/repository/AuditLogRepository.java`
- [x] T030 [P] [US5] Tạo `AuditLogResponse` DTO tại `backend/src/main/java/com/duylongtech/backend/dto/response/AuditLogResponse.java`
- [x] T031 [US5] Cập nhật `WarehouseService`: Thêm hàm private `saveAuditLog` và nhúng nó vào THÀNH CÔNG của các hàm `createWarehouse`, `updateWarehouse`, `deleteWarehouse`.
- [x] T032 [US5] Cài đặt `WarehouseService.getWarehouseLogs` (có phân trang) tại `backend/src/main/java/com/duylongtech/backend/service/WarehouseService.java`
- [x] T033 [US5] Thêm endpoint GET `/{id}/logs` vào `backend/src/main/java/com/duylongtech/backend/controller/WarehouseController.java`
- [x] T034 [P] [US5] Thêm hàm `getWarehouseLogs` vào `frontend/src/api/warehouseApi.js`
- [x] T035 [US5] Xây dựng component `WarehouseAuditLog.jsx` (Dạng Table phân trang, parse JSON hiển thị tiếng Việt) tại `frontend/src/components/warehouse/WarehouseAuditLog.jsx`
- [x] T036 [US5] Tích hợp Component AuditLog thành một Tab "Lịch sử thay đổi" bên trong `frontend/src/pages/warehouse/WarehouseDetail.jsx`

**Checkpoint**: Tính năng lưu vết bảo mật đã hoàn thành. Mọi thay đổi kho đều không thể qua mặt hệ thống.

## Phase 8: User Story 6 - Xuất file Excel (Priority: P2)

**Goal**: Bổ sung tính năng xuất danh sách kho (kèm filters và metrics) ra file `.xlsx` định dạng chuẩn.

**Independent Test**: Lọc dữ liệu trên UI, bấm xuất Excel và mở file kiểm tra định dạng cột (Freeze panes, Number format).

### Implementation for User Story 6

- [x] T037 [US6] Thêm dependency `Apache POI` vào `pom.xml` (Backend) hoặc `xlsx` / `file-saver` vào `package.json` (Frontend) tùy theo chiến lược export. *(Khuyến nghị xử lý ở Backend để an toàn dữ liệu)*.
- [x] T038 [US6] Tạo class utility `ExcelExportHelper.java` để xử lý logic tạo Workbook, định dạng Cell (Freeze Panes, Number format) tại `backend/src/main/java/com/duylongtech/backend/util/ExcelExportHelper.java`
- [x] T039 [US6] Cài đặt `WarehouseService.exportWarehousesToExcel` (Lấy dữ liệu theo filter và gọi Helper) tại `backend/src/main/java/com/duylongtech/backend/service/WarehouseService.java`
- [x] T040 [US6] Thêm endpoint GET `/export` (trả về byte array / file stream) vào `backend/src/main/java/com/duylongtech/backend/controller/WarehouseController.java`
- [x] T041 [P] [US6] Thêm hàm `exportWarehouses` (xử lý response blob) vào `frontend/src/api/warehouseApi.js`
- [x] T042 [US6] Cập nhật `WarehouseList.jsx`: Thêm nút "Xuất Excel" gắn hàm trigger tải file.

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T043 [P] Viết Unit Tests (JUnit + Mockito) cho `WarehouseService` tại `backend/src/test/java/com/duylongtech/backend/service/WarehouseServiceTest.java`
- [x] T044 Kiểm tra format toàn bộ JSON trả về để đảm bảo bọc chuẩn bằng ApiResponse wrapper.
- [x] T045 Tối ưu hóa UI/UX: Thêm Toast notification cho các hành động CRUD thành công/thất bại bên phía React.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
- **Polish (Final Phase - Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1**: Độc lập (P1)
- **US2**: Phụ thuộc US1 để có dữ liệu (P1)
- **US3**: Phụ thuộc US2 để lấy id qua danh sách (P2)
- **US4**: Phụ thuộc US2 để lấy id qua danh sách (P2)
- **US5**: Phụ thuộc US1, US3, US4 để sinh ra action ghi log (P3)
- **US6**: Phụ thuộc US2 để lấy danh sách dữ liệu và áp dụng bộ lọc (P2)