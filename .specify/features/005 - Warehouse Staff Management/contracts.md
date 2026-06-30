# API Contracts: Warehouse Staff Management

## 1. Get Warehouse Staff List
- **Endpoint**: `GET /api/v1/warehouses/{warehouseId}/staff`
- **Description**: Lấy danh sách nhân sự thuộc một kho. Hỗ trợ phân trang và filter.
- **Query Params**:
  - `role_id` (Optional): Lọc theo vai trò.
  - `is_active` (Optional, Default: `true`): Trạng thái hoạt động.
  - `search` (Optional): Tìm theo tên/email.
  - `page` (Default: 0)
  - `size` (Default: 10)
- **Response**: `200 OK` (Paginated)
```json
{
  "content": [
    {
      "userId": 101,
      "fullName": "Nguyen Van A",
      "email": "a.nguyen@email.com",
      "roles": [
        { "id": 1, "code": "WH_KEEPER", "name": "Thủ kho" },
        { "id": 2, "code": "WH_QC", "name": "Kỹ thuật bảo hành" }
      ],
      "isActive": true
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 25,
  "totalPages": 3
}
```

## 2. Assign Roles to Staff (Gán quyền)
- **Endpoint**: `POST /api/v1/warehouses/{warehouseId}/staff`
- **Description**: Gán một hoặc nhiều role cho nhân sự vào kho. (Tạo mới hoặc update `is_active = TRUE`).
- **Request Body**:
```json
{
  "userId": 101,
  "roleIds": [1, 2]
}
```
- **Response**: `200 OK` (hoặc `201 Created`)
```json
{
  "message": "Gán quyền thành công"
}
```

## 3. Revoke Staff Access (Thu hồi quyền)
- **Endpoint**: `DELETE /api/v1/warehouses/{warehouseId}/staff/{userId}`
- **Description**: Thu hồi quyền của nhân sự tại kho (Soft delete: `is_active = FALSE`).
- **Response**: `200 OK`
```json
{
  "message": "Thu hồi quyền thành công"
}
```
- **Error Response**: `400 Bad Request` (Trường hợp dính Hard Block)
```json
{
  "error": "BAD_REQUEST",
  "message": "Nhân viên đang là người tạo chứng từ chưa hoàn tất. Vui lòng xử lý chứng từ trước khi thu hồi quyền."
}
```

## 4. Get Warehouse Roles (For Dropdown)
- **Endpoint**: `GET /api/v1/roles?module=WAREHOUSE`
- **Description**: Lấy danh sách các Role hợp lệ để gán cho kho. Backend bắt buộc chặn các quyền Admin.
- **Response**: `200 OK`
```json
[
  { "id": 1, "code": "WH_KEEPER", "name": "Thủ kho" },
  { "id": 2, "code": "WH_QC", "name": "Kiểm soát chất lượng" }
]
```
