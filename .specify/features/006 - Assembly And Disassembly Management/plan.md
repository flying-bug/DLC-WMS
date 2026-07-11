# Implementation Plan: Assembly and Disassembly Management

**Branch**: `[006-assembly-and-disassembly-management]` | **Date**: 2026-07-08 | **Spec**: [specs/006 - Assembly And Disassembly Management/spec.md]

**Input**: Feature specification from `.specify/features/006 - Assembly And Disassembly Management/spec.md`

## Summary

Triển khai tính năng Quản lý Lắp ráp và Tháo dỡ (Assembly and Disassembly Management) cho hệ thống WMS. Cho phép người dùng tạo định mức lắp ráp (BOM) có tỷ lệ phân bổ giá vốn, tạo Lệnh lắp ráp/tháo dỡ, và sinh Phiếu nhập/xuất kho từ Lệnh. Hệ thống áp dụng cơ chế khóa BOM (Version Integrity), thực thi từng phần (Partial Fulfillment), truy vết phả hệ Serial (Genealogy Tracking), và chặn Hủy Lệnh khi đã lỡ xuất/nhập kho (Hard Block).

## Technical Context

**Language/Version**: Java 17, Spring Boot 3 / React (Vite)

**Primary Dependencies**: Spring Data JPA, Hibernate, MySQL 8, Flyway / React Router, Axios, TailwindCSS

**Storage**: MySQL 8 (Bảng `ASSEMBLY_BOMS`, `ASSEMBLY_BOM_LINES`, `ASSEMBLY_ORDERS`, `ASSEMBLY_ORDER_LINES`, `INVENTORY_DOCUMENTS`, `AUDIT_LOGS`)

**Testing**: JUnit 5, Mockito / Jest, React Testing Library

**Target Platform**: Web application (Frontend + Backend)

## Project Structure

### Documentation (this feature)

```text
.specify/features/006 - Assembly And Disassembly Management/
├── plan.md              
├── spec.md          
├── clarify.md        
├── data-model.md        
├── contracts.md
├── research.md
├── implement.md
├── tasks.md
└── quickstart.md         
```

### Source Code

```text
# Web application (backend + frontend)
backend/
├── src/main/resources/db/migration/ (V2__add_assembly_fields.sql)
├── src/main/java/com/duylongtech/backend/
│   ├── constant/ (SystemMessage) -> Thêm mã lỗi: ASM_INVALID_COST_PCT, vv.
│   ├── entity/ (AssemblyBomLine, AssemblyOrder, InventoryDocument)
│   ├── dto/ (AssemblyBomLineRequest, AssemblyOrderResponse, GenerateInventoryDocumentRequest - @Valid)
│   ├── repository/ (AssemblyOrderRepository, InventoryDocumentRepository)
│   ├── service/ (AssemblyOrderService, AuditLogService)
│   └── controller/ (AssemblyOrderController)
└── tests/

frontend/
├── src/
│   ├── components/AssemblyOrder/
│   ├── pages/AssemblyOrder/
│   └── services/assemblyOrderApi.js
└── tests/
```

**Structure Decision**: Tính năng này sẽ cập nhật các Entity/Service/Controller hiện tại của module Assembly trong Backend. Đặc biệt, theo đúng Constitution, mọi Request DTO phải dùng `@Valid`, các Exception sẽ ném ra mã lỗi từ `SystemMessage.java`, và mọi thao tác CUD Lệnh/BOM phải gọi `AuditLogService`. Database sẽ được bổ sung cột `cost_allocation_pct` và `quantity_produced` qua script Flyway `V2__add_assembly_fields.sql`.
