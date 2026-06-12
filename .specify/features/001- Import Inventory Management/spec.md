# Feature Specification: Quản lý Kho, Định danh Serial và Bảo hành Linh kiện Máy tính (Phase 1)

## Overview
Hệ thống quản lý kho và bảo hành dành riêng cho doanh nghiệp phân phối/bán lẻ linh kiện điện tử máy tính. Vấn đề cốt lõi là kiểm soát chính xác 100% vị trí, trạng thái của từng linh kiện vật lý thông qua Serial Number (S/N) và hỗ trợ truy xuất bảo hành nhanh chóng, trong khi vẫn duy trì tốc độ xử lý báo cáo tồn kho tổng hợp (Sổ cái).

**Đối tượng sử dụng:** Quản lý kho, Nhân viên kho, Nhân viên Kỹ thuật/Bảo hành có Phân quyền động.
**Giá trị kỳ vọng:** Chống thất thoát hàng hóa, tăng tốc độ nhập/xuất kho bằng máy quét Barcode (SKU & S/N), và tra cứu bảo hành chính xác theo từng linh kiện kể cả khi đã được lắp ráp thành bộ PC.

## User Scenarios

### Primary Scenario (Luồng nghiệp vụ chính)

1. **Nhập kho & Quét mã:** Quản lý kho tạo phiếu nhập. Dùng máy quét tít mã Barcode (chính là mã `product_code` nội bộ) để chọn mặt hàng, hoặc nhập tay, hoặc nhập qua file excel lên lưới. Đối với hàng có quản lý Serial, quản lý kho tít liên tục các S/N. Hệ thống tự động đếm số lượng và lưu chi tiết vào bảng Sổ chi tiết (`SERIAL_NUMBERS`), đồng thời cộng dồn số lượng tổng vào Sổ cái (`INVENTORY_BALANCES`).
2. **Chuyển kho nội bộ:** Khi điều chuyển hàng, thủ kho quét S/N. Hệ thống tự động cập nhật `warehouse_id` mới trực tiếp trên bảng `SERIAL_NUMBERS` và điều chỉnh tăng/giảm tồn kho tổng ở 2 kho tương ứng trong `INVENTORY_BALANCES`.
3. **Lắp ráp PC & Xuất bán:** Khách mua bộ PC. Kỹ thuật viên nhặt các linh kiện rời và quét S/N từng món để xuất kho. Bộ PC không sinh ra S/N Parent mới. Hệ thống ghi nhận các S/N linh kiện này đã được bán (Status: SOLD) và map với Đơn hàng (`sales_order_id`).
4. **Bảo hành linh kiện trong PC:** Khách mang PC đến bảo hành. Kỹ thuật viên mở máy, quét mã S/N trên thanh RAM bị hỏng. Hệ thống tra cứu ngay lập tức thanh RAM này thuộc Đơn hàng nào, khách hàng nào, và còn hạn bảo hành hay không.

### Edge Cases

- **Trùng Serial Number:** Khi nhập kho, nếu S/N đã tồn tại và đang ở trạng thái In Stock, hệ thống chặn lại và cảnh báo tiếng Bíp.
- **Lệch số lượng và S/N:** Hệ thống không cho phép Ghi sổ (POST) nếu số lượng tổng trên dòng hàng không khớp với số lượng S/N đã quét.

## Business Rules (Quy tắc nghiệp vụ)

- **Quy tắc Import Excel:** Hệ thống áp dụng cơ chế Partial Import (Import một phần). Nếu file có dòng lỗi (trùng S/N, sai product_code), hệ thống vẫn import các dòng đúng, đồng thời bôi đỏ/cảnh báo các dòng sai trên lưới nhập liệu để người dùng sửa tay trực tiếp mà không bắt upload lại từ đầu.
- **Quy tắc kích hoạt Bảo hành:** Thời hạn bảo hành của linh kiện tính từ thời điểm phiếu xuất bán (Sales Order) được chuyển sang trạng thái POSTED. Ngày kết thúc = Ngày xuất bán + Số tháng bảo hành (được cấu hình trong bảng `PRODUCTS`).

## UI/UX & System Feedback (Trải nghiệm người dùng)

- **Cơ chế phản hồi âm thanh/thị giác (Scanner Feedback):**
  - Quét thành công: Ô nhập liệu nháy viền xanh, hệ thống phát 1 tiếng "Bíp" ngắn.
  - Quét lỗi (Trùng/Sai): Ô nhập liệu nháy viền đỏ, phát 3 tiếng "Bíp" dài, hiển thị Toast message báo lỗi ở góc màn hình.
