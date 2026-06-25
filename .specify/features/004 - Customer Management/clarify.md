# Clarification Notes (Critical Reviews)

## 1. User Scenarios & Acceptance Scenarios

**User Story 1 (Thêm mới):**
- **Vấn đề:** Nếu số điện thoại thuộc về một khách hàng đã bị chuyển sang trạng thái INACTIVE (Ngừng hoạt động) thì hệ thống xử lý thế nào?
- **Giải pháp:** Bổ sung kịch bản: "Nếu SĐT trùng với khách hàng đã INACTIVE, hệ thống hiển thị thông báo: SĐT này thuộc về khách hàng cũ đã ngừng hoạt động. Bạn có muốn khôi phục (Re-activate) lại không?"

**User Story 3 (Cập nhật & Ngừng hoạt động):**
- **Vấn đề:** Cần làm rõ phạm vi ảnh hưởng khi khách hàng bị vô hiệu hóa.
- **Giải pháp:** Khi `PARTNERS.status = 'INACTIVE'`, trên giao diện tạo mới Phiếu Bảo hành/Phiếu xuất kho, khi nhân viên gõ SĐT của khách này thì hệ thống MUST NOT (không được) hiển thị gợi ý trong dropdown list.

## 2. Functional Requirements

**Đồng bộ trạng thái thiết bị (Serial Numbers):**
- **Vấn đề:** Spec chưa đề cập đến việc cập nhật trạng thái thiết bị khi nhận bảo hành.
- **Giải pháp:** Bổ sung Business Rule: Khi tạo Phiếu tiếp nhận bảo hành (REPAIRS), hệ thống bắt buộc phải cập nhật trạng thái của mã linh kiện đó trong bảng `SERIAL_NUMBERS.status` từ `SOLD` thành `WARRANTY_HOLD` hoặc `REPAIRING`.

**Định dạng Mã khách hàng (FR-002):**
- **Vấn đề:** Format chung chung (VD: KH0001) khó quản lý và nhận diện.
- **Giải pháp:** Chốt cứng format để Dev tạo hàm tự động tăng trong Database: `KH` + `YYYYMM` (Năm tháng hiện tại) + `XXXX` (Số tự tăng từ 0001), ví dụ: KH2026060001.

## 3. Key Entities

- Bảng Khách hàng: Cần ghi rõ `PARTNERS` (với điều kiện `is_customer = TRUE`).
- Bảng Thu/Chi: Ghi rõ `PAYMENT_RECEIPTS` & `PAYMENT_VOUCHERS`.

## 4. Bổ sung Thẻ Thống Kê Thu/Chi (Câu hỏi Follow-up)

**Quyết định:** NÊN thêm một thẻ thống kê nhỏ tính Tổng tiền khách đã chi trả, nhưng CHƯA NÊN làm tính năng tự động phân hạng "VIP" ở Phase này để tránh Scope Creep.

**Chi tiết bổ sung (FR-006):**
Phía trên danh sách phiếu Thu/Chi tại tab Lịch sử Thu/Chi, hệ thống MUST hiển thị một thẻ tóm tắt (Summary Card) thể hiện Tổng giá trị đã thu. Giá trị này bằng tổng cột `amount` của các bản ghi `status = 'POSTED'` trong bảng `PAYMENT_RECEIPTS` của khách hàng đó.

## 5. Các Quyết Định Thiết Kế Chuyên Sâu (Deep Dive Review)

Dựa trên các đặc thù nghiệp vụ quản lý linh kiện PC (Khách thợ, sang tay linh kiện), dự án đã thống nhất các quyết định (Options) như sau:

**1. Phân loại Khách lẻ (Retail) vs Khách Thợ/Đại lý (Dealer):**
- **Quyết định:** Thêm trường `Nhóm khách hàng` (Dropdown: Khách lẻ, Khách thợ) ngay trên popup Tạo nhanh. Default chọn sẵn là "Khách lẻ" (RETAIL).
- **Lý do:** Giúp bộ phận Marketing và Sales có thể báo cáo và chăm sóc tập khách hàng mua sỉ/thợ. (Map với FR-003, FR-005).

**2. Rủi ro khi thay đổi Số điện thoại (Business Key Mutation):**
- **Quyết định:** Cho phép linh hoạt thay đổi (sửa sai) Số điện thoại. Tuy nhiên, hệ thống phải bật cảnh báo và ngầm tạo Audit Log ghi nhận lịch sử đổi SĐT.
- **Lý do:** Ngành bán lẻ rất hay gõ nhầm số (do nghe sai, bấm nhầm). Nếu khóa cứng sẽ sinh ra nhiều dữ liệu rác. Bật cảnh báo giúp nhân viên nhận thức được rủi ro làm mất thông tin bảo hành thiết bị. (Map với Acceptance Scenarios của Story 3).

**3. Địa chỉ Khách hàng tự do (Unstructured Address):**
- **Quyết định:** Giữ nguyên Address là một trường Text Area tự do ở module Khách Hàng. Khi làm lệnh Trả Hàng (Return Order) mới ép nhập cấu trúc chuẩn (Tỉnh, Quận, Phường).
- **Lý do:** Ưu tiên tốc độ tại quầy khi bán hàng và nhận bảo hành. Không bắt khách hàng chờ đợi để chọn từng cấp địa chỉ. (Map với phần Edge Cases).

**4. Chuyển nhượng thiết bị (Sang tay linh kiện):**
- **Quyết định:** Nới lỏng Validation. Chấp nhận tạo Phiếu nhận bảo hành với `partner_id` khác với chủ sở hữu gốc (người mua đầu tiên). Bật soft warning cảnh báo để nhân viên tự kiểm tra tính hợp lệ.
- **Lý do:** Giải pháp linh hoạt (Bypass) nhanh chóng cho thực trạng "mua đi bán lại" cực kỳ phổ biến trong ngành linh kiện, không làm phình to chi phí phát triển tính năng "Transfer Ownership" ở Phase này. (Map với phần Edge Cases).

**5. Lỗi Hiệu Năng (Crash) khi Load Hồ sơ "Khách Vãng Lai":**
- **Quyết định:** Disable nút "Xem chi tiết" UI đối với Khách vãng lai (`KH-0000`). Đồng thời bắt buộc áp dụng Phân trang (Pagination) trên API cho cả 3 Tab Chi tiết Khách hàng.
- **Lý do:** Khách vãng lai tích lũy giao dịch rất lớn, việc ẩn xem chi tiết giải quyết nhanh bài toán nghiệp vụ, trong khi phân trang giải quyết rủi ro crash hệ thống về lâu dài.

**6. Bảo hành các linh kiện "Không có Serial Number" (Non-serialized Items):**
- **Quyết định:** Đổi Tab "Thiết bị" thành "Lịch sử mua hàng", query dữ liệu từ `SALES_ORDER_LINES` thay vì chỉ `SERIAL_NUMBERS`.
- **Lý do:** Giúp nhân viên tra cứu được toàn bộ các linh kiện phụ (cáp, keo, quạt) không được dán S/N, tạo sự thuận tiện khi bảo hành theo hóa đơn.

**7. Validation Số Điện Thoại (Business Key):**
- **Quyết định:** Bắt buộc validate SĐT tạo mới/cập nhật bằng Regex chuẩn có sẵn ở Backend: `(\+84|0)[\s.-]?(3[2-9]|5[5689]|7[06-9]|8[1-9]|9[0-9])([\s.-]?\d){7}`.
- **Lý do:** Chặn rác dữ liệu ngay từ đầu vào, tránh làm hỏng định danh khách hàng.
