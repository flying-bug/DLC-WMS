# Data Model: Repair Management

## Entities

### `REPAIRS`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **repair_code**: `VARCHAR(50) NOT NULL UNIQUE`
- **partner_id**: `BIGINT UNSIGNED NOT NULL` (Khách hàng)
- **product_id**: `BIGINT UNSIGNED NOT NULL` (Sản phẩm dịch vụ hoặc máy đang sửa)
- **serial_number_id**: `BIGINT UNSIGNED NULL` (Serial của máy đang sửa nếu có)
- **issue_description**: `TEXT` (Mô tả lỗi)
- **status**: `VARCHAR(30) NOT NULL DEFAULT 'DRAFT'` ('DRAFT', 'QUOTATION', 'CONFIRMED', 'UNDER_REPAIR', 'TESTING', 'DONE', 'CANCELLED')
- **under_warranty**: `BOOLEAN NOT NULL DEFAULT FALSE` (Có đang trong hạn bảo hành máy không)
- **repair_warranty_end_date**: `DATE NULL` (Hạn bảo hành sau sửa chữa)
- **invoice_method**: `VARCHAR(30) NOT NULL DEFAULT 'after_repair'` ('none', 'b4repair', 'after_repair')
- **total_amount**: `DECIMAL(15,4) NOT NULL DEFAULT 0.0`
- **version**: `INT NOT NULL DEFAULT 0` (Dùng cho Optimistic Locking theo Constitution)
- **created_by**, **approved_by**: `BIGINT UNSIGNED`
- **created_at**, **updated_at**: `DATETIME`

### `REPAIR_LINES`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **repair_id**: `BIGINT UNSIGNED NOT NULL` (FK -> `REPAIRS`)
- **component_variant_id**: `BIGINT UNSIGNED NOT NULL` (Linh kiện)
- **action_type**: `VARCHAR(20) NOT NULL` ('ADD', 'REMOVE')
- **quantity**: `DECIMAL(15,4) NOT NULL`
- **unit_price**: `DECIMAL(15,4) NOT NULL DEFAULT 0.0`
- **is_free_warranty**: `BOOLEAN NOT NULL DEFAULT FALSE` (Miễn phí do bảo hành)
- **serial_number_id**: `BIGINT UNSIGNED NULL` (Serial linh kiện tháo ra/lắp vào để truy vết)
- **note**: `TEXT`

### `REPAIR_FEES`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **repair_id**: `BIGINT UNSIGNED NOT NULL` (FK -> `REPAIRS`)
- **fee_name**: `VARCHAR(255) NOT NULL` (Tên phí dịch vụ/nhân công)
- **fee_amount**: `DECIMAL(15,4) NOT NULL DEFAULT 0.0`
- **is_free_warranty**: `BOOLEAN NOT NULL DEFAULT FALSE`
- **note**: `TEXT`

### Liên kết Mở rộng (Virtual/Existing Entities)
- **`INVENTORY_DOCUMENTS`**: Bảng Phiếu nhập/xuất kho hiện hữu cần có cột `reference_repair_id` (BIGINT) trỏ về `REPAIRS.id` để theo dõi phiếu kho Reserve/Done/Scrap của lệnh sửa chữa.
- **`INVOICES`**: Bảng hóa đơn cần có `reference_repair_id` (BIGINT) để theo dõi hóa đơn được sinh ra từ lệnh.

## Validation Rules

1. **Warranty Price Logic (Logic giá bảo hành)**:
   - Nếu `under_warranty = TRUE` của `REPAIRS` hoặc `is_free_warranty = TRUE` của `REPAIR_LINES`/`REPAIR_FEES`, bắt buộc `unit_price` hoặc `fee_amount` = 0.
2. **Action Type Validation (Logic xuất/nhập linh kiện)**:
   - Nếu `action_type = 'ADD'`: Khi `DONE`, tự động sinh Inventory Document (GOODS_ISSUE) trừ kho linh kiện.
   - Nếu `action_type = 'REMOVE'`: Khi `DONE`, tự động sinh Inventory Document (GOODS_RECEIPT) nhập vào `Scrap Location`.
3. **Hard Block (Chặn Xác nhận/Hoàn tất khi thiếu thông tin)**:
   - Lệnh không thể chuyển sang `CONFIRMED` nếu `partner_id` bị trống.
   - Lệnh không thể chuyển sang `CONFIRMED` nếu kho không đủ linh kiện `ADD`.
4. **Genealogy Tracking (Truy vết Serial)**:
   - Đối với linh kiện đắt tiền (bắt buộc quản lý Serial), `serial_number_id` trên `REPAIR_LINES` không được để trống khi lệnh chuyển sang `DONE`.
5. **Data Integrity & Audit Trail**:
   - Mọi thao tác cập nhật/đổi trạng thái Lệnh phải được ghi vào `AUDIT_LOGS`.
   - Lệnh sửa chữa không được xóa vật lý (Hard Delete), chỉ được chuyển sang `CANCELLED` (đóng vai trò như Soft Delete).
