# Data Model: Customer Management (Account Management)

## Entities

### `PARTNERS`
- **id**: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- **code**: `VARCHAR(50) NOT NULL UNIQUE` (Read-only after create, auto-generated e.g., KH2026060001)
- **type**: `VARCHAR(20) NOT NULL DEFAULT 'COMPANY'` (Enum: INDIVIDUAL, COMPANY)
- **name**: `VARCHAR(150) NOT NULL`
- **phone**: `VARCHAR(20)` (Unique business key for customers, indexed via `idx_partners_phone`)
- **email**: `VARCHAR(100)`
- **address**: `TEXT` (Unstructured address, structured handling pushed to Logistics module)
- **tax_code**: `VARCHAR(50)`
- **is_customer**: `BOOLEAN NOT NULL DEFAULT FALSE` (Must be TRUE for this module)
- **is_supplier**: `BOOLEAN NOT NULL DEFAULT FALSE`
- **parent_id**: `BIGINT UNSIGNED NULL`
- **credit_limit**: `DECIMAL(15,2) NOT NULL DEFAULT 0.00`
- **payment_term_days**: `INT NOT NULL DEFAULT 0`
- **bank_account_number**: `VARCHAR(50)`
- **bank_name**: `VARCHAR(100)`
- **bank_beneficiary_name**: `VARCHAR(100)`
- **group_type**: `VARCHAR(50) NOT NULL DEFAULT 'RETAIL'` (Enum: RETAIL, WHOLESALE, DISTRIBUTOR - Dropdown options: Khách lẻ, Khách thợ)
- **status**: `VARCHAR(20) NOT NULL DEFAULT 'APPROVED'`
- **created_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- **updated_at**: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

## Validation Rules
1. **Số điện thoại (phone)**: Phải được validate bằng Regex từ `AppConstants.MOBILE_REGEX`: `(\+84|0)[\s.-]?(3[2-9]|5[5689]|7[06-9]|8[1-9]|9[0-9])([\s.-]?\d){7}` (Trim khoảng trắng trước khi lưu). Định danh duy nhất.
2. **Khách vãng lai**: Hệ thống có sẵn bản ghi `KH-0000` (Seed data). UI không cung cấp tính năng "Xem chi tiết" cho mã này để tránh tràn bộ nhớ do query hàng chục nghìn records.
3. **Soft Delete**: Không cho phép xóa cứng (Hard delete). Chỉ chuyển `status = INACTIVE`. Nếu khách hàng đang có phiếu bảo hành ở trạng thái sửa chữa, chặn vô hiệu hóa.
4. **Thay đổi Số điện thoại**: Cho phép sửa SĐT nhưng bắt buộc ghi nhận qua bảng `AUDIT_LOGS` để lưu vết vì đây là khóa định danh sở hữu thiết bị.
5. **Gán giá trị mặc định**: Khi tạo qua UI Quick Create, hệ thống tự động gán `is_customer = TRUE`, `type = 'INDIVIDUAL'`, `credit_limit = 0.00`, `payment_term_days = 0`. Mặc định `group_type = 'RETAIL'`.
6. **Max Length (Độ dài chuỗi)**: Bắt buộc áp dụng `@Size` validation ở Controller và hiển thị lỗi ở UI để tránh lỗi SQL `DataTruncationException`: `name` (Max 150), `email` (Max 100), `address` (UI nên rào ở 1000 ký tự).
