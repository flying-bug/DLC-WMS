# Implementation Plan: [003 - Warehouse Management]

**Branch**: `feature/003-warehouse-management` | **Date**: 2026-06-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/features/003 - Warehouse Management/spec.md`

**Note**: This template is filled in by the `__SPECKIT_COMMAND_PLAN__` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Triển khai tính năng Quản lý danh mục kho (Warehouse Master Data) bao gồm các chức năng tạo mới, xem danh sách, xem chi tiết (tích hợp thống kê số dư và thẻ audit log), chỉnh sửa (giới hạn các trường) và vô hiệu hóa (Soft Delete).
Chỉ Manager mới có quyền CRUD kho. Khi tạo kho sẽ tự động lưu thông tin Người tạo vào `USER_WAREHOUSE_ROLES`.

## Technical Context

**Language/Version**: Java 17, Spring Boot 4.0.6 / React 19.x, Vite 8.x

**Primary Dependencies**: Spring Web, Spring Data JPA, MySQL, jjwt, Axios, React Router, Bootstrap 5

**Storage**: MySQL 8.0 (Các bảng WAREHOUSES, USER_WAREHOUSE_ROLES, INVENTORY_BALANCES)

**Testing**: JUnit 5, Mockito / Vitest, React Testing Library

**Target Platform**: Web Browser

**Project Type**: Web Application

**Performance Goals**: <0.5s tạo kho, <1.5s p95 tính toán chỉ số kho cho 50k bản ghi (SC-001, SC-002)

**Constraints**: Mọi string lỗi/thông báo phải lấy từ `SystemMessage.java`. Không cho phép Hard Delete.

**Scale/Scope**: Tối đa hàng chục kho, nhưng `INVENTORY_BALANCES` có thể lên tới 50,000 bản ghi/kho.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Layered Architecture: Sử dụng Controller, Service, Repository, DTO.
- [x] SOLID Principles: Single Responsibility cho các thao tác kho.
- [x] Test-First 80% Coverage: JUnit/Vitest tích hợp.
- [x] Centralized System Messages: Chỉ dùng `SystemMessage.java`.
- [x] Security-First: Manager role validation (`@PreAuthorize`), chặn Soft Delete.
- [x] Data Integrity & Audit Trail: Lưu audit logs cho CRUD.
- [x] RESTful API Standards: URL chuẩn `/api/v1/warehouses`.
- [x] Component-Based UI: Tách Modals và Data Tables tái sử dụng.
- [x] Simplicity & YAGNI: Dùng SQL thuần cho thống kê, không caching phức tạp.

## Project Structure

### Documentation (this feature)

```text
.specify/features/003 - Warehouse Management/
├── plan.md              # This file (__SPECKIT_COMMAND_PLAN__ command output)
├── research.md          # Phase 0 output (__SPECKIT_COMMAND_PLAN__ command)
├── data-model.md        # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
├── quickstart.md        # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
├── contracts/           # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
└── tasks.md             # Phase 2 output (__SPECKIT_COMMAND_TASKS__ command)
```

### Source Code (repository root)

```text
backend/
├── src/main/java/com/duylongtech/backend/
│   ├── dto/request/WarehouseRequest.java
│   ├── dto/response/WarehouseResponse.java
│   ├── dto/response/WarehouseDetailResponse.java
│   ├── dto/response/AuditLogResponse.java
│   ├── entity/Warehouse.java
│   ├── entity/UserWarehouseRole.java
│   ├── entity/AuditLog.java
│   ├── repository/WarehouseRepository.java
│   ├── repository/UserWarehouseRoleRepository.java
│   ├── repository/AuditLogRepository.java
│   ├── service/WarehouseService.java
│   └── controller/WarehouseController.java
└── src/test/java/com/duylongtech/backend/service/WarehouseServiceTest.java

frontend/
├── src/
│   ├── api/warehouseApi.js
│   ├── components/warehouse/WarehouseFormModal.jsx
│   └── pages/warehouse/
│       ├── WarehouseList.jsx
│       └── WarehouseDetail.jsx
└── tests/components/warehouse/WarehouseFormModal.test.jsx
```

**Structure Decision**: Option 2 (Web application) was selected because the system consists of a Spring Boot backend and a React frontend.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(No violations)
