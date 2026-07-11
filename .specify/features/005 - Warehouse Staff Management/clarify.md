# Clarification Notes (Critical Reviews)

## 1. User Scenarios & Acceptance Scenarios

**User Story 1 (Xem danh sách nhân sự):**
- **Vấn đề:** Khi số lượng nhân sự đông và áp dụng cơ chế Soft Delete (cập nhật `is_active = FALSE`), nếu load toàn bộ dữ liệu sẽ gây rối mắt.
- **Giải pháp:** Mặc định (Default) UI chỉ hiển thị các nhân sự đang hoạt động (`is_active = TRUE`). Bổ sung một Toggle/Checkbox "Hiển thị nhân sự đã ngừng hoạt động" để quản lý có thể xem lại nhân sự cũ. Đồng thời bổ sung tính năng bộ lọc (Filter) theo "Vai trò" (Đã cập nhật vào Spec).

**User Story 2 (Gán nhân sự vào kho):**
- **Vấn đề 1:** Manager có thể vô tình gán các quyền cấp cao (Super Admin, HR) gây lỗ hổng bảo mật nếu gọi toàn bộ list Role trong DB.
- **Giải pháp 1:** Bắt buộc Backend phải Filter API danh sách Vai trò, chỉ trả về các vai trò thuộc phân hệ quản lý kho (Warehouse Roles).
- **Vấn đề 2:** Nhu cầu thực tế tại các kho vừa và nhỏ thường có sự kiêm nhiệm nhiều vị trí (VD: Thủ kho kiêm Kỹ thuật bảo hành). Spec ban đầu chỉ cho phép chọn 1 vai trò cụ thể.
- **Giải pháp 2:** Cho phép Manager chọn nhiều vai trò (Multi-role/Kiêm nhiệm) cho 1 user khi gán vào kho. Đồng thời, bổ sung cơ chế gửi thông báo Notification (In-app/Email) cho nhân sự vừa được cấp quyền.

**User Story 3 (Cập nhật/Thu hồi quyền):**
- **Vấn đề:** Xóa vật lý (Lệnh DELETE) sẽ làm mất Data Tracking cho các báo cáo lịch sử. Hơn nữa, nếu nhân sự đang có chứng từ `DRAFT`/`SUBMITTED`, việc rút quyền sẽ sinh ra rác dữ liệu.
- **Giải pháp:** "Thu hồi quyền" (Xóa khỏi kho) bản chất là Update cờ `is_active = FALSE` (Soft Delete) trên bảng `USER_WAREHOUSE_ROLES`. Đồng thời thêm cơ chế chặn cứng (Hard block) không cho phép Soft Delete nếu nhân viên đang có chứng từ `DRAFT` hoặc `SUBMITTED`. Yêu cầu phải xử lý dứt điểm hoặc hủy chứng từ trước.

## 2. Functional Requirements

**Kiểm soát chứng từ dở dang (FR-006):**
- **Vấn đề:** Spec chưa đề cập đến việc áp dụng Soft Delete và validation chặn quyền.
- **Giải pháp:** Thu hồi quyền được quy định chuẩn là Soft Delete. Phải validate kiểm tra các chứng từ do user tạo (`created_by`) đang ở trạng thái `DRAFT` hoặc `SUBMITTED` trước khi cho phép thu hồi quyền.

**Bảo mật gán quyền (FR-007):**
- **Quyết định:** Manager bị chặn việc gán các quyền không thuộc thẩm quyền của kho. Backend áp dụng filter bắt buộc đối với API danh sách Vai trò (`/roles`).

## 3. Key Entities

**Bảng Warehouse_User_Role:**
- **Quyết định:** Entity này không chỉ lưu 1 `role_id` duy nhất cho mỗi cặp `warehouse_id` và `user_id`.
- **Giải pháp:** Bảng cần được thiết kế để hỗ trợ lưu nhiều dòng (Composite Key) cho phép một nhân viên giữ nhiều `role_id` khác nhau trong cùng một `warehouse_id`.

**Bảng Notification:**
- **Quyết định:** Không thêm entity `Notification` vào Database trong giai đoạn này để tránh làm phức tạp Core WMS.
- **Giải pháp:** Việc thông báo "được cấp quyền/thu hồi quyền" sẽ được đẩy (trigger) qua Email System hoặc hiển thị Toast/Popup ngay trong UI của User nếu họ đang online, không cần lưu trữ vật lý trong Database.

## 4. Các Quyết Định Thiết Kế Chuyên Sâu (Deep Dive Review)

Dựa trên các đặc thù nghiệp vụ quản lý kho linh kiện điện tử máy tính (yêu cầu quản lý chặt chẽ theo Serial, quy trình bảo hành/QC nghiêm ngặt) và tiêu chuẩn kế toán khắt khe (chuẩn MISA), dự án đã thống nhất các quyết định (Options) như sau:

**1. Bài toán Kiêm nhiệm đa vai trò (Multi-role Assignment):**
- **Quyết định:** Nới lỏng cấu trúc gán quyền. UI cho phép gộp/chọn nhiều Role bằng Multi-select Checkbox thay vì Dropdown đơn.
- **Lý do:** Ở các đại lý máy tính hoặc kho chi nhánh, nhân sự thường kiêm nhiệm cả "Thủ kho", "Nhân viên kiểm kê" và "QC/Kỹ thuật". Việc cho phép Multi-role giúp hệ thống linh hoạt hơn, phù hợp với quy mô nhân sự thực tế. (Map với User Story 2).

**2. Cơ chế "Soft Delete" thay cho "Hard Delete":**
- **Quyết định:** Không bao giờ xóa dòng vật lý khỏi `USER_WAREHOUSE_ROLES`. Chỉ dùng lệnh `UPDATE is_active = FALSE`.
- **Lý do:** Tuân thủ nguyên tắc kế toán của MISA và Audit. Cần bảo toàn lịch sử nhân sự đã từng thao tác, đăng nhập tại kho nào để phục vụ Audit Trail.

**3. Cơ chế "Hard Block" (Bảo vệ tính toàn vẹn chứng từ):**
- **Quyết định:** Chặn tuyệt đối hành động "Thu hồi quyền" (Soft delete) nếu user đang là `created_by` của các Chứng từ kho (Nhập/Xuất, Chuyển kho, Kiểm kê) ở trạng thái `DRAFT` hoặc `SUBMITTED`.
- **Lý do:** Các chứng từ tạo ra phải có người xử lý đến cùng (POSTED) hoặc Hủy bỏ (CANCELLED). Việc chặn quyền sẽ ép buộc quy trình dọn dẹp dữ liệu rác, đảm bảo tính toàn vẹn số liệu.

**4. Bảo mật khi uỷ quyền (Role Filtering):**
- **Quyết định:** Cấm hiển thị các Role thuộc System/Admin/HR trong danh sách gán quyền của Warehouse Manager.
- **Lý do:** Phân tầng bảo mật. Ngăn chặn khả năng Manager lạm quyền (Privilege Escalation) gán cho nhân sự cấp dưới các role siêu việt.

**5. Tích hợp Notification & Audit Trail:**
- **Quyết định:** Ghi log vào bảng `AUDIT_LOGS` để truy vết chi tiết (`entity_name='USER_WAREHOUSE_ROLES'`). Về phía User, chỉ gửi thông báo qua Email hoặc Toast trên Client, không lưu trữ Notification trong Database.
- **Lý do:** Giữ cho Database gọn nhẹ (chỉ tập trung vào Core WMS). Bảng `AUDIT_LOGS` đã đủ để đảm nhiệm việc kiểm toán tính minh bạch (Traceability) khi phân quyền.
