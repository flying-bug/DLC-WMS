# Clarification & Business Rules: Sales Order

Tài liệu này làm rõ các quy tắc nghiệp vụ (Business Rules) và phạm vi của Module Sales Order.

## 1. Scope (Phạm vi)

### In-Scope (Trong phạm vi)
- Tạo, sửa, xóa (khi nháp), duyệt, hủy đơn bán hàng.
- Xử lý giữ hàng (Stock Reservation) trong kho.
- Chia sẻ báo giá qua Public URL.
- Theo dõi lịch sử thanh toán đơn giản (số tiền đã trả, dư nợ).
- Tích hợp trực tiếp với Module Export Slip (Phiếu xuất kho).

### Out-of-Scope (Ngoài phạm vi)
- Xử lý chiết khấu (Discount) phức tạp theo từng dòng hoặc theo % bậc thang (sẽ tách thành Module Khuyến mãi riêng).
- Xử lý Thuế VAT (Hiện tại giá bán là giá net hoặc đã bao gồm thuế tùy chính sách công ty).
- Trả hàng (Sales Return): Nằm ở một module riêng (Returns Management).

## 2. Business Rules (Quy tắc nghiệp vụ cốt lõi)

### BR-01: Quy tắc Duyệt Đơn (Approval Rule)
- Đơn hàng chỉ được duyệt khi tổng số lượng yêu cầu của TỪNG mặt hàng trong đơn phải **<=** Hàng khả dụng (Available Quantity) trong kho được chọn.
- `Available Quantity = Total Actual Quantity - Reserved Quantity (cho các đơn khác)`.

### BR-02: Quy tắc Khóa Đơn (Immutability Rule)
- Khi Đơn hàng đã ở trạng thái `APPROVED` hoặc `POSTED` hoặc `CANCELLED`, mọi nỗ lực chỉnh sửa (Update) cấu trúc hàng hóa, đối tác, kho, ngày lập phiếu đều bị từ chối (HTTP 400).
- Riêng trạng thái `APPROVED` vẫn cho phép "Ghi nhận thanh toán".

### BR-03: Quy tắc Thanh toán (Payment Rule)
- Không được phép ghi nhận số tiền thanh toán lớn hơn số tiền còn nợ (`totalAmount - paidAmount`).
- Việc thanh toán hoàn toàn độc lập với việc giao hàng (Xuất kho). Đơn có thể `PAID` nhưng chưa xuất kho (`APPROVED`), hoặc đã xuất kho (`POSTED`) nhưng vẫn `UNPAID`.

### BR-04: Quy tắc Hủy Đơn (Cancellation Rule)
- Khi Hủy đơn, tất cả số lượng hàng đang "giữ chỗ" (Stock Reservation) thuộc về đơn đó phải được lập tức giải phóng (Release) về lại cho kho.
- Nếu đơn đã xuất kho (`POSTED`), KHÔNG thể Hủy đơn.

## 3. Câu hỏi và Quyết định (Q&A)

**Q: Tại sao sử dụng UUID cho Public Quote thay vì mã `SO...`?**
A: Trong môi trường B2B, báo giá là tài liệu nhạy cảm. Nếu dùng `SO26080001`, đối thủ có thể dễ dàng đoán ra `SO26080002` và thu thập toàn bộ giá bán, danh sách khách hàng của công ty. UUID 36 ký tự (Security by Obscurity) đảm bảo link không thể bị đoán trúng.

**Q: Lỡ khách hàng chia sẻ link UUID đó ra ngoài thì sao?**
A: Link báo giá bản chất là Public. Trách nhiệm bảo mật link lúc này thuộc về phía người gửi (Sales) và người nhận (Khách hàng). Tuy nhiên, trên UI không hiển thị các thông tin nội bộ nhạy cảm (như Giá vốn, Lợi nhuận).
