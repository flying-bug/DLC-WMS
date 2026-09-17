# Implementation Guide: Fix Repair Management

**Feature**: `[012-fix-repair-management]`  
**Updated**: 2026-09-16  
**Sources**: `spec.md`, `clarify.md`, `data-model.md`, `plan.md`

> Tên file `implemement.md` được giữ đúng theo yêu cầu của feature. Đây là hướng dẫn triển khai; danh sách công việc có thể đánh dấu nằm trong `task.md`.

## 1. Nguyên tắc triển khai

1. `RepairWorkflowService` là coordinator duy nhất của state machine Repair.
2. `InventoryDocumentService` vẫn là nơi duy nhất post/unpost và thay đổi tồn, serial, ledger.
3. `PaymentService` vẫn là nơi duy nhất tạo/post giao dịch tiền.
4. Actor lấy từ Spring Security; DTO không nhận actor hoặc status đặc quyền.
5. Frontend không quyết định transition; chỉ gọi action endpoint và render response backend.
6. Reuse service/repository hiện có; không tạo engine workflow, event bus hoặc payment subsystem mới.

## 2. Backend foundation

### 2.1 Enum và domain methods

Cập nhật `backend/src/main/java/com/duylongtech/backend/enums/RepairStatus.java`:

```text
DRAFT
WAITING_CONFIRM
WAITING_STOCK
IN_REPAIR
WAITING_SCRAP_RETURN
DONE
CANCELLED
```

Thêm enum nhỏ nếu codebase đang dùng enum cho domain vocabulary:

- `RepairFeePolicy`: `WARRANTY`, `PAID`, `PARTIAL`.
- `RepairOutcome`: `SUCCESS`, `FAILED`, `CUSTOMER_DECLINED`, `UNREPAIRABLE`.
- `InventoryDocumentRole`: `PARTS_EXPORT`, `SCRAP_IMPORT`.

Không giữ public method nhận target status tùy ý. Entity/domain cung cấp action có precondition rõ:

```text
submit(actor, technician, scrapWarehouse)
reject(actor, reason)
accept(actor)
markWaitingStock(actor)
markInRepair(actor)
finishWithoutScrap(actor, outcome)
markWaitingScrap(actor, outcome)
completeAfterScrap(actor)
cancel(actor, reason)
markReturned(actor, recipient)
```

Nếu transition orchestration nằm ở service, entity vẫn phải chặn state không hợp lệ để tránh caller khác bypass.

### 2.2 Request/response DTO

Tách request theo action thay vì mở rộng một DTO lớn:

| DTO | Trường client được gửi |
|---|---|
| `RepairDraftRequest` hoặc `RepairRequest` đã thu hẹp | Partner, device, intake, warehouse, assigned technician, fee policy/percent, note |
| `RepairDiagnosisRequest` | Diagnosis, parts, fees |
| `RepairRejectRequest` | `reason` |
| `RepairFinishRequest` | `outcome`, removed parts/serials/scrap condition |
| `RepairCancelRequest` | `reason` |
| `RepairReturnRequest` | Recipient name/phone, note |
| `RepairPaymentRequest` | Payment method, idempotency key; amount lấy từ Repair snapshot |

Không bind các field:

```text
repairStatus, createdBy, submittedBy, acceptedBy,
completedBy, returnedBy, role, totalAmount snapshot
```

Response nên trả `allowedActions` hoặc đủ role/state flags để frontend render chính xác, nhưng backend vẫn kiểm tra lại mỗi action.

### 2.3 Repository locking

Tái sử dụng/mở rộng `RepairRepository.findByIdForUpdate(...)` để action thay đổi workflow lock Repair row.

Repository cần:

```text
findByIdForUpdate(id)
existsActiveBySerialNumberId(serialId, excludedRepairId)
findByAssignedTechnicianIdAndRepairStatusIn(...)
findDocumentsByReferenceAndRoleForUpdate(...)
findReservationByRepairAndVariantAndWarehouseForUpdate(...)
```

Lock theo thứ tự ổn định: Repair → inventory balance/serial/reservation → document. Giữ cùng thứ tự giữa accept, post, unpost và cancel để giảm deadlock.

## 3. Migration

Tạo Flyway migration sau version mới nhất tại thời điểm implement; hiện dự kiến `V57__fix_repair_management.sql`.

Migration phải:

1. Thêm field Repair và workflow metadata từ `data-model.md`.
2. Thêm `WAREHOUSES.scrap_warehouse_id`.
3. Cho `STOCK_RESERVATIONS.sales_order_id` nullable và thêm `repair_id`.
4. Thêm `INVENTORY_DOCUMENTS.document_role` cùng unique business key.
5. Thêm reference/idempotency cho `PAYMENT_TRANSACTIONS`.
6. Map trạng thái cũ và xử lý constraint `V21`/`V23` theo đúng thứ tự drop/backfill/add.
7. Tạo báo cáo hoặc bảng tạm/log migration cho record không map KTV/mapping kho an toàn.

