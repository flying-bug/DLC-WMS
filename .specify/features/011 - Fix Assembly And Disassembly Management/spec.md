# Feature Specification: Fix Assembly And Disassembly Management

**Feature Branch**: `[011-fix-assembly-and-disassembly-management]`  
**Created**: 2026-09-05  
**Status**: Ready for Planning  
**Input**: `G:\Downloads\assembly_disassembly_spec.md` và đánh giá hiện trạng module `006`.

## 1. Kết luận phân tích

Module hiện tại đã có BOM, lệnh lắp ráp/tháo dỡ, chứng từ kho và truy vết serial. Tuy nhiên, luồng đang cho phép người dùng tự đặt trạng thái BOM/lệnh, tự sinh từng chứng từ kho, và có endpoint “thực thi nhanh” có thể tạo rồi ghi sổ cả xuất/nhập trong một thao tác. Các hành vi này không đáp ứng nguyên tắc tách biệt trách nhiệm trong tài liệu nguồn.

V011 thay thế luồng phê duyệt/thực thi của module `006` bằng quy trình bắt buộc:

```text
Kỹ thuật viên tạo BOM/lệnh
  -> Kế toán duyệt
  -> hệ thống tự tạo đúng 01 phiếu xuất + 01 phiếu nhập ở DRAFT
  -> Thủ kho ghi sổ phiếu xuất sau khi quét đủ serial
  -> Kỹ thuật viên thao tác vật lý
  -> Thủ kho ghi sổ phiếu nhập sau khi quét/khai báo đủ serial
  -> hệ thống tự hoàn thành lệnh
```

### Quyết định phạm vi cần chốt

Tài liệu nguồn yêu cầu **đúng một cặp phiếu kho được tự tạo ngay khi duyệt**. Điều này mâu thuẫn với feature `006`, vốn cho phép tạo nhiều phiếu để thực hiện từng phần. Spec này lấy tài liệu nguồn làm chuẩn: v011 **không hỗ trợ partial fulfillment**. Nếu nghiệp vụ vẫn cần thực hiện từng phần, cần xác nhận lại để đổi thành “một cặp phiếu cho mỗi đợt” trước khi code; không được âm thầm giữ cả hai cách vì sẽ làm mơ hồ điều kiện hoàn thành lệnh.

## 2. Mục tiêu

- Phân tách rõ trách nhiệm của Kỹ thuật viên, Kế toán và Thủ kho.
- Chỉ BOM/lệnh được duyệt mới có thể đi tới thao tác kho.
- Tự tạo, liên kết và theo dõi chính xác một phiếu xuất và một phiếu nhập cho mỗi lệnh.
- Chặn ghi sổ khi serial bắt buộc chưa đủ, sai SKU, trùng lặp hoặc không có trong đúng kho.
- Chỉ hoàn thành lệnh khi cả hai chứng từ liên kết đều `POSTED`.
- Giữ tồn kho, giá vốn và phả hệ serial nhất quán qua lắp ráp và tháo dỡ.

## 3. Phạm vi

### 3.1 Trong phạm vi

- Vòng đời duyệt BOM và Assembly Order.
- Phân quyền backend và UI theo ba vai trò.
- Tự tạo cặp chứng từ kho khi duyệt lệnh, liên kết qua `referenceType = ASSEMBLY_ORDER` và `referenceId = assemblyOrderId`.
- Quét/kiểm tra serial trước khi ghi sổ; cập nhật tồn kho, giá vốn và phả hệ serial khi ghi sổ.
- Thông báo cho Kế toán khi có BOM/lệnh chờ duyệt.
- Hiển thị trạng thái hai chứng từ liên kết trên chi tiết lệnh.
- Kiểm thử chuyển trạng thái, phân quyền, idempotency, serial, tồn kho và giá vốn.

### 3.2 Ngoài phạm vi

- Phân bổ chi phí nhân công, điện nước hoặc chi phí gia công vào giá vốn.
- Tạo một engine sản xuất/MRP mới.
- Partial fulfillment hay nhiều cặp phiếu cho cùng một lệnh (trừ khi quyết định ở phần 1 được thay đổi).
- Quy trình xuất hủy phế liệu sau tháo dỡ; chỉ ghi nhận kho/vị trí nhận hàng hỏng nếu module chứng từ kho hiện có hỗ trợ.

