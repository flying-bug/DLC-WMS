# UI Test Scenarios: Assembly And Disassembly Management

**Feature**: `[011-fix-assembly-and-disassembly-management]`  
**Created**: 2026-09-06  
**Scope**: Kiểm thử thủ công toàn bộ workflow BOM, lắp ráp, tháo dỡ, serial, phân quyền, hủy/unpost và thông báo  
**Excluded**: Cost allocation/costing mới

## 1. Mục tiêu

Xác nhận người dùng chỉ có thể thực hiện đúng bước thuộc vai trò của mình và mọi thay đổi vật lý đều đi qua đúng một cặp phiếu xuất/nhập:

```text
Technician tạo/gửi BOM và lệnh
  -> Accountant duyệt/từ chối
  -> hệ thống tạo 01 phiếu xuất + 01 phiếu nhập DRAFT
  -> Warehouse Controller ghi sổ xuất
  -> Warehouse Controller ghi sổ nhập
  -> lệnh tự động COMPLETED
```

## 2. Môi trường và tài khoản

Chỉ chạy trên môi trường test/staging có thể reset dữ liệu.

| Tài khoản | Role | Quyền cần có |
|---|---|---|
| `technician-ui@test.local` | `ROLE_TECHNICIAN` | `assembly_config:add/edit/view`, `assembly:add/edit/view/submit` |
| `accountant-ui@test.local` | `ROLE_ACCOUNTANT` | `assembly_config:view`, `assembly:view/approve` |
| `warehouse-ui@test.local` | `ROLE_WAREHOUSE_CONTROLLER` | `assembly:view/execute/complete`, `export:view/edit`, `import:view/edit` |
| `manager-ui@test.local` | `ROLE_MANAGER` | Quyền thay thế để kiểm thử override nếu cần |

Mở ba cửa sổ trình duyệt độc lập hoặc ba profile/incognito để giữ đồng thời ba session.

## 3. Dữ liệu chuẩn bị

### 3.1. Kho và SKU

Tạo kho `WH-UI-ASSEMBLY` và các Variant sau:

| SKU | Loại theo dõi | Tồn ban đầu | Serial |
|---|---|---:|---|
| `PC-UI-01` | SERIAL | 0 | Chưa có |
| `RAM-UI-16` | SERIAL | 6 | `RAM-UI-001` đến `RAM-UI-006` |
| `SSD-UI-01` | SERIAL | 3 | `SSD-UI-001` đến `SSD-UI-003` |
| `CABLE-UI-01` | NONE | 10 | Không áp dụng |

Tất cả serial đầu vào phải ở `AVAILABLE`, đúng Variant và đúng kho `WH-UI-ASSEMBLY`.

Chuẩn bị thêm dữ liệu âm:

- `RAM-OTHER-001`: serial thuộc SKU RAM khác.
- `RAM-WH2-001`: serial `RAM-UI-16` nhưng ở kho khác.
- `RAM-USED-001`: serial `RAM-UI-16` nhưng trạng thái không phải `AVAILABLE`.
- Một SKU serial có tồn bằng 0 để kiểm tra thiếu tồn.

### 3.2. BOM chuẩn

```text
BOM: BOM-PC-UI-v1
Target: PC-UI-01
1 bộ gồm:
  RAM-UI-16   x 2
  SSD-UI-01   x 1
  CABLE-UI-01 x 2
```

### 3.3. Baseline tồn kho

Chụp lại màn hình Báo cáo tồn kho trước mỗi happy path. Với lệnh lắp 2 bộ, số lượng dự kiến:

| SKU | Trước | Sau phiếu xuất | Sau phiếu nhập |
|---|---:|---:|---:|
| `RAM-UI-16` | 6 | 2 | 2 |
| `SSD-UI-01` | 3 | 1 | 1 |
| `CABLE-UI-01` | 10 | 6 | 6 |
| `PC-UI-01` | 0 | 0 | 2 |

## 4. Quy ước ghi kết quả

Với mỗi test case, ghi:

