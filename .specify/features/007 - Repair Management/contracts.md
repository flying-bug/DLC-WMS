# API Contracts: Repair Management

## 1. Manage Repairs
### 1.1 Create Repair Order
- **Endpoint**: `POST /api/v1/repairs`
- **Description**: Tạo mới lệnh sửa chữa.
- **Request Body**:
```json
{
  "partnerId": 501,
  "productId": 1002,
  "serialNumberId": 305,
  "issueDescription": "Máy không lên nguồn, sập nguồn liên tục.",
  "underWarranty": false,
  "invoiceMethod": "after_repair"
}
```
- **Response**: `201 Created`
```json
{
  "status": 201,
  "message": "Tạo lệnh sửa chữa thành công",
  "data": {
    "id": 10,
    "repairCode": "REP-0010"
  }
}
```

### 1.2 Update Repair Order
- **Endpoint**: `PUT /api/v1/repairs/{id}`
- **Description**: Cập nhật thông tin lệnh sửa chữa (chỉ cho phép khi ở trạng thái DRAFT hoặc QUOTATION).

### 1.3 Get Repairs (List & Detail)
- **Endpoint**: `GET /api/v1/repairs`
- **Endpoint**: `GET /api/v1/repairs/{id}`
- **Description**: Lấy danh sách (phân trang, lọc theo trạng thái) hoặc chi tiết lệnh sửa chữa (kèm Lines và Fees).

## 2. Manage Repair Lines & Fees
### 2.1 Add/Update Repair Line
- **Endpoint**: `POST /api/v1/repairs/{id}/lines`
- **Description**: Thêm linh kiện cần thay thế (`ADD`) hoặc thu hồi (`REMOVE`).
- **Request Body**:
```json
{
  "componentVariantId": 205,
  "actionType": "ADD",
  "quantity": 1,
  "unitPrice": 1500000,
  "isFreeWarranty": false,
  "serialNumberId": null,
  "note": "Thay Mainboard mới"
}
```
- **Response**: `201 Created` / `200 OK`

### 2.2 Add/Update Repair Fee
- **Endpoint**: `POST /api/v1/repairs/{id}/fees`
- **Description**: Thêm phí dịch vụ (công sửa chữa, vệ sinh).

## 3. Workflow & Execution
### 3.1 Update Repair Status
- **Endpoint**: `PUT /api/v1/repairs/{id}/status`
- **Description**: Chuyển trạng thái lệnh (`QUOTATION`, `CONFIRMED`, `UNDER_REPAIR`, `TESTING`, `DONE`, `CANCELLED`).
- **Request Body**:
```json
{
  "status": "CONFIRMED"
}
```
- **Response**: `200 OK`
```json
{
  "status": 200,
  "message": "Chuyển trạng thái thành công",
  "data": null
}
```
- **Error Response**: `400 Bad Request` (Nếu Confirm nhưng kho hết linh kiện).
```json
{
  "status": 400,
  "message": "Không đủ tồn kho linh kiện để xác nhận lệnh.",
  "data": {
    "code": "INV05",
    "details": "Linh kiện ID 205 thiếu tồn kho"
  }
}
```
*(Ghi chú: Mã `INV05` và câu message phải được lấy tập trung từ enum `SystemMessage` theo chuẩn Constitution).*

### 3.2 Generate Inventory Documents (Reserve & Execute)
- **Endpoint**: `POST /api/v1/repairs/{id}/inventory-documents`
- **Description**: API nội bộ hoặc tự động trigger khi đổi Status. Sinh phiếu giữ kho (Draft/Waiting) khi `CONFIRMED` và chuyển thành Phiếu xuất/nhập thực tế (Done) khi `DONE`.

### 3.3 Generate Invoice
- **Endpoint**: `POST /api/v1/repairs/{id}/invoices`
- **Description**: Tự động trigger khi lệnh `DONE` và `invoiceMethod != 'none'`. Tạo hóa đơn thanh toán cho khách hàng dựa trên tổng chi phí linh kiện và dịch vụ.
