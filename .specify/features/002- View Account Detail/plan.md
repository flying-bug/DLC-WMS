# Implementation Plan: View Account Detail

- **Branch:** `feature/view-account-detail` | **Date:** 11/06/2026 | **Spec:** `./spec.md`
- **Input:** Feature specification từ `/specs/view-account-detail/spec.md`
- **Note:** Tài liệu này định nghĩa kế hoạch thực thi chi tiết, tuân thủ kiến trúc Spec-Driven Development.

---

## 1. Technical Context (Ngữ cảnh Kỹ thuật)

- **Language/Version:** Java (Spring Boot 3.x), TypeScript/JavaScript (React + Vite)
- **Primary Dependencies:** Spring Web, Spring Data JPA, React Router, Cloudinary (Frontend URL)
- **Storage:** MySQL (Bổ sung thêm schema)
- **Testing:** JUnit 5 / Mockito (Backend), Vitest (Frontend)
- **Target Platform:** Web Application (Internal ERP)
- **Performance Goals:** Hiển thị profile dưới 200ms, tự động scale ảnh UI để tiết kiệm băng thông
- **Constraints:** Read-only (Chỉ đọc), TUYỆT ĐỐI không trả về `password_hash` trên API
- **Structure Decision:** - Backend: Mô hình Controller-Service-Repository-DTO chuẩn.
  - Frontend: Smart/Dumb Components, xử lý URL hình ảnh trực tiếp ở tầng view (Cloudinary Transformations).

---

## Phase 0: Outline & Research

*Giải quyết các yếu tố cần làm rõ (Unknowns) trước khi code:*
- [x] **Database Context:** Kiểm tra các bảng `USERS`, `ROLES`, `USER_ROLES` để xác nhận liên kết Khóa ngoại (Foreign Key) khả dụng cho lệnh JOIN.
- [x] **Cloudinary Research:** Cú pháp để tự động crop hình tròn, focus khuôn mặt, resize về 150x150 trên URI (`w_150,h_150,c_fill,g_face,r_max`).
- [ ] **NEEDS CLARIFICATION:** Cơ chế xác thực Token hiện tại (JWT Header) đã parse sẵn `userId` hay controller cần bóc tách lại từ `SecurityContextHolder`.

---

## Phase 1: Design & Contracts

### 1.1 Data Model (Cấu trúc dữ liệu Database)
*Tạo script migration (Flyway/Liquibase) hoặc SQL Command cho bảng `USERS`:*
- Thêm `employee_code` (VARCHAR(50), UNIQUE)
- Thêm `avatar_url` (VARCHAR(255), Nullable)
- Thêm `address` (TEXT, Nullable)

### 1.2 API Contracts (Giao thức Backend - Frontend)
- **Interface Exposures:** `GET /api/v1/users/me`
- **Authentication:** Bearer Token.
- **Data Transfer Object (DTO) Response:**
```json
{
  "status": 200,
  "message": "Lấy thông tin tài khoản thành công",
  "data": {
    "id": 1,
    "employeeCode": "NV-00123",
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
      }
    ],
    "createdAt": "2026-05-10T08:00:00Z"
  }
}

---
## Phase 2: Implementation Tasks (Phân rã công việc)
Back-end (Spring Boot) - Can be parallelized [P]
[P] Task BE-1: Viết SQL Script / Migration để thêm employee_code, avatar_url, address vào DB.

[P] Task BE-2: Tạo UserDetailResponseDTO (Bao gồm Role info và thuộc tính boolean isActive).

[P] Task BE-3: Cập nhật UserRepository để Query JOIN dữ liệu USERS và ROLES. (Dùng JPQL hoặc Entity Graph).

[P] Task BE-4: Xử lý logic tại UserService (Loại bỏ mật khẩu, chuyển status sang isActive).

[P] Task BE-5: Triển khai API tại UserController, bóc tách userId từ context (JWT) và gọi service trả về kết quả.

Front-end (React + Vite) - Can be parallelized [P]
[P] Task FE-1: Viết hàm API fetch (axios / fetch) kết nối đến /api/v1/users/me.

[P] Task FE-2: Xây dựng file Utils (cloudinaryHelper.ts) tự động gắn tham số w_150,h_150,c_fill,g_face,r_max vào URL gốc từ Backend.

[P] Task FE-3: Tạo component AvatarFallback để hiển thị chữ cái đầu hoặc Icon mặc định nếu user chưa có ảnh (avatarUrl = null).

[P] Task FE-4: Tích hợp dữ liệu JSON vào Component AccountDetailView.tsx. Binding dữ liệu Text, Roles và hình ảnh lên màn hình.