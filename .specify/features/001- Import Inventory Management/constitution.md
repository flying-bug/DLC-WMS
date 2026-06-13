# WMS & Warranty System Constitution

## Core Principles

### I. Định danh tuyệt đối (Absolute Traceability)
Mọi linh kiện điện tử có cấu hình theo dõi Serial (`track_serial = TRUE`) bắt buộc phải được quản lý đích danh 100%. Không có ngoại lệ. Tổng số lượng S/N ở trạng thái `AVAILABLE` tại một kho phải luôn khớp tuyệt đối với số lượng tồn kho `quantity_on_hand` của kho đó.

### II. Tính bất biến của dữ liệu (Data Immutability)
Dữ liệu lịch sử kho và chứng từ là bất khả xâm phạm. Hệ thống tuyệt đối không sử dụng xóa cứng (Hard-delete) hoặc cập nhật trực tiếp (Direct Update) lên các chứng từ Phiếu nhập/Xuất/Chuyển kho đã ở trạng thái `POSTED`. Mọi sai sót phải được xử lý bằng nghiệp vụ kế toán (Tạo chứng từ đảo/chứng từ điều chỉnh).

### III. Trải nghiệm hướng Thiết bị quét (Scanner-First UX)
Giao diện người dùng (UI/UX) phải được thiết kế xoay quanh thiết bị ngoại vi (Súng quét mã vạch). 
- Giảm thiểu tối đa việc sử dụng chuột và bàn phím trong luồng nhập liệu chính.
- Tốc độ Auto-focus phải `< 0.1s`. 
- Bắt buộc phải có phản hồi âm thanh (Bíp) và thị giác (Màu sắc, Toast message) rõ ràng cho từng thao tác quét thành công/thất bại.

### IV. Tách bạch Sổ cái và Sổ chi tiết (Ledger Separation)
Kiến trúc Database phải duy trì sự phân tách rõ ràng:
- `INVENTORY_BALANCES` là Sổ cái: Chỉ phục vụ truy vấn số lượng tổng hợp, đảm bảo tốc độ báo cáo `< 1s`. Không lưu thông tin Serial vào đây.
- `SERIAL_NUMBERS` là Sổ chi tiết: Chỉ dùng để truy vết vị trí, trạng thái và vòng đời bảo hành của từng cá thể.

### V. Chấp nhận thành công một phần (Partial Success Processing)
Đối với các thao tác xử lý dữ liệu lớn (Bulk Actions) như Import file Excel, hệ thống áp dụng nguyên tắc "Thành công một phần" (Partial Import) thay vì "Được ăn cả ngã về không" (All-or-Nothing). Dòng dữ liệu đúng sẽ được nạp, dòng sai sẽ bị chặn lại, bôi đỏ và cho phép người dùng sửa trực tiếp trên giao diện để tối ưu thời gian thao tác.

## Yêu cầu Bảo mật & Hiệu năng (Security & Performance Standards)

- **Xử lý đồng thời (Concurrency):** Mọi giao dịch làm thay đổi trạng thái của Serial Number hoặc Tồn kho phải được bọc trong Database Transaction và sử dụng khóa mức dòng (Row-level lock) để triệt tiêu hoàn toàn rủi ro Double-entry (Ví dụ: 2 người cùng xuất bán 1 S/N).
- **Phân quyền động (Dynamic RBAC):** Mọi Action (Tạo mới, Sửa, Ghi sổ, Xóa nháp) trên API bắt buộc phải được bảo vệ bởi Permission Code tương ứng. Không hard-code Role trong logic nghiệp vụ.
- **Vệ sinh dữ liệu (Data Sanitization):** Mọi Input dạng chuỗi (S/N, Product Code) từ người dùng hoặc máy quét phải được hệ thống tự động loại bỏ khoảng trắng thừa (Trim) và chuyển thành chữ in hoa (Uppercase) trước khi query hoặc lưu vào Database.
- **Lưu vết hệ thống (Audit Trail):** Mọi hành động làm thay đổi vòng đời chứng từ (DRAFT -> POSTED -> CANCELLED) phải được ghi log tự động vào bảng `AUDIT_LOGS`.

## Quy trình Phát triển & Kiểm thử (Development Workflow & Quality Gates)

- **Test-First với Phần cứng:** Team Dev và QA bắt buộc phải code và kiểm thử bằng súng quét mã vạch thực tế ngay từ Sprint đầu tiên của Phase Phát triển. Không chấp nhận chỉ test bằng bàn phím giả lập.
- **Nghiệm thu trung gian (Sign-off Gates):**
  - Code chỉ được viết khi Spec và Wireframe/UI đã được Sign-off.
  - Tính năng chỉ được deploy lên môi trường Staging khi đã vượt qua 100% Acceptance Checklist.
- **Bảo vệ dữ liệu gốc (Data Migration):** Tồn kho đầu kỳ không được can thiệp bằng script Database. Bắt buộc phải được đưa vào hệ thống thông qua giao diện Import Excel của hệ thống để đảm bảo chạy qua đầy đủ các luồng Validation và lưu vết Audit.

## Governance

- **Quyền tối thượng:** Bản Constitution này đứng trên mọi tài liệu quy trình khác trong Phase 1. 
- **Tuân thủ:** Mọi Pull Request (PR) phải được Reviewer đối chiếu xem có vi phạm các nguyên tắc trong Hiến pháp này hay không (Đặc biệt là tính Bất biến và Tách bạch Sổ cái).
- **Sửa đổi:** Bất kỳ sửa đổi nào đối với cấu trúc Database (`database-schema.md`) hoặc luồng nghiệp vụ (`spec.md`) đi ngược lại với Hiến pháp này đều cần phải có sự họp bàn, phê duyệt từ Product Manager / BA và được cập nhật lại vào tài liệu.

**Version**: 1.0.0 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-06-12