# Phase 0: Outline & Research

## Findings

### 1. Unique Business Key Constraint
- **Decision**: Validate độ dài chuỗi (`@Size`) và định dạng SĐT bằng regex `MOBILE_REGEX` ngay tại `CustomerController` và `CustomerService` cho thao tác Create/Update.
- **Rationale**: Do `phone` là business key định danh chủ sở hữu thiết bị, database đã có index `idx_partners_phone` nhưng kiểu dữ liệu là `VARCHAR(20)`. Phải validate chặt chẽ ở ứng dụng trước khi lưu để chặn rác dữ liệu.

### 2. UI/UX cho Tính năng Tạo Nhanh (Quick Create)
- **Decision**: Sử dụng Drawer (hoặc Dialog Modal) cho form "Thêm nhanh" khách hàng từ các màn hình Giao dịch (Bán hàng, Bảo hành).
- **Rationale**: Mục tiêu SC-002 là giảm tỷ lệ gián đoạn luồng làm việc. Việc dùng Drawer cho form khách hàng ngay trong lúc tạo hóa đơn/phiếu bảo hành đảm bảo "Interaction & UX Flow" như `spec.md` yêu cầu.

### 3. Xử lý Hiệu năng khi Query "Khách vãng lai" (KH-0000)
- **Decision**: Tích hợp Pagination cho cả 3 Endpoint Tab Data ở Backend, đồng thời UI disable nút xem chi tiết với riêng khách hàng này.
- **Rationale**: Khách vãng lai chứa hàng nghìn record giao dịch, query toàn bộ gây rủi ro tràn RAM hoặc timeout. Theo quyết định ở Deep Dive Review, kết hợp cả UI logic và API pagination là cách an toàn nhất.

### 4. Tách biệt Địa chỉ (Address Handling)
- **Decision**: Giữ `address` ở dạng free-text `VARCHAR` trong entity `PARTNERS`.
- **Rationale**: Đảm bảo tốc độ nhập liệu tối đa cho nhân viên Bán hàng/Bảo hành. Việc validate địa chỉ chuẩn cấp 3 (Tỉnh/Huyện/Xã) sẽ được ủy quyền cho form giao nhận vận chuyển của module Logistics.
