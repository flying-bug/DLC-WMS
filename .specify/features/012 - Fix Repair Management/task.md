# Tasks: Fix Repair Management

**Feature**: `[012-fix-repair-management]`  
**Updated**: 2026-09-16  
**Status**: Ready  
**Sources**: `spec.md`, `clarify.md`, `data-model.md`, `implemement.md`, `plan.md`

## 1. Quy ước

- `[P]`: có thể làm song song khi dependency trước đó đã hoàn tất.
- `[BE]`, `[FE]`, `[DB]`, `[QA]`: khu vực chính.
- Mỗi task chỉ được đánh dấu xong khi code và test liên quan cùng hoàn tất.
- Không sửa các thay đổi unrelated đang có trong worktree.

## 2. Phase 0 — Baseline và dữ liệu hiện trạng

- [ ] **T001 [QA]** Ghi characterization tests cho `RepairWorkflowService.transitionStatus`, `handleConfirm`, `handleDone` và các transition feature 007 hiện tại.
- [ ] **T002 [QA]** Ghi API test chứng minh `PUT /repairs/{id}/status` và payload actor/status hiện còn được sử dụng ở đâu trước khi loại bỏ.
- [ ] **T003 [DB]** Kiểm tra schema thực tế sau `V21`, `V23`, migration mới nhất và ghi lại tên constraint/index Repair hiện hành.
- [ ] **T004 [DB]** Viết query audit dữ liệu: Repair theo status, duplicate inventory document theo Repair, `responsible_person` không map User, active serial trùng và warehouse thiếu SCRAP mapping.
- [x] **T005 [BE]** Xác nhận scale/rounding thống nhất giữa `REPAIRS.total_amount` và `PAYMENT_TRANSACTIONS.amount`; cập nhật `clarify.md` nếu schema thật khác giả định.

**Gate 0**: Có baseline tests và báo cáo migration; chưa thay state production trước gate này.

## 3. Phase 1 — Migration và domain foundation

- [x] **T006 [DB]** Tạo migration Flyway version kế tiếp, dự kiến `backend/src/main/resources/db/migration/V57__fix_repair_management.sql`; xác nhận version ngay trước khi tạo.
- [x] **T007 [DB]** Trong migration, thêm workflow/fee/device/reject/transition/return fields cho `REPAIRS` theo `data-model.md`.
- [x] **T008 [DB]** Thêm `WAREHOUSES.scrap_warehouse_id` self-FK và index.
- [x] **T009 [DB]** Cho `STOCK_RESERVATIONS.sales_order_id` nullable, thêm `repair_id`, FK và unique `(repair_id, variant_id, warehouse_id)`.
- [x] **T010 [DB]** Thêm `INVENTORY_DOCUMENTS.document_role` và unique `(reference_type, reference_id, document_role)` sau khi xử lý duplicate.
- [x] **T011 [DB]** Thêm Repair reference/idempotency fields và index/unique phù hợp cho `PAYMENT_TRANSACTIONS`.
- [x] **T012 [DB]** Map legacy statuses, backfill dữ liệu chắc chắn và xuất danh sách record cần xử lý thủ công; không đoán assigned technician.
- [x] **T013 [QA]** Viết migration test cho mọi mapping legacy, constraint mới, duplicate document và record không map an toàn.
- [x] **T014 [BE]** Cập nhật `RepairStatus` và thêm fee policy/outcome/document role enums hoặc constants theo convention hiện tại.
- [x] **T015 [BE]** Cập nhật `Repair`, `RepairLine`, `Warehouse`, `StockReservation`, `InventoryDocument`, `PaymentTransaction` entities theo migration.
- [x] **T016 [BE]** Thêm/điều chỉnh repository methods có lock và queries theo Repair reference/assigned technician/active serial.

**Gate 1**: Application boot với schema mới; migration test pass; unique/FK không làm mất dữ liệu.

## 4. Phase 2 — RBAC, intake và submit

