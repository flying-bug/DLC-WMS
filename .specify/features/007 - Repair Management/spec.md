# Feature Specification: Repair Management

**Feature Branch**: `[007-repair-management]`

**Created**: 2026-07-19

**Status**: Planning

**Input**: User description: "Module này được thiết kế để quản lý vòng đời sửa chữa thiết bị, bao gồm: tiếp nhận, đánh giá, quản lý linh kiện (thêm/tháo), tính phí, bảo hành, và tích hợp sâu với module Kho và Assembly, tích hợp tự động trừ kho và quản lý phí dịch vụ."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quản lý Lệnh sửa chữa, Khách hàng và Bảo hành (Priority: P1)

Là nhân viên kỹ thuật (Staff), tôi muốn tạo lệnh sửa chữa để ghi nhận tình trạng lỗi của sản phẩm, định danh khách hàng, giúp theo dõi lịch sử bảo hành và quy trình xử lý.

**Why this priority**: Là điểm khởi đầu của quy trình, cần thiết để định danh thiết bị và đối tác (Partner).

**Independent Test**: Kiểm tra màn hình tạo lệnh sửa chữa, nhập thông tin máy, thông tin khách hàng, đánh dấu tình trạng bảo hành và lưu dữ liệu.

**Acceptance Scenarios**:
1. **Given** Nhân viên kỹ thuật tạo lệnh mới, **When** sản phẩm có trong hệ thống, **Then** hệ thống cho phép chọn `serial_number_id` và bắt buộc chọn `partner_id` (Khách hàng).
2. **Given** Một lệnh đang ở trạng thái `DRAFT`, **When** Staff điền mô tả lỗi (`issue_description`), **Then** hệ thống lưu thông tin để quản lý đánh giá.
3. **Given** Người dùng cập nhật bất kỳ thông tin nào của lệnh, **Then** hệ thống lưu vết toàn bộ (Audit Logs) đảm bảo tính minh bạch.

---

### User Story 2 - Báo giá, Quản lý Linh kiện và Phí dịch vụ (Priority: P1)

Là kỹ thuật viên (Staff), tôi muốn lên danh sách các linh kiện cần thay thế (`REPAIR_LINES`) và chi phí dịch vụ (`REPAIR_FEES`) để báo giá cho khách hàng trước khi sửa.

**Why this priority**: Đảm bảo khách hàng đồng ý chi phí (trừ bảo hành) trước khi xuất kho linh kiện và sửa chữa.

**Independent Test**: Chuyển lệnh sang trạng thái QUOTATION, kiểm tra logic tính phí và duyệt báo giá.

**Acceptance Scenarios**:
1. **Given** Lệnh báo giá sửa chữa ngoài, **When** thêm linh kiện vào `REPAIR_LINES` (action_type = `ADD`), **Then** hệ thống tính tổng chi phí dựa trên `unit_price` và `fee_amount`.
2. **Given** Lệnh được đánh dấu `under_warranty = TRUE`, **When** thêm linh kiện, **Then** hệ thống tự động gán `is_free_warranty = TRUE` và `unit_price = 0`.
3. **Given** Lệnh đang ở trạng thái `QUOTATION`, **When** khách hàng đồng ý báo giá và Manager/Staff xác nhận, **Then** lệnh chuyển sang trạng thái `CONFIRMED`.

---

### User Story 3 - Giữ kho, Thực thi sửa chữa và Hóa đơn (Priority: P1)

Là thủ kho/kỹ thuật viên, tôi muốn hệ thống tự động giữ (reserve) linh kiện khi lệnh được xác nhận, và chính thức trừ kho/xuất hóa đơn khi hoàn tất sửa chữa.

**Why this priority**: Đảm bảo đồng bộ tồn kho thực tế, không bị thiếu hụt linh kiện trong lúc đang sửa và chuẩn hóa quy trình thu phí.

**Acceptance Scenarios**:
1. **Given** Lệnh chuyển sang `CONFIRMED`, **When** kho còn đủ linh kiện, **Then** hệ thống sinh `INVENTORY_DOCUMENTS` (trạng thái Draft/Waiting) để **Giữ chỗ (Reserve)** linh kiện.
2. **Given** Lệnh chuyển sang `CONFIRMED`, **When** kho KHÔNG đủ linh kiện, **Then** hệ thống báo lỗi không đủ tồn kho và chặn xác nhận lệnh.
3. **Given** Lệnh ở trạng thái `UNDER_REPAIR`, **When** bấm "Hoàn tất" (DONE), **Then** hệ thống đổi phiếu xuất kho linh kiện sang trạng thái Done (trừ kho thực tế) và tự động sinh Hóa Đơn (`INVOICE`) dựa trên `invoice_method`.

