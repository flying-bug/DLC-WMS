# Implementation Plan: 001- Import Inventory Management

**Branch**: `001-import-inventory-management` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `spec.md`

## Summary

Hệ thống quản lý kho và bảo hành linh kiện máy tính, hỗ trợ kiểm soát vị trí và trạng thái vật lý của từng linh kiện thông qua Serial Number (S/N). Chức năng chính bao gồm: Nhập/Xuất kho qua máy quét mã vạch hoặc Import Excel, đảm bảo tốc độ tra cứu tồn kho, tích hợp lịch sử bảo hành, tự động hóa luồng chuyển kho, và tuân thủ các quy tắc dữ liệu toàn vẹn (không xóa cứng chứng từ đã POST, tồn kho không được âm).

## Technical Context

**Language/Version**: Java (Spring Boot) cho Backend, JavaScript (React) cho Frontend.

**Primary Dependencies**: Spring Boot, Spring Data JPA, React, Axios, Apache POI / xlsx (để xử lý Import Excel).

**Storage**: MySQL / MariaDB (Sử dụng InnoDB, bắt buộc hỗ trợ Transaction và Row-level lock).

**Testing**: JUnit, Mockito (Backend) / Jest, React Testing Library (Frontend).

**Target Platform**: Web application (Tối ưu hóa hiển thị trên nền tảng Desktop 1920x1080 và máy tính bảng Tablet cho nhân viên kho).

**Project Type**: Web Application (Client-Server architecture).

**Performance Goals**: 
- SC-001: Tốc độ load báo cáo Tồn kho tổng hợp đạt < 1 giây trên quy mô 1.000.000 S/N.
- SC-004: Độ trễ từ lúc súng quét nhả Enter đến khi focus lại vào ô nhập liệu < 0.1 giây.
- SC-003: Giảm 80% thời gian nhập liệu qua file Excel so với gõ tay.

**Constraints**: 
- **Partial import**: Hỗ trợ import dòng đúng, báo lỗi đỏ tại dòng sai trên UI để sửa tay, không bắt up lại toàn bộ file.
- **Concurrency**: Áp dụng Row-level lock (Database Lock) trên bảng `SERIAL_NUMBERS` khi hạch toán (POST) để tránh double-entry.
- **Security / Sanitize**: RBAC cho các tính năng DRAFT/POST. Mọi input (S/N, Barcode) phải được trim khoảng trắng và Uppercase tự động.
- **Immutability**: Không xóa cứng chứng từ đã POST (dùng chứng từ đảo nếu muốn sửa).

**Scale/Scope**: Tối đa 5000 dòng / lần upload file Excel (dung lượng file max 5MB).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Đảm bảo thiết kế schema Database theo đúng `database-schema.md` (đặc biệt các bảng `INVENTORY_BALANCES`, `SERIAL_NUMBERS`, `INVENTORY_DOCUMENTS`).
- API Design phải tuân thủ xử lý lỗi trả về cụ thể chi tiết từng dòng để Frontend thực hiện Partial Import.
- Đảm bảo trải nghiệm UX với Scanner Feedback: Viền xanh + Bíp ngắn (Thành công), Viền đỏ + 3 Bíp dài + Toast message (Thất bại/Lỗi).

## Project Structure

### Documentation (this feature)

```text
.specify/features/001- Import Inventory Management/
├── plan.md              # This file
├── database-schema.md   # Schema definition 
├── spec.md              # Feature specification
└── ux-design.md         # UI/UX guidelines
```

### Source Code (repository root)

```text
backend/
├── src/main/java/com/dlc/wms/
│   ├── models/            # Entity classes (InventoryBalances, SerialNumbers, etc.)
│   ├── repositories/      # JPA Repositories
│   ├── services/          # Business logic, Excel parsing, Transaction & Lock handling
│   └── controllers/       # REST APIs cho Import, Quét mã
└── src/test/

frontend/
├── src/
│   ├── api/               # Axios client & API calls (bao gồm axiosClient.js)
│   ├── components/        # BarcodeScannerInput, ExcelUploader, StatusToast
│   ├── pages/             # ImportInventoryPage, StockReportPage
│   └── utils/             # SoundPlayer (Scanner Feedback), TextFormatter (Trim/Uppercase)
└── tests/
```

**Structure Decision**: Ứng dụng Web với cấu trúc Backend và Frontend tách biệt rõ ràng. Backend chịu trách nhiệm xử lý nghiệp vụ, lock cơ sở dữ liệu và xác thực phân quyền. Frontend đảm nhiệm luồng thao tác UX cực nhanh (nhận diện luồng Barcode scanner input, highlight trạng thái, xử lý lưới dữ liệu Excel).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Thiết kế luồng Partial Import thay vì All-or-Nothing | Trải nghiệm người dùng: không bắt nhân viên kho sửa lỗi và up lại toàn bộ file nếu có dòng sai nhỏ. | Việc Reject cả file (All-or-Nothing transaction) cho 5000 dòng quá phiền toái và tốn thời gian. |
| Row-level lock trên bảng `SERIAL_NUMBERS` | Ngăn chặn race condition (Double-entry) khi nhiều nhân viên kho cùng thao tác trên 1 mã S/N tại cùng 1 thời điểm. | Optimistic Lock có thể làm rớt thao tác hạch toán thường xuyên trong điều kiện nhiều người cùng nhập/xuất. |
