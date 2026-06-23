# Data Model: Profile Management

This document defines the data structure, tables, and relationships serving the Profile Management module. It also identifies the immediate database Migration tasks required to ensure the feature operates.

## 1. Database Migration Tasks (Immediate Actions)

### Fix Migration V6 Error
- **Issue**: The previous `V6` migration file declared adding HR info columns (like `id_card`, `dob`, `gender`...) after the `address` column (`AFTER address`). However, the `USERS` table currently does not have an `address` column, causing an error when running the migration.
- **Solution**: Open the Migration V6 SQL file and change the script to `AFTER phone` (or after a certainly existing column like `email`). Remove the hardcoded `UNIQUE` attribute at the Database level for `id_card`. Also, add a DROP INDEX/CONSTRAINT `UNIQUE` command for `phone` and `email` (if created in previous versions) to switch to catching Unique at the Application layer.
- **Columns ensured in V6**:
  - `id_card`: `VARCHAR(20)` (NO hardcoded UNIQUE)
  - `dob`: `DATE`
  - `gender`: `VARCHAR(10)`
  - `start_date`: `DATE`
  - `position`: `VARCHAR(100)`
  - `department`: `VARCHAR(100)`

### Migration Script V7
- **Goal**: Add a field to store the avatar image path for the Cloudinary upload feature.
- **Execution Details**: Create file `V7__add_avatar_url.sql` with the command:
  ```sql
  ALTER TABLE USERS ADD COLUMN avatar_url VARCHAR(255) NULL AFTER department;
  ```

## 2. Core Entities

### `USERS` (Central Table)
The core table storing personnel account information. Permission states (Read-only or Updatable) are applied at the end-user's Profile interface.
- `id`: `BIGINT UNSIGNED PRIMARY KEY`
- `username`: `VARCHAR(50) UNIQUE NOT NULL` (Read-only)
- `full_name`: `VARCHAR(100) NOT NULL` (Read-only)
- `phone`: `VARCHAR(20)` (Updatable - Requires validation for exactly 10 digits, starting with 0 or +84. Catch Unique at the Application layer combined with `status != 'INACTIVE'` condition to avoid Soft Delete errors)
- `email`: `VARCHAR(100)` (Updatable - Catch Unique at Application layer)
- `id_card`: `VARCHAR(20)` (Read-only - Catch Unique at Application layer)
- `dob`: `DATE` (Updatable - Validate >= 18 years old)
- `gender`: `VARCHAR(10)` (Updatable)
- `start_date`: `DATE` (Read-only)
- `position`: `VARCHAR(100)` (Read-only)
- `department`: `VARCHAR(100)` (Read-only)
- `avatar_url`: `VARCHAR(255) NULL` (Updatable)
- `status`: `VARCHAR(20)` (Example: APPROVED, INACTIVE)
- `version`: `INT DEFAULT 1` (Used for Optimistic Locking)
- `created_at`: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `updated_at`: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### `AUDIT_LOGS` (Security Log)
A black box recording all Profile changes, ensuring transparency and fraud traceability.
- `id`: `BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY`
- `user_id`: `BIGINT UNSIGNED NOT NULL` (ID of the person performing the action)
- `action`: `VARCHAR(50) NOT NULL` (Uses constant: `UPDATE_PROFILE`)
- `entity_name`: `VARCHAR(100) NOT NULL` (Uses constant: `USERS`)
- `entity_id`: `BIGINT UNSIGNED NOT NULL` (ID of the user whose info was changed)
- `ip_address`: `VARCHAR(45) NOT NULL` (Mandatory to extract from client's HTTP Request)
- `detail`: `JSON` (Mandatory standard Schema convention: must follow the `{"field_name": {"old": "val1", "new": "val2"}}` structure for easy query reporting later. Example: `{"phone": {"old": "098...", "new": "090..."}, "avatar_url": {"old": null, "new": "https://..."}}`)
- `created_at`: `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`

## 3. 1-to-Many Relationships Standardization

A personnel member can hold multiple Roles and be in charge of multiple Warehouses. This data is managed via Junction tables.
**UI/UX Goal**: When the Backend API returns Profile data, this data must be structured as an Array so the Frontend can easily map and render into Tags (Example: `[Kho Tổng]`, `[Trạm BH Q1]`).

### `USER_ROLES` (Global User - Role Junction Table)
- Stores system roles not tied to a specific warehouse (Example: Admin, HR, Director, Chief Accountant).
- Structure: `user_id` linked to `USERS.id`, `role_id` linked to `ROLES.id`.
- **JSON Output API Example**: 
  ```json
  "roles": [
    {"id": 1, "name": "Thủ kho"}, 
    {"id": 2, "name": "Kỹ thuật bảo hành"}
  ]
  ```

### `USER_WAREHOUSE_ROLES` (User - Warehouse Junction Table)
- Determines the physical warehouse or warranty station scope the personnel belongs to.
- Structure: `user_id` linked to `USERS.id`, `warehouse_id` linked to `WAREHOUSES.id`, `role_id` linked to `ROLES.id` (To assign permissions per warehouse - Role per Warehouse).
- **JSON Output API Example** (Note: One person can hold multiple roles in the same warehouse, so `roles` will be an array): 
  ```json
  "warehouses": [
    {
      "id": 101, 
      "name": "Kho Tổng", 
      "roles": ["Nhân viên kiểm kê", "Thủ kho"]
    }, 
    {
      "id": 102, 
      "name": "Trạm BH Q1", 
      "roles": ["Quản lý kho"]
    }
  ]
  ```
- **Core Security Constraint**: Whenever there is a change (INSERT/DELETE) on the `USER_WAREHOUSE_ROLES` table by an Admin, the system must automatically invalidate the token (session) of that user, forcing a re-login to refresh warehouse permissions.
