# Danh Sách Tài Khoản Mặc Định (Seeded Accounts)

Hệ thống được khởi tạo sẵn các tài khoản mẫu phục vụ kiểm thử và phát triển dưới đây. Tất cả mật khẩu mặc định đều là `123456`.

---

## 1. Tài Khoản Quản Trị Tối Cao (Super Admin)
* **Tên đăng nhập (Username):** `admin`
* **Mật khẩu (Password):** `123456`
* **Họ và tên:** `System Admin`
* **Email:** `admin@duylongtech.com`
* **Số điện thoại:** `0123456789`
* **Vai trò chính (Role):** `SUPER_ADMIN`
* **Trạng thái:** `APPROVED` (Đang hoạt động)
* **Quyền hạn:** Toàn quyền kiểm soát hệ thống, quản lý tài khoản và cập nhật phân quyền động cho các tài khoản khác.

---

## 2. Tài Khoản Quản Lý (Manager)
* **Tên đăng nhập (Username):** `manager@duylong.vn`
* **Mật khẩu (Password):** `123456`
* **Họ và tên:** `Quản Lý Hệ Thống`
* **Vai trò chính (Role):** `ROLE_MANAGER` (Manager)
* **Trạng thái:** `APPROVED` (Đang hoạt động)
* **Quyền hạn:** Toàn quyền thao tác trên các phân hệ nghiệp vụ kinh doanh (Quản lý kho, Danh mục hàng hóa, Đơn vị tính, Báo cáo sổ kho...). Không có quyền quản lý tài khoản hay phân quyền.

---

## 3. Tài Khoản Nhân Viên (Staff)
* **Tên đăng nhập (Username):** `staff@duylong.vn`
* **Mật khẩu (Password):** `123456`
* **Họ và tên:** `Nhân Viên Kho`
* **Vai trò chính (Role):** `ROLE_STAFF` (Staff)
* **Trạng thái:** `APPROVED` (Đang hoạt động)
* **Quyền hạn:** Được phân quyền mặc định trên các nghiệp vụ kho bãi (Nhập kho, Xuất kho, Chuyển kho, Kiểm kê, Đóng gói/tháo dỡ). Đặc biệt, tài khoản này hỗ trợ **phân quyền động chi tiết** từ giao diện quản trị của Super Admin.
