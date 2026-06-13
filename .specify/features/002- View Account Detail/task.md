# Tasks: View Account Detail

**Input**: Design documents from `.specify/features/002- View Account Detail/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story and technical phases to enable independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Backend)

**Purpose**: Core infrastructure and data structure changes required for the feature.

- [x] T001 [US1] Thực thi script DDL bổ sung column (`user_code`, `avatar_url`, `address`) vào bảng `USERS`
  > **File cần tạo:** `backend/src/main/resources/db/migration/Vxxx__add_profile_columns_to_users.sql`
- [x] T002 [P] [US1] Cập nhật Entity `User` để map với các column mới
  > **File cần sửa:** `backend/src/main/java/com/duylongtech/backend/entity/User.java`
- [x] T003 [P] [US1] Tạo DTO `UserProfileResponse` (che giấu `password_hash`, chuyển đổi `status` sang `isActive`)
  > **File cần tạo:** `backend/src/main/java/com/duylongtech/backend/dto/response/UserProfileResponse.java`
- [x] T004 [US1] Cập nhật `UserRepository` để JOIN bảng `USER_ROLES` và `ROLES` lấy danh sách quyền hạn
  > **File cần sửa:** `backend/src/main/java/com/duylongtech/backend/repository/UserRepository.java`

**Checkpoint**: Database and Data Models ready

---

## Phase 2: Core API (Backend)

**Purpose**: Business logic and API endpoint exposing the data.

- [x] T005 [US1] Viết hàm `getCurrentUserProfile()` trong `UserService` để lấy dữ liệu và map ra DTO
  > **File cần sửa:** `backend/src/main/java/com/duylongtech/backend/service/UserService.java` (và `UserServiceImpl.java`)
- [x] T006 [US1] Cài đặt API Endpoint `GET /api/v1/users/me` yêu cầu xác thực Bearer Token
  > **File cần sửa:** `backend/src/main/java/com/duylongtech/backend/controller/UserController.java`

**Checkpoint**: Backend API ready for integration

---

## Phase 3: Integration (Frontend)

**Purpose**: Frontend data fetching and type definitions.

- [ ] T007 [P] [US1] Định nghĩa Interface/Type cho DTO trả về (`UserProfile`)
  > **File cần tạo/sửa:** `frontend/src/types/user.types.ts`
- [ ] T008 [US1] Cấu hình hàm gọi API `GET /api/v1/users/me` bằng Axios/Fetch
  > **File cần tạo/sửa:** `frontend/src/services/api/user.api.ts`

**Checkpoint**: Frontend integration layer ready

---

## Phase 4: UI Implementation (Frontend) 🎯 MVP

**Purpose**: Visual components and routing for the View Account Detail feature.

- [ ] T009 [P] [US1] Viết logic/Component hiển thị Avatar xử lý Cloudinary Transformation và Fallback (avatar trống/chữ cái đầu)
  > **File cần tạo/sửa:** `frontend/src/components/common/Avatar/Avatar.tsx`
- [ ] T010 [US1] Tạo Component màn hình View Account Detail (hiển thị Mã NV, Tên, Chức vụ, Email, SĐT, Địa chỉ)
  > **File cần tạo:** `frontend/src/pages/Account/AccountDetail.tsx`
- [ ] T011 [US1] Tích hợp màn hình vào Router và UI Layout chung
  > **File cần sửa:** `frontend/src/routes/AppRoutes.tsx` hoặc `frontend/src/components/Layout/MainLayout.tsx`

**Checkpoint**: Feature complete and ready for manual verification
