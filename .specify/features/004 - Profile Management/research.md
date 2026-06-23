# Phase 0: Outline & Research

## Findings

### 1. Avatar Processing (Cloudinary Upload vs Local Storage)
- **Decision**: Directly use Cloudinary Server-side API. Apply **Asynchronous** mechanism for the old image deletion task.
- **Rationale**: Uploading files to the Backend helps secure the API Secret when calling the delete (Destroy) function. However, to avoid the risk of **Data Loss** in case of an unexpected DB error, the system MUST adhere to the Transaction Pattern: *Upload new image to Cloudinary -> Receive URL -> Save URL to Database -> If Database Commit is SUCCESSFUL -> Push the Delete old image task to a Background Job / Async Event*. If DB saving fails, the old image on Cloudinary is not lost.

### 2. "Soft" Unique Validation (Application vs DB Level)
- **Decision**: Completely remove `UNIQUE` constraints at the Database level for `phone`, `email`, `id_card`. Switch to using `SELECT EXISTS` logic at the Repository layer (Spring Data JPA).
- **Rationale**: The WMS system requires storage based on a Soft Delete mechanism (`status = INACTIVE`). If `UNIQUE` is hardcoded in the DB, a former employee returning to work will be stuck and unable to recreate an account (duplicate phone number/ID card currently INACTIVE). Using Application-level validation allows flexible catching with the condition `WHERE phone = ? AND status != 'INACTIVE'`.

### 3. Avatar Optimization (Cloudinary CDN Transformations)
- **Decision**: The Frontend takes full responsibility for inserting the Transformation string (`c_thumb,g_face,w_150...`) via the Cloudinary React SDK. The Backend only stores the **Original URL**.
- **Rationale**: Initially intended to store the pre-transformed URL in the DB, but this approach lacks flexibility (hard-code). Having the Backend store the standard URL and delegating Resize/Crop rights to the Frontend is more optimal, strictly adhering to Component-Based UI. The Frontend can call the `w_150` image in the Sidebar and `w_800` on the Detail page without needing to store 2 different URLs.

### 4. Concurrency Management (Optimistic Locking)
- **Decision**: Add the `@Version Integer version` field to the `User.java` Entity.
- **Rationale**: When Admin/HR and the personnel themselves edit the profile concurrently, Optimistic Locking (via Hibernate `@Version`) is the simplest and lightest way to detect conflicts without locking rows (Pessimistic Lock) causing DB bottlenecks. Upon conflict, the backend throws `ObjectOptimisticLockingFailureException` converted to error code 409.
