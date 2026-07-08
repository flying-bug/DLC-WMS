# Feature Specification: Assembly and Disassembly Management

**Feature Branch**: `[006-assembly-and-disassembly-management]`

**Created**: 2026-07-08

**Status**: In Progress

**Input**: User description: "Hoàn thiện logic nghiệp vụ thực thi lệnh Lắp ráp (Assembly) và Tháo dỡ (Disassembly) thông qua quy trình tạo Phiếu xuất kho và Phiếu nhập kho (tương tự chuẩn ERP/MISA). Cập nhật theo các quyết định từ tài liệu Clarify."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quản lý Định mức lắp ráp BOM (Priority: P2)

Là nhân viên quản lý kho, tôi muốn tạo và quản lý định mức lắp ráp (Assembly BOM) để xác định danh sách các linh kiện cần thiết cấu thành một sản phẩm hoàn chỉnh.

**Why this priority**: BOM là công thức gốc, nếu không có BOM, không thể tạo được lệnh lắp ráp hay tháo dỡ hợp lệ.

**Independent Test**: Truy cập màn hình BOM, kiểm tra khả năng thêm, sửa định mức, tỷ lệ phân bổ giá vốn và kiểm tra cơ chế khóa (lock) BOM.

**Acceptance Scenarios**:
1. **Given** Nhân viên đang tạo mới BOM, **When** điền mã sản phẩm thành phẩm và thêm danh sách các linh kiện, **Then** hệ thống yêu cầu số lượng định mức của từng linh kiện phải > 0, VÀ tổng tỷ lệ phân bổ giá vốn (`cost_allocation_pct`) của tất cả linh kiện cộng lại phải đúng bằng 100%.
2. **Given** Một BOM đang ở trạng thái `DRAFT`, **When** chưa được duyệt (`APPROVED`), **Then** không thể chọn BOM này để tạo lệnh lắp ráp hay lệnh tháo dỡ.
3. **Given** Một BOM đang được sử dụng bởi một hoặc nhiều Lệnh Lắp ráp/Tháo dỡ chưa hoàn tất (đang `DRAFT` hoặc `APPROVED`), **When** quản lý cố gắng sửa đổi cấu trúc linh kiện của BOM, **Then** hệ thống chặn hành động và báo lỗi: *"BOM đang được sử dụng, không thể chỉnh sửa. Vui lòng tạo phiên bản mới."*

---

### User Story 2 - Tạo và Duyệt Lệnh Lắp ráp / Tháo dỡ (Priority: P1)

Là thủ kho/quản lý, tôi muốn tạo lệnh Lắp ráp hoặc Tháo dỡ dựa trên định mức (BOM) và duyệt (`APPROVED`) lệnh để làm cơ sở thực thi vật lý.

**Why this priority**: Lệnh đóng vai trò là bản kế hoạch. Cần được duyệt trước khi cho phép xuất/nhập linh kiện để đảm bảo tính chặt chẽ.

**Independent Test**: Tạo mới một lệnh, kiểm tra các trạng thái `DRAFT`, `APPROVED`, và `POSTED`.

**Acceptance Scenarios**:
1. **Given** Lệnh đang ở trạng thái `DRAFT`, **When** quản lý xem xét và click "Duyệt" (Approve), **Then** trạng thái lệnh chuyển thành `APPROVED` và không cho phép sửa đổi chi tiết nữa. Dữ liệu công thức BOM được chốt (snapshot) cứng vào thời điểm này.
2. **Given** Lệnh đã chuyển qua trạng thái `APPROVED` hoặc `POSTED`, **When** thủ kho cố gắng chỉnh sửa lệnh, **Then** hệ thống chặn hành động và báo lỗi.
3. **Given** Một lệnh đang ở trạng thái `APPROVED` và ĐÃ phát sinh Phiếu kho, **When** người dùng bấm Hủy (Cancel) lệnh, **Then** hệ thống **chặn cứng (Hard Block)** và yêu cầu xử lý/hủy các phiếu kho liên quan trước.

---

### User Story 3 - Thực thi lệnh qua Phiếu Nhập/Xuất Kho & Tính Giá Vốn (Priority: P1)

Là thủ kho, tôi muốn thực thi lệnh đã duyệt bằng cách sinh ra các Phiếu xuất kho và Phiếu nhập kho tương ứng. Hỗ trợ truy vết Serial, tính giá vốn và xử lý linh kiện hỏng.

**Why this priority**: Đảm bảo quy trình xuất/nhập vật lý khớp với kế hoạch, tính đúng giá thành hạch toán.

**Independent Test**: Mở Lệnh `APPROVED`, tạo phiếu xuất/nhập, kiểm tra tracking Serial, giá vốn sinh ra và tồn kho thực tế.

