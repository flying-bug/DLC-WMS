# Implementation Plan

Tính năng này đã được triển khai hoàn tất theo lộ trình dưới đây:

## Giai đoạn 1: Foundation (Entities & DB)
- [x] Định nghĩa `SalesOrder`, `SalesOrderLine` Entities.
- [x] Xây dựng script DB Migration (tạo bảng).
- [x] Tạo Repositories.

## Giai đoạn 2: Core Services (CRUD & Logic)
- [x] Tính năng Create/Update/Delete DRAFT.
- [x] Viết logic Approve (Check hàng khả dụng & sinh Stock Reservation).
- [x] Logic Cancel (Xóa Reservation).
- [x] Quản lý thanh toán (Payment flow).

## Giai đoạn 3: Integration (Kho & Báo Giá)
- [x] Nút tạo `ExportSlip` tự động từ SO.
- [x] Chuyển đổi mã bảo mật sang `UUID (public_token)` thông qua Flyway V25 Migration.
- [x] Expose `PublicSalesOrderController` bypassing JWT.

## Giai đoạn 4: UI / Frontend
- [x] Danh sách Đơn hàng (`SalesOrderListPage`).
- [x] Form tạo/sửa tích hợp `react-datepicker` chuẩn ngày tháng (`CreateSalesOrderPage`).
- [x] Màn hình chi tiết Đơn hàng & theo dõi kho (`SalesOrderDetailPage`).
- [x] Template Báo giá Public chuyên nghiệp (`PublicQuotePage` / `QuotationTemplate`).
- [x] Tối ưu hóa UI/UX: Copy Link to Clipboard.

## Giai đoạn 5: Testing & QA
- [x] Test biên (nhập quá số lượng tồn kho).
- [x] Test thanh toán (PARTIAL vs PAID).
- [x] Test bảo mật Public Quote.
- [x] Xử lý lỗi Date Picker (ngăn chọn ngày quá khứ cho Payment).