- [x] **T017 [BE]** Thu hẹp `RepairRequest`: bỏ status, actor và snapshot amount khỏi writable payload; thêm assigned technician, fee policy, percent, intake/manual device fields.
- [x] **T018 [BE]** Tạo DTO action tối thiểu cho diagnosis, reject, finish, cancel, payment và return device.
- [x] **T019 [BE]** Refactor `RepairService.createRepair/updateRepair` để chỉ Kế toán thao tác `DRAFT` và backend luôn gán state/actor.
- [x] **T020 [BE]** Reuse `CustomerService` để validate/link Partner; không duplicate logic tạo khách trong Repair service.
- [x] **T021 [BE]** Validate internal serial–variant và cặp manual device fields; chặn một active Repair cho cùng serial dưới concurrency.
- [x] **T022 [BE]** Validate fee policy: warranty=0, paid=100, partial trong khoảng (0,100).
- [x] **T023 [BE]** Validate assigned user active có `ROLE_TECHNICIAN` và repair warehouse hợp lệ.
- [x] **T024 [BE]** Resolve `warehouse.scrapWarehouseId`, validate active/type `SCRAP`, snapshot vào Repair khi submit.
- [x] **T025 [BE]** Implement `POST /repairs/{id}/submit`: lock, validate, transition, metadata, audit và after-commit notification.
- [ ] **T026 [QA] [P]** Test create/update/submit với Accountant, role sai, Partner sai, KTV sai, device sai, duplicate active serial và thiếu scrap mapping.

**Gate 2**: Chỉ Kế toán tạo/sửa/submit được lệnh hợp lệ; client không spoof state/actor.

## 5. Phase 3 — Technician workflow

- [x] **T027 [BE]** Implement diagnosis endpoint chỉ cho assigned KTV ở `WAITING_CONFIRM`.
- [x] **T028 [BE]** Validate `ADD`, `REPLACE`, `REMOVE`, quantity, variant, price/fee snapshot và ownership fields.
- [x] **T029 [BE]** Implement reject có reason, chuyển về `DRAFT`, lưu latest metadata/audit và notify Accountant.
- [x] **T030 [BE]** Implement accept không cần export: `WAITING_CONFIRM → IN_REPAIR`, không tạo document/reservation rỗng.
- [x] **T031 [BE]** Mở rộng reservation service/repository để tạo, fulfil, release reservation thuộc Repair.
- [x] **T032 [BE]** Implement accept có export: lock Repair/tồn, reserve và tạo đúng một `PARTS_EXPORT DRAFT` atomically.
- [x] **T033 [BE]** Xử lý duplicate-key/retry accept idempotently; request xung đột phải trả lỗi, không trả success giả.
- [ ] **T034 [QA] [P]** Test assigned/unassigned KTV, reject/resubmit, no-parts accept, insufficient stock, rollback và concurrent accept.

**Gate 3**: KTV workflow hoàn chỉnh đến `WAITING_STOCK/IN_REPAIR`; không document/reservation trùng hoặc mồ côi.

## 6. Phase 4 — Warehouse export và unpost

- [x] **T035 [BE]** Nhận diện Repair document bằng `referenceType/referenceId/documentRole` trong `InventoryDocumentService`/posting service.
- [x] **T036 [BE]** Enforce warehouse controller và quyền tại warehouse cho sửa serial/post/unpost Repair document.
- [x] **T037 [BE]** Validate export serial distinct, exact quantity, variant, warehouse, availability và reservation tại backend.
- [x] **T038 [BE]** Sau post export, fulfil reservation và chuyển Repair `WAITING_STOCK → IN_REPAIR` trong cùng transaction.
- [x] **T039 [BE]** Implement hủy `PARTS_EXPORT DRAFT`: cancel document, release reservation, Repair về `WAITING_CONFIRM` và notify KTV.
- [x] **T040 [BE]** Implement safe unpost `PARTS_EXPORT POSTED`: dependency check, restore inventory/serial/ledger, Repair về `WAITING_STOCK`.
- [x] **T041 [BE]** Chặn unpost khi Repair `DONE`, scrap import đã post hoặc inventory dependency không cho phép.
- [ ] **T042 [QA] [P]** Test serial/non-serial, wrong warehouse, wrong role, concurrent post/cancel, rollback và allowed/blocked unpost.

