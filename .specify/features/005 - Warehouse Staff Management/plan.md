# Implementation Plan: Warehouse Staff Management

**Branch**: `[001-warehouse-staff-management]` | **Date**: 2026-06-30 | **Spec**: [specs/005 - Warehouse Staff Management/spec.md]

**Input**: Feature specification from `.specify/features/005 - Warehouse Staff Management/spec.md`

## Summary

Triển khai tính năng Quản lý Nhân sự Kho (Contextual RBAC) cho WMS. Cho phép Warehouse Manager xem danh sách nhân viên, gán kiêm nhiệm nhiều vai trò (Multi-role), và thu hồi quyền (Soft Delete) một cách an toàn thông qua cơ chế Hard Block (chặn nếu còn chứng từ dở dang). Hệ thống áp dụng Role Filtering để ngăn ngừa lạm quyền.

## Technical Context

**Language/Version**: Java 17, Spring Boot 3 / React (Vite)

**Primary Dependencies**: Spring Data JPA, Spring Security, Hibernate, MySQL 8 / React Router, Axios, TailwindCSS

**Storage**: MySQL 8 (Bảng `USER_WAREHOUSE_ROLES`, `AUDIT_LOGS`, `USERS`, `ROLES`)

**Testing**: JUnit 5, Mockito / Jest, React Testing Library

**Target Platform**: Web application (Frontend + Backend)

## Project Structure

### Documentation (this feature)

```text
.specify/features/005 - Warehouse Staff Management/
├── plan.md              
├── spec.md          
├── clarify.md        
├── data-model.md        
└── contracts.md         
```

### Source Code

```text
# Web application (backend + frontend)
backend/
├── src/main/java/com/dlcwms/
│   ├── models/ (UserWarehouseRole, AuditLog)
│   ├── repositories/ (UserWarehouseRoleRepository, DocumentRepositories for hard block check)
│   ├── services/ (WarehouseStaffService)
│   └── controllers/ (WarehouseStaffController)
└── tests/

frontend/
├── src/
│   ├── components/WarehouseStaff/
│   ├── pages/WarehouseStaff/
│   └── services/warehouseStaffApi.js
└── tests/
```

**Structure Decision**: Tính năng này sẽ thêm các service/controller mới vào Backend để quản lý `USER_WAREHOUSE_ROLES` theo `warehouseId`, và Frontend sẽ phát triển giao diện list/assign/revoke cho Warehouse Manager.