- **Tự động Focus (Auto-focus):** Sau khi máy quét tít xong 1 mã (máy quét tự nhả lệnh Enter), con trỏ chuột (cursor) phải tự động focus lại vào đúng ô Textbox nhập S/N trong vòng < 0.1 giây để sẵn sàng cho lần quét tiếp theo mà không cần nhân viên chạm vào chuột.

## Import Excel Template Definition

File template Excel chuẩn để nhập kho hàng loạt cần bao gồm các thông tin:
- **Cột `product_code`:** Bắt buộc, Text (Định danh linh kiện).
- **Cột `quantity`:** Bắt buộc, Number > 0.
- **Cột `serial_numbers`:** Bắt buộc đối với linh kiện có cấu hình `track_serial = TRUE`. Các số Serial trên cùng 1 dòng được ngăn cách nhau bởi dấu phẩy (`,`) hoặc dấu chấm phẩy (`;`).
- **Cột ' :**
- *Giới hạn:* Kích thước file tối đa 5MB, xử lý tối đa 5000 dòng/lần upload để đảm bảo hiệu năng và không gây timeout server.

## Requirements (mandatory)
Functional Requirements
FR-001: Hệ thống MUST phân biệt rõ Sổ cái (Tồn kho tổng) và Sổ chi tiết (Serial). Các báo cáo tồn kho tổng hợp chỉ được query trên bảng INVENTORY_BALANCES.

FR-002: Hệ thống MUST sử dụng mã product_code làm định danh mã vạch (Barcode) để quét và tìm kiếm sản phẩm.

FR-003: Hệ thống MUST hỗ trợ 3 phương thức nhập liệu trên phiếu nhập kho: Nhập tay, Quét Barcode/Scanner và Import Excel.

FR-004: Hệ thống MUST tự động focus lại con trỏ chuột vào ô nhập S/N trong < 0.1s sau khi nhận tín hiệu phím Enter từ súng quét.

FR-005: Hệ thống MUST cập nhật trực tiếp warehouse_id và status trong bảng SERIAL_NUMBERS khi có nghiệp vụ chuyển kho hoặc xuất bán.

FR-006: Hệ thống MUST có cơ chế Partial Import đối với file Excel (Cho phép import dòng đúng, giữ lại dòng sai trên lưới để sửa tay).

## Non-Functional & Security Requirements
SEC-001 (RBAC): Chỉ user có quyền (Permissions) tương ứng mới được phép Tạo nháp, Chỉnh sửa, và Ghi sổ (POST) phiếu nhập/xuất.

SEC-002 (Sanitization): Chuỗi S/N hoặc product_code nhập vào MUST được tự động trim khoảng trắng thừa ở hai đầu và chuyển thành Uppercase.

SEC-003 (Audit): Mọi thay đổi trạng thái chứng từ MUST được lưu vết (Người thực hiện, Thời gian, Hành động) vào bảng AUDIT_LOGS.

NFR-001 (Immutability): Phiếu kho sau khi POST KHÔNG ĐƯỢC phép xóa cứng. Phải sử dụng chứng từ đảo nếu muốn sửa sai.

NFR-002 (Integrity): Tồn kho tổng trong INVENTORY_BALANCES không bao giờ được phép < 0. Tổng đếm S/N ở trạng thái AVAILABLE tại Kho X MUST luôn bằng quantity_on_hand của Kho X.

## Functional Requirements

- The system SHALL phân biệt rõ Sổ cái (Tồn kho tổng) và Sổ chi tiết (Serial). Khi xem báo cáo tồn kho tổng, hệ thống chỉ query vào bảng `INVENTORY_BALANCES`.
- The system SHALL sử dụng mã `product_code` làm định danh mã vạch (Barcode) để quét và tìm kiếm sản phẩm.
- The system SHALL cập nhật trực tiếp `warehouse_id` và `status` trong bảng `SERIAL_NUMBERS` khi có biến động vị trí/trạng thái hàng hóa.
- The system SHALL ghi nhận quá trình xuất/nhập/chuyển kho bằng việc insert các dòng lịch sử vào `INVENTORY_LEDGER` (Thẻ kho).
- The system SHALL cho phép nhập liệu qua 3 phương thức: Quét máy Barcode, Nhập tay trên lưới, và Import từ file Excel.

## Non-Functional Requirements (Yêu cầu phi chức năng)

