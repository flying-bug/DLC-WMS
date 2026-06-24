# API Contracts: Customer Management

All APIs adhere to standard RESTful conventions and require `Bearer Token` authentication (except public endpoints). Standard response envelope applies:
```json
{
  "status": 200,
  "message": "MSG_CODE_FROM_SYSTEM_MESSAGES",
  "data": { ... }
}
```

## 1. Create Customer
- **Endpoint**: `POST /api/v1/customers`
- **Description**: Tạo mới khách hàng từ màn hình quản lý hoặc tạo nhanh (Quick Create) từ các màn hình Giao dịch.
- **Request Body**:
```json
{
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "email": "nguyenvana@gmail.com", // Optional
  "address": "123 Le Loi, Q1, TP.HCM",
  "groupType": "RETAIL" // RETAIL, WHOLESALE
}
```
- **Response**: `201 Created`
```json
{
  "id": 1,
  "code": "KH2026060001",
  "name": "Nguyen Van A",
  "phone": "0901234567",
  "status": "APPROVED",
  "groupType": "RETAIL"
}
```

## 2. Search Customers
- **Endpoint**: `GET /api/v1/customers`
- **Description**: Tìm kiếm và hiển thị danh sách khách hàng (Hỗ trợ Autocomplete Search theo SĐT).
- **Query Params**:
  - `phone` (Optional): Số điện thoại cần tìm.
  - `page` (Default: 0)
  - `size` (Default: 10)
- **Response**: `200 OK` (Paginated)
```json
{
  "content": [...],
  "page": 0,
  "size": 10,
  "totalElements": 50,
  "totalPages": 5
}
```

## 3. Update Customer
- **Endpoint**: `PUT /api/v1/customers/{id}`
- **Description**: Cập nhật thông tin khách hàng. Ghi Audit Log nếu SĐT thay đổi.
- **Request Body**:
```json
{
  "name": "Nguyen Van A (Updated)",
  "phone": "0987654321",
  "email": "nguyenvana_updated@gmail.com", // Optional
  "address": "456 Le Loi, Q1",
  "groupType": "RETAIL"
}
```

## 4. Deactivate Customer
- **Endpoint**: `PATCH /api/v1/customers/{id}/status`
- **Description**: Chuyển trạng thái sang `INACTIVE`. Block nếu có đơn bảo hành đang sửa chữa.
- **Request Body**:
```json
{
  "status": "INACTIVE"
}
```

## 5. Get Customer Sales History
- **Endpoint**: `GET /api/v1/customers/{id}/sales-history`
- **Description**: Lấy lịch sử mua hàng (các sản phẩm có S/N và không S/N). Truy vấn từ `SALES_ORDER_LINES` và `SALES_ORDERS`. Bắt buộc phân trang.
- **Response**: `200 OK` (Paginated)
```json
{
  "content": [
    {
      "orderCode": "SO-20260601-001",
      "orderDate": "2026-06-01",
      "productName": "VGA RTX 4090",
      "quantity": 1,
      "serialNumber": "SN-RTX4090-001" // Optional
    }
  ]
}
```

## 6. Get Customer Warranties
- **Endpoint**: `GET /api/v1/customers/{id}/warranties`
- **Description**: Lấy lịch sử bảo hành của khách hàng từ `WARRANTIES` và `REPAIRS`. Bắt buộc phân trang.
- **Response**: `200 OK` (Paginated)
```json
{
  "content": [
    {
      "warrantyCode": "WR-20260605-001",
      "serialNumber": "SN-RTX4090-001",
      "startDate": "2026-06-01",
      "endDate": "2029-06-01",
      "warrantyStatus": "APPROVED",
      "repairs": [
        {
          "repairCode": "RP-20261012-001",
          "receivedDate": "2026-10-12",
          "repairStatus": "RECEIVED"
        }
      ]
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 5,
  "totalPages": 1
}
```

## 7. Get Customer Receipts & Summary
- **Endpoint**: `GET /api/v1/customers/{id}/receipts`
- **Description**: Lấy lịch sử thu chi và Summary Tổng tiền đã thu.
- **Response**: `200 OK`
```json
{
  "summary": {
    "totalPaid": 15000000.00
  },
  "receipts": {
    "content": [...], // Paginated list from PAYMENT_RECEIPTS and PAYMENT_VOUCHERS
    "page": 0,
    "size": 10,
    "totalElements": 20,
    "totalPages": 2
  }
}
```
