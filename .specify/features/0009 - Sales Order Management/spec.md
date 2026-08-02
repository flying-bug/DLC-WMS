# Feature Specification: Sales Order Management

**Feature Branch**: `[0009-sales-order-management]`

**Created**: 2026-08-02

**Status**: Implemented

**Input**: User description: "Module này được thiết kế để quản lý vòng đời Đơn Bán Hàng (Sales Order), bao gồm: tạo đơn, duyệt đơn, xuất kho, theo dõi thanh toán và chia sẻ báo giá công khai cho khách hàng."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quản lý Đơn Bán Hàng (Priority: P1)

Là nhân viên Sales, tôi muốn tạo đơn bán hàng để ghi nhận thỏa thuận với khách hàng, các mặt hàng cần bán, số lượng, đơn giá và các điều khoản thanh toán.

**Why this priority**: Là điểm khởi đầu của quy trình kinh doanh, mang lại doanh thu cho công ty.

**Acceptance Scenarios**:
1. **Given** Nhân viên Sales tạo đơn mới, **When** chọn Khách hàng (Partner) và Kho (Warehouse), **Then** hệ thống bắt buộc nhập ngày lập (soDate) và cho phép nhập Hạn thanh toán (paymentDueDate) >= soDate.
2. **Given** Một đơn hàng đang ở trạng thái `DRAFT`, **When** Staff điền các sản phẩm (`lines`), **Then** hệ thống tự động tính toán `line_amount` (quantity * unit_price) và `total_amount`.
3. **Given** Đơn hàng `DRAFT`, **When** Nhân viên Sales sửa thông tin, **Then** hệ thống lưu vết thông tin và cập nhật tổng tiền.

---

### User Story 2 - Duyệt Đơn & Giữ Hàng Kho (Priority: P1)

Là Quản lý Kinh doanh hoặc Thủ kho, tôi muốn hệ thống tự động kiểm tra tồn kho và "Giữ hàng" (Reserve) ngay khi đơn hàng được duyệt để tránh tình trạng bán trùng (overselling).

**Why this priority**: Đảm bảo đồng bộ tồn kho thực tế, không bị thiếu hụt hàng hóa khi xuất kho giao cho khách.

**Acceptance Scenarios**:
1. **Given** Đơn hàng chuyển sang `APPROVED`, **When** kho còn đủ Hàng khả dụng (`available = total_quantity - reserved_quantity`), **Then** hệ thống sinh `StockReservation` và cập nhật `reserved_quantity` trong Inventory Balance.
2. **Given** Đơn hàng chuyển sang `APPROVED`, **When** kho KHÔNG đủ hàng, **Then** hệ thống văng lỗi (Exception) và chặn duyệt đơn.
3. **Given** Lệnh ở trạng thái `APPROVED`, **When** người dùng hủy đơn (`CANCELLED`), **Then** hệ thống tự động giải phóng (release) `StockReservation`, trả lại hàng khả dụng.

---

### User Story 3 - Chia sẻ Báo Giá Công Khai (Public Quote) (Priority: P2)

Là nhân viên Sales, tôi muốn gửi một đường link báo giá trực tuyến cho Khách hàng mà họ không cần phải đăng nhập vào hệ thống WMS để xem.

**Why this priority**: Tăng trải nghiệm khách hàng, hiện đại hóa quy trình sales.

**Acceptance Scenarios**:
1. **Given** Đơn hàng được tạo, **When** hệ thống lưu dữ liệu, **Then** tự động sinh một mã `publicToken` (UUID v4 ngẫu nhiên).
2. **Given** Khách hàng truy cập link báo giá qua `publicToken`, **When** đơn hàng không bị hủy, **Then** hiển thị giao diện báo giá đầy đủ thông tin mặt hàng, tổng tiền.
3. **Given** Khách hàng cố gắng truy cập link bằng ID hoặc mã `soCode` thông thường, **Then** hệ thống báo lỗi 404/Access Denied để bảo mật thông tin nội bộ.

---

### User Story 4 - Ghi nhận thanh toán và Xuất kho (Priority: P1)

Là Kế toán / Thủ kho, tôi muốn ghi nhận số tiền khách đã trả và tiến hành tạo phiếu xuất kho để giao hàng.

**Acceptance Scenarios**:
1. **Given** Đơn hàng `APPROVED`, **When** Kế toán ghi nhận thanh toán một phần, **Then** `paidAmount` tăng lên và `paymentStatus` chuyển thành `PARTIAL`.
2. **Given** Thanh toán đủ 100%, **Then** `paymentStatus` = `PAID`.
3. **Given** Đơn hàng `APPROVED`, **When** Thủ kho bấm "Tạo phiếu xuất kho", **Then** hệ thống sinh ra một `ExportSlip` liên kết chặt chẽ với Sales Order, tự động map các line sản phẩm sang Export Slip. Khi Export Slip chuyển sang `POSTED`, Sales Order cũng chuyển sang `POSTED`.

---

### Edge Cases

1. **Khách hàng thay đổi ý định sau khi đã duyệt**: Chỉ cho phép Hủy (`CANCELLED`) khi chưa xuất kho (Trạng thái `APPROVED`). Nếu đã `POSTED`, không cho phép hủy đơn trực tiếp mà phải làm quy trình Hoàn hàng (Sales Return).
2. **Sản phẩm bị hết hàng trong lúc đang soạn đơn**: Lúc Lưu nháp (DRAFT) thì không sao, nhưng khi bấm "Duyệt", hệ thống sẽ block lại nếu hàng khả dụng không đủ.
3. **Xung đột ngày tháng**: Hạn thanh toán không được nhỏ hơn Ngày lập đơn và không được nằm trong quá khứ so với thời điểm lập phiếu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: State Machine (Trạng thái đơn): 
  `DRAFT` (Nháp) -> `APPROVED` (Đã duyệt / Giữ hàng) -> `POSTED` (Hoàn tất xuất kho). Rẽ nhánh: `CANCELLED` (Đã hủy).
- **FR-002**: Payment Status (Trạng thái thanh toán):
  `UNPAID` (0) -> `PARTIAL` (< Total) -> `PAID` (== Total).
- **FR-003**: Tích hợp Kho (Inventory Reservation): 
  - `APPROVED`: Sinh `StockReservation`.
  - `POSTED` (thông qua Export Slip): Trừ tồn kho thực tế, xóa/release `StockReservation`.
- **FR-004**: Public Link Security: Sử dụng UUID cho endpoint `/api/v1/public/sales-orders/{token}/quote`, vô hiệu hóa quyền truy cập qua ID/soCode nếu không có JWT.

### Key Entities

- **SALES_ORDERS**: Lưu trữ thông tin tổng quát. `soCode`, `publicToken`, `totalAmount`, `paidAmount`, `status`, `paymentStatus`.
- **SALES_ORDER_LINES**: Lưu chi tiết mặt hàng, `variantId`, `quantity`, `unitPrice`.
- **STOCK_RESERVATIONS**: Bảng trung gian theo dõi lượng hàng bị giữ (`quantityReserved`) cho từng đơn hàng.

## Success Criteria *(mandatory)*

- **SC-001**: Không xảy ra tình trạng âm kho ẢO do nhiều SO cùng duyệt một lúc (Concurrency Control / Row Locking nếu cần).
- **SC-002**: Link báo giá không bị dò rỉ thông tin của các đơn hàng khác (Brute-force protection nhờ UUID).
- **SC-003**: Dòng tiền (Cashflow) được ghi nhận chính xác không sai lệch 1 đồng (`BigDecimal`).
