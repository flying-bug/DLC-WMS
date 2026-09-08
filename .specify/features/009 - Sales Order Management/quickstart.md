# Validation Checklist & Quickstart Testing Guide

Tài liệu hướng dẫn Test toàn bộ hệ thống Sales Order từ A-Z.

## 1. Unit & Edge Cases Testing

### Màn hình Create / Update
- [ ] **Test Date Validation**: Chọn *Ngày lập* là ngày hôm nay. Mở *Hạn thanh toán* và click thử vào ngày hôm qua. Kết quả: Lịch không cho bấm (Greyed out). Cố tình nhập text: Hệ thống văng Toast Error "Hạn thanh toán không được nằm trong quá khứ".
- [ ] **Test Empty State**: Bấm Lưu khi chưa nhập thông tin. Bắt lỗi "Vui lòng chọn khách hàng", "Vui lòng chọn kho".
- [ ] **Test Add Line**: Sản phẩm không được rỗng, số lượng không được <= 0.
- [ ] **Test Lock Edit**: Vào đơn hàng đã `APPROVED`, sẽ thấy các Input bị disable hoặc nút "Lưu" biến mất.

### Tích hợp Kho hàng (Inventory)
- [ ] **Test Overselling**: Vào kho xem số lượng khả dụng của Sản phẩm A là 10. Ra tạo Sales Order mua 15 cái Sản phẩm A. Bấm "Lưu & Duyệt đơn". 
  - *Expected*: Báo lỗi HTTP 400 "Kho không đủ hàng". Đơn hàng bị đẩy về trạng thái DRAFT.
- [ ] **Test Reserve**: Tạo mua 5 cái. Bấm Duyệt thành công. 
  - *Expected*: Vào kho xem lại sẽ thấy Số tồn tổng vẫn là 10, nhưng Hàng đang giữ (Reserved) là 5, Hàng Khả dụng còn 5.

### Quy trình Export Slip & Payment
- [ ] **Test Create Export Slip**: Từ SO đã duyệt, bấm "Tạo phiếu xuất kho". Kiểm tra xem trang Export Slip có tự động load dữ liệu KH, Kho và danh sách sản phẩm y hệt SO hay không.
- [ ] **Test POSTED sync**: Quay lại tab SO. Bấm Xác nhận Xuất kho ở tab Export Slip. Tải lại trang SO, SO phải tự động chuyển thành `POSTED`.
- [ ] **Test Payment Partial/Full**: Bấm "Ghi nhận thanh toán". Tổng bill là 5.000.000đ. Đóng 2.000.000đ. Status thanh toán chuyển thành PARTIAL. Đóng nốt 3.000.000đ, Status chuyển thành PAID.

### Public Link Security
- [ ] **Test UUID Route**: Copy link chia sẻ (`/quote/{uuid}`). Mở trình duyệt ẩn danh (Không đăng nhập). Paste link. Giao diện báo giá hiện ra bình thường.
- [ ] **Test Guessing UUID**: Đổi 1 ký tự trong UUID ở thanh URL. 
  - *Expected*: Màn hình báo lỗi "Đã xảy ra lỗi hệ thống / Không tìm thấy báo giá" hoặc UI trả về trạng thái NotFound an toàn.
- [ ] **Test API Bypass**: Gọi Postman vào API `/api/v1/public/sales-orders/xxx/quote`. Không cần JWT Auth Bearer token vẫn trả về JSON. Gọi thử API nội bộ `/api/v1/sales-orders/xxx` không JWT, trả về 403 Forbidden/401 Unauthorized.

---

Bất cứ Tester hay Developer nào khi tham gia phát triển và debug tính năng SO đều có thể dựa vào Check List trên để đảm bảo ứng dụng DLC-WMS vận hành chính xác logic nghiệp vụ thương mại B2B.