- **Concurrency (Xử lý đồng thời):** Hệ thống phải áp dụng cơ chế Database Lock (Row-level lock) đối với bảng `SERIAL_NUMBERS` trong quá trình hạch toán (POST) để ngăn chặn lỗi double-entry khi nhiều nhân viên cùng làm thao tác trên 1 mã Serial.
- **Responsive Design:** Giao diện nhập/xuất kho phải được tối ưu hóa hiển thị tốt nhất trên Desktop/Laptop (độ phân giải 1920x1080) và máy tính bảng (Tablet) cho nhân viên kho cầm đi lại kiểm hàng.

## Security and Compliance Requirements

- Authentication and RBAC requirements for all mutating actions: Chỉ user có quyền (Permissions) tương ứng mới được phép Tạo nháp, Chỉnh sửa, và Ghi sổ (POST) phiếu nhập/xuất (Phân quyền động theo mã Permission code).
- Input validation and sanitization requirements: Chuỗi S/N hoặc `product_code` quét vào phải được tự động trim khoảng trắng thừa ở hai đầu và chuyển thành in hoa (Uppercase).
- Audit log requirements for business-critical events: Mọi thay đổi trạng thái chứng từ (DRAFT -> POSTED -> CANCELLED) phải được ghi vào `AUDIT_LOGS`.
- Data retention and soft-delete expectations: Dữ liệu Serial và Lịch sử kho không được phép xóa cứng (Hard-delete), chỉ được dùng chứng từ đảo để điều chỉnh (Immutability).

## Data Integrity Requirements

- Inventory MUST NOT become negative: Tồn kho tổng trong `INVENTORY_BALANCES` không được nhỏ hơn 0.
- Serial lifecycle MUST remain traceable: Tổng số lượng S/N ở trạng thái AVAILABLE trong kho X phải luôn bằng `quantity_on_hand` của kho X trong bảng Balance.
- Finalized stock history MUST remain immutable: Các Phiếu nhập/xuất đã POST không được sửa xóa dòng hàng.
- Warranty eligibility MUST be verified where relevant: Chế độ bảo hành áp dụng trực tiếp lên S/N của linh kiện rời, không áp dụng cho cấu hình PC tổng.

## Success Criteria
- SC-001: Tốc độ load báo cáo Tồn kho tổng hợp đạt < 1 giây trên quy mô 1.000.000 S/N.
- SC-002: Tỉ lệ lệch tồn kho vật lý và phần mềm giảm xuống 0% (nhờ cơ chế bắt buộc quét đích danh).
- SC-003: Giảm 80% thời gian nhập liệu cho các lô hàng từ 50 S/N trở lên khi sử dụng tính năng Import Excel so với gõ tay.
- SC-004: Độ trễ từ lúc súng quét nhả Enter đến khi focus lại vào ô nhập liệu < 0.1 giây.

## Key Entities

- **INVENTORY_BALANCES**: Đóng vai trò là Sổ Cái. Chỉ lưu Tổng số lượng. (Trường `serial_number_id` được giữ lại ở cấu trúc bảng nhưng Application luôn truyền giá trị NULL khi thao tác).
- **SERIAL_NUMBERS**: Đóng vai trò Sổ Chi tiết. Lưu vết vị trí (kho nào) và trạng thái hiện tại của từng cá thể linh kiện.
- **PRODUCT_VARIANTS**: Bảng chứa mã `product_code` - đồng thời là mã Barcode dùng để quét bằng súng bắn mã vạch.

## Assumptions

- Mã `product_code` nội bộ của hệ thống luôn được in làm tem Barcode dán lên sản phẩm để quét.
- Không theo dõi cấn trừ công nợ chi tiết theo từng hóa đơn, chỉ quản lý tổng thu/chi/nợ theo Đối tác (Partner_id).
- Máy tính/Thiết bị cầm tay của thủ kho có kết nối mạng ổn định (Luồng offline chưa được hỗ trợ sâu).
- Người dùng sử dụng các thiết bị quét mã vạch tiêu chuẩn có khả năng tự động truyền ký tự Enter (Carriage Return) ở cuối chuỗi.

## Out of Scope (Ngoài phạm vi Phase 1)

- Luồng xử lý xuất trả hàng lỗi về cho Nhà cung cấp/Hãng (Vendor RMA).
- Theo dõi cấn trừ công nợ chi tiết theo từng hóa đơn trả góp của khách hàng.
- Tính năng thiết kế và in ấn tem nhãn Barcode trực tiếp từ hệ thống phần mềm (Cửa hàng sẽ sử dụng phần mềm in tem thứ 3 hoặc tem có sẵn từ nhà sản xuất).