**Gate 4**: Chỉ post thành công mới vào `IN_REPAIR`; post/unpost không làm lệch Repair, reservation hoặc tồn.

## 7. Phase 5 — Finish technical và scrap import

- [x] **T043 [BE]** Implement `RepairFinishRequest` với outcome, removed variant/quantity/serials và scrap condition.
- [x] **T044 [BE]** Validate finish chỉ bởi assigned KTV khi `IN_REPAIR`; serial-managed quantity phải nguyên và đủ serial.
- [x] **T045 [BE]** Implement no-removed branch: snapshot money và chuyển trực tiếp `DONE`.
- [x] **T046 [BE]** Implement removed branch: tạo/reuse một `SCRAP_IMPORT DRAFT` từ hàng tháo thực tế và chuyển `WAITING_SCRAP_RETURN`.
- [x] **T047 [BE]** Enforce Thủ kho có quyền tại `repair.scrapWarehouseId`; validate physical receipt serial/variant/quantity.
- [x] **T048 [BE]** Sau post scrap import, cập nhật inventory/serial/ledger, snapshot money và chuyển `DONE` atomically.
- [x] **T049 [BE]** Chặn scrap import rỗng, post trước export bắt buộc và unpost sau `DONE`.
- [ ] **T050 [QA] [P]** Test `ADD/REPLACE/REMOVE`, no-scrap path, scrap path, duplicate finish, wrong scrap warehouse và rollback post.

**Gate 5**: `DONE` chỉ đạt khi đúng điều kiện kỹ thuật/kho; không có scrap document giả hoặc trùng.

## 8. Phase 6 — Fee split, Payment và bàn giao

- [x] **T051 [BE]** Centralize fee split bằng `BigDecimal`; company amount lấy bằng phép trừ để không lệch tổng.
- [x] **T052 [QA] [P]** Test policy boundary 0/100/partial, rounding, total zero, VAT và invariant snapshot.
- [x] **T053 [BE]** Mở rộng `PaymentService`/repository để hỗ trợ Repair reference và idempotency key.
- [x] **T054 [BE]** Implement `POST /repairs/{id}/payment-documents`: chỉ Accountant sau `DONE`, amount lấy từ snapshot; không tạo phiếu zero.
- [ ] **T055 [QA] [P]** Test payment trước DONE, role sai, retry/concurrency, amount tampering và Partner ledger.
- [x] **T056 [BE]** Implement `POST /repairs/{id}/return-device`: recipient validation, handover code, server actor/time, không đổi status.
- [ ] **T057 [QA] [P]** Test return trước/sau DONE, duplicate call, role sai và Repair state/inventory không đổi.
- [x] **T058 [FE]** Reuse/extend print utility để in phiếu bàn giao metadata; không thêm OTP hoặc signature upload.

**Gate 6**: Fee snapshot đúng; payment và handover liên kết Repair, idempotent và chỉ chạy sau `DONE`.

## 9. Phase 7 — API, permissions, audit và notifications

- [x] **T059 [BE]** Thay controller status endpoint bằng action routes trong `spec.md`; ngừng expose `PUT /repairs/{id}/status`.
- [x] **T060 [BE]** Cập nhật permission seed/mapping tối thiểu cho Accountant, Technician và Warehouse Controller; domain guard vẫn bắt buộc.
- [x] **T061 [BE]** Audit create/update/submit/diagnosis/accept/reject/cancel/finish/reservation/document/payment/return với actor và transition.
- [x] **T062 [BE]** Phát notification after-commit cho các event Repair, có deep link và de-duplicate key.
- [ ] **T063 [QA] [P]** Test API contract, 403/business errors, actor spoofing, audit payload và notification rollback/de-duplication.

