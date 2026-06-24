# Feature Specification: Quản lý Khách hàng (Customer Management)

- **Feature Branch**: `feat-customer-management`
- **Created**: 24/06/2026
- **Status**: Ready for Development
- **Input**: User description: "Hệ thống quản lý kho và bảo hành linh kiện điện tử. Chỉ xử lý thu chi cơ bản, không dính dáng đến kế toán, công nợ hay tính lương."

## Revision History

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 24/06/2026 | 1.0.0 | Khởi tạo tài liệu Spec ban đầu | BA |
| 24/06/2026 | 1.1.0 | Cập nhật Business Rules sau Deep Dive Review (Thêm nhóm khách hàng, cảnh báo đổi SĐT, luồng trả hàng) | BA |
| 24/06/2026 | 1.2.0 | Tối ưu hiệu năng KH vãng lai, sửa logic hiển thị Tab mua hàng và validate SĐT bằng Regex | BA |

## User Scenarios & Testing (mandatory)

### User Story 1 - Thêm mới & Tra cứu Khách hàng (Priority: P1)
Nhân viên Bán hàng/Bảo hành cần tạo mới thông tin khách hàng (tối thiểu Tên và Số điện thoại) hoặc tìm kiếm khách hàng cũ thông qua Số điện thoại để tiến hành lập Phiếu xuất bán hoặc Phiếu tiếp nhận bảo hành.

- **Why this priority**: Đây là bước khởi nguồn bắt buộc của mọi luồng nghiệp vụ. Không xác định được khách hàng thì không thể bán hàng hay nhận bảo hành thiết bị.
- **Independent Test**: Có thể test độc lập hoàn toàn giao diện Thêm mới (Drawer) và thanh tìm kiếm (Search bar) trên trang danh sách mà không cần phụ thuộc các module khác.
- **Acceptance Scenarios**:
  - **Given** người dùng mở form "Thêm mới", **When** nhập Họ Tên, Số điện thoại hợp lệ (chưa tồn tại) và bấm "Lưu", **Then** hệ thống ghi nhận thành công vào bảng `PARTNERS`, tự động sinh mã KH (vd: KH0001) và hiển thị bản ghi mới lên danh sách.
  - **Given** số điện thoại "0901234567" đã tồn tại trong DB, **When** người dùng cố gắng tạo một khách hàng mới với SĐT "0901234567", **Then** hệ thống chặn lưu và báo lỗi: "Số điện thoại này đã được đăng ký cho khách hàng [Tên KH]".
  - **Given** số điện thoại "0901234567" trùng với khách hàng đã có trạng thái `INACTIVE`, **When** người dùng cố gắng tạo một khách hàng mới với SĐT "0901234567", **Then** hệ thống hiển thị thông báo: "SĐT này thuộc về khách hàng cũ đã ngừng hoạt động. Bạn có muốn khôi phục (Re-activate) lại không?".
  - **Given** danh sách khách hàng đang có dữ liệu, **When** người dùng gõ SĐT vào ô Tìm kiếm, **Then** hệ thống lọc và trả về đúng duy nhất khách hàng khớp với SĐT đó.

### User Story 2 - Xem chi tiết Hồ sơ Khách hàng & Thiết bị (Priority: P1)
Nhân viên bảo hành cần xem chi tiết hồ sơ của một khách hàng, bao gồm thông tin liên hệ và 3 tab dữ liệu trọng tâm: Lịch sử mua hàng, Lịch sử bảo hành và Lịch sử Thu/Chi.

- **Why this priority**: Trọng tâm của hệ thống bảo hành nằm ở Serial Number (S/N). Khi tiếp nhận, nhân viên phải nhìn vào hồ sơ để biết khách hàng này đã mua linh kiện gì, mã S/N là gì, còn hạn bảo hành hay không.
- **Independent Test**: Yêu cầu team Backend mock dữ liệu ở các bảng `SERIAL_NUMBERS`, `WARRANTIES`, `PAYMENT_RECEIPTS` trỏ về một `partner_id`. Click xem chi tiết KH đó và kiểm tra hiển thị trên 3 Tab.
- **Acceptance Scenarios**:
  - **Given** người dùng đang ở danh sách, **When** click vào Tên hoặc Mã Khách Hàng, **Then** hệ thống mở trang Chi tiết Khách hàng.
  - **Given** trang chi tiết khách hàng, **When** người dùng xem tab "Lịch sử mua hàng", **Then** hiển thị danh sách các sản phẩm đã mua bao gồm cả linh kiện có S/N và không có S/N (query từ `SALES_ORDER_LINES`).
  - **Given** trang chi tiết khách hàng, **When** người dùng xem tab "Lịch sử Bảo hành", **Then** hiển thị danh sách các gói bảo hành (`warranty_code`) và phiếu sửa chữa (`repair_code`) liên quan.

