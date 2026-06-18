# Clarification Log: 003 - Warehouse Management

## Session 2026-06-17

**Q1: Cơ chế phân quyền và gán quyền tự động (Data-level Access) đối với chức năng quản lý kho là gì?**
- **Vấn đề**: FR-001 nêu Manager hoặc user trong `USER_WAREHOUSE_ROLES` có quyền thao tác kho. Nhưng US1 lại yêu cầu tự động gán Manager vào bảng này khi tạo kho, gây nhầm lẫn về việc Manager có quyền Global hay Explicit.
- **Câu trả lời**: Manager mặc định có quyền trên TẤT CẢ các kho (Global Access). Việc tự động insert vào `USER_WAREHOUSE_ROLES` ở US1 chỉ mang tính chất ghi nhận "Người tạo (Owner)" chứ không dùng để cấp quyền truy cập. Ngoài ra, Staff hoàn toàn KHÔNG CÓ quyền thực hiện CRUD Kho.

**Q2: Các trường hợp lệ để chỉnh sửa (Editable Fields)**
- **Vấn đề**: Trong bảng `WAREHOUSES` có trường `type`. Trường này có được sửa đổi sau khi kho đã tạo hay không?
- **Câu trả lời**: Không. Vì hệ thống mới nên chỉ để mặc định kho là `STANDARD`, trường `type` sẽ bị khóa (Read-only) vĩnh viễn sau khi kho được tạo thành công, giống như trường mã kho (`code`).

**Q3: Ai có quyền xem Tab "Lịch sử thay đổi" (Audit Logs) trong chi tiết kho?**
- **Vấn đề**: Việc truy cập nhật ký thay đổi kho cần được phân quyền rõ ràng để tránh lộ lọt thông tin.
- **Câu trả lời**: Chỉ những người dùng có quyền Manager (hoặc tài khoản được cấp quyền truy cập kho đó qua `USER_WAREHOUSE_ROLES`) mới được phép gọi API và xem log. Staff bị chặn hoàn toàn.

**Q4: Xử lý ghi đè dữ liệu (Concurrent Updates) khi có nhiều người cùng chỉnh sửa kho?**
- **Vấn đề**: Tài liệu hiện tại đang sử dụng "Last-Write-Wins" (người lưu sau đè người trước). Đối với hệ thống WMS, điều này rủi ro cao (VD: Manager A vừa đổi trạng thái kho thành INACTIVE, Manager B lưu thông tin sửa tên dựa trên giao diện cũ sẽ đè lại trạng thái thành ACTIVE).
- **Câu trả lời**: Cần áp dụng cơ chế **Optimistic Locking** (Khóa lạc quan) thông qua trường `@Version` trên Entity. Người lưu sau sẽ nhận được báo lỗi HTTP 409 Conflict yêu cầu tải lại trang thay vì ghi đè mù quáng.

**Q5: Hiển thị danh sách Lịch sử thay đổi (Audit Logs) có phân trang không?**
- **Vấn đề**: US5 không đề cập đến giới hạn dữ liệu. Một kho có thể có hàng ngàn log, nếu query tất cả sẽ gây tràn RAM và chậm UI.
- **Câu trả lời**: Bắt buộc phải áp dụng **Phân trang (Pagination)** ở phía Server cho API lấy Audit Logs (ví dụ 20 logs/trang).

**Q6: Mã kho (code) có được tái sử dụng nếu kho cũ đã bị xóa mềm (Soft Delete)?**
- **Vấn đề**: Khi kho K01 bị đổi trạng thái thành INACTIVE (xóa mềm), người dùng có được tạo kho mới mã K01 không?
- **Câu trả lời**: Không. Unique constraint của trường `code` là toàn cục bất kể trạng thái. Không được phép tạo mã trùng lặp dưới mọi hình thức để đảm bảo tính duy nhất của lịch sử Audit Log.

### Session 2026-06-18 (Review sau khi có Spec mới)

**Q7: Báo cáo xuất Excel (US6) có bắt buộc chứa các trường thống kê tồn kho (Total Quantity, Total Value) cho từng kho không?**
- **Vấn đề**: Trong Acceptance Scenario của US6 có đề cập *"Cột Tổng giá trị tồn được định dạng chuẩn Số/Tiền tệ"*, nhưng danh sách kho hiển thị trên UI và API xuất danh sách hiện tại chỉ chứa thông tin tĩnh cơ bản của kho (ID, Tên, Mã, Địa chỉ, Trạng thái). Nếu muốn thêm các chỉ số tồn kho vào file Excel, Backend sẽ phải join thêm với bảng `INVENTORY_BALANCES` cho toàn bộ danh sách, tiềm ẩn rủi ro N+1 query làm giảm hiệu năng (chậm hơn mức SC-005 yêu cầu là 3 giây).
- **Câu trả lời**: Cần làm rõ có nên tách việc xuất cấu hình Kho và xuất Báo cáo Tồn Kho thành 2 loại file riêng biệt không, hoặc nếu gộp chung thì Backend bắt buộc phải nâng cấp sử dụng DTO Query chuyên biệt (có group by) thay vì tái sử dụng Repository cơ bản.

**Q8: Phân quyền xuất Excel (RBAC) cho Staff**
- **Vấn đề**: FR-001 quy định Staff bị từ chối truy cập (CRUD kho), tuy nhiên US6 có ghi *"Manager (và Kế toán) cần xuất danh sách các kho hàng"*. Nếu Kế toán đang mang role STAFF, họ có được cấp quyền truy cập API `/export` không?
- **Câu trả lời**: Cần bổ sung logic: Nếu là role Kế toán (có thể là một role chuyên biệt hoặc gán quyền động), thì cho phép Read-only và gọi API xuất Excel, nhưng vẫn ẩn các nút Thêm/Sửa/Xóa.
