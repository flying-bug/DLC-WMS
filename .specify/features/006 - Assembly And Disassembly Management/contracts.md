# API Contracts: Assembly and Disassembly Management

## 1. Manage Assembly BOMs
### 1.1 Create Assembly BOM
- **Endpoint**: `POST /api/v1/assembly-boms`
- **Description**: Tạo mới công thức lắp ráp (BOM).
- **Request Body**:
```json
{
  "productId": 1001,
  "bomCode": "BOM-PC-001",
  "bomName": "PC Gaming Standard",
  "versionNo": 1.0,
  "status": "APPROVED",
  "lines": [
    {
      "componentVariantId": 201,
      "quantity": 1,
      "costAllocationPct": 40.0,
      "note": "Mainboard"
    },
    {
      "componentVariantId": 202,
      "quantity": 1,
      "costAllocationPct": 60.0,
      "note": "CPU"
    }
  ]
}
```
- **Response**: `201 Created`

### 1.2 Update Assembly BOM
- **Endpoint**: `PUT /api/v1/assembly-boms/{id}`
- **Description**: Cập nhật BOM. Backend sẽ chặn (throw 400) nếu BOM đang có Lệnh `DRAFT` hoặc `APPROVED` sử dụng nó.
- **Request Body**: (Tương tự Create)
- **Response**: `200 OK`

### 1.3 Get Assembly BOMs (List & Detail)
- **Endpoint**: `GET /api/v1/assembly-boms`
- **Endpoint**: `GET /api/v1/assembly-boms/{id}`
- **Description**: Lấy danh sách (phân trang, lọc theo status) hoặc chi tiết định mức.

## 2. Manage Assembly/Disassembly Orders
### 2.1 Get Assembly Orders (List & Detail)
- **Endpoint**: `GET /api/v1/assembly-orders`
- **Endpoint**: `GET /api/v1/assembly-orders/{id}`
- **Description**: Lấy danh sách lệnh hoặc chi tiết lệnh. Chi tiết lệnh sẽ trả về kèm theo `quantityActual` (số lượng thành phẩm đã hoàn thành thực tế).

### 2.2 Create Assembly / Disassembly Order
- **Endpoint**: `POST /api/v1/assembly-orders` (hoặc `/disassembly-orders`)
- **Description**: Tạo lệnh lắp ráp/tháo dỡ dựa trên BOM.
- **Request Body**:
```json
{
  "orderCode": "ASM-2026-001",
  "bomId": 50,
  "warehouseId": 10,
  "quantity": 50,
  "executionDate": "2026-07-08",
  "note": "Lắp ráp gấp cho đơn hàng A",
  "status": "DRAFT"
}
```
- **Response**: `201 Created`

### 2.3 Update Order Status (Duyệt / Hủy / Hoàn thành)
- **Endpoint**: `PUT /api/v1/assembly-orders/{id}/status`
- **Description**: Chuyển trạng thái lệnh (VD: `APPROVED`, `POSTED`, `CANCELLED`).
- **Request Body**:
```json
{
  "status": "CANCELLED"
}
```
- **Response**: `200 OK`
- **Error Response**: `400 Bad Request` (Nếu gửi status `CANCELLED` nhưng Lệnh đã sinh ra Phiếu kho `POSTED`).
```json
{
  "error": "BAD_REQUEST",
  "message": "Không thể hủy lệnh vì đã có Phiếu kho liên quan được Ghi sổ."
}
```

## 3. Execution (Inventory Integration)
### 3.1 Generate Inventory Document from Order
- **Endpoint**: `POST /api/v1/assembly-orders/{id}/inventory-documents`
- **Description**: Khởi tạo Phiếu xuất/nhập kho nháp từ dữ liệu Lệnh. Backend tự động tính giá vốn và fill chi tiết hàng hóa.
- **Request Body**:
```json
{
  "documentType": "GOODS_ISSUE", // Hoặc GOODS_RECEIPT
  "lines": [
    {
      "variantId": 201,
      "quantity": 25, // Hỗ trợ Partial Fulfillment (Nhập/Xuất từng phần)
      "serialNumbers": ["SN001", "SN002", "..." ] // Serial là bắt buộc
    }
  ]
}
```
- **Response**: `201 Created`
- **Error Response**: `400 Bad Request` (Nếu Tháo dỡ mà Target Variant Serial không có tồn kho).
```json
{
  "error": "INSUFFICIENT_INVENTORY",
  "message": "Thành phẩm đem tháo dỡ không có tồn kho hợp lệ."
}
```
