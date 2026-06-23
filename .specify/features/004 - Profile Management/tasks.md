# Tasks: Profile Management

**Input**: Design documents from `.specify/features/004 - Profile Management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts.md

**Organization**: Tasks are grouped by user story/feature phase to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/main/java/com/duylongtech/backend/`, `frontend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and DB Migration

- [ ] T001 Initialize new branch `feature/004-profile-management`
- [ ] T002 Fix Migration V6 error (Remove `UNIQUE` for `id_card`, change `AFTER address` to `AFTER phone`) at `backend/src/main/resources/db/migration/V6__...`
- [ ] T003 Add Migration V7 (Add `avatar_url`) at `backend/src/main/resources/db/migration/V7__...`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Add business error codes (Profile, Cloudinary, Optimistic Lock) to `SystemMessage.java`
- [ ] T005 [P] Update `User` entity (Add `@Version`, `avatar_url`, new fields) at `backend/src/main/java/com/duylongtech/backend/entity/User.java`
- [ ] T006 [P] Ensure entity/repository structure for `AuditLog`, `UserRole`, `UserWarehouseRole` is available.
- [ ] T007 Configure Cloudinary SDK at `backend/src/main/java/com/duylongtech/backend/config/CloudinaryConfig.java`
- [ ] T008 Create/Update required Repositories (`UserRepository`, `UserRoleRepository`, `UserWarehouseRoleRepository`, `AuditLogRepository`)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Profile Details (GET Profile)

**Goal**: Display logged-in user profile along with role/warehouse Tag list.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Create `ProfileResponse` DTO at `backend/src/main/java/com/duylongtech/backend/dto/response/ProfileResponse.java`
- [ ] T010 [US1] Implement `ProfileService.getMyProfile` (Handle merging `role_id` into the `roles` array of each warehouse) at `backend/src/main/java/com/duylongtech/backend/service/ProfileService.java`
- [ ] T011 [US1] Create GET endpoint `/api/v1/profile` in `ProfileController.java`
- [ ] T012 [P] [US1] Implement `profileApi.getProfile` at `frontend/src/api/profileApi.js`
- [ ] T013 [US1] Build Component `WarehouseTags.jsx` (Render merged tag array) at `frontend/src/components/profile/WarehouseTags.jsx`
- [ ] T014 [US1] Build page `MyProfile.jsx` displaying User info (with original ID Card).

---

## Phase 4: User Story 2 - Update Information (PUT Profile)

**Goal**: Allow editing Phone, Email, DOB, Gender with Soft-delete Unique check and Optimistic Locking.

### Implementation for User Story 2

- [ ] T015 [P] [US2] Create `ProfileUpdateRequest` DTO at `backend/src/main/java/com/duylongtech/backend/dto/request/ProfileUpdateRequest.java`
- [ ] T016 [US2] Implement `updateContactInfo` method in `ProfileService` (Use Application-level Validation to check Unique Phone/Email with status != INACTIVE).
- [ ] T017 [US2] Catch `ObjectOptimisticLockingFailureException` in Global Exception Handler and convert to HTTP 409 Conflict.
- [ ] T018 [US2] Integrate logging logic into `AuditLogRepository` (Action `UPDATE_PROFILE`, JSON format `old/new`).
- [ ] T019 [US2] Create `NotificationService.java` and integrate sending notification to Admin after DB commit succeeds.
- [ ] T020 [US2] Create PUT endpoint `/api/v1/profile` in `ProfileController.java`
- [ ] T021 [P] [US2] Implement `profileApi.updateProfile` at `frontend/src/api/profileApi.js`
- [ ] T022 [US2] Build Component `ContactInfoForm.jsx` (Edit form passing `version` variable) at `frontend/src/components/profile/ContactInfoForm.jsx`

---

## Phase 5: User Story 3 - Update Avatar (Avatar Upload)

**Goal**: Upload image to Cloudinary, delete old image (Async), save URL to DB.

### Implementation for User Story 3

- [ ] T023 [US3] Implement `CloudinaryService.uploadAvatar` (Receive Multipart file) and configure a Listener `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` to catch the safe image deletion event.
- [ ] T024 [US3] Update `ProfileService.updateAvatar`: Receive new URL -> Update DB -> Publish a `ProfileAvatarUpdatedEvent` instead of calling `@Async` directly. Ensure DB Commit succeeds before the Listener runs to delete junk images.
- [ ] T025 [US3] Create POST endpoint `/api/v1/profile/avatar` in `ProfileController.java`
- [ ] T026 [P] [US3] Implement `profileApi.uploadAvatar` (use formData) at `frontend/src/api/profileApi.js`
- [ ] T027 [US3] Build Component `AvatarUploader.jsx`. Handle inserting Transformation Hook string (`c_thumb...`) directly using React Cloudinary SDK.

---

## Phase 6: User Story 4 - Session Invalidation (Security Edge Case)

**Goal**: Kick User back to login screen if their warehouse permissions are changed by Admin during the session.

### Implementation for User Story 4

- [ ] T028 [US4] Update JWT Filter or Security Interceptor logic to re-validate permission status (compare token payload with latest Database/Cache). If Role/Warehouse mismatches, return 403 error code.

---

## Phase 7: Polish & Testing

**Purpose**: Quality assurance and UX polish.

- [ ] T029 [P] Write Unit Tests (JUnit) for `ProfileService.updateContactInfo` (Thoroughly test Soft-delete Unique and Optimistic Locking) at `backend/src/test/java/com/duylongtech/backend/service/ProfileServiceTest.java`.
- [ ] T030 Handle React side UI Toast Notification (Catch 409 Conflict code and request page reload).
- [ ] T031 Add Loading State spinner for Avatar upload operation in `AvatarUploader.jsx`.
