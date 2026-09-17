# Feature Specification: Fix Repair Management

**Feature Branch**: `[012-fix-repair-management]`  
**Created**: 2026-09-08  
**Updated**: 2026-09-16  
**Status**: Ready for Planning  
**Input**: `repair_management_spec.md`, đối chiếu feature `007 - Repair Management`, và các quyết định nghiệp vụ v012.

## 1. Kết luận phân tích

Module Repair hiện tại chưa tách đúng trách nhiệm giữa Kế toán, Kỹ thuật viên (KTV) và Thủ kho. State machine cũ cho phép luồng chung `DRAFT → QUOTATION → CONFIRMED → UNDER_REPAIR → DONE`, endpoint cập nhật trạng thái nhận giá trị từ client, và thao tác hoàn tất có thể tự tạo/ghi sổ chứng từ kho.

V012 thay luồng đó bằng quy trình bắt buộc:

```text
Kế toán tiếp nhận, tạo lệnh và phân công KTV
  → KTV chẩn đoán, khai báo linh kiện và xác nhận
  → hệ thống giữ tồn, tạo phiếu xuất DRAFT nếu cần linh kiện
  → Thủ kho quét serial, ghi sổ phiếu xuất và giao linh kiện
  → KTV sửa chữa, kiểm tra và khai báo linh kiện thực tế tháo ra
  → hệ thống tạo phiếu nhập phế phẩm DRAFT nếu có hàng tháo
  → Thủ kho nhận hàng vật lý và ghi sổ phiếu nhập phế phẩm
  → hệ thống hoàn tất lệnh
  → Kế toán xử lý tài chính và bàn giao thiết bị
```

Mọi phân quyền, transition, tồn kho, reservation, serial và liên kết chứng từ phải được kiểm tra ở backend. Frontend chỉ hiển thị action hợp lệ; client không được tự đặt trạng thái hoặc actor.

## 2. Mục tiêu và phạm vi

### 2.1 Mục tiêu

- Phân tách rõ trách nhiệm của Kế toán, KTV được phân công và Thủ kho.
- Chỉ cho phép các transition nghiệp vụ xác định trước.
- Giữ tồn và tạo tối đa một phiếu xuất linh kiện cho mỗi lệnh.
- Chỉ tạo phiếu nhập phế phẩm từ linh kiện KTV thực tế tháo ra.
- Chỉ hoàn tất lệnh khi toàn bộ chứng từ kho bắt buộc đã `POSTED`.
- Tính phần khách trả/công ty chịu từ dữ liệu chi phí đã chốt.
- Bảo đảm idempotency, audit và nhất quán dữ liệu khi retry hoặc xử lý đồng thời.

### 2.2 Trong phạm vi

- Tiếp nhận thiết bị trong/ngoài hệ thống và tạo nhanh khách hàng.
- Phân công KTV, chẩn đoán, linh kiện và phí công.
- Reservation, xuất linh kiện, nhập linh kiện tháo ra vào kho phế phẩm.
- Serial, tồn kho, inventory ledger và liên kết chứng từ với Repair.
- Chính sách phí `WARRANTY`, `PAID`, `PARTIAL`.
- Tạo/liên kết chứng từ tài chính theo module Payment hiện có sau `DONE`.
- Bàn giao thiết bị bằng metadata và phiếu in.
- RBAC, audit, thông báo, migration và regression test.

### 2.3 Ngoài phạm vi

- Công thức giá vốn/cost allocation mới; dùng nghiệp vụ costing hiện có của chứng từ kho.
- Partial fulfillment hoặc nhiều phiếu cùng vai trò cho một lệnh.
- Hủy trực tiếp sau khi linh kiện đã xuất và được sử dụng.
- OTP bàn giao; dự kiến feature riêng từ v013 nếu có nhu cầu.
- Chữ ký số/chữ ký điện tử có giá trị pháp lý.
- Vòng đời xử lý phế phẩm sau khi đã nhập kho và báo cáo sửa chữa mới.

