# Implementation Plan: [004 - Profile Management]

**Branch**: `feature/004-profile-management` | **Date**: 2026-06-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/features/004 - Profile Management/spec.md`

**Note**: This template is filled in by the `__SPECKIT_COMMAND_PLAN__` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deploy the Profile Management feature allowing employees to view profile details (including identity info and warehouse/role permission lists as tags), update contact information (phone, email, dob, gender), and upload an avatar via Cloudinary.
The system must handle flexible Unique validation at the Application layer to be compatible with the Soft Delete mechanism. All update operations must write a detailed log (with IP) to `AUDIT_LOGS` and send a Notification. Additionally, integrate the Optimistic Locking mechanism to prevent concurrent data overwriting.

## Technical Context

**Language/Version**: Java 17, Spring Boot 4.0.6 / React 19.x, Vite 8.x

**Primary Dependencies**: Spring Web, Spring Data JPA, MySQL, jjwt, Axios, React Router, Bootstrap 5, Cloudinary SDK

**Storage**: MySQL 8.0 (Tables: USERS, USER_ROLES, USER_WAREHOUSE_ROLES, AUDIT_LOGS)

**Testing**: JUnit 5, Mockito / Vitest, React Testing Library

**Target Platform**: Web Browser

**Project Type**: Web Application

**Performance Goals**: <1.2s response time for displaying the profile page (with image CDN integration). <500ms to save the Audit Log after a successful update (SC-002, SC-003).

**Constraints**: Strictly block updates to Read-only fields (username, id_card...). Use Cloudinary Transformation Hooks (`c_thumb,g_face...`) to compress images before returning them to the Frontend. Delete old images on Cloudinary before saving the new URL. Do not use UNIQUE DB constraints for `phone`, `email`, `id_card` columns.

**Scale/Scope**: Manage thousands of user profiles. Update frequency is not too high but requires absolute data accuracy (especially Audit log and permissions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Layered Architecture: Use Controller, Service, Repository, DTO.
- [x] SOLID Principles: Separate the User update Service and Cloudinary call Service.
- [x] Test-First 80% Coverage: JUnit/Vitest integrated for update and validate logic.
- [x] Security-First: Hard-lock read-only, block HTTP 403 on sensitive fields, log access IPs, Invalidate Session if warehouse permissions change.
- [x] Data Integrity & Audit Trail: Save detailed Audit Logs in JSON format, along with Optimistic Locking (version).
- [x] RESTful API Standards: Standard URL `/api/v1/profile`.
- [x] Component-Based UI: Separate Profile Header, Contact Form, Avatar Upload.
- [x] Simplicity & YAGNI: Do not over-engineer, only save Cloudinary URL, validate Unique using application code.

## Project Structure

### Documentation (this feature)

```text
.specify/features/004 - Profile Management/
├── plan.md              # This file (__SPECKIT_COMMAND_PLAN__ command output)
├── research.md          # Phase 0 output (__SPECKIT_COMMAND_PLAN__ command)
├── data-model.md        # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
├── quickstart.md        # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
├── contracts.md         # Phase 1 output (__SPECKIT_COMMAND_PLAN__ command)
└── clarify.md           # Clarification Notes
```

### Source Code (repository root)

```text
backend/
├── src/main/java/com/duylongtech/backend/
│   ├── dto/request/ProfileUpdateRequest.java
│   ├── dto/response/ProfileResponse.java
│   ├── dto/response/AvatarUploadResponse.java
│   ├── entity/User.java
│   ├── entity/AuditLog.java
│   ├── repository/UserRepository.java
│   ├── repository/UserRoleRepository.java
│   ├── repository/UserWarehouseRoleRepository.java
│   ├── repository/AuditLogRepository.java
│   ├── service/ProfileService.java
│   ├── service/CloudinaryService.java
│   ├── service/NotificationService.java
│   └── controller/ProfileController.java
└── src/test/java/com/duylongtech/backend/service/ProfileServiceTest.java

frontend/
├── src/
│   ├── api/profileApi.js
│   ├── components/profile/AvatarUploader.jsx
│   ├── components/profile/ContactInfoForm.jsx
│   ├── components/profile/WarehouseTags.jsx
│   └── pages/profile/
│       └── MyProfile.jsx
└── tests/components/profile/ContactInfoForm.test.jsx
```

**Structure Decision**: Option 2 (Web application) was selected because the system consists of a Spring Boot backend and a React frontend.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

(No violations)
