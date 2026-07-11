# Data Model: Assembly and Disassembly Management

## Entities

### `ASSEMBLY_BOMS`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **product_id**: `BIGINT UNSIGNED NOT NULL` (Thành phẩm)
- **bom_code**: `VARCHAR(50) NOT NULL UNIQUE`
- **bom_name**: `VARCHAR(255) NOT NULL`
- **version_no**: `DECIMAL(10,2) NOT NULL DEFAULT 1.0`
- **status**: `VARCHAR(30) NOT NULL DEFAULT 'DRAFT'` ('DRAFT', 'APPROVED', 'INACTIVE')
- **created_at**, **updated_at**: `DATETIME`

### `ASSEMBLY_BOM_LINES`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **assembly_bom_id**: `BIGINT UNSIGNED NOT NULL` (FK -> `ASSEMBLY_BOMS`)
- **component_variant_id**: `BIGINT UNSIGNED NOT NULL` (Linh kiện)
- **quantity**: `DECIMAL(15,4) NOT NULL` (Định mức số lượng)
- **cost_allocation_pct**: `DECIMAL(5,2) NOT NULL DEFAULT 0.0` (Tỷ lệ phân bổ giá vốn khi tháo dỡ. Dạng %, VD: 40.50)
- **note**: `TEXT`

### `ASSEMBLY_ORDERS`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **order_code**: `VARCHAR(50) NOT NULL UNIQUE`
- **order_type**: `VARCHAR(30) NOT NULL` ('ASSEMBLY', 'DISASSEMBLY')
- **bom_id**: `BIGINT UNSIGNED NULL`
- **target_variant_id**: `BIGINT UNSIGNED NOT NULL`
- **warehouse_id**: `BIGINT UNSIGNED NOT NULL`
- **quantity**: `DECIMAL(15,4) NOT NULL` (Số lượng kế hoạch)
- **quantity_produced**: `DECIMAL(15,4) NOT NULL DEFAULT 0.0` (Số lượng thành phẩm đã hoàn thành thực tế - Partial Fulfillment)
- **status**: `VARCHAR(30) NOT NULL DEFAULT 'DRAFT'` ('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED')
- **execution_date**: `DATE NOT NULL`
- **note**: `TEXT`
- **created_by**, **approved_by**: `BIGINT UNSIGNED`
- **created_at**, **updated_at**: `DATETIME`

### `ASSEMBLY_ORDER_LINES`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **assembly_order_id**: `BIGINT UNSIGNED NOT NULL`
- **component_variant_id**: `BIGINT UNSIGNED NOT NULL`
- **quantity_required**: `DECIMAL(15,4) NOT NULL` (Số lượng linh kiện cần)
- **quantity_actual**: `DECIMAL(15,4) NOT NULL DEFAULT 0.0` (Số lượng linh kiện đã xuất/nhập thực tế)
- **unit_cost**: `DECIMAL(15,4) NOT NULL DEFAULT 0.0` (Giá vốn sinh ra từ lệnh, phục vụ tracking)
- **note**: `TEXT`

### Liên kết Mở rộng (Virtual/Existing Entities)
- **`INVENTORY_DOCUMENTS`**: Bảng Phiếu nhập/xuất kho hiện hữu của hệ thống cần có thêm (hoặc sử dụng) cột `reference_order_id` (BIGINT) trỏ về `ASSEMBLY_ORDERS.id` để nhận diện Phiếu kho này thuộc Lệnh nào.

## Validation Rules

1. **BOM Cost Allocation (Tỷ lệ giá vốn)**: 
   - `SUM(cost_allocation_pct)` của tất cả các dòng thuộc 1 `assembly_bom_id` **bắt buộc bằng 100.00**.
2. **BOM Version Lock (Khóa sửa BOM)**:
   - Khi Update BOM, truy vấn: `SELECT 1 FROM ASSEMBLY_ORDERS WHERE bom_id = ? AND status IN ('DRAFT', 'APPROVED')`. Nếu tồn tại, chặn hành động update nội dung linh kiện của BOM.
3. **Hard Block (Chặn Hủy/Xóa Lệnh)**:
   - Trước khi `UPDATE status = 'CANCELLED'` (hoặc DELETE) Lệnh: Truy vấn bảng `INVENTORY_DOCUMENTS` theo `reference_order_id`. Nếu có tồn tại bản ghi, bắn ngoại lệ (Exception) chặn hành động.
4. **Disassembly Validation (Chặn xuất quá tồn kho)**:
   - Khi tạo lệnh tháo dỡ hoặc sinh Phiếu xuất tháo dỡ: Cần kiểm tra tồn kho (từ bảng `INVENTORY_BALANCES` hoặc tương đương) của `target_variant_id` tại `warehouse_id`. Tồn kho (Quantity) bắt buộc `> 0`.
5. **Serial Genealogy (Phả hệ Serial)**:
   - Mối quan hệ phả hệ giữa Serial sinh ra (Thành phẩm lắp ráp) và Serial bị tiêu hao (Linh kiện lắp ráp) được lưu vết thông qua chính các chứng từ Phiếu Nhập và Phiếu Xuất có chung `reference_order_id`.