## 3. Vai trò và trách nhiệm

| Vai trò | Role hệ thống | Được phép | Không được phép |
|---|---|---|---|
| Kế toán | `ROLE_ACCOUNTANT` | Tiếp nhận, tạo/sửa `DRAFT`, tạo nhanh/chọn Partner, chọn chính sách phí, phân công KTV, submit/cancel hợp lệ, tạo chứng từ tài chính, xác nhận trả máy | Chẩn đoán hoặc hoàn tất thay KTV; post/unpost chứng từ kho |
| Kỹ thuật viên | `ROLE_TECHNICIAN` | Xem lệnh được phân công; chẩn đoán, khai báo linh kiện/phí công, accept/reject, sửa chữa, khai báo hàng tháo và finish technical | Xử lý lệnh của KTV khác; tự xuất/nhập kho; tự chuyển trạng thái tùy ý |
| Thủ kho | `ROLE_WAREHOUSE_CONTROLLER` | Sửa serial trên chứng từ kho `DRAFT`, nhận/giao hàng vật lý, post/unpost theo chính sách | Sửa nội dung lệnh, chẩn đoán, phí hoặc hoàn tất kỹ thuật |

Backend lấy actor từ security context, kiểm tra role, kho được phân quyền, quan hệ KTV được phân công và trạng thái hiện tại. Không tin `createdBy`, `assignedTechnicianId`, role hoặc status do client tự suy ra.

## 4. Vòng đời lệnh sửa chữa

```text
DRAFT --submit (Kế toán)--> WAITING_CONFIRM
   ^                              |
   |--reject + lý do (KTV)---------|
                                  |
                                  +--accept, không cần xuất--> IN_REPAIR
                                  |
                                  +--accept, cần xuất--> WAITING_STOCK
                                                              |
                                                export POSTED--+
                                                              v
                                                          IN_REPAIR
                                                              |
                            finish, không có hàng tháo---------+--> DONE
                                                              |
                            finish, có hàng tháo--> WAITING_SCRAP_RETURN
                                                              |
                                          scrap import POSTED--+--> DONE
```

| Trạng thái | Ý nghĩa | Người thực hiện action tiếp theo |
|---|---|---|
| `DRAFT` | Lệnh mới hoặc bị KTV trả lại; chưa khóa nội dung tiếp nhận | Kế toán |
| `WAITING_CONFIRM` | Chờ KTV được phân công chẩn đoán và xác nhận/từ chối | KTV được phân công |
| `WAITING_STOCK` | Reservation và phiếu xuất `DRAFT` đã được tạo | Thủ kho |
| `IN_REPAIR` | Không cần xuất hoặc phiếu xuất bắt buộc đã `POSTED` | KTV được phân công |
| `WAITING_SCRAP_RETURN` | KTV hoàn tất kỹ thuật; chờ kho nhận hàng tháo | Thủ kho |
| `DONE` | Kỹ thuật và toàn bộ nghiệp vụ kho bắt buộc đã hoàn tất | Kế toán xử lý tài chính/trả máy |
| `CANCELLED` | Lệnh bị hủy hợp lệ trước khi phát sinh sử dụng vật tư | Không có |

`DONE` và `CANCELLED` là trạng thái cuối. Mỗi `serialNumberId` chỉ có tối đa một lệnh active (`status NOT IN ('DONE', 'CANCELLED')`). Với thiết bị ngoài, hệ thống cảnh báo khi trùng `manualDeviceIdentifier` nhưng không tự động kết luận đó là cùng một thiết bị.

## 5. Quy trình nghiệp vụ

### User Story 1 — Tiếp nhận, khách hàng và phân công (P1)

Là Kế toán, tôi muốn tra cứu hoặc tạo nhanh khách hàng, nhận thiết bị và phân công đúng KTV để lệnh có đủ thông tin trước khi chẩn đoán.

**Quy tắc**:

