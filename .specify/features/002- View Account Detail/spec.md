# FEATURE SPECIFICATION: VIEW ACCOUNT DETAIL

**Ngày tạo:** 11/06/2026
**Người viết:** BA 
**Epic:** Quản lý Người dùng & Phân quyền (User Management)
**Trạng thái:** Ready for Dev

---

## 1. TỔNG QUAN (OVERVIEW)
Chức năng **View Account Detail** cho phép nhân viên trong hệ thống quản lý kho linh kiện điện tử xem các thông tin cá nhân cơ bản của mình (Mã nhân viên, Tên, Chức vụ, Email, SĐT, Địa chỉ, Ảnh đại diện). Chức năng này chỉ phục vụ mục đích **Xem (Read-only)**, giúp nhân viên xác nhận lại thông tin định danh và quyền hạn của mình trên hệ thống.

---

## 2. USER STORY
> **As an** Employee (Nhân viên đã đăng nhập)
> **I want to** view my personal account details and avatar
> **So that** I can verify my contact information and roles within the warehouse system.

---

## 3. THAY ĐỔI CƠ SỞ DỮ LIỆU (DATABASE CHANGES)
Thực thi đoạn script DDL sau để bổ sung các trường hiển thị còn thiếu cho giao diện profile vào bảng `USERS`:

```sql
ALTER TABLE `USERS` 
ADD COLUMN `user_code` VARCHAR(50) NULL UNIQUE AFTER `username`,
ADD COLUMN `avatar_url` VARCHAR(255) NULL AFTER `full_name`,
ADD COLUMN `address` TEXT NULL AFTER `phone`;

## 4. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)
4.1. Quy tắc Backend (Spring Boot)
Data Masking (Che giấu dữ liệu): Lớp DTO trả về API tuyệt đối không được bao gồm trường password_hash.

Data Aggregation (Gom nhóm dữ liệu): Thực hiện phép JOIN qua các bảng USER_ROLES và ROLES để trả về danh sách Chức vụ/Quyền hạn (roles) mà tài khoản đang sở hữu.

Xử lý Trạng thái: Map trường status (chuỗi: DRAFT, APPROVED, INACTIVE) thành cờ isActive (boolean) để Frontend dễ xử lý màu sắc badge hiển thị (APPROVED = true, các trạng thái khác = false).

4.2. Quy tắc Frontend (React + Vite)
Cloudinary Transformation: Bắt buộc sử dụng tham số Transformation của Cloudinary ngay trên URL ảnh (VD: w_150,h_150,c_fill,g_face) để cắt ảnh tự động và tối ưu băng thông tải trang.

Fallback Image: Nếu avatarUrl là null hoặc chuỗi rỗng, bắt buộc hiển thị ảnh Placeholder mặc định (Avatar trống hoặc chữ cái đầu tiên của tên người dùng).

## 5. THIẾT KẾ API (API SPECIFICATION)
Thông tin chung
Endpoint: /api/v1/users/me

Method: GET

Auth Required: Yes (Bearer Token)

Response Thành công (200 OK)
JSON


{
  "status": 200,
  "message": "Lấy thông tin tài khoản thành công",
  "data": {
    "id": 1,
    "userCode": "NV-00123",
    "username": "duylong_admin",
    "fullName": "Nguyễn Duy Long",
    "email": "longnd@duylongcomputer.com",
    "phone": "0987654321",
    "address": "123 Đường ABC, Quận X, TP.HCM",
    "avatarUrl": "[https://res.cloudinary.com/duylong-computer/image/upload/v1715392812/avatars/nv-00123.jpg](https://res.cloudinary.com/duylong-computer/image/upload/v1715392812/avatars/nv-00123.jpg)",
    "isActive": true,
    "roles": [
      {
        "code": "WH_MANAGER",
        "name": "Quản lý kho tổng"
      },
      {
        "code": "WARRANTY_STAFF",
        "name": "Nhân viên bảo hành"
      }
    ],
    "createdAt": "2026-05-10T08:00:00Z"
  }
}
Mã lỗi dự kiến (Error Codes)
401 Unauthorized: Token hết hạn hoặc header không chứa token hợp lệ.

404 Not Found: ID user không tồn tại trong hệ thống Database.

6. PHẠM VI NGOÀI DỰ ÁN (OUT OF SCOPE)
Nút "Chỉnh sửa hồ sơ" và luồng API cập nhật thông tin cá nhân.

API Upload file ảnh đại diện vật lý lên hệ thống Cloudinary.

Màn hình và API hiển thị Lịch sử hoạt động (Audit Logs) của tài khoản.