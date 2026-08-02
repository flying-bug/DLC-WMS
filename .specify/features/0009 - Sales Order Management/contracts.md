# Contracts: Sales Order API Specification

Bộ API chuẩn RESTful kết nối Frontend (React) và Backend (Spring Boot) cho phân hệ Bán hàng.

## 1. Internal APIs (Cần xác thực Bearer Token JWT)

### 1.1 Quản lý Đơn hàng (SO)
- **`GET /api/v1/sales-orders`**
  - **Query Params**: `page, size, status, search, fromDate, toDate, partnerId`
  - **Mô tả**: Lấy danh sách có phân trang các đơn hàng.
  
- **`GET /api/v1/sales-orders/{id}`**
  - **Mô tả**: Lấy chi tiết đơn hàng (bao gồm SO Lines, Khách hàng, Tồn kho, và Stock Reservations).
  - **Response**: `SalesOrderResponse` DTO.

- **`POST /api/v1/sales-orders`**
  - **Mô tả**: Tạo đơn nháp (DRAFT).
  - **Body**: `SalesOrderRequest`
  - **Validation**: Bắt lỗi `paymentDueDate` không được nhỏ hơn `soDate` hoặc nhỏ hơn ngày hiện tại.

- **`PUT /api/v1/sales-orders/{id}`**
  - **Mô tả**: Chỉnh sửa thông tin đơn hàng (Chỉ thành công nếu SO đang DRAFT).
  
- **`DELETE /api/v1/sales-orders/{id}`**
  - **Mô tả**: Xóa cứng (Hard delete) đơn nháp (DRAFT). Cascade delete các SO Lines.

### 1.2 Các Hành Động Nghiệp Vụ (Actions)
- **`POST /api/v1/sales-orders/{id}/approve`**
  - **Mô tả**: Chuyển SO sang `APPROVED`. Gọi sang Inventory Service để kiểm tra hàng và sinh `StockReservation`. 
  - **Error Codes**: `ERR400` nếu thiếu hàng tồn kho.

- **`POST /api/v1/sales-orders/{id}/cancel`**
  - **Mô tả**: Chuyển SO sang `CANCELLED`. Giải phóng `StockReservation`.

- **`POST /api/v1/sales-orders/{id}/payment`**
  - **Mô tả**: Kế toán ghi nhận thanh toán.
  - **Body**: `{ amount: DECIMAL, note: STRING }`
  - **Response**: Trạng thái Payment được cập nhật tự động (PARTIAL/PAID).

- **`POST /api/v1/sales-orders/{id}/create-export-slip`**
  - **Mô tả**: Tự động sinh `ExportSlip` dựa trên thông tin SO.
  - **Response**: Trả về `ExportSlipResponse` có ID để Redirect FE.

## 2. Public APIs (Không cần xác thực)

Đây là các endpoint mở hoàn toàn, không yêu cầu Authorization header.

- **`GET /api/v1/public/sales-orders/{token}/quote`**
  - **Path Variable**: `token` (Là chuỗi UUID `publicToken` của bảng `SALES_ORDERS`).
  - **Mô tả**: Lấy thông tin Báo giá. Dữ liệu trả về tương tự như `/api/v1/sales-orders/{id}` nhưng **Ẩn đi (Masked)** các thông tin nhạy cảm (như StockReservation details, giá vốn, ID nội bộ) ở mức DTO mapping (`toDetailResponse`).
  - **Response**: `SalesOrderResponse`.
  - **Error Codes**: `404 Not Found` (Trường hợp sai UUID hoặc đơn hàng không tồn tại); `400 Bad Request` (Nếu đơn bị CANCELLED).

## 3. Data Transfer Objects (DTO)

### SalesOrderRequest Payload
```java
public class SalesOrderRequest {
    private String soCode;
    @NotNull(message = "Ngày lập không được để trống")
    private LocalDate soDate;
    private LocalDate paymentDueDate;
    @NotNull(message = "Khách hàng không được để trống")
    private Long partnerId;
    @NotNull(message = "Kho không được để trống")
    private Long warehouseId;
    private String note;
    @NotEmpty(message = "Danh sách mặt hàng không được rỗng")
    private List<SalesOrderLineRequest> lines;
}
```

### SalesOrderResponse DTO
Hệ thống sử dụng DTO Builder Pattern để map Entity ra DTO.
Thông tin trả về luôn kèm danh sách `SalesOrderLineResponse` (thông tin Line) và `StockReservationResponse` (danh sách các lô hàng đang được giữ).