- `partnerId` luôn bắt buộc. Kế toán tìm Partner bằng số điện thoại; nếu chưa có thì tạo nhanh bằng Customer Service hiện tại với tên và số điện thoại tối thiểu. Hệ thống tự sinh mã, mặc định `type = INDIVIDUAL`, `groupType = RETAIL`, `isCustomer = true`.
- Không dùng một Partner chung kiểu “Khách lẻ” vì sẽ trộn lịch sử sửa chữa, thanh toán và thiết bị.
- Với thiết bị trong hệ thống, `serialNumberId` phải thuộc đúng `productVariantId`.
- Với thiết bị ngoài, `productVariantId` và `serialNumberId` có thể rỗng nhưng `manualDeviceName` và `manualDeviceIdentifier` bắt buộc theo cặp.
- `externalCondition`, `customerComplaint`, `feePolicy`, kho sửa chữa/kho xuất và `assignedTechnicianId` bắt buộc trước submit.
- KTV được phân công phải là user active có `ROLE_TECHNICIAN`.
- Backend xác định bảo hành từ serial/warranty tại thời điểm tiếp nhận; client không được dùng boolean `underWarranty` để tự đổi giá.
- Lệnh mới luôn là `DRAFT`; submit chuyển `DRAFT → WAITING_CONFIRM` và thông báo KTV.

**Acceptance scenarios**:

1. Given số điện thoại đã thuộc Partner, When Kế toán tiếp nhận, Then hệ thống chọn Partner hiện có và không tạo trùng.
2. Given số điện thoại chưa tồn tại, When Kế toán tạo nhanh khách hàng hợp lệ, Then hệ thống tạo Partner và gắn `partnerId` vào Repair.
3. Given thiếu dữ liệu bắt buộc hoặc KTV không hợp lệ, When submit, Then backend từ chối và giữ `DRAFT`.
4. Given lệnh hợp lệ, When Kế toán submit, Then lệnh thành `WAITING_CONFIRM`, lưu actor/thời điểm và thông báo đúng KTV.

### User Story 2 — Chẩn đoán, xác nhận hoặc trả phiếu (P1)

Là KTV được phân công, tôi muốn cập nhật chẩn đoán, linh kiện và phí công rồi xác nhận hoặc trả phiếu có lý do.

- KTV chỉ sửa diagnosis, parts và labor fees khi lệnh `WAITING_CONFIRM`.
- Kế toán có thể đề xuất parts trong `DRAFT` nhưng không được sửa sau submit.
- Dòng linh kiện dùng `ADD`, `REPLACE` hoặc `REMOVE`.
- Tồn hiển thị trên UI chỉ mang tính tham khảo; backend luôn kiểm tra lại khi accept và post.
- Reject bắt buộc có lý do, chuyển về `DRAFT`, ghi audit và thông báo Kế toán; v012 không giới hạn số lần reject.
- Accept không có dòng cần xuất thì chuyển thẳng `IN_REPAIR`.
- Accept có dòng cần xuất phải khóa dữ liệu liên quan, kiểm tra tồn khả dụng, tạo reservation và đúng một `PARTS_EXPORT` `DRAFT` trong cùng transaction, rồi chuyển `WAITING_STOCK`.

**Acceptance scenarios**:

1. Given KTV không được phân công, When xem danh sách riêng hoặc gọi accept/reject/finish, Then backend từ chối.
2. Given KTV reject có lý do, Then lệnh về `DRAFT`, lưu lần reject gần nhất và audit đầy đủ.
3. Given không có `ADD` hoặc phần lắp mới của `REPLACE`, When accept, Then lệnh đi thẳng `IN_REPAIR` và không tạo phiếu xuất.
4. Given cần xuất và đủ tồn, When accept, Then có tối đa một reservation và một `PARTS_EXPORT DRAFT`.
5. Given retry hoặc hai accept đồng thời, Then không tạo reservation/chứng từ trùng.

### User Story 3 — Xuất linh kiện (P1)

Là Thủ kho, tôi muốn quét đúng linh kiện và ghi sổ phiếu xuất tự sinh để giao cho KTV.

