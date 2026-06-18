# API Contract: Warehouse Management

## Base URL
`/api/v1/warehouses`

## Endpoints

### 1. Lấy danh sách kho (Get List)
- **Method**: `GET`
- **URL**: `/`
- **Query Params**: `page` (int, default=0), `size` (int, default=10), `search` (string, optional)
- **Response**: 
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "content": [
        {
          "id": 1,
          "code": "WH-01",
          "name": "Kho trung tâm",
          "address": "123 Đường A",
          "type": "STANDARD",
          "status": "APPROVED"
        }
      ],
      "page": 0,
      "size": 10,
      "totalElements": 1,
      "totalPages": 1
    }
  }
  ```

### 2. Tạo kho mới (Create)
- **Method**: `POST`
- **URL**: `/`
- **Body**:
  ```json
  {
    "code": "WH-01",
    "name": "Kho trung tâm",
    "address": "123 Đường A",
    "type": "STANDARD"
  }
  ```
- **Response** (HTTP 201):
  ```json
  {
    "status": 201,
    "message": "Thêm mới dữ liệu thành công.",
    "data": {
      "id": 1,
      "code": "WH-01",
      "name": "Kho trung tâm",
      "address": "123 Đường A",
      "type": "STANDARD",
      "status": "APPROVED",
      "createdAt": "2026-06-17T08:00:00"
    }
  }
  ```

### 3. Cập nhật thông tin kho (Update)
- **Method**: `PUT`
- **URL**: `/{id}`
- **Body**:
  ```json
  {
    "name": "Kho trung tâm 2",
    "address": "456 Đường B",
    "status": "APPROVED"
  }
  ```
- **Lưu ý**: Các trường `code` và `type` bị bỏ qua nếu gửi lên.

### 4. Vô hiệu hóa / Soft Delete (Delete)
- **Method**: `DELETE`
- **URL**: `/{id}`
- **Response** (HTTP 200):
  ```json
  {
    "status": 200,
    "message": "Xóa dữ liệu thành công.",
    "data": null
  }
  ```
- **Error Response** (HTTP 409 Conflict - Nếu kho có chứa hàng hóa hoặc phiếu xuất nhập):
  ```json
  {
    "status": 409,
    "message": "Không thể xóa kho đã phát sinh giao dịch hoặc đang chứa linh kiện. Hệ thống đã tự động chuyển trạng thái kho này về ngừng hoạt động (INACTIVE).",
    "data": null
  }
  ```

### 5. Xem chi tiết kho kèm Metrics (Get Detail)
- **Method**: `GET`
- **URL**: `/{id}/metrics`
- **Response**: 
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "id": 1,
      "code": "WH-01",
      "name": "Kho trung tâm",
      "address": "123 Đường A",
      "status": "APPROVED",
      "totalSkus": 120,
      "totalQuantity": 5000,
      "totalValue": 150000000
    }
  }
  ```

### 6. Lịch sử thay đổi kho (Get Audit Logs)
- **Method**: `GET`
- **URL**: `/{id}/logs`
- **Query Params**: `page` (int, default=0), `size` (int, default=10)
- **Response** (HTTP 200): 
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "content": [
        {
          "id": 105,
          "action": "UPDATE",
          "userFullName": "Nguyễn Văn A",
          "createdAt": "2026-06-17T14:30:00",
          "detail": {
            "fields_changed": {
              "name": {
                "old": "Kho trung tâm",
                "new": "Kho Tổng Duylong"
              },
              "status": {
                "old": "APPROVED",
                "new": "INACTIVE"
              }
            }
          }
        },
        {
          "id": 101,
          "action": "CREATE",
          "userFullName": "Nguyễn Văn A",
          "createdAt": "2026-06-17T08:00:00",
          "detail": {}
        }
      ],
      "page": 0,
      "size": 10,
      "totalElements": 2,
      "totalPages": 1
    }
  }

### 7. Xuất kho (Export to Excel)
- **Method**: `GET`
- **URL**: `/export-excel`
- **Query Params**: `code` (string, optional), `name` (string, optional), `address` (string, optional), `status` (string, optional)
- **Response** (HTTP 200 - File Download):
  ```
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  
  [Binary Excel File Content]
  ``