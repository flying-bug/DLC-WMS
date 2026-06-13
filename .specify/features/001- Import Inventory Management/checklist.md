# Acceptance Checklist: 001- Import Inventory Management

**Purpose**: Kiểm tra, nghiệm thu các yêu cầu nghiệp vụ, kỹ thuật, bảo mật và trải nghiệm người dùng của tính năng Quản lý Kho & Định danh Serial (Phase 1).
**Created**: 2026-06-12
**Feature**: [spec.md](./spec.md)

## Functional Requirements (Nghiệp vụ cốt lõi)

- [ ] CHK001 Hỗ trợ nhập kho qua 3 phương thức: Nhập tay, Quét máy Barcode, Import Excel.
- [ ] CHK002 Hệ thống phân biệt rõ bảng Sổ cái (`INVENTORY_BALANCES`) và Sổ chi tiết (`SERIAL_NUMBERS`).
- [ ] CHK003 Import Excel hỗ trợ cơ chế Partial Import (Import dòng đúng, giữ lại và bôi đỏ dòng sai trên lưới để sửa tay).
- [ ] CHK004 Chức năng chuyển kho tự động cập nhật `warehouse_id` mới trong `SERIAL_NUMBERS` và điều chỉnh số lượng tồn tổng.
- [ ] CHK005 Xuất bán linh kiện chuyển trạng thái S/N sang `SOLD` và liên kết với Đơn hàng (`sales_order_line_id`).
- [ ] CHK006 Bảo hành cho phép tra cứu ngày xuất bán, khách hàng và hạn bảo hành khi quét một S/N hỏng của linh kiện.
- [ ] CHK007 Cập nhật Thẻ kho (`INVENTORY_LEDGER`) đầy đủ với mọi biến động Nhập/Xuất/Chuyển kho.

## Non-Functional & Performance (Hiệu năng)

- [ ] CHK008 Tự động focus: Con trỏ chuột trở lại ô nhập liệu < 0.1 giây sau khi súng quét nhả Enter.
- [ ] CHK009 Tốc độ query: Báo cáo tồn kho tổng hợp load < 1 giây trên quy mô 1.000.000 dòng S/N.
- [ ] CHK010 Cải thiện tốc độ: Giảm 80% thời gian nhập liệu qua Excel (với lô > 50 S/N) so với nhập tay.
- [ ] CHK011 Xử lý đồng thời (Concurrency): Row-level lock được áp dụng chính xác cho bảng `SERIAL_NUMBERS` khi hạch toán (POST) để tránh lỗi double-entry.

## Data Integrity & Security (Toàn vẹn dữ liệu & Bảo mật)

- [ ] CHK012 RBAC: Chỉ User có phân quyền (Permission Code) mới được Tạo nháp, Chỉnh sửa, và Ghi sổ (POST) phiếu kho.
- [ ] CHK013 Sanitization: Mọi S/N hoặc `product_code` nhập vào đều tự động Trim khoảng trắng và chuyển sang in hoa (Uppercase).
- [ ] CHK014 Audit Log: Mọi thay đổi trạng thái chứng từ (DRAFT -> POSTED -> CANCELLED) được lưu vết vào `AUDIT_LOGS`.
- [ ] CHK015 Immutability: Phiếu kho sau khi POST không được phép xóa cứng (Hard-delete), bắt buộc dùng chứng từ đảo để điều chỉnh.
- [ ] CHK016 Integrity: Tồn kho tổng trong `INVENTORY_BALANCES` không bao giờ được phép rơi xuống mức âm (< 0).
- [ ] CHK017 Integrity: Tổng số lượng S/N trạng thái `AVAILABLE` tại kho X luôn khớp với `quantity_on_hand` của kho X.
- [ ] CHK018 Edge Case: Cảnh báo "Trùng Serial Number" nếu quét/nhập S/N đã tồn tại và đang ở trạng thái In Stock.
- [ ] CHK019 Edge Case: Hệ thống chặn Ghi sổ (POST) nếu số lượng tổng trên dòng hàng không khớp với số S/N đã quét.

## UI/UX Requirements (Trải nghiệm người dùng)

- [ ] CHK020 Scanner Feedback (Thành công): Ô nhập liệu nháy viền XANH và phát 1 tiếng "Bíp" ngắn.
- [ ] CHK021 Scanner Feedback (Thất bại): Ô nhập liệu nháy viền ĐỎ, phát 3 tiếng "Bíp" dài, và hiển thị Toast báo lỗi chi tiết.
- [ ] CHK022 Responsive Design: Giao diện tối ưu hiển thị trên Desktop/Laptop (1920x1080) và máy tính bảng (Tablet).

## Notes

- Check items off as completed: `[x]`
- Add comments or findings inline
- Link to relevant resources or documentation
- Items are numbered sequentially for easy reference