- Phiếu xuất dùng `referenceType = REPAIR`, `referenceId = repair.id`, `issuePurpose = REPAIR`, `documentRole = PARTS_EXPORT`.
- Chỉ Thủ kho có quyền tại kho tương ứng được sửa serial và post phiếu `DRAFT` khi lệnh `WAITING_STOCK`.
- SKU quản lý serial phải có số serial distinct đúng bằng số lượng, đúng variant/kho, đang xuất được và không bị lệnh khác giữ.
- SKU không serial phải được kiểm tra tồn khả dụng và reservation của chính Repair tại thời điểm post.
- Post thành công trừ tồn, fulfil reservation, cập nhật serial/ledger, chuyển `WAITING_STOCK → IN_REPAIR` và thông báo KTV.
- Không có nút hoặc endpoint “Bắt đầu sửa chữa” riêng cho KTV.

### User Story 4 — Hoàn tất kỹ thuật và nhận phế phẩm (P1)

Là KTV, sau khi sửa và kiểm tra thiết bị, tôi muốn khai báo linh kiện thực tế đã tháo và yêu cầu hoàn tất kỹ thuật.

- Chỉ KTV được phân công được finish khi lệnh `IN_REPAIR`.
- Dòng `REMOVE` và phần tháo cũ của `REPLACE` phải có variant, số lượng, tình trạng phế phẩm và serial nếu SKU quản lý serial.
- Không tạo trước phiếu nhập phế phẩm bằng dữ liệu giả.
- Nếu không có hàng tháo thực tế, finish chuyển thẳng `DONE`.
- Nếu có hàng tháo, finish tạo đúng một `SCRAP_IMPORT DRAFT` và chuyển `WAITING_SCRAP_RETURN`.
- Phiếu nhập dùng `referenceType = REPAIR`, `referenceId = repair.id`, `issuePurpose = SCRAP`, `documentRole = SCRAP_IMPORT`.
- Thủ kho chỉ post sau khi nhận hàng vật lý; post thành công cập nhật tồn/serial/ledger và chuyển `WAITING_SCRAP_RETURN → DONE` trong cùng transaction.

### User Story 5 — Chính sách phí và tài chính (P1)

Là Kế toán, tôi muốn hệ thống tính rõ phần khách trả và phần công ty chịu để tạo chứng từ đúng sau khi lệnh hoàn tất.

| `feePolicy` | `customerSharePercent` | Phần khách trả | Phần công ty chịu |
|---|---:|---:|---:|
| `WARRANTY` | `0` | `0` | `totalAmount` |
| `PAID` | `100` | `totalAmount` | `0` |
| `PARTIAL` | `> 0` và `< 100` | `round(totalAmount × percent / 100)` | `totalAmount - customerPayAmount` |

- V012 áp dụng tỷ lệ trên toàn lệnh, không hỗ trợ tỷ lệ theo từng dòng.
- Kế toán chọn policy/tỷ lệ trong `DRAFT`. Khi parts/fees thay đổi trước accept, hệ thống tính lại số tiền dự kiến.
- Khi `DONE`, hệ thống lưu snapshot `totalAmount`, `customerPayAmount`, `companyCoveredAmount`; tổng hai phần phải bằng `totalAmount`.
- Mọi điều chỉnh phần chia sẻ phải lưu actor, thời điểm và lý do.
- Giá trị tính từ snapshot linh kiện đã sử dụng và phí công; không dùng `currentStock` hoặc dữ liệu UI chưa chốt.
- Chứng từ Payment chỉ được tạo sau `DONE`, liên kết `repairId` và idempotent theo loại chứng từ/reference.

### User Story 6 — Bàn giao thiết bị (P2)

Là Kế toán, tôi muốn xác nhận đã trả đúng thiết bị và lưu bằng chứng vận hành tối thiểu.

