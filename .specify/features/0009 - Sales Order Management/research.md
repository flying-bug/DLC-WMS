# Research & Implementation Strategy: Sales Order

## 1. Domain Driven Research: Inventory Allocation & Reservation

Bài toán lớn nhất trong thương mại điện tử / B2B bán sỉ là tình trạng: "Tôi có 10 cái iPhone trong kho, Khách A gọi điện chốt mua 8 cái. Nửa tiếng sau, Khách B đặt mua online 5 cái. Làm sao tránh xung đột?"

**Giải pháp được chọn (Hard Reservation Mechanism):**
Chúng ta đã nghiên cứu và triển khai cơ chế Giữ hàng Cứng (Hard Reservation) ngay tại tầng CSDL thông qua bảng `STOCK_RESERVATIONS` và Tracking trường `reserved_quantity` trong `INVENTORY_BALANCES`.
- **Ưu điểm**: Minh bạch dữ liệu. Dễ dàng truy xuất (Query) xem đơn hàng nào đang chiếm bao nhiêu hàng trong kho thông qua màn hình Kho / Lịch sử.
- **Nhược điểm**: Đòi hỏi logic cẩn thận khi Hủy Đơn (Cancel) hoặc Chỉnh sửa để không bị kẹt hàng tồn kho mãi mãi (Dead stock). (Do đó chúng ta thiết kế `expires_at` để tự động nhả kho sau 72h nếu cần).

## 2. Research: UUID for Public Links (Security by Obscurity)

Việc chia sẻ báo giá cần một cơ chế không yêu cầu khách hàng phải đăng nhập (Frictionless B2B).
- **Cách tiếp cận 1: Dùng ID hoặc soCode (Ví dụ: `/quote/1` hoặc `/quote/SO001`)**
  - *Vấn đề*: ID tuần tự là mục tiêu ưa thích của Insecure Direct Object Reference (IDOR). Bất cứ ai cũng có thể viết script vòng lặp `ID=1..9999` để crawl dữ liệu công ty.
- **Cách tiếp cận 2: JWT signed Links**
  - *Vấn đề*: JWT có hạn sử dụng (Expiration). Nếu khách hàng mở link sau 3 ngày có thể bị lỗi, yêu cầu sales gửi lại -> Trải nghiệm kém.
- **Cách tiếp cận 3 (Được chọn): UUIDv4 Token (Security by Obscurity)**
  - Sinh một chuỗi ngẫu nhiên dài (Ví dụ: `f47ac10b-58cc-4372-a567-0e02b2c3d479`). Không có quy luật, không thể đoán được. An toàn trước bot dò tìm. Lưu trực tiếp vào Database để Indexing và Lookup siêu nhanh (Tạo index trên `public_token`).

## 3. Frontend Research: Formats Date (Native vs Third-party)

Trên React, thẻ `<input type="date">` mặc định lấy theo Locale của Hệ điều hành (System OS Locale).
- Nếu User dùng Windows tiếng Anh: Giao diện hiển thị `MM/DD/YYYY`.
- Điều này gây nhầm lẫn trầm trọng cho User Việt Nam khi nhập liệu, đặc biệt ở 2 trường nhạy cảm: `Ngày lập hóa đơn` và `Hạn thanh toán`.

**Giải pháp đã thử và chốt lại:**
- Không sử dụng CSS / JS Hack vì không tương thích chéo trình duyệt (Safari / Firefox / Chrome).
- **Quyết định sử dụng `react-datepicker` kết hợp `date-fns`**:
  - Giao diện (Calendar popup) đẹp hơn, đồng bộ hơn.
  - Ép cứng `dateFormat="dd/MM/yyyy"`, đảm bảo tính thống nhất hiển thị 100% trên mọi máy tính.
  - Hỗ trợ tốt cho việc validation (`minDate`) tự động làm mờ (disable) các ngày trong quá khứ hoặc trước ngày lập đơn một cách trực quan trên lịch.
