# Feature Specification: User Profile Management

**Feature Branch**: `feat/user-profile-management`

**Created**: June 23, 2026

**Status**: Draft

## Revision History
- **June 23, 2026**: Updated spec for Cloudinary orphan files, tightened validation rules, displaying 1-to-Many data (UI tags), and added ip_address to Audit Log.

**Input**: User description: "Develop User Profile Management module (View/Update Profile) for warehouse and RMA personnel. Integrate data fetching from USERS table, role assignment tables, save Avatar via Cloudinary, and write security logs."

## User Scenarios & Testing *(mandatory)*

## Clarifications
### Session 2026-06-23
- Q: When updating contact info, do we need to notify Admin/HR? → A: Yes, send an In-app Notification to the regional Admin/HR, and write a log to `AUDIT_LOGS`.
- Q: How to handle when Admin changes the Warehouse Roles of the currently logged-in User? → A: Force logout (invalidate token) to refresh the session.

### User Story 1 - View User Profile Details (Priority: P1)

As a system user (Storekeeper, RMA Technician, Warehouse Manager, Admin...), I want to view my profile details to verify the accuracy of my identification information, position, and assigned warehouse/station.

**Why this priority**: It ensures the accuracy of identification data when performing inventory checks, import/export, and RMA processing. Users need to know exactly under what name and roles they are operating to have clear business accountability.

**Independent Test**: Log in with any employee account (e.g., Storekeeper), access the "My Profile" page, and verify the system displays the correct information matching the DB record (including the list of assigned warehouses).

**Acceptance Scenarios**:

1. **Given** a user has successfully logged in with an `APPROVED` account, **When** the user accesses the "My Profile" page, **Then** the system must display full information: Avatar (or default image if none), Username, Full Name, ID Card Number, Start Date, Department, Position, System Roles, and Assigned Warehouses/Stations.
2. **Given** the user is on the profile details page, **When** the user attempts to edit fields such as Username, Full Name, ID Card, Start Date, Department, Position, Roles, or Assigned Warehouses, **Then** the system must lock these fields (Read-only) and disable user input.

---

### User Story 2 - Update Personal Contact Information (Priority: P1)

As a system user, I want to update my Phone Number, Email, Date of Birth, and Gender so that contact information is always accurate, helping HR and other warehouses contact me quickly when coordinating parts or processing RMA.

**Why this priority**: This is a core feature allowing personnel to self-update contact info without bothering Admins, increasing flexibility for distributed warehouse operations.

**Independent Test**: Perform a Phone Number and Email change on the form, click the "Save" button, then reload the page or check directly in the `USERS` table to see if the new data is accurately recorded.

**Acceptance Scenarios**:

1. **Given** the user is on the profile edit interface, **When** submitting valid changes for Phone Number, Email, Date of Birth, Gender, and clicking "Save", **Then** the system updates the database, writes a security log, and displays a success message: "Cập nhật hồ sơ thành công".
2. **Given** the user enters a Phone Number or Email that is already registered by another employee in the system, **When** clicking "Save", **Then** the system must block it, display an error message: "Số điện thoại hoặc Email đã tồn tại trên hệ thống", and not save to the DB.

---

### User Story 3 - Change Avatar via Cloudinary (Priority: P2)

As a system user, I want to upload or change my profile picture (Avatar) to increase personal recognition on the navigation bar (Header) and in warehouse operation history logs.

**Why this priority**: Enhances User Experience (UX) and enterprise system personalization, though it does not disrupt warehouse workflows if this feature is delayed.

**Independent Test**: Upload a portrait image file from a local device, click Save, then check if the URL saved in the `avatar_url` field leads to Cloudinary and the avatar displayed on the Header changes accordingly.

**Acceptance Scenarios**:

1. **Given** the user clicks to select an avatar from their personal device, **When** the image file is valid (JPG/PNG/WEBP format and under 2MB), **Then** the system uploads the image to the configured folder on Cloudinary, receives a secure URL (`secure_url`), and is ready to save when the user clicks the Save button.
2. **Given** the user selects an invalid file (e.g., .docx or a 5MB image), **When** file selection is done, **Then** the system immediately displays an error warning right below the image selection area and disables the "Save" button.

---

### Edge Cases

