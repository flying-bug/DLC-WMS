---
description: "Task list for Import Inventory Management (Phase 1)"
---

# Tasks: 001- Import Inventory Management

**Input**: Design documents from `.specify/features/001- Import Inventory Management/`

**Prerequisites**: plan.md, spec.md, database-schema.md, ux-design.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Cài đặt thư viện và cấu trúc dự án cơ bản theo plan.md.

- [ ] T001 Khởi tạo/Kiểm tra cấu trúc module trong thư mục `backend/` và `frontend/`
- [ ] T002 Cài đặt thư viện Apache POI (cho Java Backend) để xử lý đọc file Excel vào `pom.xml`
- [ ] T003 [P] Cài đặt/Kiểm tra thư viện Axios và cấu hình `axiosClient.js` trên Frontend

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: Không bắt đầu US nào trước khi Phase này hoàn thành.

- [ ] T004 Setup database schema và migrations cho các bảng cốt lõi (`WAREHOUSES`, `PRODUCT_VARIANTS`, `SERIAL_NUMBERS`, `INVENTORY_BALANCES`, `INVENTORY_DOCUMENTS`, `INVENTORY_LEDGER`) theo `database-schema.md`
- [ ] T005 Tạo JPA Entities cho toàn bộ các bảng trên trong `backend/src/main/java/com/dlc/wms/models/`
- [ ] T006 [P] Tạo các Spring Data Repositories tương ứng (`SerialNumberRepository`, `InventoryBalanceRepository`, ...)
- [ ] T007 Cấu hình Middleware/Exception Handler chung để xử lý lỗi Validate Data và trả về response chi tiết từng dòng (phục vụ luồng Partial Import)
- [ ] T008 [P] Tạo component dùng chung `SoundPlayer` và `StatusToast` ở frontend để phản hồi âm thanh (Scanner Feedback)

**Checkpoint**: Foundation ready - có thể bắt đầu làm các User Stories.

---

## Phase 3: User Story 1 - Nhập kho & Quét mã (Priority: P1) 🎯 MVP

**Goal**: Cho phép quản lý kho nhập kho bằng Barcode Scanner (từng chiếc) hoặc Import file Excel hàng loạt. Tốc độ focus < 0.1s.

### Backend (US1)
- [ ] T009 [P] [US1] Tạo `InventoryImportService` để xử lý logic nhận 1 mã S/N đơn lẻ và cập nhật `SERIAL_NUMBERS` cùng `INVENTORY_BALANCES`
- [ ] T010 [P] [US1] Bổ sung logic áp dụng Row-level lock (DB Lock) trên bảng `SERIAL_NUMBERS` trong quá trình Insert/Update để tránh double-entry
- [ ] T011 [US1] Xây dựng chức năng đọc file Excel (Apache POI) và triển khai luồng Partial Import (Import dòng đúng, giữ lại dòng lỗi) trong `ExcelImportService`
- [ ] T012 [US1] Tạo các REST API endpoints cho thao tác quét mã lẻ và upload file trong `InventoryController`

### Frontend (US1)
- [ ] T013 [P] [US1] Tạo `TextFormatter` utility để tự động Trim khoảng trắng và Uppercase chuỗi S/N / Barcode đầu vào
- [ ] T014 [US1] Tạo `BarcodeScannerInput` component có khả năng bắt tự động sự kiện phím "Enter" từ súng quét và focus lại ô input trong < 0.1 giây
- [ ] T015 [US1] Xây dựng giao diện trang `ImportInventoryPage` chứa form cấu hình thông tin lô hàng
- [ ] T016 [US1] Tạo component `ExcelUploader` có lưới (Data Grid) hiển thị dữ liệu phản hồi từ API (Bôi đỏ/cảnh báo các dòng lỗi) để user sửa tay
- [ ] T017 [US1] Tích hợp API và `SoundPlayer` để phát bíp ngắn (Thành công) hoặc 3 bíp dài + hiện Toast (Lỗi quét mã)

**Checkpoint**: Quản lý kho có thể nhập dữ liệu vào Sổ cái và Sổ chi tiết thành công qua máy quét và Excel.

---

## Phase 4: User Story 2 - Chuyển kho nội bộ (Priority: P2)

**Goal**: Quét S/N để tự động cập nhật `warehouse_id` mới và điều chỉnh số lượng ở 2 kho.

### Backend (US2)
- [ ] T018 [P] [US2] Thêm hàm `transferSerial` trong `InventoryTransferService` xử lý cập nhật kho cho `SERIAL_NUMBERS`
- [ ] T019 [US2] Thêm logic điều chỉnh `INVENTORY_BALANCES` (Giảm số lượng kho nguồn, tăng kho đích)
- [ ] T020 [US2] Cập nhật lịch sử di chuyển chi tiết vào Thẻ kho `INVENTORY_LEDGER`
- [ ] T021 [US2] Tạo API endpoint cho luồng điều chuyển kho trong `InventoryController`

### Frontend (US2)
- [ ] T022 [P] [US2] Tạo giao diện `TransferInventoryPage` 
- [ ] T023 [US2] Tái sử dụng `BarcodeScannerInput` vào `TransferInventoryPage` để tít mã S/N khi điều chuyển

**Checkpoint**: Có thể điều chuyển linh kiện qua lại giữa các kho và theo dõi lịch sử.

---

## Phase 5: User Story 3 - Lắp ráp PC & Xuất bán (Priority: P2)

**Goal**: Quét từng linh kiện rời để đánh dấu Đã bán (SOLD) và liên kết với Đơn hàng (`sales_order_id`).

### Backend (US3)
- [ ] T024 [P] [US3] Viết `SalesOutboundService` thay đổi trạng thái của Serial Number thành `SOLD`
- [ ] T025 [US3] Validate S/N phải có trạng thái `AVAILABLE` mới được phép xuất.
- [ ] T026 [US3] Gán S/N với `sales_order_line_id` tương ứng và trừ tổng lượng trên Sổ cái.

### Frontend (US3)
- [ ] T027 [P] [US3] Tạo giao diện `SalesOutboundPage` cho quy trình xuất bán hàng.

---

## Phase 6: User Story 4 - Bảo hành linh kiện trong PC (Priority: P3)

**Goal**: Tra cứu nhanh lịch sử S/N và tính hợp lệ của bảo hành.

### Backend (US4)
- [ ] T028 [P] [US4] Viết API query thông tin S/N tổng hợp bao gồm Ngày xuất bán, Đơn hàng gốc, Khách hàng và hạn Bảo hành.

### Frontend (US4)
- [ ] T029 [P] [US4] Tạo `WarrantyLookupComponent` hiển thị chi tiết thông tin trả về khi quét S/N hỏng của linh kiện cần kiểm tra bảo hành.

---

## Dependencies & Execution Order

- **Phase 2 (Foundational)** phải hoàn thành trước toàn bộ các User Stories.
- Task Backend US1 (T009 - T012) có thể làm song song với Task Frontend US1 (T013 - T016). Tuy nhiên T017 (Tích hợp luồng quét & phản hồi) cần API Backend sẵn sàng.
- Partial Import (T011) là task cực kỳ quan trọng, cần phối hợp chặt chẽ với cấu trúc Error Response của (T007).