**Acceptance Scenarios**:
1. **Given** Một Lệnh Lắp ráp `APPROVED`, **When** bấm "Tạo phiếu xuất linh kiện", **Then** hệ thống sinh Phiếu xuất. Thủ kho phải quét chọn các mã **Serial** thực tế. Khi Ghi sổ, tồn kho linh kiện bị trừ.
2. **Given** Lệnh Lắp ráp hoàn tất (một phần/toàn bộ), **When** bấm "Tạo phiếu nhập thành phẩm", **Then** hệ thống sinh Phiếu nhập, yêu cầu cấp **Serial mới**. Giá vốn thành phẩm tự động = Tổng giá vốn linh kiện đã xuất.
3. **Given** Một Lệnh Tháo dỡ `APPROVED`, **When** bấm "Tạo phiếu xuất thành phẩm", **Then** hệ thống bắt buộc thủ kho phải quét mã Serial của thành phẩm đem tháo dỡ, đồng thời Validate: Serial này phải đang tồn tại trong kho (Quantity > 0). Nếu không, báo lỗi chặn xuất.
4. **Given** Lệnh Tháo dỡ đang nhập linh kiện về, **When** hệ thống sinh Phiếu nhập, **Then** giá vốn của từng linh kiện thu hồi được tự động chia theo tỷ lệ phần trăm (`cost_allocation_pct`) của BOM nhân với giá vốn của thành phẩm đem tháo dỡ.
5. **Given** Có linh kiện bị gãy hỏng khi tháo dỡ, **Then** thủ kho được quyền tách dòng trên Phiếu nhập thu hồi để nhập số hàng hỏng này vào "Kho Phế Liệu".
6. **Given** Toàn bộ công việc kết thúc, **When** Thủ kho bấm "Hoàn thành Lệnh", **Then** Lệnh chuyển sang trạng thái `POSTED`.

---

### Edge Cases

- What happens if phiếu nhập/xuất được sinh ra nhưng bị từ chối/hủy? -> Cho phép sinh lại phiếu mới từ Lệnh (nếu Lệnh chưa `POSTED`).
- What if số lượng thu hồi thực tế khi tháo dỡ ít hơn định mức? -> Sửa `Quantity Actual` trên Phiếu Nhập kho sinh ra trước khi Ghi sổ. Lệnh vẫn lưu số định mức.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Trạng thái Lệnh (Order): `DRAFT`, `APPROVED`, `POSTED`. Hard Block chặn Hủy (Cancel)/Xóa lệnh nếu đã có Phiếu kho liên kết (InventoryDocument) được sinh ra.
- **FR-002**: Thực thi từng phần (Partial Fulfillment): Cho phép liên tục tạo `InventoryDocument` từ Lệnh cho đến khi đủ số lượng.
- **FR-003**: Genealogy Tracking (Truy vết Serial): Bắt buộc khai báo Serial trên Phiếu xuất/nhập sinh ra từ lệnh. Hệ thống tự động map phả hệ giữa Serial thành phẩm và Serial linh kiện.
- **FR-004**: Tự động tính Giá vốn (Costing):
  - Lắp ráp: Giá vốn Target Variant = Tổng (Giá vốn Component * Số lượng xuất).
  - Tháo dỡ: Giá vốn Component = (Giá vốn Target Variant đem tháo dỡ * `cost_allocation_pct`).
- **FR-005**: Hao hụt tháo dỡ (Scrap Handling): Hỗ trợ sửa `Quantity Actual` và chọn Kho đích khác nhau trên Phiếu nhập thu hồi.
- **FR-006**: Tồn kho và giá vốn chỉ bị tác động khi Phiếu Nhập/Xuất đạt trạng thái Ghi sổ (`POSTED`).
- **FR-007**: Toàn vẹn Version BOM: Khóa tính năng sửa đổi BOM nếu BOM đó đang được tham chiếu bởi bất kỳ AssemblyOrder nào đang ở trạng thái `DRAFT` hoặc `APPROVED`.
- **FR-008**: Validation Tháo dỡ: Bắt buộc Validate Target Variant và Serial đem đi tháo dỡ phải có tồn kho lớn hơn 0 tại thời điểm sinh Phiếu xuất.

### Key Entities *(include if feature involves data)*

- **AssemblyBomLine**: **(NEW)** Bổ sung cột `cost_allocation_pct` (Decimal/Float) để chia tỷ lệ giá vốn khi tháo dỡ. Validation tổng các lines của 1 BOM phải bằng 100%.
- **AssemblyOrder**: Điều chỉnh luồng trạng thái chính thành (`DRAFT`, `APPROVED`, `POSTED`). 
- **InventoryDocument** & **InventoryDocumentLine**: Tái sử dụng bảng hiện có, đảm bảo liên kết `reference_order_id` về mã Lệnh.
- **SerialNumber / Genealogy**: Sử dụng bảng Serial hiện tại hoặc thêm `SERIAL_GENEALOGY` để map Parent-Child.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% Lệnh có phiếu kho liên quan bị chặn Hủy lệnh. Lỗi cố tình sửa BOM đang sử dụng bị văng Exception 400.
- **SC-002**: Báo cáo giá trị tồn kho (Value) khớp hoàn toàn với giá vốn kế thừa, xử lý đúng phép chia tỷ lệ từ `cost_allocation_pct` mà không rớt số lẻ.
- **SC-003**: 100% truy vết được nguồn gốc linh kiện (Serial Component) của một thành phẩm máy tính (Serial Target) sau khi lắp ráp.

## Assumptions

- **Chi phí nhân công/gia công (Overhead/Labor Costs):** Không hỗ trợ phân bổ các chi phí ngoài lề (nhân công, điện nước) vào giá vốn thành phẩm. Giá vốn chỉ thuần túy dựa trên vật liệu trực tiếp.
- Module Quản lý Nhập/Xuất kho (Inventory Document) của hệ thống đã hỗ trợ sẵn việc quản lý cấp độ Serial và có thể tích hợp.
