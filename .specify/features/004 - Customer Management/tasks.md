# Tasks: Customer Management (Account Management)

**Input**: Design documents from `.specify/features/004 - Account Management/`

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

- [ ] T001 Khởi tạo branch mới `feature/backend/customer-management` Nếu có rồi thì thôi không phải tạo nữa và làm trên đó luôn

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Thêm các mã lỗi nghiệp vụ (Customer/Partner) vào `backend/src/main/java/com/duylongtech/backend/constant/SystemMessage.java`
- [x] T003 [P] Tạo entity `Partner` tại `backend/src/main/java/com/duylongtech/backend/entity/Partner.java` (Ánh xạ database theo `data-model.md`)
- [x] T004 Tạo `PartnerRepository` tại `backend/src/main/java/com/duylongtech/backend/repository/PartnerRepository.java`
- [x] T005 [P] Cập nhật các entity liên quan (nếu chưa có hoặc thiếu field join): `SalesOrderLine`, `Warranty`, `PaymentReceipt` để phục vụ query lịch sử.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Thêm mới & Tra cứu Khách hàng (Priority: P1) 🎯 MVP

**Goal**: Cho phép nhân viên thêm nhanh hoặc tìm kiếm khách hàng bằng SĐT.

**Independent Test**: Gửi POST request lưu DB thành công, validate SĐT regex. Tìm kiếm GET trả về đúng danh sách phân trang.

### Implementation for User Story 1

- [x] T006 [P] [US1] Tạo `CustomerRequest` và `CustomerResponse` DTO tại `backend/src/main/java/com/duylongtech/backend/dto/`
- [x] T007 [US1] Cài đặt `CustomerService.createCustomer` (validate Regex `@Size`, set default values) và `searchCustomers` tại `backend/src/main/java/com/duylongtech/backend/service/CustomerService.java`
- [x] T008 [US1] Tạo endpoint POST và GET (Search) trong `CustomerController.java`
- [x] T009 [P] [US1] Khởi tạo API service axios `customerApi.js` tại `frontend/src/api/customerApi.js`
- [x] T010 [US1] Xây dựng màn hình danh sách `CustomerList.jsx` (Table Component) có ô Search Autocomplete SĐT.
- [x] T011 [US1] Xây dựng component `CustomerQuickCreateDrawer.jsx` (Dạng Drawer/Modal mở ngang từ mép phải) dùng chung.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Xem chi tiết Hồ sơ (Priority: P1)

**Goal**: Load trang chi tiết khách hàng với 3 Tab: Mua hàng, Bảo hành, Thu chi. Bắt buộc có phân trang và ẩn với KH-0000.

**Independent Test**: Click xem chi tiết khách hàng bình thường ra đủ 3 tab. Khách hàng mã KH-0000 không có nút click.

### Implementation for User Story 2

- [x] T012 [P] [US2] Tạo các DTO Response cho 3 Tab: `SalesHistoryResponse`, `WarrantyHistoryResponse`, `ReceiptHistoryResponse`.
- [x] T013 [P] [US2] Cập nhật `CustomerService` và `CustomerController` để cung cấp 3 API endpoint: `/customers/{id}/sales-history`, `/customers/{id}/warranties`, `/customers/{id}/receipts` (có phân trang).
- [x] T014 [US2] Tạo component `CustomerDetailPage.jsx` (trang chi tiết chia 3 Tab, fetch API khi đổi tab).
- [x] T015 [US2] Thêm 3 endpoint GET vào `CustomerController.java`.
- [x] T016 [P] [US2] Thêm hàm gọi 3 endpoint vào `frontend/src/api/customerApi.js`.
- [x] T017 [US2] Xây dựng trang `CustomerDetail.jsx` với Header thông tin chung và Card Summary Tổng Thu.
- [x] T018 [US2] Xây dựng 3 Component Tab: `SalesHistoryTab.jsx`, `WarrantyTab.jsx`, `ReceiptsTab.jsx` có tích hợp Pagination chuẩn. Cập nhật `CustomerList.jsx` chặn nút "Xem chi tiết" nếu ID là `KH-0000`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Cập nhật thông tin & Ngừng hoạt động (Priority: P2)

**Goal**: Sửa SĐT (có Audit Log) và vô hiệu hóa (Soft Delete) có rào điều kiện.

**Independent Test**: Gửi PUT request sửa SĐT, check bảng AUDIT_LOGS. Gửi PATCH vô hiệu hóa KH đang có thiết bị gửi sửa -> Hệ thống báo lỗi.

### Implementation for User Story 3

- [x] T019 [US3] Cài đặt `CustomerService.updateCustomer` (Ghi Audit Log nếu SĐT đổi) và `deactivateCustomer` (Kiểm tra Repair status).
- [x] T020 [US3] Thêm endpoint PUT và PATCH vào `CustomerController.java`.
- [x] T021 [P] [US3] Thêm hàm `updateCustomer` và `deactivateCustomer` vào `frontend/src/api/customerApi.js`.
- [x] T022 [US3] Tích hợp API update vào component `CustomerQuickCreateDrawer.jsx` (Dùng chung với Create, đổi mode dựa trên props). Tích hợp cảnh báo (UI Warning) khi sửa SĐT.
- [x] T023 [US3] Thêm nút "Sửa" và "Ngừng hoạt động" vào màn hình `CustomerList.jsx` và `CustomerDetail.jsx`. Thêm Confirm Dialog khi bấm Ngừng hoạt động.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T024 [P] Viết Unit Tests (JUnit + Mockito) cho `CustomerService` (Đặc biệt Test edge cases KH-0000, Validation SĐT).
- [x] T025 Kiểm tra format toàn bộ JSON trả về để đảm bảo bọc chuẩn bằng ApiResponse wrapper.
- [~] T026 Tối ưu hóa UI/UX: Thêm Toast notification cho các thao tác thành công/thất bại và bắt lỗi từ API. *(Skipped theo yêu cầu dừng Frontend)*

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
- **Polish (Final Phase - Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1**: Độc lập (P1)
- **US2**: Phụ thuộc US1 để tạo dữ liệu khách hàng (P1)
- **US3**: Phụ thuộc US1, US2 để hiển thị form và lấy ID (P2)
