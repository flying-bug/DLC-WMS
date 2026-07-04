# Tasks: Warehouse Staff Management

**Input**: Design documents from `.specify/features/005 - Warehouse Staff Management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/main/java/com/dlcwms/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Khởi tạo branch mới `feature/005-warehouse-staff-management` (Bỏ qua nếu đã làm việc trên branch chuẩn)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Thêm các mã lỗi nghiệp vụ (Staff RBAC/Hard Block) vào file Constant System Message của Backend.
- [ ] T003 [P] Khởi tạo Entity `UserWarehouseRole` tại thư mục Entity của Backend (Map đúng cấu trúc `data-model.md` với `UNIQUE KEY`).
- [ ] T004 Khởi tạo `UserWarehouseRoleRepository` với các hàm query cơ bản.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Xem danh sách nhân sự tại kho (Priority: P1)

**Goal**: Hiển thị danh sách nhân viên thuộc kho với tính năng Filter và Toggle trạng thái Active/Inactive.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Tạo `WarehouseStaffResponse` DTO tại Backend.
- [ ] T006 [US1] Cài đặt `WarehouseStaffService.getStaffList` (Nhóm các role theo userId, mặc định filter `is_active = TRUE` nếu không có param `is_active = FALSE`).
- [ ] T007 [US1] Khởi tạo `WarehouseStaffController` và thêm endpoint `GET /api/v1/warehouses/{warehouseId}/staff`.
- [ ] T008 [P] [US1] Khởi tạo API service axios `warehouseStaffApi.js` tại `frontend/src/services/`.
- [ ] T009 [US1] Xây dựng màn hình danh sách `WarehouseStaffList.jsx` chứa Table.
- [ ] T010 [US1] Thêm các tính năng Filter (Theo Vai trò) và Toggle Checkbox (Hiển thị nhân sự đã ngừng hoạt động) trên màn hình danh sách.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Gán quyền nhân sự (Multi-role) (Priority: P1)

**Goal**: Cung cấp API Filter Roles và API POST để gán nhiều role cho 1 user tại kho.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Thêm API Endpoint `GET /api/v1/roles?module=WAREHOUSE` tại `RoleController` (Hoặc thêm Filter cho Role List hiện có) để đảm bảo không trả về quyền Admin/System.
- [ ] T012 [US2] Cài đặt `WarehouseStaffService.assignRoles` (Xử lý mảng `roleIds`, update `is_active = TRUE` hoặc thêm mới bản ghi. Tích hợp Audit Log).
- [ ] T013 [US2] Thêm endpoint POST vào `WarehouseStaffController`.
- [ ] T014 [US2] Xây dựng UI Component `AssignStaffModal.jsx` (Dạng Modal hoặc Drawer) chứa ô Search User Autocomplete và Select Multiple Roles Dropdown.
- [ ] T015 [US2] Tích hợp gọi API gán quyền và show Toast/Notification thành công.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Thu hồi quyền & Hard Block (Priority: P2)

**Goal**: Thu hồi quyền (Soft Delete `is_active = FALSE`) và tích hợp rào chắn Hard Block với các chứng từ dở dang.

### Implementation for User Story 3

- [ ] T016 [US3] Khởi tạo các hàm Query phụ trong Repositories (`InventoryDocumentRepository`, `StockTransferRepository`...) để check sự tồn tại của phiếu có `created_by = userId` VÀ `status IN ('DRAFT', 'SUBMITTED')`.
- [ ] T017 [US3] Cài đặt `WarehouseStaffService.revokeAccess` (Gọi các query check ở trên. Nếu tồn tại, ném Exception 400. Nếu không, update `is_active = FALSE`).
- [ ] T018 [US3] Thêm endpoint DELETE vào `WarehouseStaffController`.
- [ ] T019 [US3] Thêm nút "Thu hồi quyền" vào màn hình danh sách nhân sự (Hiển thị Confirm Dialog).
- [ ] T020 [US3] Tích hợp API và bắt mã lỗi 400 từ Backend để hiển thị câu cảnh báo: *"Nhân viên đang có chứng từ chưa hoàn tất..."* lên Toast/Modal.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T021 [P] Viết Unit Tests (JUnit) cho `WarehouseStaffService` (Kiểm thử kỹ luồng Hard Block ném Exception và luồng kiêm nhiệm nhiều roles).
- [ ] T022 Kiểm tra format JSON response và tối ưu hóa xử lý lỗi (Global Exception Handler) cho mã 403 (Trái thẩm quyền).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
- **Polish (Final Phase - Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1**: Độc lập (P1)
- **US2**: Phụ thuộc vào US1 để có giao diện hiển thị danh sách sau khi gán (P1)
- **US3**: Phụ thuộc vào US1 và US2 để có user trên giao diện nhằm click thu hồi quyền (P2)