## 4. Vai trò và quyền hạn

| Vai trò | Được phép | Không được phép |
|---|---|---|
| `ROLE_TECHNICIAN` | Tạo/sửa BOM và lệnh ở `DRAFT`; gửi duyệt; xem tiến độ; thực hiện lắp/tháo vật lý | Tự duyệt/từ chối BOM hoặc lệnh; ghi sổ chứng từ kho |
| `ROLE_ACCOUNTANT` | Xem, duyệt hoặc từ chối BOM/lệnh chờ duyệt | Tạo lệnh thay Kỹ thuật viên; ghi sổ chứng từ kho |
| `ROLE_WAREHOUSE_CONTROLLER` | Xem phiếu hệ thống tạo, quét serial, ghi sổ phiếu xuất/nhập | Sửa BOM/lệnh; duyệt BOM/lệnh |
| Manager/Super Admin | Có thể được cấp quyền thay thế theo ma trận quyền hiện hành; mọi thao tác phải audit | Không được bỏ qua validation hay transition |

Frontend chỉ có tác dụng hướng dẫn; mọi quyền và transition ở bảng trên phải được kiểm tra tại backend từ principal đăng nhập, không nhận `createdBy`, `approvedBy` hay role do client gửi.

## 5. Vòng đời và quy tắc chuyển trạng thái

### 5.1 BOM

```text
DRAFT --gửi duyệt--> PENDING_APPROVAL --duyệt--> APPROVED
                                  \--từ chối--> REJECTED --sửa/gửi lại--> PENDING_APPROVAL
```

- BOM mới luôn là `DRAFT`; request create/update không được tự đặt `APPROVED`.
- Chỉ Kỹ thuật viên được gửi duyệt hoặc sửa BOM `DRAFT`/`REJECTED`.
- Chỉ Kế toán được duyệt/từ chối BOM `PENDING_APPROVAL`; từ chối cần có lý do.
- Chỉ BOM `APPROVED` được chọn để lập lệnh. BOM đã được tham chiếu bởi bất kỳ lệnh chưa `COMPLETED`/`CANCELLED` phải bị khóa cấu trúc; tạo version BOM mới để thay đổi.

### 5.2 Assembly Order

```text
DRAFT --gửi duyệt--> PENDING_APPROVAL --từ chối--> REJECTED
                                      \--duyệt--> APPROVED
APPROVED --phiếu xuất POSTED--> IN_PROGRESS
APPROVED/IN_PROGRESS --cả xuất và nhập POSTED--> COMPLETED
```

- Lệnh mới luôn `DRAFT`; dòng vật tư là snapshot từ BOM đã duyệt tại thời điểm tạo.
- Kế toán duyệt lệnh phải kiểm tra BOM còn `APPROVED`, kho hợp lệ và số lượng tồn khả dụng theo chính sách đặt trước. Việc ghi sổ vẫn phải kiểm tra tồn lại để tránh race condition.
- Duyệt thành công phải tạo **atomically** đúng một phiếu xuất và một phiếu nhập `DRAFT`; nếu một phiếu không tạo được, rollback toàn bộ duyệt lệnh.
- `APPROVED`, `IN_PROGRESS`, `COMPLETED` không được sửa dòng, BOM, kho, số lượng hay loại lệnh.
- `COMPLETED` là trạng thái cuối. Không có nút “Hoàn thành” thủ công.
- Chỉ được hủy `DRAFT`, `PENDING_APPROVAL`, `REJECTED`. Khi đã có chứng từ liên kết, hủy/xóa lệnh bị chặn cứng. Không được tái sử dụng hay tạo thêm cặp phiếu qua retry.

## 6. Quy trình nghiệp vụ

### User Story 1 — Duyệt BOM (P1)

Là Kỹ thuật viên, tôi muốn lập và gửi BOM để Kế toán kiểm soát định mức trước khi nó được dùng cho lắp ráp/tháo dỡ.

**Acceptance scenarios**:

1. Given BOM mới hợp lệ, When Kỹ thuật viên lưu, Then BOM là `DRAFT`.
2. Given BOM `DRAFT` hoặc `REJECTED`, When Kỹ thuật viên gửi duyệt, Then BOM là `PENDING_APPROVAL` và Kế toán nhận thông báo.
3. Given BOM `PENDING_APPROVAL`, When Kế toán duyệt, Then BOM là `APPROVED` và xuất hiện trong danh sách chọn BOM của lệnh.
4. Given BOM `PENDING_APPROVAL`, When Kế toán từ chối có lý do, Then BOM là `REJECTED`, lý do được lưu/audit và Kỹ thuật viên được thông báo.

### User Story 2 — Duyệt lệnh và tạo chứng từ tự động (P1)

Là Kỹ thuật viên, tôi muốn gửi lệnh từ BOM đã duyệt để Kế toán duyệt; khi duyệt, hệ thống chuẩn bị sẵn chứng từ cho Thủ kho.

**Quy tắc tạo chứng từ**:

| Loại lệnh | Phiếu xuất `DRAFT` | Phiếu nhập `DRAFT` |
|---|---|---|
| `ASSEMBLY` | Các component, số lượng = BOM × số bộ | Target/finished variant, số lượng = số bộ |
| `DISASSEMBLY` | Target/finished variant, số lượng = số bộ | Các component thu hồi, số lượng kế hoạch = BOM × số bộ |

**Acceptance scenarios**:

1. Given lệnh `DRAFT`, When Kỹ thuật viên gửi duyệt, Then lệnh là `PENDING_APPROVAL` và Kế toán nhận thông báo.
2. Given lệnh hợp lệ `PENDING_APPROVAL`, When Kế toán duyệt, Then lệnh thành `APPROVED`, có đúng hai chứng từ `DRAFT`, cùng `referenceType/referenceId`, và không chứng từ nào tác động tồn kho.
3. Given client retry hoặc hai yêu cầu duyệt đồng thời, When chỉ một yêu cầu thắng, Then vẫn chỉ có đúng một cặp chứng từ và không có lệnh/chứng từ mồ côi.
4. Given lệnh bị từ chối, When Kế toán nhập lý do, Then lệnh thành `REJECTED`, không có chứng từ nào được tạo.

### User Story 3 — Xuất kho và thao tác vật lý (P1)

Là Thủ kho, tôi muốn quét đúng vật tư của phiếu xuất tự sinh và ghi sổ để giao cho Kỹ thuật viên.

- Chỉ Thủ kho được sửa serial trên phiếu `DRAFT` và ghi sổ.
- Với SKU theo serial, số serial unique quét phải bằng chính xác số lượng dòng; serial phải thuộc đúng variant, ở trạng thái/số dư xuất được, và ở đúng kho của phiếu.
- Với hàng không theo serial, vẫn phải kiểm tra đủ lượng tồn khả dụng tại thời điểm ghi sổ.
- Ghi sổ xuất chỉ cập nhật tồn, ledger/cost layer và trạng thái serial theo nghiệp vụ kho hiện có. Sau đó lệnh chuyển `IN_PROGRESS`; không tạo thêm chứng từ.

### User Story 4 — Nhập kho và hoàn tất tự động (P1)

Là Thủ kho, tôi muốn nhận kết quả lắp/tháo dỡ qua phiếu nhập đã được chuẩn bị để tồn kho và phả hệ serial được cập nhật chính xác.

- Phiếu nhập chỉ được ghi sổ sau phiếu xuất liên kết. Hệ thống phải chặn post nhập trước xuất.
- Lắp ráp: target serial mới phải hợp lệ/duy nhất theo chính sách serial; giá vốn target bằng tổng giá vốn thực tế của các component đã xuất trong phiếu liên kết.
- Tháo dỡ: target serial đã xuất phải tồn tại trong kho; v011 giữ hành vi giá vốn hiện có và không triển khai cost allocation mới.
- Khi nhập tất cả serial bắt buộc, hệ thống ghi nhận phả hệ target–component. Với tháo dỡ, liên kết component cũ được đóng trạng thái phù hợp trước khi tạo/trả lại trạng thái truy vết của component.
- Khi post nhập thành công, service phải kiểm tra cả hai phiếu của lệnh là `POSTED`, sau đó tự chuyển lệnh thành `COMPLETED` trong cùng transaction hoặc qua event bảo đảm giao dịch.

### User Story 5 — Theo dõi và thông báo (P2)

Là người tham gia quy trình, tôi muốn thấy ngay ai đang chờ thao tác và tình trạng hai phiếu kho.

