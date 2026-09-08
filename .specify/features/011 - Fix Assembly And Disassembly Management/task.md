# Tasks: Fix Assembly And Disassembly Management

**Feature**: `[011-fix-assembly-and-disassembly-management]`  
**Sources**: `spec.md`, `clarify.md`, `data-model.md`, `plan.md`, `implement.md`  
**Status**: In Progress

**Progress**: 45/50 tasks complete. Implementation phases are complete; database/runtime release gates remain.

## Format

```text
- [ ] Txxx [P?] [US?] Description with exact file path
```

- `[P]`: Có thể làm song song nếu không sửa cùng file và không phụ thuộc trực tiếp.
- `[US1]`: BOM approval/resubmit.
- `[US2]`: Order approval và tự tạo cặp phiếu.
- `[US3]`: Warehouse post, serial và tự hoàn thành.
- `[US4]`: Cancel/unpost và recovery.
- `[US5]`: Role, notification và UI.

Không có task cost allocation/costing mới trong feature này.

## Phase 0 — Decision Gate

- [x] T001 Chốt toàn bộ decision tại `clarify.md` §5 và đổi các mục tương ứng từ “Cần chốt” sang rule cuối cùng trong `.specify/features/011 - Fix Assembly And Disassembly Management/clarify.md`.
- [x] T002 [P] Rà dữ liệu hiện hữu theo state BOM/lệnh/chứng từ để duyệt mapping migration; ghi kết quả vào `.specify/features/011 - Fix Assembly And Disassembly Management/plan.md`.
- [x] T003 [P] Xác nhận Flyway version mới nhất và chọn migration version không trùng trong `backend/src/main/resources/db/migration/`.

**Checkpoint**: Không còn decision mở ảnh hưởng workflow hoặc schema.

## Phase 1 — Foundation, migration and workflow primitives

- [x] T004 Tạo migration workflow sau version Flyway mới nhất trong `backend/src/main/resources/db/migration/Vxx__refine_assembly_workflow.sql`: BOM/order metadata, order `@Version`, cancellation settlement và unique index cặp document.
- [x] T005 [P] Cập nhật `backend/src/main/java/com/duylongtech/backend/entity/AssemblyBom.java` với default `DRAFT` và metadata submit/approve/reject.
- [x] T006 [P] Cập nhật `backend/src/main/java/com/duylongtech/backend/entity/AssemblyOrder.java` với workflow metadata, `@Version`, cancellation settlement; deprecate use `quantityProduced` cho partial completion.
- [x] T007 [P] Thêm constants/enums state và mã business error workflow tại `backend/src/main/java/com/duylongtech/backend/constant/`.
- [x] T008 Thêm query document pair/order lock và existence query theo doc type tại `backend/src/main/java/com/duylongtech/backend/repository/AssemblyOrderRepository.java` và `InventoryDocumentRepository.java`.
- [x] T009 Viết migration/repository tests cho default, backfill và unique cặp export/import tại `backend/src/test/java/com/duylongtech/backend/`.

**Checkpoint**: Schema và repository bảo đảm không có cặp document trùng.

## Phase 2 — User Story 1: BOM approval workflow

- [x] T010 [US1] Refactor create/update BOM để chỉ tạo/sửa `DRAFT`/`REJECTED`, không nhận `APPROVED` từ client trong `backend/src/main/java/com/duylongtech/backend/service/AssemblyOrderService.java` hoặc workflow service mới.
- [x] T011 [US1] Implement actions submit, approve, reject, resubmit; enforce role, reason, audit và lock BOM trong `backend/src/main/java/com/duylongtech/backend/service/AssemblyWorkflowService.java`.
- [x] T012 [US1] Thêm DTO request cho reject reason/action response tại `backend/src/main/java/com/duylongtech/backend/dto/request/` và `dto/response/`.
- [x] T013 [US1] Expose API BOM action rõ nghĩa, bỏ đường update status tùy ý tại `backend/src/main/java/com/duylongtech/backend/controller/AssemblyOrderController.java`.
- [x] T014 [P] [US1] Gửi notification after-commit và audit cho submit/reject tại `AssemblyWorkflowService.java` và `AppNotificationService.java`.
- [x] T015 [US1] Viết unit/integration tests state, role, reason và resubmit tại `backend/src/test/java/com/duylongtech/backend/service/AssemblyWorkflowServiceTest.java`.