- V012 không dùng OTP hoặc chữ ký số.
- Return device chỉ được thực hiện sau `DONE` và chỉ cập nhật metadata hậu xử lý; không thay đổi trạng thái kỹ thuật/kho.
- Lưu `returnedAt`, `returnedBy`, `recipientName`, `recipientPhone`, `returnNote` và mã phiếu bàn giao.
- Có thể in phiếu để khách ký tay; file/ảnh chữ ký không nằm trong phạm vi v012.
- OTP bàn giao là feature riêng dự kiến từ v013. Không tái sử dụng OTP quên mật khẩu hiện có.

## 6. Hủy, unpost và giữ tồn

| Tình huống | Chính sách bắt buộc |
|---|---|
| KTV reject ở `WAITING_CONFIRM` | Chuyển `DRAFT`; chưa có reservation/chứng từ nên không ảnh hưởng tồn |
| Hủy phiếu xuất `DRAFT` ở `WAITING_STOCK` | Chỉ Thủ kho; release reservation, vô hiệu phiếu, đưa lệnh về `WAITING_CONFIRM`, thông báo KTV |
| Hủy lệnh trước chứng từ `POSTED` | Chỉ Kế toán và bắt buộc lý do; release reservation, vô hiệu chứng từ `DRAFT`, chuyển `CANCELLED` |
| Phiếu xuất post nhầm nhưng hàng chưa sử dụng | Thủ kho được unpost nếu dependency check thành công, chưa có scrap import `POSTED` và lệnh chưa `DONE`; chuyển về `WAITING_STOCK`, sau đó Kế toán có thể cancel |
| Linh kiện đã giao/đã sử dụng | V012 không cho cancel; KTV hoàn tất với `repairOutcome` phù hợp và hệ thống xử lý đầy đủ chứng từ kho |
| Unpost `SCRAP_IMPORT POSTED` | Không cho phép sau `DONE`; điều chỉnh bằng chứng từ adjustment/audit riêng |
| `DONE` | Cấm cancel, delete, unpost và sửa parts/fees/chứng từ liên kết |

V012 không thêm workflow `PARTS_RETURN` hoặc `CANCEL_PENDING_RETURN`. Khi có nhu cầu hoàn trả vật tư đã giao nhưng chưa sử dụng, triển khai thành feature riêng với phiếu nhập trả liên kết phiếu xuất gốc; không dùng cancel trực tiếp để sửa tồn.

Mọi post/unpost phải revalidate tại backend và giữ Repair, chứng từ, reservation, tồn, serial và ledger nhất quán trong cùng transaction hoặc cơ chế event có bảo đảm giao dịch.

## 7. Kho phế phẩm

- Mỗi kho sửa chữa/kho xuất phải được cấu hình một `scrapWarehouseId` trỏ đến warehouse active có `type = SCRAP`.
- Có thể dùng cùng một kho phế phẩm cho nhiều kho sửa chữa, nhưng việc ánh xạ vẫn được cấu hình rõ ràng theo từng kho.
- Khi submit, Repair lưu snapshot `scrapWarehouseId`; thay đổi cấu hình sau đó không đổi kho nhận của lệnh đang chạy.
- Không hard-code warehouse ID, không fallback `1L`, và không chọn kho bằng code chung `SCRAP` khi có nhiều kho phù hợp.
- Nếu thiếu mapping hoặc kho phế phẩm không active/không đúng loại, backend chặn submit hoặc finish trước khi tạo chứng từ.

## 8. Dữ liệu và migration

### 8.1 `REPAIRS`