- Thông báo realtime/in-app đến `ROLE_ACCOUNTANT` khi BOM/lệnh được gửi duyệt.
- Thông báo đến Kỹ thuật viên khi bị từ chối; đến Thủ kho khi lệnh được duyệt và cặp phiếu được tạo.
- Chi tiết lệnh hiển thị mã, loại, trạng thái, ngày ghi sổ, người ghi sổ của phiếu xuất và nhập; người dùng có quyền xem có thể đi đến chi tiết phiếu.

## 7. Yêu cầu chức năng

- **FR-001**: Backend chỉ chấp nhận các transition ở mục 5; endpoint chung cập nhật `status` phải bị thay bằng action rõ nghĩa (`submit`, `approve`, `reject`) hoặc kiểm soát transition/role tương đương.
- **FR-002**: BOM mặc định `DRAFT`; hỗ trợ `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` và lưu người gửi/duyệt/từ chối, thời điểm và lý do.
- **FR-003**: Lệnh hỗ trợ `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`, `CANCELLED`; không được client tự gán trạng thái đặc quyền.
- **FR-004**: Duyệt lệnh là idempotent và atomically tạo một cặp xuất/nhập. Repository/database phải có ràng buộc hoặc locking đủ để ngăn cặp phiếu thứ hai cho cùng lệnh và vai trò phiếu.
- **FR-005**: Hai chứng từ phải dùng hằng số thống nhất `ASSEMBLY_ORDER`, không dùng lẫn `ASSEMBLY`; `referenceId` là ID lệnh.
- **FR-006**: Luồng `/execute` cũ và endpoint sinh phiếu thủ công không được phép bypass cặp phiếu/role/serial. Xóa, ngừng expose hoặc refactor chúng vào luồng mới trước khi release.
- **FR-007**: Ghi sổ chứng từ liên kết phải validate serial ở backend, không chỉ disable nút frontend.
- **FR-008**: Sau mỗi post/unpost chứng từ liên kết, hệ thống phải đồng bộ lại trạng thái lệnh theo hai chứng từ. Chính sách unpost phải được xác định: tối thiểu không cho unpost phiếu xuất khi phiếu nhập đã `POSTED`.
- **FR-009**: V011 không bổ sung cost allocation hoặc công thức costing mới; thay đổi costing phải được triển khai bằng feature riêng.
- **FR-010**: Audit mọi thao tác tạo, gửi, duyệt, từ chối, post/unpost; log chứa actor, order/document ID và transition, không chứa dữ liệu nhạy cảm không cần thiết.

## 8. Dữ liệu và API cần thay đổi

### 8.1 Dữ liệu

- `ASSEMBLY_BOMS`: đổi default status thành `DRAFT`; bổ sung metadata phê duyệt/từ chối nếu chưa có.
- `ASSEMBLY_ORDERS`: bổ sung/làm rõ metadata submit/approve/reject và lý do từ chối; migration chuyển đổi an toàn trạng thái dữ liệu cũ (`SUBMITTED`, `POSTED`) theo mapping đã được duyệt.
- `ASSEMBLY_BOM_LINES`: không bổ sung hoặc thay đổi `cost_allocation_pct` trong v011.
- `INVENTORY_DOCUMENTS`: giữ `reference_type`, `reference_id`; bổ sung unique constraint/index theo `(reference_type, reference_id, doc_type)` hoặc cột role chứng từ để đảm bảo một xuất/một nhập mỗi lệnh.
- `ASSEMBLY_ORDER_SERIALS`/genealogy: ràng buộc serial mapping không trùng và chỉ được tạo từ chứng từ đã post, hoặc refactor để liên kết trực tiếp với dòng chứng từ làm nguồn audit.

### 8.2 API đề xuất

- `POST /assembly-boms/{id}/submit`, `POST /assembly-boms/{id}/approve`, `POST /assembly-boms/{id}/reject`
- `POST /assembly-orders/{id}/submit`, `POST /assembly-orders/{id}/approve`, `POST /assembly-orders/{id}/reject`
- `GET /assembly-orders/{id}/inventory-documents` trả về đúng hai chứng từ và trạng thái của chúng.

Các endpoint create/update hiện có phải ép trạng thái an toàn; endpoint `PUT /assembly-orders/{id}/status`, `POST /assembly-orders/{id}/inventory-documents` và `POST /assembly-orders/{id}/execute` cần được thay thế hoặc loại bỏ có kiểm soát để không còn đường vòng.