---

### User Story 4 - Xử lý linh kiện thu hồi (Scrap/Recycle)

Là thủ kho, tôi muốn phân loại các linh kiện lỗi tháo dỡ (`REMOVE`) vào kho phế liệu.  

**Acceptance Scenario**: Khi lệnh có `REPAIR_LINES` với `action_type = REMOVE`, **When** lệnh chuyển sang `DONE`, **Then** hệ thống tự động sinh phiếu nhập kho (Inventory Document type IN) hướng vào "Kho Phế Liệu" (Scrap Location).  

---

### Edge Cases

1. **Sản phẩm cần sửa không thuộc hệ thống (Thiết bị ngoài)**: Không cho phép nhập free-text để tránh rác DB. Yêu cầu chọn một mã sản phẩm dịch vụ chung (ví dụ: `[DichVu] Sửa chữa máy ngoài`) và nhập chi tiết model vào phần ghi chú/mô tả lỗi.
2. **Linh kiện cần thay thế bị hết hàng**: Hệ thống không cho phép xác nhận lệnh (Confirm) nếu kho không đủ linh kiện.
3. **Stocktake Lock (Kho đang kiểm kê)**: Lệnh không thể chuyển sang `DONE` (gây xuất/nhập kho) nếu phân hệ Kho đang trong trạng thái kiểm kê để đảm bảo Data Integrity tuyệt đối.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trạng thái lệnh (State Machine): 
  `DRAFT` -> `QUOTATION` (Báo giá) -> `CONFIRMED` (Khách duyệt) -> `UNDER_REPAIR` -> `DONE` (Hoàn tất) hoặc `CANCELLED` (Hủy).

- **FR-002**: Phân quyền (RBAC):
    - Staff: Tạo DRAFT, thêm linh kiện, cập nhật trạng thái sửa chữa.
    - Manager: Chuyển trạng thái CONFIRMED (hoặc cấp quyền duyệt báo giá), ghi đè giá, Hủy lệnh.

- **FR-003**: Tích hợp Kho (Inventory Reservation): 
  - Tại `CONFIRMED`: Sinh phiếu yêu cầu xuất kho để **Reserve** (giữ chỗ) linh kiện.
  - Tại `DONE`: Chuyển phiếu xuất kho sang hoàn tất để trừ tồn thực tế; Nếu có linh kiện tháo ra (`REMOVE`), sinh phiếu nhập vào Scrap Location.

- **FR-004**: Logic giá: Nếu `under_warranty = TRUE` hoặc `is_free_warranty = TRUE`, `unit_price` của linh kiện/phí phải bằng 0.

- **FR-005**: Tích hợp Kế toán (Invoicing): 
  - Tại trạng thái `DONE`, tự động tạo Hóa Đơn (Invoice) nếu `invoice_method` là sau khi sửa (After Repair) và có phát sinh chi phí.

### Key Entities *(include if feature involves data)*

- **REPAIRS**: Lưu trữ thông tin tổng quát của lệnh.
  - Bổ sung: `partner_id` (Bắt buộc, ID Khách hàng), `invoice_method` (`none`, `b4repair`, `after_repair`), `state`.
- **REPAIR_LINES**: Lưu chi tiết linh kiện.
  - Cần phân định rõ `action_type`: `ADD` (thêm mới từ Stock), `REMOVE` (tháo ra đưa vào Scrap).
  - Bao gồm Price, Free Warranty Status.
- **REPAIR_FEES**: Lưu phí nhân công/dịch vụ ngoài linh kiện.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% lệnh ở trạng thái DONE phải có phiếu xuất kho liên kết trong INVENTORY_DOCUMENTS được đánh dấu hoàn thành.
- **SC-002**: Không xảy ra tình trạng âm kho do linh kiện bị lấy mất bởi phiếu xuất kho khác trong lúc lệnh sửa chữa đang `UNDER_REPAIR` (Nhờ cơ chế Reserve).
- **SC-003**: Phân quyền hoạt động chính xác.

## Assumptions
- Giá vốn của dịch vụ sửa chữa chỉ tính dựa trên linh kiện và phí dịch vụ; không bao gồm các chi phí gián tiếp khác.
- Module Kho đã hỗ trợ chức năng Reserve (Giữ tồn kho trước) thông qua trạng thái phiếu nhập/xuất kho nháp/chờ xử lý.