## 10. Phase 8 — Frontend

- [x] **T064 [FE]** Cập nhật `frontend/src/api/repairApi.js`: bỏ `updateRepairStatus`, thêm action APIs.
- [x] **T065 [FE]** Cập nhật state labels, filters và work queue trong `RepairListPage.jsx`.
- [x] **T066 [FE]** Refactor `RepairFormPage.jsx` để fields/action theo role, state và `allowedActions`; bỏ `EDITABLE_STATUSES` cũ.
- [x] **T067 [FE]** Reuse `CustomerModal.jsx` cho tìm/tạo nhanh Partner và tự gắn ID trả về.
- [x] **T068 [FE]** Thêm diagnosis/reject/accept UI cho assigned KTV; hiển thị lỗi tồn từ backend.
- [x] **T069 [FE]** Bỏ chỉnh serial xuất trong Repair; thêm liên kết mở `PARTS_EXPORT` cho Thủ kho.
- [x] **T070 [FE]** Thêm finish technical UI với outcome, removed parts, scrap condition và removed serials.
- [x] **T071 [FE]** Thêm panel hai inventory documents và trạng thái/reservation liên quan.
- [x] **T072 [FE]** Thêm fee policy/percent preview nhưng luôn render amount từ response backend sau save/action.
- [x] **T073 [FE]** Thêm payment và return-device actions chỉ sau `DONE`; hiển thị handover metadata.
- [x] **T074 [FE]** Xóa nút “Bắt đầu sửa chữa”, “Kết thúc sửa chữa” cũ và mọi payload status/actor/snapshot amount.
- [ ] **T075 [QA] [P]** Viết frontend tests cho action visibility, quick-create, diagnosis, linked docs, finish, fee split và return device.

**Gate 8**: Không còn UI/API client bypass workflow; mỗi vai trò hoàn thành được hành trình của mình.

## 11. Phase 9 — Release verification

- [x] **T076 [QA]** Chạy toàn bộ backend tests và build.
- [x] **T077 [QA]** Chạy frontend tests và production build.
- [ ] **T078 [DB]** Rehearse migration trên bản sao dữ liệu feature 007 đại diện; kiểm tra orphan, duplicate, status và rollback/runbook.
- [ ] **T079 [QA]** Manual E2E happy path có parts + scrap với ba tài khoản thật.
- [ ] **T080 [QA]** Manual E2E các nhánh: no parts, no scrap, reject/resubmit, insufficient stock, export unpost và repair outcome thất bại.
- [ ] **T081 [QA]** Security E2E với KTV không được phân công, Thủ kho sai warehouse và payload spoof actor/status/amount.
- [ ] **T082 [BE]** Review OpenAPI, error messages, notification links và permission matrix.
- [ ] **T083 [QA]** Đối chiếu Definition of Done trong `spec.md`; ghi release evidence và các giới hạn ngoài scope.

## 12. Dependency và critical path

```text
T001–T005
  → T006–T016
  → T017–T026
  → T027–T034
  → T035–T042
  → T043–T050
  → T051–T063
  → T064–T075
  → T076–T083
```

Các task `[P]` chỉ song song trong phase khi entity/API contract mà chúng phụ thuộc đã ổn định. Không merge UI action trước backend authorization/state guard tương ứng.

## 13. Scope guard

Không thêm các hạng mục sau vào task v012:

- `PARTS_RETURN`/`CANCEL_PENDING_RETURN`.
- Partial fulfillment hoặc nhiều export/import cùng role.
- Cost allocation mới.
- OTP bàn giao hoặc chữ ký số.
- Tự động phát hành hóa đơn điện tử.
- Vòng đời xử lý phế phẩm sau nhập.

Nếu một hạng mục trên trở thành bắt buộc, tạo feature/spec riêng hoặc mở lại Decision Gate trước khi sửa code.
