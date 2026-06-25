# Implementation Plan: [004 - Account Management]

**Branch**: `feature/004-account-management` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/features/004 - Account Management/spec.md`

**Note**: This template is filled in by the `__SPECKIT_COMMAND_PLAN__` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Triển khai module Quản lý Khách hàng (Customer Management) với chức năng cốt lõi: tạo mới (kèm validation chặt SĐT), tìm kiếm nhanh (Autocomplete SĐT), xem hồ sơ chi tiết 3 Tab (Lịch sử mua hàng, bảo hành, thu chi) có phân trang. 
Bao gồm cả các quy tắc chặn xóa cứng, xử lý Khách vãng lai, và ghi log khi thay đổi Số điện thoại (Business Key).

## Technical Context

**Language/Version**: Java 17, Spring Boot 4.0.6 / React 19.x, Vite 8.x

**Primary Dependencies**: Spring Web, Spring Data JPA, MySQL, jjwt, Axios, React Router, Bootstrap 5

**Storage**: MySQL 8.0 (Các bảng liên quan: `PARTNERS`, `SALES_ORDERS`, `SALES_ORDER_LINES`, `SERIAL_NUMBERS`, `WARRANTIES`, `REPAIRS`, `PAYMENT_RECEIPTS`, `AUDIT_LOGS`)

**Testing**: JUnit 5, Mockito / Vitest, React Testing Library

**Target Platform**: Web Browser

## Constitution Check

- [x] **Layered Architecture**: Sử dụng DTO riêng biệt `CustomerRequest`, `CustomerResponse` (Điều I).
- [x] **Centralized System Messages**: Bổ sung mã lỗi chặn vô hiệu hóa, lỗi SĐT vào `SystemMessage` (Điều IV).
- [x] **Security-First**: Endpoint yêu cầu Token. Log mọi thay đổi SĐT vào `AUDIT_LOGS` (Điều V/VI).
- [x] **Data Integrity**: Chặn xóa cứng (Hard Delete), chỉ update `status = INACTIVE` (Điều VI).
- [x] **Component-Based UI**: Sử dụng Drawer/Modal cho Quick Create. Viết Pagination Component chuẩn cho 3 Tab chi tiết (Điều IX).
- [x] **Simplicity & YAGNI**: Chỉ dùng text cho địa chỉ, không tách bảng Tỉnh/Huyện/Xã lúc này để tối ưu luồng tạo nhanh (Điều X).
