# Contributing Guide

## Quy Trình Làm Việc

- Tạo issue hoặc task rõ ràng trước khi code.
- Chia nhánh theo tính năng hoặc phạm vi sửa lỗi.
- Mỗi pull request cần mô tả nghiệp vụ, phạm vi thay đổi và cách kiểm thử.

## Quy Ước Code

- Đặt tên rõ ràng, nhất quán.
- Code theo hướng SOLID, Clean Code.
- Tách service, controller, repository, UI component đúng trách nhiệm.
- Ưu tiên code dễ đọc hơn code ngắn.
- Frontend tham khảo phong cách giao diện MISA kết hợp web hiện đại.
- Code phải có validate chuẩn, bảo mật phù hợp và dùng đúng package.
- API cần có Swagger/OpenAPI khi bổ sung hoặc thay đổi endpoint.
- **Quản lý System Message / Error Code**: không viết text cứng thông báo trong code. Các thông báo lỗi/hệ thống phải tập trung vào một enum hoặc cấu hình dùng chung, ví dụ `SystemMessage.java` ở backend, gồm mã lỗi và nội dung thông báo.

## Quy Ước Frontend UI/Theme

Frontend kế thừa phong cách phần mềm MISA kết hợp giao diện web hiện đại. Khi code màn hình mới hoặc sửa giao diện cũ, bắt buộc tuân thủ các quy ước dưới đây.

### Quản Lý Màu Sắc

- Không viết màu hard-code trong CSS module hoặc JSX như `#0075c0`, `#e0e0e0`, `rgba(...)`, `white`.
- Tất cả màu gốc phải khai báo trong `frontend/src/styles/tokens.css`.
- Tất cả màu theo ngữ nghĩa giao diện phải khai báo trong `frontend/src/styles/theme.css`.
- Các file component/page chỉ được dùng biến CSS dạng `var(--color-...)`, `var(--status-...)`, `var(--table-...)`, `var(--shadow-...)`.
- Nếu cần màu mới, thêm biến có tên rõ nghĩa vào `tokens.css` hoặc `theme.css` trước, sau đó mới sử dụng.

Ví dụ đúng:

```css
.primaryButton {
  background: var(--button-primary-bg);
  color: var(--color-white);
}

.tableRow:hover {
  background: var(--table-hover-bg);
}
```

Ví dụ sai:

```css
.primaryButton {
  background: #0075c0;
  color: white;
}
```

### Palette Chuẩn

- Primary: `--color-primary` dùng cho nút chính, link, active state.
- Secondary/Sidebar: `--color-secondary` dùng cho sidebar.
- Page background: `--page-bg`.
- Surface/card: `--surface-bg` hoặc `--color-surface`.
- Success/Warning/Danger: dùng nhóm biến `--status-*` cho badge và trạng thái.

### Typography

- Font-family toàn hệ thống: `Inter, sans-serif`, khai báo qua `--font-sans`.
- Label, table header, caption: dùng cỡ 12px-13px.
- Body text, input, table cell: dùng cỡ 14px.
- Card header/button lớn: dùng cỡ 16px.
- Page title: dùng cỡ từ 20px trở lên.

### Table Chuẩn

- Header: dùng `--table-header-bg`, chữ đậm 600, uppercase, cỡ 12px-13px.
- Body cell: padding khoảng `12px 16px`, có border ngang `1px solid var(--table-border)`.
- Hover row: dùng `--table-hover-bg`.
- Nội dung dài phải có xử lý `overflow-wrap`, `max-width`, `line-clamp` hoặc layout phù hợp, không để mất thông tin.

### Form Chuẩn

- Input/select cao khoảng 36px-40px.
- Border dùng `--form-border`, radius dùng `--radius-control`.
- Focus dùng `--form-focus-border` và shadow focus từ theme.
- Label đặt trên input, font-size 13px, font-weight 500, màu `--form-label-color`.

### Button Chuẩn

- Primary: dùng `--button-primary-bg`, hover dùng `--button-primary-hover-bg`, chữ `--color-white`.
- Outline: dùng `--button-outline-bg`, hover dùng `--button-outline-hover-bg`, border `--color-border`.
- Danger/delete/cancel: dùng nhóm biến `--color-danger-*` hoặc `--status-danger-*`.

### Badge Trạng Thái

- Hoạt động/Hoàn thành/Thành công: dùng `--status-success-bg`, `--status-success-text`.
- Khóa/Đã hủy/Thất bại: dùng `--status-danger-bg`, `--status-danger-text`.
- Đang xử lý/Chờ: dùng `--status-warning-bg`, `--status-warning-text`.

### Template Màn Hình

- CRUD List: ưu tiên cấu trúc như `UsersPage.jsx`: stat cards, search/filter bar, table, pagination.
- Detail đơn giản: dùng Drawer trượt từ phải như `EmployeeDrawer`.
- Detail chứng từ phức tạp: dùng Master-Detail như `ExportSlipPage.jsx`.
- Create/Update form dài: tổ chức theo card/grid và sticky bottom action bar như `UpdateExportSlipPage.jsx`.