Trước khi thêm unique index, query duplicate theo reference/role. Migration phải fail rõ ràng hoặc cô lập record bất thường; không xóa document để làm migration chạy qua.

## 4. Intake và submit

### 4.1 Create/update draft

Refactor `RepairService`:

- Create luôn set `DRAFT` ở server.
- Kế toán mới được create/update header.
- Validate Partner là customer active.
- Device trong hệ thống: serial thuộc đúng variant.
- Device ngoài: yêu cầu cặp manual fields.
- Validate fee policy bằng rule trong `clarify.md`.
- Không dùng `underWarranty` client làm nguồn quyết định giá.

Quick-create Partner gọi Customer Service hiện có từ UI/API, sau đó dùng ID trả về trong Repair; không duplicate logic tạo customer trong RepairService.

### 4.2 Submit

`POST /repairs/{id}/submit` trong một transaction:

```text
lock Repair
assert actor is ACCOUNTANT
assert state == DRAFT
validate required intake fields
validate Partner, active assigned technician and role
validate repair warehouse
resolve active SCRAP mapping
assert no other active Repair for device serial
snapshot scrapWarehouseId
transition WAITING_CONFIRM
save metadata + audit
publish after-commit notification
```

Không tạo reservation hoặc inventory document ở submit.

## 5. Diagnosis, reject và accept

### 5.1 Diagnosis update

- Chỉ assigned KTV và state `WAITING_CONFIRM`.
- Validate action type, quantities, variant and price snapshot.
- `ADD` cần phần xuất mới; `REPLACE` có phần xuất mới và có thể có phần tháo cũ sau này; `REMOVE` không tạo export.
- Không cho client chốt serial xuất ở Repair; serial xuất thuộc inventory draft/document UI của Thủ kho.

### 5.2 Reject

Trong một transaction:

```text
lock Repair
assert assigned technician and WAITING_CONFIRM
assert reason not blank
transition DRAFT
save latest rejection metadata + audit
notify accountant after commit
```

Ở `WAITING_CONFIRM` chưa có reservation/document nên reject không cần cleanup kho.

### 5.3 Accept không cần export

Nếu không có `ADD` hoặc phần lắp mới của `REPLACE`:

```text
WAITING_CONFIRM → IN_REPAIR
```

Không tạo reservation hoặc document rỗng.

### 5.4 Accept có export

Trong một transaction:

```text
lock Repair
assert assigned technician and WAITING_CONFIRM
normalize/group required quantities by variant + warehouse
lock relevant balance/reservation rows in stable order
recalculate available quantity
create/reuse repair reservations
create/reuse one PARTS_EXPORT DRAFT from Repair snapshot
transition WAITING_STOCK
save audit
notify warehouse after commit
```

Database unique keys là lớp bảo vệ cuối. Nếu concurrent request gặp duplicate key, re-read Repair/document và trả response hiện tại nếu action trước đã hoàn thành tương đương; không trả thành công nếu dữ liệu xung đột.

## 6. Inventory integration

### 6.1 Post export

Trong `InventoryDocumentService`/posting service hiện có:

1. Nhận document `PARTS_EXPORT`, lock document và referenced Repair.
2. Assert Repair `WAITING_STOCK`.
3. Assert actor là warehouse controller có quyền tại kho.
4. Validate serial distinct, variant, warehouse, status, quantity và reservation.
5. Dùng posting logic hiện có để trừ tồn/cost layer, cập nhật ledger/serial.
6. Fulfil reservation của Repair.
7. Gọi workflow sync chuyển `IN_REPAIR` trong cùng transaction.
8. Ghi audit; notification sau commit.

Không thêm endpoint start repair.

### 6.2 Hủy export draft

- Chỉ warehouse controller khi Repair `WAITING_STOCK`.
- Cancel/invalidate document bằng status, release reservation atomically.
- Repair về `WAITING_CONFIRM`; KTV được thông báo.

### 6.3 Unpost export

- Chỉ khi Repair chưa `DONE`.
- Không có `SCRAP_IMPORT POSTED` hoặc dependency inventory khác.
- Dùng service unpost hiện tại để khôi phục đúng tồn, serial, ledger.
- Repair về `WAITING_STOCK`; không tự cancel.
- Kế toán chỉ cancel sau khi document không còn `POSTED`.

### 6.4 Finish technical

Trong một transaction:

```text
lock Repair
assert assigned technician and IN_REPAIR
validate outcome
validate removed lines, serial and scrap condition
if no removed items:
    snapshot money
    transition DONE
else:
    create/reuse one SCRAP_IMPORT DRAFT at repair.scrapWarehouseId
    transition WAITING_SCRAP_RETURN
save audit
notify next owner after commit
```

