# API Contracts: Profile Management

This document defines the API communications (Endpoint, Request, Response) between the Frontend and Backend for the Profile Management module.
*Note: All APIs below require access authentication via a JWT token string passed in the Header (`Authorization: Bearer <token>`). Any token that has been invalidated due to warehouse permission changes will be rejected with a 403 Forbidden error.*

**Base Path (Assumed)**: `/api/v1/profile`

---

## 1. Get Profile
- **Method**: `GET`
- **URL**: `/api/v1/profile`
- **Description**: Returns all personal information of the currently logged-in user based on the token. Contains a list of global roles and a list of permissions by warehouse.
- **Response (HTTP 200)**:
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "id": 1042,
      "username": "nv_kho_01",
      "full_name": "Nguyễn Văn A",
      "phone": "0901234567",
      "email": "nva@duylongcomputer.com",
      "id_card": "079095000123",
      "dob": "1995-05-15",
      "gender": "MALE",
      "start_date": "2024-01-10",
      "position": "Nhân viên kho",
      "department": "Kho vận",
      "avatar_url": "https://res.cloudinary.com/duylongcomputer/image/upload/c_thumb,g_face,w_150,h_150,f_auto,q_auto/users/avatars/nv_kho_01_1718928000.jpg",
      "status": "APPROVED",
      "version": 1,
      "global_roles": [
        {"id": 5, "name": "Nhân viên cơ bản"}
      ],
      "warehouses": [
        {
          "id": 101,
          "name": "Kho Tổng",
          "roles": ["Nhân viên kiểm kê", "Thủ kho"]
        },
        {
          "id": 102,
          "name": "Trạm BH Q1",
          "roles": ["Kỹ thuật bảo hành"]
        }
      ]
    }
  }
  ```

---

## 2. Update Profile Contact Info
- **Method**: `PUT`
- **URL**: `/api/v1/profile`
- **Description**: API to update allowed personal information (Phone, Email, Date of Birth, Gender). The Frontend MUST include the `version` field for the Backend to check Optimistic Locking.
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "phone": "0987654321",
    "email": "nva_updated@duylongcomputer.com",
    "dob": "1995-05-15",
    "gender": "MALE",
    "version": 1
  }
  ```
- **Success Response (HTTP 200)**:
  ```json
  {
    "status": 200,
    "message": "Cập nhật hồ sơ thành công.",
    "data": {
      "version": 2
    }
  }
  ```
- **Format Error / Unique Validation Error Response (HTTP 400)**:
  ```json
  {
    "status": 400,
    "message": "Dữ liệu không hợp lệ.",
    "errors": {
      "phone": "Số điện thoại phải có chính xác 10 chữ số và bắt đầu bằng 0 hoặc +84.",
      "email": "Email đã tồn tại trên hệ thống.",
      "dob": "Nhân viên phải từ đủ 18 tuổi trở lên."
    }
  }
  ```
- **Optimistic Locking Overwrite Error Response (HTTP 409)**:
  ```json
  {
    "status": 409,
    "message": "Thông tin hồ sơ đã bị thay đổi bởi phiên làm việc khác. Vui lòng tải lại trang."
  }
  ```

---

## 3. Upload Avatar via Cloudinary
- **Method**: `POST`
- **URL**: `/api/v1/profile/avatar`
- **Description**: Specialized API to change the avatar. The Frontend sends the image file directly (Multipart). The Backend receives the file, calls the Cloudinary upload API, saves the new URL to the DB, **calls the API to delete the old image**, and saves a Log.
- **Headers**: `Content-Type: multipart/form-data`
- **Body**: 
  - `file`: `[Binary Data - JPG/PNG/WEBP format, Max size: 2MB]`
- **Success Response (HTTP 200)**:
  ```json
  {
    "status": 200,
    "message": "Cập nhật ảnh đại diện thành công.",
    "data": {
      "avatar_url": "https://res.cloudinary.com/duylongcomputer/image/upload/c_thumb,g_face,w_150,h_150,f_auto,q_auto/users/avatars/nv_kho_01_1718931000.jpg"
    }
  }
  ```
- **Invalid File Error Response (HTTP 400)**:
  ```json
  {
    "status": 400,
    "message": "File upload không hợp lệ. Vui lòng chọn ảnh định dạng JPG/PNG/WEBP và dung lượng không vượt quá 2MB."
  }
  ```
- **Storage Server Connection Error Response (HTTP 502)**:
  ```json
  {
    "status": 502,
    "message": "Lưu hình ảnh thất bại do sự cố máy chủ lưu trữ (Cloudinary timeout). Vui lòng thử lại sau."
  }
  ```