| Field | Giá trị |
|---|---|
| Result | `PASS`, `FAIL`, `BLOCKED` |
| Tester/Time | Người chạy và thời điểm |
| Evidence | Screenshot, order/BOM/document code, Network response |
| Actual | Hành vi thực tế nếu khác Expected |
| Defect | Mã bug nếu FAIL |

## 5. BOM workflow

### BOM-01 — Tạo BOM nháp

**Actor**: Technician

1. Mở `/assembly-boms/create`.
2. Chọn target `PC-UI-01`, nhập tên và ba dòng component theo §3.2.
3. Bấm **Lưu nháp**.

**Expected**:

- BOM được tạo ở `DRAFT`, không phải `APPROVED`.
- BOM chưa xuất hiện khi tạo Assembly Order và lọc “BOM đã duyệt”.
- Accountant chưa nhận thông báo duyệt nếu Technician chỉ lưu nháp.

### BOM-02 — Validation dữ liệu BOM

Lặp lại thao tác lưu/gửi với từng dữ liệu:

1. Không có component.
2. Component chưa chọn SKU.
3. Quantity bằng `0`, âm hoặc thập phân cho SKU serial.
4. Hai BOM cùng target và cùng cấu trúc component.

**Expected**: UI/backend chặn, hiển thị lỗi rõ dòng; không tạo BOM lỗi hoặc bản ghi một phần.

### BOM-03 — Gửi duyệt

**Actor**: Technician

1. Mở BOM `DRAFT`.
2. Bấm **Gửi duyệt**.

**Expected**:

- BOM chuyển `PENDING_APPROVAL` và bị khóa chỉnh sửa.
- Accountant nhận notification có link đúng BOM.
- Technician không thấy nút **Duyệt cấu hình** hoặc **Từ chối**.

### BOM-04 — Từ chối bắt buộc có lý do

**Actor**: Accountant

1. Mở BOM `PENDING_APPROVAL` từ notification.
2. Bấm **Từ chối**, đóng prompt hoặc nhập chuỗi trắng.
3. Thực hiện lại và nhập `Sai định mức RAM`.

**Expected**:

- Lần không có reason: không gửi request hoặc backend từ chối; trạng thái vẫn `PENDING_APPROVAL`.
- Lần có reason: trạng thái `REJECTED`; reason hiển thị cho Technician và có audit.

### BOM-05 — Sửa và gửi lại BOM bị từ chối

**Actor**: Technician

1. Mở BOM `REJECTED`.
2. Sửa dòng RAM theo yêu cầu.
3. Bấm **Gửi lại duyệt**.

**Expected**:

- Sửa trên cùng BOM ID/version; không tạo BOM mới.
- Trạng thái trở lại `PENDING_APPROVAL`.
- Lịch sử từ chối cũ không mất; Accountant nhận notification mới.

### BOM-06 — Duyệt BOM

**Actor**: Accountant

1. Mở BOM `PENDING_APPROVAL`.
2. Bấm **Duyệt cấu hình**.

**Expected**:

- BOM chuyển `APPROVED` và xuất hiện trong form tạo lệnh.
- Không thể sửa cấu trúc BOM đã duyệt.
- Accountant không thể tạo/sửa BOM; Technician không thể tự duyệt bằng URL/API cũ.

### BOM-07 — Khóa BOM đang được sử dụng

1. Tạo một lệnh `DRAFT` tham chiếu BOM đã duyệt.
2. Thử mở/sửa cấu trúc BOM.

**Expected**: hệ thống chặn thay đổi và yêu cầu tạo version mới; lệnh giữ snapshot component cũ.

## 6. Assembly Order approval workflow

### ORD-01 — Tạo lệnh nháp

**Actor**: Technician

1. Mở `/assembly-orders/create?type=ASSEMBLY`.
2. Chọn BOM đã duyệt, kho `WH-UI-ASSEMBLY`, quantity `2`.
3. Bấm **Lưu tạm**.

**Expected**:

- Lệnh là `DRAFT`; chưa có phiếu kho.
- Dòng snapshot lần lượt là RAM `4`, SSD `2`, Cable `4`.
- Payload `createdBy` do server lấy từ session, không phụ thuộc dữ liệu client.

