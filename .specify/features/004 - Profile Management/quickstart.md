# Quickstart Validation Guide: Profile Management

## Prerequisites
- Spring Boot Backend is running at `http://localhost:8080`. Cloudinary environment variable (`CLOUDINARY_URL`) is configured.
- MySQL database has run migrations V6, V7 adding info fields and `avatar_url`.
- Valid JWT Token of a user (any role).

## Run Scenarios

### Scenario 1: View profile details
1. Call API `GET /api/v1/profile` with JWT Token.
2. **Expected**: Returns HTTP 200 OK. Response contains all account info (username, original id_card), roles list, warehouses list with role_id merged into an array, and the version variable.

### Scenario 2: Update contact information successfully
1. Call API `PUT /api/v1/profile` passing the correct `version` and valid new `phone`, `email` info.
2. **Expected**: Returns HTTP 200 OK. `USERS` table is updated, `AUDIT_LOGS` table records a new log containing `ip_address` and detailed JSON changes. In-app Notification is sent to the regional Admin.

### Scenario 3: Optimistic Locking Error
1. Open 2 Profile interface tabs simultaneously (both fetch data with version 1).
2. Tab A successfully updates `phone` (DB upgrades to version 2).
3. Tab B clicks Save with old info (still sending version 1 to the API).
4. **Expected**: Tab B receives HTTP 409 Conflict "Thông tin hồ sơ đã bị thay đổi". The UI does not get updated incorrectly.

### Scenario 4: Update Avatar and delete junk files (Data Preservation)
1. Call API `POST /api/v1/profile/avatar` using `multipart/form-data` containing a valid JPG image file.
2. **Expected**: Returns HTTP 200 OK. `USERS` table successfully updates the new URL. If the user already had an old image, a Background Task (Async) will be triggered silently to call Cloudinary Destroy API to delete the old image, absolutely ensuring it's not deleted before the DB commits successfully.

### Scenario 5: Delete warehouse permission forcing re-login (Session Invalidation)
1. User is on the Profile page.
2. Admin logs into the system and deletes 1 record in the `USER_WAREHOUSE_ROLES` table of that User.
3. User clicks update info on the UI.
4. **Expected**: HTTP 403 Forbidden. Frontend redirects to the login screen, reporting the session has ended.