**Checkpoint**: BOM `APPROVED` chỉ có thể được Kế toán duyệt.

## Phase 3 — User Story 2: Order approval và document pair

- [x] T016 [US2] Refactor create/update order để chỉ hoạt động ở `DRAFT` (và `REJECTED` nếu T001 chốt resubmit) trong `backend/src/main/java/com/duylongtech/backend/service/AssemblyOrderService.java`.
- [x] T017 [US2] Implement submit/reject/resubmit action, server-side actor/role/reason/audit trong `AssemblyWorkflowService.java`.
- [x] T018 [US2] Implement approve transaction: lock order, validate BOM/warehouse, build snapshot lines và tạo đúng một export + import `DRAFT` tại `AssemblyWorkflowService.java`.
- [x] T019 [US2] Thêm database/application idempotency handling cho retry/concurrent approve tại `AssemblyWorkflowService.java` và `InventoryDocumentRepository.java`.
- [x] T020 [US2] Thay endpoint `PUT /assembly-orders/{id}/status` bằng submit/approve/reject endpoints tại `backend/src/main/java/com/duylongtech/backend/controller/AssemblyOrderController.java`.
- [x] T021 [US2] Ngừng expose/refactor `POST /assembly-orders/{id}/inventory-documents` để client không tự tạo document lines tại `AssemblyOrderController.java`.
- [x] T022 [US2] Thêm API đọc pair documents theo lệnh tại `AssemblyOrderController.java` và response DTO phù hợp.
- [x] T023 [US2] Viết tests approve success, rollback khi tạo document thứ hai lỗi, duplicate retry và concurrent approve tại `AssemblyWorkflowServiceTest.java`.

**Checkpoint**: Duyệt lệnh chỉ tạo một cặp phiếu `DRAFT` từ snapshot server-side.

## Phase 4 — User Story 3: Posting, serial và completion

- [x] T024 [US3] Refactor serial validation tại `backend/src/main/java/com/duylongtech/backend/service/InventoryDocumentService.java`: exact unique count, correct variant, warehouse và availability ở thời điểm post.
- [x] T025 [US3] Chặn post import khi export liên kết chưa `POSTED` trong `InventoryDocumentService.java`.
- [x] T026 [US3] Thêm callback/coordinator sau post export/import để đồng bộ `APPROVED -> IN_PROGRESS -> COMPLETED` tại `InventoryDocumentService.java` và `AssemblyWorkflowService.java`.
- [x] T027 [US3] Cập nhật genealogy để chỉ tạo từ document `POSTED`, không từ request lệnh/execute tại `AssemblyWorkflowService.java` và `AssemblyOrderService.java`.
- [x] T028 [US3] Deprecate/remove endpoint `/assembly-orders/{id}/execute` và logic bypass trong `backend/src/main/java/com/duylongtech/backend/controller/AssemblyOrderController.java`.
- [x] T029 [US3] Viết test post import before export, serial thiếu/trùng/sai kho, completed tự động và all-or-nothing tại `InventoryDocumentServiceFlowTest.java` và `AssemblyWorkflowServiceTest.java`.

**Checkpoint**: Không có luồng post/complete nào bỏ qua cặp chứng từ và backend serial validation.

## Phase 5 — User Story 4: Cancel/unpost and recovery

- [x] T030 [US4] Implement cancel-before-post: cancel cả export/import `DRAFT`, lệnh `CANCELLED` và audit tại `AssemblyWorkflowService.java`.
- [x] T031 [US4] Implement cancel-after-export theo quyết định T001: request/confirm, reason, `PENDING_UNPOST`, khóa import và authorization trong `AssemblyWorkflowService.java`.
- [x] T032 [US4] Guard `unpostExport`: chỉ lệnh cancelled pending-unpost, import chưa `POSTED`, kiểm tra return serial tại `backend/src/main/java/com/duylongtech/backend/service/InventoryDocumentService.java`.
- [x] T033 [US4] Đồng bộ `cancellationSettlementStatus=SETTLED` khi unpost thành công; cấm reopen/reuse order tại `AssemblyWorkflowService.java`.
- [x] T034 [US4] Implement quyết định cho hỏng vật lý/reversal import-post chỉ khi T001 đưa vào scope; nếu ngoài scope, trả business error rõ ràng tại workflow/inventory service.
- [x] T035 [US4] Viết tests cancel draft, cancel after export, unpost restore, import-post block và Cancel/Post race tại `AssemblyWorkflowServiceTest.java`.