### ORD-02 — Validation tạo lệnh

Kiểm tra lần lượt: không chọn BOM, chọn BOM chưa duyệt, không chọn kho, quantity `0`, âm, và quantity thập phân khi target theo serial.

**Expected**: không tạo/gửi lệnh; lỗi chỉ rõ field; không có chứng từ mồ côi.

### ORD-03 — Gửi, từ chối và gửi lại lệnh

1. Technician bấm **Gửi duyệt** → kiểm tra `PENDING_APPROVAL` và notification Accountant.
2. Accountant từ chối với reason `Sai số lượng` → kiểm tra `REJECTED`, chưa có phiếu kho.
3. Technician sửa quantity về `2`, bấm **Gửi lại duyệt**.

**Expected**: cùng Order ID; quay lại `PENDING_APPROVAL`; reason/audit cũ còn; không có phiếu trước khi duyệt.

### ORD-04 — Duyệt lệnh và tự tạo cặp phiếu

**Actor**: Accountant

1. Bấm **Duyệt lệnh**.
2. Mở chi tiết lệnh và hai danh sách phiếu liên kết.

**Expected**:

- Lệnh `APPROVED`.
- Có chính xác một `EX_SO DRAFT` và một `IN_PO DRAFT`.
- Cả hai có nguồn `ASSEMBLY_ORDER` và cùng Order ID/code.
- Phiếu xuất chứa RAM `4`, SSD `2`, Cable `4`; phiếu nhập chứa PC `2`.
- Tồn kho chưa thay đổi.
- Warehouse Controller nhận notification.

### ORD-05 — Idempotency/double click

1. Double-click nút duyệt hoặc mở hai tab Accountant và duyệt gần đồng thời.
2. Refresh chi tiết/danh sách chứng từ.

**Expected**: chỉ có một phiếu xuất và một phiếu nhập; không HTTP 500, không chứng từ/order mồ côi.

### ORD-06 — Đường workflow cũ bị khóa

**Expected qua UI**:

- Không còn nút **Duyệt lệnh (Lưu)**, **Thực thi Lắp ráp/Tháo dỡ**, **Hoàn thành** thủ công.
- Không thể tự tạo thêm phiếu từ lệnh đã duyệt.

**Optional Network check**: gọi endpoint legacy `/status`, `/inventory-documents`, `/execute` phải bị từ chối; không thay đổi dữ liệu.

## 7. Lắp ráp — happy path

### ASM-01 — Chặn nhập trước xuất

**Actor**: Warehouse Controller

1. Mở phiếu nhập `DRAFT` trước khi ghi sổ phiếu xuất.
2. Nhập đủ `PC-UI-AS-001`, `PC-UI-AS-002` và bấm **Ghi sổ**.

**Expected**: bị chặn với thông báo phải ghi sổ phiếu xuất trước; tồn/serial/order không đổi.

### ASM-02 — Validation serial phiếu xuất

Trên phiếu xuất Assembly, chạy độc lập từng case:

| Case | Dữ liệu | Expected |
|---|---|---|
| Thiếu serial | Chỉ 3 RAM cho quantity 4 | Chặn post; yêu cầu đúng 4 serial |
| Trùng serial | Quét `RAM-UI-001` hai lần | UI hoặc backend chặn duplicate |
| Sai SKU | Quét `RAM-OTHER-001` vào dòng `RAM-UI-16` | Chặn, báo serial không thuộc SKU |
| Sai kho | Quét `RAM-WH2-001` | Chặn, báo serial không thuộc kho |
| Không khả dụng | Quét `RAM-USED-001` | Chặn, báo trạng thái không khả dụng |
| Thiếu tồn non-serial | Đặt Cable vượt tồn | Chặn post; tồn không âm |

Sau mỗi case, refresh và xác nhận phiếu vẫn `DRAFT`, không có ledger/tồn thay đổi một phần.

### ASM-03 — Ghi sổ phiếu xuất thành công

1. Chọn RAM `001–004`, SSD `001–002`; Cable quantity `4`.
2. Bấm **Ghi sổ**.

**Expected**:

