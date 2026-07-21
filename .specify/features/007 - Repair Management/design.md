# Thiết kế Frontend (UI/UX) - Repair Management

**Tham khảo thiết kế (Reference):** [Odoo 17 Repair Orders](https://www.youtube.com/watch?v=gM5WtdvSF9s)

## Yêu cầu thực hiện
Thực hiện sửa đổi FE của **Repair Management** (Chỉ FE, không sửa BE). Trước khi thực hiện, hãy đọc và phân tích toàn bộ source code Frontend và Backend của Repair Management, bao gồm entity, DTO, request/response, API, validation, business logic, routing, state management và các component dùng chung để đảm bảo giao diện frontend khớp hoàn toàn với backend hiện có.

Thực hiện refactor toàn bộ UI của module Repair Management gồm các màn hình:
- View Repair List
- View Repair Details (nếu có)
- Create Repair Order
- Update Repair Order
- Delete Repair Order (Modal xác nhận)

## 2. Chi tiết các module/tính năng cần đối chiếu & thực hiện
Dựa trên tài liệu đặc tả (spec) và Data Model, Frontend cần đảm bảo hiển thị và tương tác đầy đủ với các phân hệ (sub-modules) sau:

### 2.1. Quản lý thông tin chung (Repair Orders)
- **Thông tin cơ bản:** Mã lệnh (`repair_code`), Khách hàng (`partner_id`), Sản phẩm sửa chữa (`product_id`), Serial sản phẩm (`serial_number_id`), Mô tả lỗi (`issue_description`).
- **Thông tin bổ sung:** Tình trạng bảo hành (`under_warranty`), Hạn bảo hành sau sửa (`repair_warranty_end_date`), Phương thức xuất Hóa đơn (`invoice_method`: none, b4repair, after_repair).
- **Trạng thái (Status/State Machine):** `DRAFT` -> `QUOTATION` -> `CONFIRMED` -> `UNDER_REPAIR` -> `TESTING` -> `DONE` hoặc `CANCELLED`.
- **Logic Validation:** Không cho phép `CONFIRMED` nếu thiếu Khách hàng (`partner_id`).

### 2.2. Quản lý linh kiện (Repair Lines - Tabs Notebook)
- Hỗ trợ bảng Inline Editing cho phép thao tác:
  - **Loại thao tác (`action_type`):** Lắp thêm (`ADD`) hoặc Thu hồi (`REMOVE` - đưa vào kho phế liệu).
  - **Dữ liệu linh kiện:** Mã biến thể (`component_variant_id`), Số lượng (`quantity`), Đơn giá (`unit_price`), Miễn phí bảo hành (`is_free_warranty`), Serial linh kiện (`serial_number_id`), Ghi chú (`note`).
- **Logic Validation:** Nếu lệnh đánh dấu `under_warranty = true` hoặc dòng linh kiện `is_free_warranty = true`, thì Đơn giá (`unit_price`) bắt buộc bằng 0. 

### 2.3. Quản lý phí dịch vụ (Repair Fees - Tabs Notebook)
- Quản lý các loại phí nhân công, dịch vụ đi kèm.
- **Dữ liệu phí:** Tên phí (`fee_name`), Số tiền (`fee_amount`), Miễn phí bảo hành (`is_free_warranty`).

### 2.4. Hiển thị thông tin tích hợp (Tùy chọn hiển thị)
- **Tồn kho (Inventory):** Hiển thị cảnh báo hoặc trạng thái giữ kho (Reserve) khi lệnh `CONFIRMED`, và thông báo trừ kho thành công khi `DONE`. Không cho phép `CONFIRMED` nếu kho thiếu linh kiện `ADD`.
- **Hóa đơn (Invoicing):** Hiển thị trạng thái/link hóa đơn nếu `invoice_method` kích hoạt khi lệnh ở trạng thái `DONE`.

### 2.5. Các tác vụ dọn dẹp & Refactor
- Xóa toàn bộ field, filter, cột, dữ liệu, action hoặc component không còn được backend hỗ trợ hoặc không có trong API.
- Cập nhật chính xác payload request/response theo DTO của backend (loại bỏ các mock data cũ).
- Tận dụng tối đa các component dùng chung của dự án.

## Đồng bộ UI/UX
Refactor UI của module để đồng nhất 100% với layout tham khảo từ video YouTube và form chuẩn của **Import/Export Management** (nếu applicable).

Chuẩn hóa và đồng nhất toàn bộ:
- Button (màu sắc, kích thước, icon, hover, disabled, loading).
- Form.
- Search box.
- Filter.
- Dropdown.
- DatePicker.
- Table.
- Pagination.
- Modal.
- Drawer (nếu có).
- Toast Notification.
- Empty State.
- Loading State.
- Error State.
- Badge trạng thái.
- Breadcrumb.
- Card.
- Tooltip.
- Icon.
- Typography.
- Spacing, margin, padding.
- Responsive.

Đồng nhất layout và style của:
- Ô tìm kiếm.
- Placeholder (ví dụ: "Mã lệnh sửa chữa...").
- Bộ lọc.
- Từ ngày (dd/MM/yyyy).
- Đến ngày (dd/MM/yyyy).
- Tình trạng.
- Dropdown.
- DatePicker.
- Khoảng cách giữa các filter.
- Nút Lọc dữ liệu.
- Nút Làm mới.
- Bảng dữ liệu.
- Phân trang.

## Ngôn ngữ & Nội dung
Chuyển toàn bộ toast, validation message, modal xác nhận và thông báo hệ thống sang tiếng Việt có dấu, sử dụng wording thống nhất trên toàn hệ thống.

## Ràng buộc Kỹ thuật
Không thay đổi business logic, API, route, permission hoặc cấu trúc dữ liệu; chỉ chỉnh sửa UI/UX và tối ưu code frontend. Ưu tiên tái sử dụng các component dùng chung hiện có, tuyệt đối không tạo component hoặc layout mới nếu dự án đã có component tương đương.

## Tiêu chí Nghiệm thu (Checklist)
Sau khi hoàn thành, tự kiểm tra lại toàn bộ module để đảm bảo:
- [ ] Frontend khớp 100% với backend.
- [ ] Không còn field hoặc dữ liệu dư thừa.
- [ ] Không thiếu field theo API.
- [ ] Không còn lỗi TypeScript, ESLint hoặc warning.
- [ ] Không phát sinh lỗi logic.
- [ ] Giao diện, component và trải nghiệm người dùng của Repair Management đồng nhất hoàn toàn với tài liệu mẫu.