### User Story 3 - Cập nhật thông tin & Ngừng hoạt động Khách hàng (Priority: P2)
Quản trị viên hoặc nhân viên có quyền cần cập nhật thông tin khách hàng (nếu sai sót) hoặc chuyển trạng thái sang "Ngừng hoạt động" thay vì xóa dữ liệu.

- **Why this priority**: Cần thiết để bảo trì tính chính xác của dữ liệu hệ thống, nhưng tần suất sử dụng không cao bằng việc Thêm mới/Tìm kiếm.
- **Independent Test**: Đổi thông tin SĐT/Tên, lưu lại và f5 xem DB đã cập nhật chưa. Bấm "Ngừng hoạt động" và kiểm tra khách hàng này có bị ẩn khỏi dropdown chọn khách hàng ở module Tạo đơn hàng không.
- **Acceptance Scenarios**:
  - **Given** một khách hàng có trạng thái `APPROVED`, **When** Admin chọn action "Ngừng hoạt động", **Then** hệ thống update trạng thái thành `INACTIVE`. Khi nhân viên tạo mới Phiếu Bảo hành/Phiếu xuất bán và gõ SĐT của khách này, hệ thống MUST NOT hiển thị gợi ý trong dropdown list tìm kiếm.
  - **Given** khách hàng đã bị `INACTIVE`, **When** người dùng mở lại các Phiếu bảo hành cũ của khách này, **Then** thông tin khách hàng vẫn hiển thị bình thường (toàn vẹn dữ liệu lịch sử).
  - **Given** nhân viên chọn "Sửa Số điện thoại" của khách hàng, **When** nhập SĐT mới và bấm Lưu, **Then** hệ thống hiển thị cảnh báo: *"Việc thay đổi số điện thoại sẽ làm thay đổi thông tin định danh sở hữu thiết bị. Bạn có chắc chắn?"*.
  - **Given** nhân viên xác nhận sửa SĐT, **Then** hệ thống ghi nhận bản ghi Audit Log (Lưu lịch sử SĐT cũ -> SĐT mới) và cập nhật SĐT mới vào bảng `PARTNERS`.

## Edge Cases

- **What happens when** nhân viên tạo giao dịch cho một Khách vãng lai không muốn cung cấp thông tin?
  - Hệ thống cung cấp sẵn một bản ghi mặc định (Seed data): `code: KH-0000`, `name: Khách vãng lai`. Dùng bản ghi này để bypass nghiệp vụ. Về mặt UI: Hệ thống MUST ẩn/disable nút "Xem chi tiết" đối với Khách vãng lai (`KH-0000`) để tránh query dữ liệu khổng lồ gây crash hệ thống. Đồng thời, API chi tiết KH phải áp dụng Pagination (Phân trang) cho các Tab.
- **What happens when** Admin cố tình "Ngừng hoạt động" một khách hàng đang có thiết bị gửi bảo hành (Phiếu bảo hành ở trạng thái `RECEIVED` hoặc `REPAIRING`)?
  - Hệ thống chặn thao tác và báo lỗi: "Không thể vô hiệu hóa khách hàng đang có thiết bị sửa chữa tại trung tâm."
- **How does system handle** việc khách hàng doanh nghiệp mua hàng nhưng hệ thống không có form kế toán?
  - Mặc định UI chỉ cần Tên, SĐT, Địa chỉ. Backend tự động gán các giá trị ngầm để bypass bảng `PARTNERS` (xem phần Functional Requirements).
- **How does system handle** việc giao nhận trả hàng bảo hành qua các đơn vị vận chuyển khi khách chỉ có `address` dạng text tự do?
  - Giữ nguyên `address` dạng text trong module Khách hàng để ưu tiên tốc độ nhập liệu. Khi tạo lệnh Trả hàng (Return Order), hệ thống/module Logistics sẽ có một form tách biệt ép nhập cấu trúc chuẩn (Tỉnh/Thành, Quận/Huyện, Phường/Xã).
- **What happens when** Khách B mang linh kiện của Khách A (chuyển nhượng/sang tay) đến bảo hành?
  - Hệ thống cho phép gán Phiếu bảo hành cho Khách B dù S/N thuộc về Khách A. Hệ thống sẽ hiển thị cảnh báo (Soft warning): *"Thiết bị này được mua bởi Khách A, bạn có muốn gán bảo hành này cho Khách B không?"*. Nếu Yes -> Chạy tiếp (Bypass validation).

## Requirements (mandatory)