- Phiếu xuất `POSTED`; lệnh tự chuyển `IN_PROGRESS`.
- Tồn kho đúng cột “Sau phiếu xuất” ở §3.3.
- Serial component đã xuất không còn `AVAILABLE` để xuất như linh kiện rời.
- Phiếu nhập vẫn `DRAFT`; chưa có target serial trong tồn.

### ASM-04 — All-or-Nothing trên phiếu nhập

1. Sửa quantity nhập thành `1` hoặc chỉ nhập một target serial.
2. Bấm **Ghi sổ**.

**Expected**: bị chặn; lệnh vẫn `IN_PROGRESS`, phiếu nhập `DRAFT`, không nhập một phần.

### ASM-05 — Ghi sổ thành phẩm và hoàn tất

1. Đặt quantity `2`, nhập hai serial mới `PC-UI-AS-001`, `PC-UI-AS-002`.
2. Bấm **Ghi sổ**.

**Expected**:

- Phiếu nhập `POSTED`; lệnh tự chuyển `COMPLETED` và progress bằng `2/2`.
- Tồn kho đúng cột “Sau phiếu nhập” ở §3.3.
- Hai target serial `AVAILABLE` tại đúng kho.
- Serial tree của mỗi PC chứa đúng 2 RAM và 1 SSD; component serial không gắn nhầm giữa hai PC.
- Không có nút hoàn thành hoặc chỉnh sửa lệnh.

## 8. Tháo dỡ — happy path

Dùng hai PC vừa tạo ở ASM-05 và BOM đã duyệt.

### DIS-01 — Tạo và duyệt lệnh tháo dỡ

1. Technician tạo `/assembly-orders/create?type=DISASSEMBLY`, quantity `2`, gửi duyệt.
2. Accountant duyệt.

**Expected**:

- Phiếu xuất `DRAFT` chứa target `PC-UI-01 x2`.
- Phiếu nhập `DRAFT` chứa RAM `x4`, SSD `x2`, Cable `x4`.
- Chỉ có đúng một cặp phiếu.

### DIS-02 — Validation target serial xuất tháo dỡ

Thử thiếu serial, serial PC sai SKU, sai kho, không `AVAILABLE` hoặc cùng serial hai lần.

**Expected**: chặn post và không thay đổi tồn. Chỉ `PC-UI-AS-001` và `PC-UI-AS-002` hợp lệ.

### DIS-03 — Ghi sổ xuất thành phẩm

1. Quét hai target serial hợp lệ.
2. Bấm **Ghi sổ**.

**Expected**: phiếu xuất `POSTED`, tồn PC từ `2` về `0`, lệnh `IN_PROGRESS`.

### DIS-04 — Khôi phục serial component cũ

1. Trên phiếu nhập, nhập lại RAM `001–004`, SSD `001–002`, Cable quantity `4`.
2. Bấm **Ghi sổ**.

**Expected**:

- Các serial component cũ từ trạng thái đang nằm trong cấu hình trở lại `AVAILABLE` tại kho.
- Không tạo duplicate serial.
- Genealogy của hai PC chuyển mapping component từ `ACTIVE` sang `REMOVED`.
- Phiếu nhập `POSTED`; lệnh `COMPLETED`; tồn component trở về baseline §3.1.

### DIS-05 — Serial component mới khi không xác định được serial cũ

1. Dùng một lệnh/dữ liệu riêng mà component không có serial cũ nhận diện được.
2. Nhập serial component mới.

**Expected**: chỉ chấp nhận serial chưa tồn tại; serial mới có liên kết truy vết với lệnh/target nguồn. Nếu hệ thống không thể giữ liên kết này, ghi nhận defect vì `clarify.md` §5.10 yêu cầu không mất phả hệ.

### DIS-06 — All-or-Nothing khi tháo dỡ

Giảm một dòng component hoặc thiếu một serial rồi post nhập.

**Expected**: chặn toàn bộ post; không nhập một phần và lệnh vẫn `IN_PROGRESS`.

## 9. Hủy và Unpost

Mỗi case dùng một lệnh mới để không ảnh hưởng dữ liệu happy path.

