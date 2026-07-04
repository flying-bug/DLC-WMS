# Data Model: Warehouse Staff Management

## Entities

### `USER_WAREHOUSE_ROLES`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **user_id**: `BIGINT UNSIGNED NOT NULL` (Foreign Key -> `USERS.id`)
- **warehouse_id**: `BIGINT UNSIGNED NOT NULL` (Foreign Key -> `WAREHOUSES.id`)
- **role_id**: `BIGINT UNSIGNED NOT NULL` (Foreign Key -> `ROLES.id`)
- **is_active**: `BOOLEAN NOT NULL DEFAULT TRUE` (Cờ trạng thái hoạt động)
- **created_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **updated_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### `AUDIT_LOGS` (Tích hợp có sẵn)
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **user_id**: `BIGINT UNSIGNED NULL`
- **action**: `VARCHAR(50) NOT NULL` (VD: ASSIGN_ROLE, REVOKE_ROLE)
- **entity_name**: `VARCHAR(100) NOT NULL` (VD: USER_WAREHOUSE_ROLES)
- **entity_id**: `BIGINT UNSIGNED NULL`
- **detail**: `JSON NULL` (Lưu thông tin role được thêm/xóa)
- **ip_address**: `VARCHAR(45) NULL`
- **status**: `VARCHAR(20) NULL`
- **description**: `TEXT NULL`
- **created_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`

## Validation Rules
1. **Kiêm nhiệm (Multi-role)**: `UNIQUE KEY uk_user_warehouse_role (user_id, warehouse_id, role_id)` cho phép một nhân viên có nhiều vai trò trong cùng một kho. Tránh trùng lặp role của cùng một người trong một kho.
2. **Thu hồi quyền (Soft Delete)**: Bắt buộc dùng lệnh `UPDATE is_active = FALSE`. Tuyệt đối không dùng `DELETE FROM USER_WAREHOUSE_ROLES`.
3. **Hard Block (Chặn thu hồi quyền)**: 
   - Truy vấn kiểm tra các bảng: `INVENTORY_DOCUMENTS`, `STOCK_TRANSFERS`, `STOCKTAKES`, `ASSEMBLY_ORDERS`.
   - Điều kiện: `created_by = user_id` VÀ `status IN ('DRAFT', 'SUBMITTED')`.
   - Nếu tồn tại >= 1 bản ghi, ném ngoại lệ (Exception) chặn hành động update `is_active = FALSE`.
4. **Role Filtering**: Tại API lấy danh sách Role, chỉ trả về các Role thỏa mãn điều kiện là "Warehouse Roles" (Dựa vào module phân quyền), cấm hiển thị `SUPER_ADMIN`, `HR`, etc.