- **Account locked (INACTIVE) while interacting**: If a user is opening the profile edit page, but simultaneously an Admin changes this account's status to `INACTIVE` in the `USERS` table. When the user clicks "Save", the backend checks the account status, rejects the request (HTTP 401/403 Unauthorized), and the frontend automatically clears the session token and redirects the user to the Login page with a session expired message.
- **Cloudinary Storage connection issue**: When the user clicks "Save" including a new avatar, but the connection between the Backend and Cloudinary API is disrupted (timeout or wrong API Key). The Backend must Rollback the entire update process (including text info like Phone, Email), return an HTTP 502 Bad Gateway error. The frontend displays the message: "Lưu hình ảnh thất bại do sự cố máy chủ lưu trữ. Vui lòng thử lại sau." and retains the form data so the user does not have to re-enter it.
- **Handling whitespaces and data formatting (Sanitization)**: The user intentionally enters a phone number containing letters or copy-pastes an email with leading/trailing whitespaces. The frontend and backend must automatically trim whitespaces and check valid RegEx formatting before executing the unique validation query at the Database level.
- **Warehouse Roles changed while interacting**: If an Admin changes the user's assigned Warehouses list while the user is interacting with the system, any request from the user using the old token will be rejected by the backend (HTTP 403 Forbidden). The frontend must automatically force the user to log out and require a fresh login to receive a new token containing updated warehouse roles.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system must retrieve data from the `USERS` table combined with role assignment data from `USER_ROLES` (join with `ROLES`) and `USER_WAREHOUSE_ROLES` (join with `WAREHOUSES`) to comprehensively display the logged-in account's profile information. The interface must display 1-to-Many data (Warehouses/Roles) as a list of consecutive tags, separated by commas (Example: `[Kho Tổng]`, `[Trạm BH Q1]`).
- **FR-002**: The system MUST hard-lock (Read-only mode) at both the UI and API control layers for enterprise attributes: `username`, `full_name`, `id_card`, `start_date`, `position`, `department`, along with role lists and assigned warehouses.
- **FR-003**: The system must allow users to edit personal attributes including: `phone`, `email`, `dob` (date of birth), `gender`, and `avatar_url`.
- **FR-004**: The system must perform input data format validation: `phone` must be exactly 10 digits starting with `0` or `+84`, `email` must be a valid enterprise email format, `dob` must ensure personnel are 18 years old or older (>= 18 years old).
- **FR-005**: The system must check uniqueness (Unique validation) of `phone` and `email` across the entire `USERS` table before executing the `UPDATE` command. If a duplicate is detected, it must abort the process and throw the corresponding error.
- **FR-006**: The system must process avatar image uploads to Cloudinary Storage under a defined directory structure: `duylongcomputer/users/avatars/` and name the file in the format `[username]_[timestamp]` to avoid overwriting data. Specifically, when a user successfully uploads a new image, the Backend MUST call Cloudinary's API to delete (Destroy) the old image based on the old URL before updating the new URL into the DB to avoid creating orphan files.
- **FR-007**: When displaying avatars on the navigation bar or profile page, the system MUST use Cloudinary's image optimization parameters (Transformation Hooks): `c_thumb,g_face,w_150,h_150,f_auto,q_auto` to minimize download size and save bandwidth for distributed branch warehouses.
- **FR-008**: The system must automatically display a default Placeholder image if the `avatar_url` data field in the database is empty or `NULL`.
- **FR-009**: After successfully updating the profile, the system must write an activity log record into the `AUDIT_LOGS` table with the information: `user_id` of the executor, `action` = 'UPDATE_PROFILE', `entity_name` = 'USERS', `entity_id` = ID of the user, mandatorily extract and save the `ip_address` of the client making the request, and a `detail` field in JSON format containing the changed fields (old value and new value). Simultaneously, the system must automatically send an In-app Notification to the Admin/Regional Manager to capture the contact info change.

### Key Entities *(include if feature involves data)*

- **USERS**: The core entity storing employee account profiles. Contains basic identification fields, additional HR info from `V6` migration (`id_card`, `dob`, `gender`, `start_date`, `position`, `department`), and the `avatar_url` image path field.
- **USER_ROLES & ROLES**: Defines the system roles of the personnel (Storekeeper, RMA Technician...), used to display job titles on the Profile.
- **USER_WAREHOUSE_ROLES & WAREHOUSES**: Determines the physical warehouse or station scope that the personnel belongs to and has the right to manipulate warehouse documents. Because one person can handle multiple warehouses, this entity returns a list of linked warehouses.
- **AUDIT_LOGS**: A security black box recording the entire history of personnel info edits to serve review and system audit purposes during inventory or RMA data disputes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts to attack or illegally alter Read-only data fields (`username`, `full_name`, `id_card`, warehouse positions) via the end-user's Update Profile API must be blocked by the Backend system returning a 403 Forbidden error.
- **SC-002**: Page load and display speed of the personal profile including the avatar (Cloudinary CDN optimized) must achieve an average response time of under 1.2 seconds in normal network conditions.
- **SC-003**: 100% of successful profile update events must be fully and accurately recorded into the `AUDIT_LOGS` table within a maximum of 500ms since the database transaction completed.

## Assumptions

- The `avatar_url` column (VARCHAR(255) NULL) will be added to the `USERS` table by the DBA team via a new SQL Migration file (`V7__add_avatar_url.sql`) prior to backend code implementation for this feature.
- The system has already established connections and fully configured Cloudinary environment variables (`CLOUDINARY_URL`, `API_KEY`, `API_SECRET`) on Development and Production environments.
- The `V6__add_full_profile_columns.sql` migration script has been corrected to remove the syntax logic error `AFTER address` (replaced by `AFTER phone` or a valid equivalent position) to ensure no database sync errors.
- Change Password and Two-Factor Authentication (2FA) configuration features are defined as Out of Scope for this module and will be implemented in a specialized security management module.