### CAN-01 — Hủy lệnh trước khi gửi duyệt

1. Technician tạo và lưu lệnh `DRAFT`.
2. Bấm **Hủy lệnh**, nhập reason.

**Expected**: lệnh `CANCELLED`, settlement `SETTLED`, không có phiếu kho, không thể mở lại hoặc resubmit.

### CAN-02 — Hủy khi hai phiếu còn DRAFT

1. Duyệt một lệnh nhưng chưa post phiếu xuất.
2. Technician bấm **Yêu cầu hủy**; Accountant bấm **Xác nhận hủy**.

**Expected**:

- Trước xác nhận: hiển thị `REQUESTED`, mọi post bị khóa.
- Sau xác nhận: lệnh `CANCELLED/SETTLED`; cả hai phiếu `CANCELLED`, không bị xóa.
- Tồn kho và serial không đổi.

### CAN-03 — Hủy sau khi phiếu xuất đã POSTED

1. Duyệt lệnh và post đủ phiếu xuất.
2. Technician yêu cầu hủy với reason `Phát hiện linh kiện lỗi trước khi lắp`.
3. Trước khi Accountant xác nhận, thử post phiếu nhập.
4. Accountant xác nhận hủy.

**Expected**:

- Bước 3 bị chặn.
- Sau xác nhận, lệnh `CANCELLED/PENDING_UNPOST`, phiếu nhập `CANCELLED`.
- UI cảnh báo đang chờ Thủ kho bỏ ghi sổ.

### CAN-04 — Bỏ ghi sổ phiếu xuất

**Actor**: Warehouse Controller

1. Xác nhận đã nhận lại đủ vật tư/serial.
2. Mở phiếu xuất liên kết, chọn **Bỏ ghi sổ**, nhập reason.

**Expected**:

- Phiếu xuất `UNPOSTED`; lệnh giữ `CANCELLED` và settlement thành `SETTLED`.
- Quantity và serial trở lại đúng trạng thái trước post.
- Không thể mở lại lệnh hoặc dùng lại cặp phiếu cũ.

### CAN-05 — Không hoàn đủ vật tư

Không trả đủ serial hoặc để một serial phát sinh giao dịch khác rồi thử unpost.

**Expected**: backend chặn unpost; không cộng giả hàng về tồn tốt; lệnh còn `PENDING_UNPOST`.

### CAN-06 — Chặn hủy/unpost sau khi nhập đã POSTED

1. Dùng lệnh `COMPLETED` có cả hai phiếu `POSTED`.
2. Thử yêu cầu hủy và unpost phiếu xuất.

**Expected**: cả hai thao tác bị chặn; hướng dẫn dùng feature reversal riêng; tồn và genealogy không đổi.

### CAN-07 — Lắp được một phần vật lý

Với lệnh 10 bộ, giả lập mới lắp được 7 bộ nhưng chưa post phiếu nhập.

**Expected nghiệp vụ**: không thể nhập 7/10. Muốn hủy/unpost phải tháo lại 7 bộ, trả đủ toàn bộ component/serial của 10 bộ rồi thực hiện CAN-03/CAN-04.

## 10. Phân quyền và bảo mật

### SEC-01 — Technician

- Không thấy/không dùng được nút approve/reject.
- Không ghi sổ hoặc unpost chứng từ kho.
- Không thể gửi `createdBy`, `approvedBy` giả qua DevTools để đổi actor.

### SEC-02 — Accountant

- Duyệt/từ chối được BOM/lệnh `PENDING_APPROVAL`.
- Không sửa BOM/lệnh thay Technician.
- Không post/unpost chứng từ kho.

### SEC-03 — Warehouse Controller

- Xem lệnh và cặp phiếu; post/unpost đúng điều kiện.
- Không tạo/sửa/submit/approve/reject BOM hoặc lệnh.

### SEC-04 — Direct URL/API

Đăng nhập từng role rồi truy cập trực tiếp URL hoặc replay request của role khác.

**Expected**: nhận 403/business error, UI refresh giữ trạng thái server, không có side effect.