## 9. Những hạng mục phải sửa trong mã hiện tại

| Ưu tiên | Phát hiện | Cần sửa |
|---|---|---|
| P0 | `AssemblyBom.status` đang default `APPROVED` trong `backend/.../entity/AssemblyBom.java`; service create BOM cũng fallback `APPROVED`. | Migration + entity/service/UI để BOM bắt đầu `DRAFT` và bắt buộc duyệt. |
| P0 | `AssemblyOrderService` cho phép trạng thái `SUBMITTED`, `APPROVED`, `POSTED`, `CANCELLED`; UI gọi lưu trực tiếp `APPROVED`. | Chuẩn hóa state machine ở mục 5; tách API submit/approve/reject và phân quyền server-side. |
| P0 | `generateInventoryDocument(...)` nhận dòng/số lượng từ client và tạo từng phiếu thủ công; không tạo cặp phiếu khi duyệt. | Duyệt lệnh phải tạo atomically cặp `DRAFT` từ snapshot lệnh; khóa/idempotency để ngăn tạo trùng. |
| P0 | `executeAssemblyOrder(...)` là một đường “scan and go”, có thể đi thẳng qua luồng chứng từ và quyền Thủ kho. | Gỡ endpoint/UI hoặc refactor thành thao tác trên hai phiếu tự sinh; không được ghi sổ trực tiếp từ lệnh. |
| P0 | `InventoryDocumentService.postExport/postImport` chưa có callback tổng quát hoàn thành assembly order. | Thêm domain service/event sau post và unpost; hoàn thành tự động khi cả hai phiếu `POSTED`. |
| Ngoài scope | Cost allocation chưa được triển khai đầy đủ. | Không thay đổi trong v011; tách thành feature riêng khi có yêu cầu. |
| P1 | Controller hiện cùng quyền `assembly:add/edit` cho tạo, duyệt, sinh phiếu và execute; request có `createdBy`. | Áp role/permission theo mục 4, lấy actor từ security context, chặn spoof actor. |
| P1 | UI vẫn hiển thị “Duyệt lệnh (Lưu)”, “Thực thi Lắp ráp/Tháo dỡ” và “Hoàn thành” thủ công. | Thay action theo vai trò/trạng thái; thêm khu vực hai phiếu liên kết, không có action bypass. |
| P1 | Kiểm tra serial phân tán giữa modal, lệnh và chứng từ; source yêu cầu 100% serial mới cho post. | Đưa rule số lượng/unique/SKU/kho/availability vào post service; UI chỉ phản chiếu lỗi backend. |
| P2 | `AppNotification` đã tồn tại nhưng AssemblyOrderService không phát notification cho luồng duyệt. | Gửi notification sau commit, có deep link và tránh gửi trùng khi retry. |
| P2 | Feature `006` cho phép nhiều phiếu/partial fulfillment, còn v011 yêu cầu một cặp phiếu. | Chốt quyết định ở mục 1, migration dữ liệu dở dang và regression test trước khi phát hành. |

## 10. Tiêu chí nghiệm thu và Definition of Done

- Không BOM/lệnh nào có thể tự chuyển từ `DRAFT` sang `APPROVED` bởi Kỹ thuật viên hoặc payload client.
- Một lần duyệt lệnh thành công tạo chính xác hai chứng từ `DRAFT` liên kết cùng lệnh; retry/concurrency không tạo thêm.
- Không thể post phiếu xuất/nhập thiếu serial bắt buộc, serial sai variant/kho hoặc trùng; backend trả lỗi nghiệp vụ rõ ràng.
- Lệnh chỉ `COMPLETED` khi đúng phiếu xuất và nhập đều `POSTED`; post nhập trước xuất bị chặn.
- Lắp ráp/tháo dỡ cập nhật tồn và phả hệ serial đúng; v011 không thay đổi cost allocation.
- Cả backend và frontend không còn endpoint/nút nào bypass quy trình hai chứng từ.
- Phân quyền, audit và thông báo được kiểm thử bằng account/role thực tế.
- Có migration rollback-safe, unit/integration tests cho transition, idempotency, post/unpost, serial và costing; build backend/frontend pass.
