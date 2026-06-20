# Data Model: Warehouse Management

## Entities

### `WAREHOUSES`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **code**: `VARCHAR(50) NOT NULL UNIQUE` (Read-only after create)
- **name**: `VARCHAR(100) NOT NULL`
- **address**: `TEXT`
- **type**: `VARCHAR(50) NOT NULL DEFAULT 'STANDARD'` (Read-only after create)
- **status**: `VARCHAR(20) NOT NULL DEFAULT 'APPROVED'` (Enum: DRAFT, APPROVED, INACTIVE)
- **version**: `BIGINT NOT NULL DEFAULT 0` (Dùng cho cơ chế Optimistic Locking)
- **created_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **updated_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### `USER_WAREHOUSE_ROLES`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **user_id**: `BIGINT UNSIGNED NOT NULL` (Foreign Key to `USERS.id`)
- **warehouse_id**: `BIGINT UNSIGNED NOT NULL` (Foreign Key to `WAREHOUSES.id`)
- **role_id**: `BIGINT UNSIGNED`
- **is_active**: `BOOLEAN NOT NULL DEFAULT TRUE`
- **created_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`

## Validation Rules
1. **Mã kho (code)**: Case-insensitive unique toàn cục.
2. **Loại kho (type)** và **Mã kho (code)**: Chỉ đọc sau lần lưu thành công đầu tiên.
3. **Soft Delete**: Không thể Hard Delete nếu đã có giao dịch phát sinh. Đổi sang `status = INACTIVE`.
4. **Optimistic Locking**: Bắt buộc dùng cột `version` cho update tránh mất mát dữ liệu do thao tác đồng thời.

### `AUDIT_LOGS` (Ghi chú thêm từ Spec)
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **user_id**: `BIGINT UNSIGNED NOT NULL` (Foreign Key to `USERS.id`)
- **action**: `VARCHAR(50) NOT NULL` (CREATE, UPDATE, DELETE)
- **entity_name**: `VARCHAR(100) NOT NULL` (Ví dụ: 'WAREHOUSES')
- **entity_id**: `BIGINT UNSIGNED NOT NULL`
- **detail**: `JSON` (Chứa thay đổi trước và sau - old/new values)
- **created_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
