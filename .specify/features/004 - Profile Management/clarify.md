# Clarification Notes: Profile Management

Based on comments and feedback, below are the points to clarify and adjust for the Specification document of the Profile Management module:

## 1. Orphan Files Issue on Cloud Storage
- **Issue**: When users upload new images to Cloudinary, old images are not deleted, leading to data junk on storage.
- **Solution/Clarification**: Added requirement for Backend: When there is an avatar change (successful new image upload), the Backend must call Cloudinary's API to delete (Destroy) the old image based on the User's old URL before updating the new URL into the database.

## 2. Loose Validation Rules
- **Issue**: Date of birth constraint (only needing to be less than the current date) and phone number (max 20 chars) are not strict enough for enterprise HR operations.
- **Solution/Clarification**: 
  - **Date of Birth (dob)**: Need to add a birth year limit rule, requiring personnel to be 18 years old or older (>= 18 years old).
  - **Phone Number (phone)**: Need to validate standard Vietnamese phone number format: Exactly 10 digits, starting with `0` or `+84`.

## 3. Displaying 1-to-Many Data Relationships
- **Issue**: It is not clearly described how the UI displays the case where one User belongs to multiple Warehouses or has multiple Roles.
- **Solution/Clarification**: The User Interface (UI) needs to display the Warehouse/Role lists as tags (Example: `[Kho Tổng]`, `[Trạm BH Q1]`) sequentially and separated by commas.

## 4. Security Logging underutilizing the Database
- **Issue**: The `AUDIT_LOGS` table has an `ip_address` field but the current spec does not require recording it, potentially causing difficulty tracking internal risks.
- **Solution/Clarification**: The Backend must strictly extract the client's IP address (`ip_address`) from the HTTP Request and save it to the `AUDIT_LOGS` table whenever there is a profile update action, helping to prevent fraud.

## 5. Sensitive Data Security (PII - Personally Identifiable Information)
- **Issue**: The ID Card number (`id_card`) is sensitive personal data; displaying it openly on the screen can lead to shoulder surfing risks.
- **Solution/Clarification**: (Based on the latest decision: Keep the ID Card data displayed normally, no need to apply PII masking mechanisms).