| Trường | Yêu cầu |
|---|---|
| `repair_status` | `DRAFT`, `WAITING_CONFIRM`, `WAITING_STOCK`, `IN_REPAIR`, `WAITING_SCRAP_RETURN`, `DONE`, `CANCELLED` |
| `assigned_technician_id` | FK `USERS`; bắt buộc trước submit; thay `responsible_person` tự do |
| `fee_policy` | `WARRANTY`, `PAID`, `PARTIAL` |
| `customer_share_percent` | Decimal từ 0 đến 100; policy quy định giá trị hợp lệ |
| `customer_pay_amount`, `company_covered_amount` | Snapshot tiền khi `DONE` |
| `fee_adjusted_by/at/reason` | Audit điều chỉnh phần chia sẻ chi phí |
| `external_condition`, `customer_complaint`, `diagnosis_note` | Tách hiện trạng, phản ánh khách hàng và chẩn đoán |
| `manual_device_name`, `manual_device_identifier` | Bắt buộc theo cặp khi không có serial hệ thống |
| `scrap_warehouse_id` | Snapshot kho phế phẩm đã resolve từ kho sửa chữa |
| `repair_outcome` | Kết quả kỹ thuật, gồm tối thiểu `SUCCESS`, `FAILED`, `CUSTOMER_DECLINED`, `UNREPAIRABLE` |
| `reject_reason`, `rejected_at/by` | Lần reject gần nhất; audit lưu toàn bộ lịch sử |
| `submitted_at/by`, `accepted_at/by`, `completed_at/by`, `cancel_reason/at/by` | Metadata transition từ principal |
| `returned_at/by`, `recipient_name/phone`, `return_note`, `handover_code` | Metadata bàn giao, không phải trạng thái kho |
| `version` | Optimistic locking; workflow dùng row lock khi tạo/release reservation |

Thêm unique/index:

- Mã lệnh unique.
- Index `(assigned_technician_id, repair_status)`.
- Một Repair active theo `serial_number_id`; nếu DB không hỗ trợ partial unique index thì lock serial/repair và kiểm tra trong transaction.

### 8.2 `WAREHOUSES`

- Bổ sung `scrap_warehouse_id` nullable trong migration để backfill, sau đó backend bắt buộc mapping trước khi kho được dùng cho Repair.
- FK phải trỏ tới warehouse khác có `type = SCRAP`; validation thực hiện ở service vì check constraint liên bảng không đủ linh hoạt.

### 8.3 `REPAIR_LINES` và chứng từ kho

- Giữ `ADD`, `REPLACE`, `REMOVE`; tách rõ serial lắp mới và serial tháo cũ.
- Số lượng, variant, serial, giá và tình trạng scrap là snapshot nghiệp vụ.
- `currentStock` chỉ là response tính động, không lưu như fact lịch sử.
- `INVENTORY_DOCUMENTS` bổ sung `document_role` gồm `PARTS_EXPORT`, `SCRAP_IMPORT` và unique `(reference_type, reference_id, document_role)`.
- Reservation tham chiếu `repair_id` hoặc generic reference, dùng `HOLDING`, `FULFILLED`, `RELEASED`.

### 8.4 `PAYMENT_TRANSACTIONS`

- Bổ sung `reference_type`, `reference_id` để liên kết `REPAIR`.
- Thêm unique/idempotency phù hợp theo `(reference_type, reference_id, type)` hoặc idempotency key được lưu bền vững.
- Không dùng nội dung `note` làm liên kết duy nhất.

### 8.5 Mapping dữ liệu feature 007

| Trạng thái cũ | Trạng thái v012 |
|---|---|
| `DRAFT` | `DRAFT` |
| `QUOTATION` | `DRAFT` |
| `CONFIRMED` | `WAITING_STOCK` chỉ khi backfill được đúng export/reservation; nếu không `WAITING_CONFIRM` |
| `UNDER_REPAIR` | `IN_REPAIR` |
| `DONE` | `DONE` |
| `CANCELLED` | `CANCELLED` |

Migration phải rollback-safe, báo cáo bản ghi không map an toàn và không tự đoán actor, KTV, kho phế phẩm hoặc chứng từ còn thiếu.

## 9. API đề xuất

