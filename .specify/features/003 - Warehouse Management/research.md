# Phase 0: Outline & Research

## Findings

### 1. API Versioning
- **Decision**: Sử dụng `/api/v1/warehouses`.
- **Rationale**: Theo quy tắc `VIII. RESTful API Standards` trong `constitution.md`, Versioning qua URL prefix `/api/v1/`.

### 2. UI Component for Form (Modal vs Page)
- **Decision**: Sử dụng Modal (Popup) cho form tạo mới và chỉnh sửa kho.
- **Rationale**: Quản lý kho là chức năng master data với số lượng trường không quá lớn (Code, Name, Address). Việc dùng Modal sẽ tăng tính liền mạch (Seamless UX) so với việc chuyển trang (Separate Page), phù hợp với "Interaction & UX Flow" trong `spec.md`.

### 3. Metric Aggregation Implementation
- **Decision**: Query trực tiếp trên DB (MySQL) sử dụng JPQL trong `InventoryBalanceRepository`.
- **Rationale**: Không cần thiết lập caching hay ElasticSearch ở giai đoạn này do vi phạm nguyên tắc `X. Simplicity & YAGNI`. Yêu cầu <1.5s p95 với 50k bản ghi có thể xử lý tốt bằng cấu trúc index cơ bản trên bảng `INVENTORY_BALANCES` trong MySQL 8.0.
- **Alternatives considered**: Redis caching (Từ chối do tăng độ phức tạp hệ thống chưa cần thiết).
