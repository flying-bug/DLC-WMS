# Phase 0: Outline & Research

## Findings

### 1. Vấn đề Kiêm nhiệm (Multi-role)
- **Decision**: Sử dụng `UNIQUE KEY (user_id, warehouse_id, role_id)` có sẵn trong bảng `USER_WAREHOUSE_ROLES` để cho phép 1 user giữ nhiều vai trò trong cùng 1 kho. API nhận vào mảng `roleIds`.
- **Rationale**: Phù hợp với mô hình nhân sự thực tế tại các kho nhỏ, 1 người có thể vừa làm Thủ kho vừa làm QC. Tránh thiết kế cứng nhắc 1-1.

### 2. Thu hồi quyền (Soft Delete)
- **Decision**: Không bao giờ gọi lệnh SQL `DELETE` trên bảng `USER_WAREHOUSE_ROLES`. Chỉ gọi lệnh `UPDATE is_active = FALSE`.
- **Rationale**: Đảm bảo toàn vẹn Audit Trail (chuỗi hành trình truy vết). Việc xóa vật lý sẽ làm mất dấu dữ liệu "ai đã từng làm việc ở kho nào", vi phạm quy tắc kế toán và kiểm toán cơ bản của WMS.

### 3. Cơ chế Hard Block chặn thu hồi quyền
- **Decision**: Khi Manager gọi API `DELETE` (Thu hồi quyền), Backend bắt buộc phải chạy các câu query kiểm tra xem nhân sự có đang là `created_by` của chứng từ nào ở trạng thái `DRAFT` hoặc `SUBMITTED` không (VD: `INVENTORY_DOCUMENTS`, `STOCK_TRANSFERS`).
- **Rationale**: Nếu thu hồi quyền trong khi chứng từ chưa chốt (`POSTED`) hoặc chưa hủy (`CANCELLED`), chứng từ đó sẽ thành rác mồ côi (không ai có quyền xử lý tiếp). Đây là rào chắn bắt buộc để đảm bảo luồng nghiệp vụ chặt chẽ.

### 4. Role Filtering & Security
- **Decision**: API lấy danh sách Vai trò (dùng cho Dropdown khi gán quyền) phải áp dụng bộ lọc (filter) để loại trừ các Role cấp cao (System Admin, Giám đốc, HR).
- **Rationale**: Chặn đứng lỗ hổng lạm quyền (Privilege Escalation), không cho phép Manager tự ý gán quyền "vượt cấp" cho nhân sự cấp dưới.

### 5. Tối ưu Giao diện Quản lý (Default View)
- **Decision**: UI danh sách nhân sự kho mặc định chỉ hiển thị nhân sự `is_active = TRUE`. Tích hợp Toggle để xem lại người cũ.
- **Rationale**: Ngăn chặn tình trạng nhiễu thông tin (Cluttered UI) khi số lượng nhân sự nghỉ việc hoặc luân chuyển tăng cao qua các năm. Mặc định chỉ tập trung vào nhân sự đang làm việc.