| Endpoint | Action và quyền |
|---|---|
| `POST /repairs` | Kế toán tạo `DRAFT` |
| `PUT /repairs/{id}` | Kế toán sửa `DRAFT`; không nhận status/actor từ client |
| `POST /repairs/{id}/submit` | Kế toán: `DRAFT → WAITING_CONFIRM` |
| `PUT /repairs/{id}/diagnosis` | KTV được phân công sửa diagnosis/parts/fees trong trạng thái cho phép |
| `POST /repairs/{id}/accept` | KTV được phân công; reserve + tạo export hoặc đi thẳng `IN_REPAIR` |
| `POST /repairs/{id}/reject` | KTV được phân công; `reason` bắt buộc |
| `POST /repairs/{id}/finish-technical` | KTV được phân công: `IN_REPAIR → WAITING_SCRAP_RETURN/DONE` |
| `POST /repairs/{id}/cancel` | Kế toán; chỉ khi chưa có chứng từ `POSTED` |
| `GET /repairs/{id}/inventory-documents` | Trả đúng chứng từ liên kết và trạng thái |
| `POST /repairs/{id}/payment-documents` | Kế toán, chỉ sau `DONE`, idempotent |
| `POST /repairs/{id}/return-device` | Kế toán, chỉ cập nhật metadata bàn giao |

Loại bỏ/ngừng expose `PUT /repairs/{id}/status`. Post/unpost chứng từ kho phải gọi Repair domain service hoặc phát event bảo đảm giao dịch để đồng bộ trạng thái; Repair Workflow Service không tự post thay Thủ kho.

## 10. Thông báo và audit

Thông báo in-app phát sau commit và de-duplicate theo event:

| Sự kiện | Người nhận |
|---|---|
| Kế toán submit | KTV được phân công |
| KTV reject | Kế toán tạo lệnh |
| KTV accept và export sẵn sàng | Thủ kho được phân quyền tại kho |
| Export posted | KTV được phân công |
| KTV yêu cầu nhận phế phẩm | Thủ kho tại kho phế phẩm |
| Scrap import posted hoặc lệnh `DONE` | Kế toán tạo lệnh |
| Chứng từ kho bị hủy/unpost | KTV và Kế toán liên quan |

Audit bắt buộc cho create/update, quick-create/link Partner, submit/accept/reject/cancel, tạo/release/fulfil reservation, create/post/unpost chứng từ, finish, điều chỉnh phí, payment và return-device. Log chứa actor, repair/document ID, transition, thời điểm và lý do; không lưu OTP, dữ liệu nhạy cảm hoặc dữ liệu khách hàng dư thừa.

## 11. Yêu cầu chức năng

- **FR-001**: Backend chỉ cho phép transition ở mục 4; client không được tự đặt status.
- **FR-002**: Chỉ KTV được phân công được xem danh sách việc riêng, accept/reject/finish; chỉ Kế toán submit/cancel/tài chính/bàn giao; chỉ Thủ kho post/unpost chứng từ kho.
- **FR-003**: `accept` phải idempotent và atomically tạo tối đa một reservation và một `PARTS_EXPORT DRAFT`.
- **FR-004**: Post export validate serial, variant, kho, số lượng, reservation và tồn; chỉ post thành công mới chuyển `IN_REPAIR`.
- **FR-005**: `SCRAP_IMPORT` chỉ được tạo từ linh kiện tháo thực tế khi finish và chỉ post sau khi kho nhận hàng.
- **FR-006**: `DONE` chỉ xảy ra khi export bắt buộc đã post và, nếu có hàng tháo, scrap import đã post.
- **FR-007**: `PARTIAL` dùng tỷ lệ toàn lệnh; backend lưu snapshot tiền và bảo đảm hai phần bằng tổng tiền.
- **FR-008**: Mỗi kho dùng cho Repair phải resolve được kho phế phẩm đã cấu hình; Repair lưu snapshot mapping.
- **FR-009**: `partnerId` bắt buộc; cho phép tạo nhanh Partner nhưng không lưu khách hàng free-text trong Repair.
- **FR-010**: V012 không dùng OTP/chữ ký số; return-device chỉ lưu metadata và không đảo `DONE`.
- **FR-011**: Cancel/unpost/release reservation phải giữ nhất quán Repair, chứng từ, tồn, serial và ledger.
- **FR-012**: Giá/payment chỉ dùng dữ liệu đã chốt; v012 không thay đổi công thức giá vốn.