## 11. Notification, audit và hiển thị

### NTF-01 — Notification routing

Kiểm tra các event:

| Event | Người nhận |
|---|---|
| BOM/lệnh submit hoặc resubmit | Accountant |
| BOM/lệnh reject | Technician tạo/gửi |
| Lệnh approved và cặp phiếu được tạo | Warehouse Controller |
| Cancel request | Accountant |
| Cancel confirmed chờ unpost | Warehouse Controller |

**Expected**: một notification/event, link mở đúng entity; transaction lỗi không sinh notification giả.

### AUD-01 — Audit trail

Kiểm tra audit cho create, update, submit/resubmit, approve, reject, cancel request/confirm, post và unpost.

**Expected**: có actor thật, entity/document ID, thời gian, transition và reason; không bị ghi dưới user do client tự gửi.

### UI-01 — Trạng thái và liên kết

- Danh sách hiển thị đúng `DRAFT`, `PENDING_APPROVAL`, `REJECTED`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- Chi tiết lệnh hiển thị đúng mã/trạng thái hai phiếu và link tới phiếu.
- `REJECTED` hiển thị reason; `REQUESTED` và `PENDING_UNPOST` có cảnh báo.
- Phiếu `DRAFT` quá hạn chỉ cảnh báo, không tự hủy.

## 12. Concurrency và phục hồi lỗi

### CON-01 — Duyệt đồng thời

Hai tab Accountant approve cùng lệnh gần đồng thời.

**Expected**: một transition thành công/idempotent; chỉ một cặp phiếu; request còn lại không tạo duplicate hoặc HTTP 500 không kiểm soát.

### CON-02 — Cancel và post đồng thời

Technician/Accountant thực hiện cancel trong khi Warehouse Controller post nhập.

**Expected**: chỉ một transaction thắng. Nếu import post trước thì cancel bị chặn; nếu cancel trước thì import post bị chặn. Không có trạng thái `COMPLETED` đồng thời `PENDING_UNPOST`.

### CON-03 — Retry do mất mạng

Ngắt mạng ngay sau khi bấm approve/post rồi gửi lại sau refresh.

**Expected**: UI đọc lại trạng thái server; không tạo cặp phiếu, ledger hoặc serial mapping trùng.

### ERR-01 — Tạo phiếu thứ hai thất bại

Giả lập lỗi server/database khi approve đang tạo phiếu nhập sau phiếu xuất.

**Expected**: rollback toàn bộ; lệnh còn `PENDING_APPROVAL`, không còn phiếu xuất mồ côi và có thể retry an toàn.

## 13. Regression checklist

- [ ] Bộ lọc, tìm kiếm và phân trang BOM/lệnh xử lý được toàn bộ trạng thái mới.
- [ ] In lệnh vẫn hoạt động ở chế độ chỉ xem.
- [ ] Phiếu nhập/xuất không liên quan Assembly vẫn tạo, sửa, post/unpost như trước.
- [ ] Sales Order, Stock Transfer, Stocktake, Warranty và Repair không bị ảnh hưởng bởi hook `ASSEMBLY_ORDER`.
- [ ] Refresh/back/forward trình duyệt không làm mất trạng thái hoặc gửi lại action.
- [ ] Không có kiểm thử nào yêu cầu cost allocation/costing mới.

## 14. Điều kiện QA sign-off

- Tất cả case P1: `BOM-01` đến `BOM-07`, `ORD-01` đến `ORD-06`, `ASM-01` đến `ASM-05`, `DIS-01` đến `DIS-06`, `CAN-01` đến `CAN-06`, `SEC-01` đến `SEC-04` phải PASS.
- Không có duplicate document, serial, genealogy hoặc inventory ledger.
- Tồn kho trước/sau khớp đúng quantity, không âm và không thay đổi một phần khi request thất bại.
- Các case concurrency không tạo HTTP 500 không kiểm soát hoặc dữ liệu mồ côi.
- Evidence được đính kèm cho happy path lắp ráp, tháo dỡ và cancel/unpost.
- Sau sign-off, cập nhật T047, T048 và T050 trong `task.md`.
