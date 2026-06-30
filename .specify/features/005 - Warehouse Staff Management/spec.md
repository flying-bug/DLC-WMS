# Feature Specification: Warehouse Staff Management

**Feature Branch**: `[001-warehouse-staff-management]`

**Created**: 2026-06-30

**Status**: Ready for Development

**Input**: User description: "Quản lý nhân sự kho theo ngữ cảnh (Contextual RBAC), hỗ trợ đa kho/đa vai trò, quản lý trạng thái tài khoản và lịch sử phân quyền."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Xem danh sách nhân sự tại kho (Priority: P1)

Là một Manager, tôi muốn xem danh sách toàn bộ nhân sự tại kho hiện tại, để nắm bắt nhân sự và vai trò của họ.

**Why this priority**: Cốt lõi của việc quản lý nhân sự là nhận diện được ai đang làm việc tại kho và trạng thái của họ, từ đó thực hiện các bước điều phối, phân quyền tiếp theo.

**Independent Test**: Truy cập màn hình nhân sự của kho, kiểm tra danh sách có trùng khớp với DB mapping.

**Acceptance Scenarios**:

1. **Given** Manager đang chọn "Kho A", **When** truy cập màn hình "Quản lý nhân sự", **Then** hiển thị danh sách nhân sự (Tên, Email, Vai trò) thuộc "Kho A". Mặc định (Default) chỉ hiển thị các nhân sự đang hoạt động (`is_active = TRUE`).
2. **Given** User đã bị Super Admin khóa (Inactive) hoặc bị thu hồi quyền tại kho, **When** Manager bật Toggle "Hiển thị nhân sự đã ngừng hoạt động", **Then** dòng dữ liệu nhân viên đó hiển thị trạng thái mờ (grayed out) kèm badge `[Đã khóa]` hoặc `[Ngừng hoạt động]`.
3. **Given** Danh sách nhân sự đông đảo, **When** Manager sử dụng bộ lọc (Filter), **Then** hệ thống cho phép lọc theo "Vai trò" (Thủ kho, Kỹ thuật bảo hành, QC...) và "Trạng thái" (Active/Inactive) để dễ dàng quản lý.

---

### User Story 2 - Gán nhân sự vào kho (Priority: P1)

Là một Manager, tôi muốn tìm kiếm và gán user vào kho với một hoặc nhiều vai trò cụ thể.

**Why this priority**: Cần thiết để bổ sung nhân lực vận hành kho; không có tính năng này kho sẽ không có nhân sự để làm việc. Tính năng kiêm nhiệm đa vai trò rất quan trọng cho các kho quy mô vừa và nhỏ.

**Independent Test**: Sử dụng API search với `warehouse_id` và một danh sách `role_id` (hỗ trợ multi-select).

**Acceptance Scenarios**:

1. **Given** một user hợp lệ, **When** Manager tìm kiếm và click mở Dropdown chọn vai trò, **Then** hệ thống chỉ hiển thị các Vai trò (Roles) thuộc nghiệp vụ Kho (Warehouse Roles), không hiển thị các quyền cấp cao khác (Super Admin, HR...).
2. **Given** Manager chọn nhiều vai trò (vd: Thủ kho, QC), **When** gán cho user, **Then** hệ thống gán quyền thành công và ghi nhận user đó kiêm nhiệm các vai trò này.
3. **Given** user tìm kiếm đã thuộc kho, **When** thực hiện tìm kiếm, **Then** hệ thống không trả về kết quả hoặc cảnh báo "Nhân viên đã thuộc kho" (tránh trùng lặp).
4. **Given** Manager hoàn tất việc gán quyền, **When** hệ thống lưu thành công, **Then** hệ thống tự động gửi Notification (In-app hoặc Email) thông báo cho User: *"Bạn vừa được cấp quyền [Các vai trò] tại [Tên Kho]"*.

---

### User Story 3 - Cập nhật/Thu hồi quyền (Priority: P2)

Là một Manager, tôi muốn thay đổi vai trò hoặc thu hồi quyền (Soft delete) nhân viên khỏi kho.

**Why this priority**: Quan trọng cho việc luân chuyển nhân sự hoặc chấm dứt quyền truy cập, bảo đảm an ninh và đúng quy trình vận hành kho. Yêu cầu chặn xóa nếu có chứng từ dở dang để bảo đảm tính toàn vẹn số liệu (MISA standard).

**Independent Test**: Có thể test độc lập bằng cách thay đổi quyền hoặc thu hồi quyền user (chuyển `is_active = FALSE`), kiểm tra lại danh sách hoặc audit log và kiểm tra cơ chế chặn thu hồi quyền khi có chứng từ dở dang.

**Acceptance Scenarios**:

1. **Given** nhân viên A là "Thủ kho", **When** đổi sang "Kỹ thuật bảo hành", **Then** quyền truy cập A cập nhật tức thì, và gửi Notification cho A.
2. **Given** nhân viên B bị khóa bởi Admin, **When** Manager thao tác, **Then** chỉ có quyền [Xem chi tiết] và [Thu hồi quyền], không được quyền sửa vai trò.
3. **Given** Manager C, **When** cố gắng thu hồi quyền của chính mình, **Then** nút hành động bị vô hiệu hóa (Anti-self-lockout).
4. **Given** Nhân viên D đang là người tạo (`created_by`) một Phiếu nhập/xuất, Phiếu kiểm kê, chuyển kho... ở trạng thái `DRAFT` hoặc `SUBMITTED`, **When** Manager thực hiện thu hồi quyền, **Then** hệ thống **chặn (Hard block)** thao tác và báo lỗi: *"Nhân viên đang có chứng từ chưa hoàn tất. Vui lòng hủy chứng từ hoặc xử lý xong trước khi thu hồi quyền."*

---

### Edge Cases

- What happens when một user đang thao tác dở dang trong kho (VD: tạo phiếu xuất) thì bị Manager thu hồi quyền? -> Hệ thống phải ngắt session/quyền ngay lập tức (khi check `warehouse_id` và `is_active` ở các request tiếp theo), trả về 403.
- How does system handle concurrent changes? -> Check trạng thái user ở Backend bằng optimistic locking hoặc kiểm tra lại tồn tại trước khi Update thu hồi quyền.
- What happens when kho bị ngưng hoạt động? -> Cần có cơ chế vô hiệu hóa hoặc khóa tác vụ ở cấp độ Warehouse, nhưng data phân quyền vẫn được giữ nguyên.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống bắt buộc truyền `warehouse_id` trong Header/Path cho mọi request để kiểm soát Contextual RBAC.
- **FR-002**: User có thể đảm nhiệm một hoặc nhiều vai trò khác nhau ở các kho khác nhau (độc lập quyền hạn) và được phép kiêm nhiệm trong cùng 1 kho.
- **FR-003**: Khi User chuyển kho (Switch Context) tại Header, hệ thống re-render toàn bộ Menu/Tính năng tương ứng với quyền của User tại kho đó.
- **FR-004**: Nếu User chuyển sang kho không có quyền Manager, hệ thống tự động Redirect về Dashboard kho đó và hiển thị Toast: *"Bạn không có quyền quản lý nhân sự tại kho này"*.
- **FR-005**: Mọi thay đổi về phân quyền phải được ghi lại tại `AUDIT_LOGS` và kích hoạt hệ thống Notification (Email/In-app) cho User liên quan.
- **FR-006**: Bắt buộc kiểm tra (Validation) các chứng từ do nhân viên tạo (`created_by`) đang ở trạng thái `DRAFT` hoặc `SUBMITTED` trước khi cho phép thu hồi quyền. Thu hồi quyền chỉ thực hiện Soft Delete (cập nhật `is_active = FALSE`), tuyệt đối không dùng lệnh DELETE vật lý.
- **FR-007**: API lấy danh sách Vai trò để gán quyền cho nhân sự kho BẮT BUỘC phải được filter chỉ trả về các Vai trò thuộc phân hệ quản lý kho (Warehouse Roles), cấm hiển thị các quyền quản trị cấp cao.

### Key Entities *(include if feature involves data)*

- **USER_WAREHOUSE_ROLES**: Bảng Mapping lưu thông tin phân quyền theo ngữ cảnh gồm: `id`, `user_id`, `warehouse_id`, `role_id`, `is_active`. (Có `UNIQUE KEY (user_id, warehouse_id, role_id)` cho phép hỗ trợ kiêm nhiệm nhiều roles).
- **AUDIT_LOGS**: Lưu vết thao tác hệ thống (`user_id`, `action`, `entity_name`, `entity_id`, `detail` dạng JSON lưu old/new value, `created_at`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chuyển đổi ngữ cảnh kho (Switch Context) hoàn thành trong < 1 giây.
- **SC-002**: 100% request trái thẩm quyền bị từ chối với lỗi 403 Forbidden.
- **SC-003**: Log đầy đủ mọi hành động thay đổi quyền trong bảng Audit Log mà không có sai sót hay miss data.
- **SC-004**: Đảm bảo 100% không cho phép thu hồi quyền nhân viên nếu họ vẫn đang là người tạo (`created_by`) các chứng từ ở trạng thái `DRAFT` hoặc `SUBMITTED` tại kho.
- **SC-005**: 100% Manager không thể tự ý gán các quyền ngoài phạm vi phân hệ quản lý kho cho nhân viên khác.

## Assumptions

- Việc tạo/khóa tài khoản nhân viên (User Identity) thuộc trách nhiệm của Super Admin, không thuộc phạm vi của Manager.
- Quyền hạn (Role Permission) được định nghĩa sẵn bởi hệ thống, Manager không được tự tạo mới vai trò (chỉ được gán).
- Manager không được quyền gán vai trò "Manager" cho người khác (trừ khi có thiết lập đặc biệt hoặc thuộc thẩm quyền Super Admin).
- User có kết nối mạng ổn định để thực hiện các thao tác chuyển đổi context.
