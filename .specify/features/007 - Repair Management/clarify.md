# Đánh giá & Clarification: Repair Management (007)

**Reviewer:** Business Analyst (10 năm kinh nghiệm - Warehouse & Hardware Warranty)
**Reference Framework:** Odoo 17 Repair Management
**Date:** 2026-07-19

---

## 1. Đánh giá tổng quan (General Assessment)

Dựa trên tiêu chuẩn của **Odoo 17**, bản Spec đã nắm bắt được các core entities cơ bản của một quy trình sửa chữa (Repair Orders, Repair Lines, Phí dịch vụ, Warranty, Scrap). Tuy nhiên, đối với quy trình quản lý kho và bảo hành linh kiện điện tử máy tính thực tế, bản spec hiện tại đang thiếu một số luồng cực kỳ quan trọng về **Invoicing (Lên hóa đơn)**, **Reservation (Giữ trước tồn kho)** và **Customer Approval (Khách hàng phê duyệt)**.

---

## 2. Các điểm cần Clarify & Đặt câu hỏi (Questions)

> [!WARNING]
> **Q1: Quy trình Invoicing (Lên Hóa Đơn) đang ở đâu?**
> Trong spec có đề cập đến `unit_price` và `fee_amount` nhưng chưa nói rõ khi nào sẽ thu tiền khách.
> *Odoo 17 cho phép 3 tùy chọn:*
> - *Invoice before repair (Thu tiền trước)*
> - *Invoice after repair (Thu tiền sau)*
> - *No invoice (Bảo hành 100% không thu tiền)*
> -> **Hỏi:** Chúng ta sẽ sinh hóa đơn ở trạng thái nào? Tự động sinh `INVOICE` khi chuyển sang `DONE` hay có bước tạo hóa đơn riêng?

> [!IMPORTANT]
> **Q2: Thời điểm trừ kho và Giữ chỗ linh kiện (Inventory Reservation)?**
> Spec viết: *"Khi status = DONE, tự động tạo INVENTORY_DOCUMENT... để trừ kho"*.
> -> **Hỏi:** Nếu chỉ trừ kho khi `DONE`, trong lúc đang `UNDER_REPAIR` (có thể mất vài ngày), linh kiện đó có thể bị một lệnh xuất kho khác (như Bán hàng) lấy mất. Odoo xử lý việc này bằng cách "Reserve" (giữ chỗ) linh kiện ngay từ lúc lệnh chuyển sang `CONFIRMED`. Chúng ta có nên đổi logic thành: `CONFIRMED` -> Giữ tồn kho, `DONE` -> Xuất/Trừ tồn kho thực tế?

> [!NOTE]
> **Q3: Workflow báo giá và Khách hàng phê duyệt (Quotation & Customer Approval)**
> Spec ghi "Manager duyệt lệnh".
> -> **Hỏi:** Trong sửa chữa phần cứng, thường phải "Khám máy -> Báo giá linh kiện -> Khách hàng đồng ý -> Mới bắt đầu sửa (`UNDER_REPAIR`)". Chúng ta có cần thêm trạng thái `WAITING_FOR_CUSTOMER` (Chờ khách đồng ý) không?

> [!WARNING]
> **Q4: Xử lý Edge Case: Hết tồn kho**
> Spec viết: *"Không cho phép xác nhận lệnh (Confirm) nếu không đủ tồn kho."*
> -> **Hỏi:** Trong thực tế, kỹ thuật viên vẫn phải lên danh sách linh kiện cần thay, sau đó hệ thống sẽ gợi ý Mua Hàng (Purchase Order) hoặc chờ nhập kho. Nếu chặn ngay lúc Confirm, quy trình sẽ bị tắc nghẽn. Có nên cho phép Confirm nhưng chuyển sang trạng thái `WAITING_PARTS` (Chờ linh kiện) như Odoo?

> [!TIP]
> **Q5: Sản phẩm không có Serial/Sản phẩm ngoài hệ thống**
> Spec viết: *"Sản phẩm cần sửa không thuộc hệ thống (không có Serial): Hệ thống vẫn cho phép tạo lệnh dựa trên thông tin nhập tay."*
> -> **Hỏi:** Việc nhập tay free-text sẽ gây rác dữ liệu khó thống kê. Odoo thường yêu cầu gán vào một "Product" dịch vụ chung (ví dụ: `[DichVu] Sửa chữa thiết bị ngoài`) và lưu thông tin khách hàng (Partner) cẩn thận. Chúng ta sẽ xử lý mapping dữ liệu này ra sao?

---

## 3. Giải pháp đề xuất sửa đổi Spec (Proposed Solutions)

Dưới góc nhìn BA chuyên triển khai Odoo, tôi đề xuất sửa `spec.md` với các nội dung sau:

### 3.1. Cập nhật Vòng đời trạng thái (State Machine)
- Bổ sung các trạng thái thực tế hơn cho `FR-001`:
  - `DRAFT`: Khởi tạo lệnh, ghi nhận lỗi từ khách hàng.
  - `QUOTATION` (Mới): Lên báo giá linh kiện & phí (nếu ngoài bảo hành) -> Chuyển khách duyệt.
  - `CONFIRMED`: Khách đã duyệt hoặc Quản lý đã duyệt. Hệ thống **Reserve (Giữ chỗ)** linh kiện trong kho. (Nếu thiếu linh kiện -> `WAITING_PARTS`).
  - `UNDER_REPAIR`: Đang tiến hành sửa.
  - `DONE`: Hoàn tất, **Thực thi trừ kho thực tế** & sẵn sàng sinh hóa đơn.
  - `CANCELLED`: Hủy.

### 3.2. Cập nhật Logic Quản lý linh kiện (Inventory Logic)
- Thay đổi **FR-003**:
  - Khi lệnh ở trạng thái `CONFIRMED`: Sinh phiếu kho (Inventory Document) dạng "Draft" hoặc "Waiting" để giữ (Reserve) số lượng linh kiện.
  - Khi lệnh ở trạng thái `DONE`: Chuyển trạng thái phiếu xuất kho sang "Done" để chính thức trừ tồn.
  - Bổ sung logic: Nếu linh kiện tháo ra (`action_type = REMOVE`), khi `DONE` sinh phiếu nhập kho vào một Location đặc thù là "Kho Phế Liệu" (Scrap Location).

### 3.3. Tích hợp thanh toán (Invoicing)
- Thêm **FR-005**: Tích hợp module Hóa đơn (Billing/Invoicing). Tự động sinh `INVOICE` dựa trên tổng tiền của `REPAIR_LINES` (không bảo hành) + `REPAIR_FEES` khi lệnh chuyển sang trạng thái `DONE`. Bổ sung trường `invoice_method` (`none`, `b4repair`, `after_repair`) như Odoo.

### 3.4. Cấu trúc lại Entities
- `REPAIR_LINES`: Cần phân định rõ 2 loại Action:
  - `ADD`: Lấy từ kho linh kiện (Stock Location) -> Thay vào thiết bị sửa (Production Location).
  - `REMOVE`: Lấy từ thiết bị sửa -> Đưa vào kho phế liệu (Scrap Location).
- `REPAIRS`: Cần bổ sung trường `partner_id` (ID khách hàng) bắt buộc để liên kết với công nợ và xuất hóa đơn. Tránh việc để trống thông tin người sở hữu thiết bị.