## 12. Hạng mục phải sửa trong mã hiện tại

| Ưu tiên | Phát hiện | Cần sửa |
|---|---|---|
| P0 | State machine và `PUT /repairs/{id}/status` còn cho client gửi trạng thái cũ | Thay enum, domain transition và action API theo spec |
| P0 | Controller dùng quyền `repair:add/edit/delete` quá rộng | Enforce role và assigned technician ở domain service |
| P0 | `responsiblePerson` là chuỗi tự do | Thêm `assignedTechnicianId` FK và validate user active/role |
| P0 | Confirm chỉ kiểm tra tồn; DONE tự tạo/post chứng từ | Tách accept → reserve/export DRAFT, warehouse post, finish → scrap import DRAFT |
| P0 | Chống trùng bằng `existsByDocCode` | Thêm unique `(reference_type, reference_id, document_role)`, locking và xử lý duplicate-key idempotently |
| P0 | UI có nút bắt đầu/kết thúc và gọi cập nhật status chung | Thay bằng action theo role/state; serial xuất chỉ sửa trên phiếu kho |
| P1 | Repair hiện nhận `underWarranty` từ client và chỉ có `totalAmount` | Thêm fee policy, tỷ lệ và snapshot khách/công ty chịu |
| P1 | Kho phế phẩm được tìm bằng code/type và có fallback | Thêm mapping kho sửa chữa → kho phế phẩm, snapshot trên Repair, bỏ hard-code/fallback |
| P1 | Payment chưa có reference trực tiếp tới Repair | Thêm reference/idempotency và chỉ tạo sau `DONE` |
| P1 | Inventory post/unpost chưa đồng bộ lifecycle Repair | Thêm callback/domain event và policy dependency của Repair |
| P1 | Migration cũ dùng constraint/status feature 007 | Viết migration mapping/backfill có báo cáo và rollback |
| P2 | Thông báo chưa nhất quán | Phát after-commit, deep link và de-duplicate |
| P2 | Chưa có metadata bàn giao đầy đủ | Thêm return-device metadata và phiếu in; không thêm OTP v012 |

## 13. Tiêu chí nghiệm thu và Definition of Done

- Lệnh mới luôn `DRAFT`; không payload nào tự gán được status hoặc actor.
- Chỉ đúng vai trò và KTV được phân công thực hiện được action tương ứng.
- Retry/concurrent accept không tạo reservation hoặc phiếu xuất trùng.
- Không thể post chứng từ thiếu/sai/trùng serial, sai variant/kho hoặc không đủ tồn.
- Lệnh không cần xuất linh kiện đi thẳng `IN_REPAIR`; lệnh không có hàng tháo đi thẳng `DONE` sau finish.
- Nếu có hàng tháo, lệnh chỉ `DONE` sau khi `SCRAP_IMPORT` được post.
- `PARTIAL` tính đúng theo tỷ lệ, làm tròn nhất quán và snapshot hai phần bằng tổng tiền.
- Không thể submit Repair nếu thiếu Partner, KTV, kho hoặc mapping kho phế phẩm bắt buộc.
- Không thể cancel sau khi vật tư đã được sử dụng; unpost chỉ thành công khi dependency check cho phép.
- Payment liên kết Repair, idempotent và chỉ được tạo sau `DONE`.
- Return-device lưu đúng actor/thời điểm/người nhận nhưng không thay đổi trạng thái Repair hoặc kho.
- Backend tests bao phủ RBAC, transition, concurrent accept, rollback, duplicate document, reservation, serial, post/unpost, fee policy và migration.
- Frontend tests xác nhận action chỉ hiện theo role/state và không còn nút/status API bypass.
- Migration chạy trên dữ liệu đại diện của feature 007, báo cáo dữ liệu không map an toàn và không tạo chứng từ mồ côi.
- Build backend/frontend pass.