**Checkpoint**: Cancel không thể làm tồn/serial/phả hệ sai hoặc để lệnh thành công mở lại.

## Phase 6 — User Story 5: Security, notification and frontend

- [x] T036 [US5] Áp server-side permission/actor extraction theo Technician/Accountant/Warehouse Controller tại `AssemblyOrderController.java` và workflow service.
- [x] T037 [P] [US5] Gửi notification after-commit cho submit, reject, approved và pending unpost tại `AssemblyWorkflowService.java`.
- [x] T038 [US5] Cập nhật `frontend/src/api/assemblyOrderApi.js` theo endpoints action mới, xóa call manual generate/execute.
- [x] T039 [US5] Cập nhật `frontend/src/pages/AssemblyOrder/AssemblyBomFormPage.jsx` cho Draft/Submit/Reject/Resubmit và reason history.
- [x] T040 [US5] Cập nhật `frontend/src/pages/AssemblyOrder/AssemblyOrderFormPage.jsx` để render action theo role/state, pair documents, reject reason và pending-unpost.
- [x] T041 [US5] Ngắt `frontend/src/pages/AssemblyOrder/AssemblyExecutionModal.jsx` khỏi workflow để không thực thi trọn lệnh ngoài phiếu kho.
- [x] T042 [US5] Cập nhật detail import/export liên kết để hiển thị source Assembly Order, block action không hợp lệ và báo lỗi serial từ backend.

**Checkpoint**: UI dẫn đúng workflow và không có action bypass.

## Phase 7 — QA, migration rehearsal and release

- [x] T043 [P] Chạy backend compile: `cd backend; .\mvnw.cmd -DskipTests compile`.
- [ ] T044 [P] Chạy backend tests: `cd backend; .\mvnw.cmd test`.
- [x] T045 [P] Chạy frontend build: `cd frontend; npm.cmd run build`.
- [ ] T046 Rehearse Flyway migration/mapping trên database disposable, kiểm tra order/document trạng thái cũ dở dang.
- [ ] T047 API smoke test theo 3 role: BOM/order approve/reject/resubmit, auto pair, post export/import, auto complete.
- [ ] T048 Chạy toàn bộ manual UI test trong `.specify/features/011 - Fix Assembly And Disassembly Management/ui-test-scenarios.md`.
- [x] T049 Regression: không còn endpoint/UI execute/manual generate có thể bypass workflow; review Swagger và audit event.
- [ ] T050 Cập nhật trạng thái feature/documentation sau khi toàn bộ checkpoint và QA sign-off pass.

### Verification note — 2026-09-06

- Feature tests: 16 checks pass (`AssemblyOrderWorkflowTest`, `AssemblyWorkflowMigrationTest` và 4 assembly inventory-flow tests).
- Backend compile: pass.
- Frontend production build: pass.
- Full backend suite: 206 tests ran; 21 failures and 1 error remain in existing InventoryDocument, Product and StockTransfer suites. T044 stays open.
- T046–T048 require a disposable database and running application with Technician, Accountant and Warehouse Controller accounts.

## Dependencies

```text
Phase 0
  -> Phase 1
      -> Phase 2 (BOM workflow)
      -> Phase 3 (Order approval/pair)
          -> Phase 4 (Post/completion)
          -> Phase 5 (Cancel/unpost)
      -> Phase 6 (Frontend/security) after API actions are stable
          -> Phase 7 (QA/release)
```

T005–T007 và T002–T003 có thể chạy song song trong phạm vi phase của chúng. T038–T042 chỉ bắt đầu khi API contract từ T013/T020–T022 đã ổn định.