### Functional Requirements
- **FR-001**: Hệ thống MUST định danh tính duy nhất của khách hàng bằng cột phone (đã có index `idx_partners_phone` trong DB). Số điện thoại MUST được validate bằng Regex chuẩn của Backend: `(\+84|0)[\s.-]?(3[2-9]|5[5689]|7[06-9]|8[1-9]|9[0-9])([\s.-]?\d){7}` (Trim khoảng trắng trước khi lưu).
- **FR-002**: Backend MUST tự động sinh code (Mã khách hàng) khi tạo mới với định dạng `KH` + `YYYYMM` (Năm tháng hiện tại) + `XXXX` (Số tự tăng từ 0001), ví dụ: KH2026060001.
- **FR-003**: UI/UX MUST hỗ trợ "Tạo nhanh khách hàng" (Popup/Drawer) ngay từ màn hình Tạo Phiếu Bảo Hành hoặc Phiếu Bán Hàng. Form tạo nhanh MUST có trường `Nhóm khách hàng` (Dropdown: `Khách lẻ` - RETAIL, `Khách thợ` - DEALER), mặc định chọn `Khách lẻ`.
- **FR-004**: Hệ thống MUST KHÔNG cung cấp tính năng "Xóa cứng" (Hard Delete) trên giao diện. Chỉ có tính năng "Ngừng hoạt động", map với cột `status = INACTIVE`.
- **FR-005**: (Quan trọng) Backend MUST tự động gán các giá trị mặc định sau khi tạo record vào bảng `PARTNERS` để tương thích DB mà không làm phức tạp UI:
  - `is_customer = TRUE`
  - `type = 'INDIVIDUAL'`
  - `group_type` = Lấy từ Dropdown của FR-003 (mặc định 'RETAIL')
  - `credit_limit = 0.00`
  - `payment_term_days = 0`
- **FR-006**: Trang chi tiết Khách hàng MUST hiển thị 3 Tab, TẤT CẢ phải được Phân trang (Pagination) để tối ưu hiệu năng:
  - **Lịch sử mua hàng**: Query từ bảng `SALES_ORDER_LINES` qua `sales_order_id` (để cover cả linh kiện có S/N và không có S/N).
  - **Bảo hành**: Query từ bảng `WARRANTIES` và `REPAIRS`.
  - **Thu/Chi**: Query từ bảng `PAYMENT_RECEIPTS` và `PAYMENT_VOUCHERS`. Không sử dụng bảng `PARTNER_LEDGER`. Phía trên danh sách phiếu Thu/Chi, hệ thống MUST hiển thị một thẻ tóm tắt (Summary Card) thể hiện Tổng giá trị đã thu. Giá trị này bằng tổng cột `amount` của các bản ghi `status = 'POSTED'` trong bảng `PAYMENT_RECEIPTS` của khách hàng đó.
- **FR-007**: Đồng bộ trạng thái thiết bị: Khi tạo Phiếu tiếp nhận bảo hành (REPAIRS), hệ thống bắt buộc phải cập nhật trạng thái của mã linh kiện đó trong bảng `SERIAL_NUMBERS.status` từ `SOLD` thành `WARRANTY_HOLD` hoặc `REPAIRING`.

### Key Entities
- **PARTNERS** (Khách hàng): Thực thể lõi lưu thông tin (với điều kiện `is_customer = TRUE`). Key attributes: `id` (PK), `code`, `name`, `phone`, `address`, `status`, `group_type`.
- **SERIAL_NUMBERS** (Thiết bị): Lưu S/N linh kiện khách sở hữu. Relates to `PRODUCT_VARIANTS`.
- **WARRANTIES / REPAIRS** (Bảo hành): Các giao dịch bảo hành và sửa chữa gắn với `partner_id` và `serial_number_id`.
- **PAYMENT_RECEIPTS / PAYMENT_VOUCHERS** (Thu/Chi): Lưu trữ dòng tiền vào/ra cơ bản gắn với `partner_id`.

## Success Criteria (mandatory)

### Measurable Outcomes
- **SC-001**: Tính năng tìm kiếm khách hàng bằng số điện thoại trên giao diện trả về kết quả trong thời gian dưới < 1.0 giây (nhờ tận dụng index `idx_partners_phone`).
- **SC-002**: Tỉ lệ gián đoạn luồng làm việc (user phải thoát trang Bảo hành ra trang Khách hàng để tạo mới KH) giảm xuống 0% nhờ tính năng FR-003.
- **SC-003**: 100% dữ liệu liên kết (S/N, Phiếu bảo hành, Thu chi) không bị orphan (mất liên kết) khi trạng thái khách hàng bị chuyển sang `INACTIVE`.

### Assumptions
- **Mô hình định danh**: Một số điện thoại chỉ đại diện cho một khách hàng cá nhân duy nhất. Hệ thống không xử lý logic một SĐT dùng chung cho nhiều khách hàng.
- **Giới hạn nghiệp vụ**: Doanh nghiệp sẽ không có nhu cầu quản lý công nợ (`credit_limit`), xuất hóa đơn VAT (`tax_code`) hay tài khoản ngân hàng (`bank_account_number`) của khách. Các field này trong DB `PARTNERS` tồn tại chỉ để dự phòng hoặc phục vụ cho loại Đối tác là Nhà cung cấp (`is_supplier`).
- **Tích hợp**: Các module Sales, Warranty và Finance (Cash) đã sẵn sàng các Endpoint API (List) để module Customer gọi và hiển thị dữ liệu lên 3 Tab chi tiết.