Phiếu scrap lấy dữ liệu từ removed snapshot; không lấy toàn bộ dòng `REPLACE/REMOVE` nếu KTV không xác nhận đã tháo thực tế.

### 6.5 Post scrap import

- Assert Repair `WAITING_SCRAP_RETURN` và actor có quyền tại scrap warehouse snapshot.
- Validate hàng vật lý/serial/variant/quantity.
- Dùng import posting logic hiện tại; serial nhận trạng thái scrap theo rule kho.
- Snapshot tiền và chuyển `DONE` trong cùng transaction.
- Không cho unpost sau khi `DONE` trong v012.

## 7. Fee calculation và Payment

Tập trung công thức trong một method/service hiện có, không tính riêng ở controller/UI:

```java
customerPayAmount = totalAmount
    .multiply(customerSharePercent)
    .divide(new BigDecimal("100"), moneyScale, RoundingMode.HALF_UP);
companyCoveredAmount = totalAmount.subtract(customerPayAmount);
```

Áp policy để derive percent trước khi tính. UI có thể preview nhưng backend response là nguồn cuối.

`POST /repairs/{id}/payment-documents`:

- Chỉ Kế toán và Repair `DONE`.
- Nếu `customerPayAmount == 0`, trả business response “không phát sinh thu khách”, không tạo payment zero.
- Amount lấy từ snapshot, không nhận amount tùy ý từ client.
- Tạo Payment qua `PaymentService` với `referenceType/referenceId/idempotencyKey`.
- Retry trả lại transaction hiện có.

## 8. Return device

`POST /repairs/{id}/return-device`:

- Chỉ Kế toán, Repair `DONE`, chưa returned.
- Validate recipient name/phone.
- Sinh `handoverCode`, ghi server timestamp và principal.
- Retry cùng idempotency/context trả lại metadata hiện có; không ghi đè người nhận âm thầm.
- Không đổi Repair status và không chạm inventory/payment.

Frontend dùng metadata để in phiếu ký tay. Không gọi Auth OTP APIs.

## 9. Authorization, audit và notification

- Controller dùng permission coarse-grained nếu convention yêu cầu; domain service luôn enforce role/state/assignment chi tiết.
- Super Admin chỉ bypass theo cơ chế phân quyền chung đã có, nhưng không bypass validation/state và vẫn audit.
- Mỗi action audit old/new state, actor, entity/document IDs, timestamp và reason.
- Notification đăng ký `afterCommit`; de-duplicate bằng event key. Notification lỗi được log/retry riêng, không rollback transaction nghiệp vụ.

## 10. Frontend

### 10.1 API client

Thay `frontend/src/api/repairApi.js`:

- Bỏ `updateRepairStatus` khỏi flow công khai.
- Thêm `submitRepair`, `saveDiagnosis`, `acceptRepair`, `rejectRepair`, `finishTechnical`, `cancelRepair`, `getRepairInventoryDocuments`, `createRepairPayment`, `returnDevice`.

### 10.2 Repair pages

Refactor:

- `RepairListPage.jsx`: filter/state label mới; KTV chỉ nhận danh sách được assign.
- `RepairFormPage.jsx`: chia section theo ownership, action theo state/role/allowedActions.
- Bỏ `EDITABLE_STATUSES = ['DRAFT', 'QUOTATION', 'UNDER_REPAIR']` và nút bắt đầu/kết thúc cũ.
- Bỏ sửa serial xuất trong Repair; dẫn tới phiếu kho draft cho Thủ kho.
- Thêm finish modal cho removed parts/outcome.
- Thêm linked-documents panel, fee split preview và return-device modal.
- Reuse `CustomerModal.jsx` để quick-create Partner.
- Reuse UI unpost/notification/printing hiện có khi phù hợp.

UI không tự giả định thành công: sau mỗi action reload Repair từ response/backend.

## 11. Kiểm thử tối thiểu

### Backend

- State machine happy path và nhánh không export/không scrap.
- Role/assigned technician/warehouse access.
- Concurrent accept và duplicate document/reservation.
- Rollback nếu tạo reservation hoặc document lỗi.
- Serial/non-serial validation tại post.
- Cancel draft, cancel before posted, allowed/blocked unpost.
- Fee policies, rounding và snapshot invariant.
- Partner quick-create/link, payment idempotency, return metadata.
- Migration mapping cho trạng thái V21/V23.

### Frontend

- Action visibility theo role/state.
- Payload không gửi status/actor/amount snapshot.
- Linked document navigation và backend error display.
- Quick-create Partner, partial preview, finish removed parts và return device.

### Release checks

```text
backend tests + build
frontend tests + build
migration rehearsal on representative feature-007 data
manual E2E with Accountant, assigned/unassigned Technician, Warehouse Controller
```
