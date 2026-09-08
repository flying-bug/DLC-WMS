# Implementation Guide: Fix Assembly And Disassembly Management

**Feature**: `[011-fix-assembly-and-disassembly-management]`  
**Created**: 2026-09-06  
**Prerequisites**: Decision Gate in `plan.md` closed; read `spec.md`, `clarify.md`, `data-model.md` first.

## 1. Implementation rules

1. Do not add cost allocation, new costing formulas or partial fulfillment.
2. Do not trust actor IDs, roles, status or document lines supplied by the client for approval/cancel/post workflow.
3. Do not mutate inventory balance, serial status or ledger from `AssemblyOrderService`; call the established `InventoryDocumentService` posting/unposting path.
4. A public endpoint must map to one explicit business action. Do not retain a generic status setter that permits arbitrary transitions.
5. Every state-changing operation is transactional, auditable and idempotent where a client can retry.

## 2. Suggested backend layout

| Responsibility | Primary file(s) |
|---|---|
| Workflow coordinator | `backend/src/main/java/com/duylongtech/backend/service/AssemblyWorkflowService.java` (new) |
| Existing domain service to simplify/delegate | `backend/src/main/java/com/duylongtech/backend/service/AssemblyOrderService.java` |
| Document post/unpost hooks | `backend/src/main/java/com/duylongtech/backend/service/InventoryDocumentService.java` |
| HTTP actions | `backend/src/main/java/com/duylongtech/backend/controller/AssemblyOrderController.java` |
| State/action request DTOs | `backend/src/main/java/com/duylongtech/backend/dto/request/` |
| Entities and migration | `backend/src/main/java/com/duylongtech/backend/entity/`, `backend/src/main/resources/db/migration/` |
| Read/lock query | `backend/src/main/java/com/duylongtech/backend/repository/` |
| Notifications | `backend/src/main/java/com/duylongtech/backend/service/AppNotificationService.java` |

Creating `AssemblyWorkflowService` is recommended to prevent `AssemblyOrderService` and `InventoryDocumentService` from recursively calling each other. Keep inventory mutations in `InventoryDocumentService`.

## 3. State transition implementation

Implement state constants/enums in one location. Each action validates current state, current user authorization, optimistic version and related documents before mutation.

```text
BOM:
  DRAFT/REJECTED --submit--> PENDING_APPROVAL
  PENDING_APPROVAL --approve--> APPROVED
  PENDING_APPROVAL --reject(reason)--> REJECTED

ORDER:
  DRAFT/(REJECTED if confirmed) --submit--> PENDING_APPROVAL
  PENDING_APPROVAL --approve--> APPROVED + create pair DRAFT
  PENDING_APPROVAL --reject(reason)--> REJECTED
  APPROVED --export POSTED--> IN_PROGRESS
  APPROVED/IN_PROGRESS --both documents POSTED--> COMPLETED
```

Cancel transitions must be implemented only after the decisions in `clarify.md` §5.2–§5.7 are confirmed.

## 4. Approve order transaction

Within one `@Transactional` method:

1. Lock/reload order and assert `PENDING_APPROVAL`.
2. Derive actor from `SecurityContext`; assert Accountant permission.
3. Revalidate the selected BOM is `APPROVED`, order snapshot is intact and warehouse is valid.
4. Apply the reservation policy only if it was approved in Decision Gate; otherwise do no reservation.
5. Build export/import lines from `AssemblyOrderLine` and target variant — never from the HTTP request.
6. Save exactly one export and one import with `DRAFT`, `referenceType=ASSEMBLY_ORDER`, `referenceId=order.id`.
7. Rely on unique index and catch duplicate-key retry as an idempotent result, not a second pair.
8. Set order `APPROVED`, approval metadata and audit event.
9. Publish notification only after successful commit.

If any step fails, rollback both document inserts and the order transition.

## 5. Posting hook

After `InventoryDocumentService.postExport` or `postImport` saves a linked document:

1. If `referenceType` is not `ASSEMBLY_ORDER`, return without workflow work.
2. Lock the order and reload both linked documents.
3. On export post, change `APPROVED` to `IN_PROGRESS` only.
4. On import post, assert export is already `POSTED`; otherwise reject before inventory posting.
5. If both are `POSTED`, set order `COMPLETED` and `quantityProduced = quantity`.
6. Persist an audit event and return normal document response.

Serial validation must remain server-side in document posting: exact unique serial count for serial-tracked SKU, matching variant and warehouse, available status, and no duplicate serial across lines.

## 6. Cancel and unpost implementation

Do not code this section until its clarification decisions are marked confirmed.

For a cancel-before-post case, mark both generated documents `CANCELLED` and order `CANCELLED` atomically; retain rows for audit.

For a cancel-after-export case:

1. Verify import has never been `POSTED`.
2. Record cancellation reason and `PENDING_UNPOST` state.
3. Block edits/post of linked import.
4. Require Warehouse Keeper to confirm physical return of all component serials.
5. Call the existing export unpost path; do not hand-write balance/serial restoration.
6. On success mark cancellation settlement `SETTLED`; never reopen the order.

If import is `POSTED`, return a business error requiring the explicitly chosen reversal procedure. Never unpost export after a posted import.

## 7. Frontend implementation

Update these areas:

- `frontend/src/api/assemblyOrderApi.js`: explicit submit/approve/reject/cancel/list-linked-document calls.
- `frontend/src/pages/AssemblyOrder/AssemblyBomFormPage.jsx`: render Draft, Submit, Reject reason and Resubmit state correctly.
- `frontend/src/pages/AssemblyOrder/AssemblyOrderFormPage.jsx`: remove direct approve/complete/execute workflow; show action buttons based on server-provided permissions/status; show both linked documents and pending-unpost warning.
- `frontend/src/pages/AssemblyOrder/AssemblyExecutionModal.jsx`: remove or transform into a document-serial helper. It must not call an endpoint that posts both sides from an order.
- Export/import detail pages: show immutable assembly source, block unauthorized edits/post, and surface backend serial errors.

Never decide permission in UI alone. On a 403 or invalid-state response, refresh detail and show the server message.

## 8. Test implementation

Add tests alongside existing services, for example:

```text
backend/src/test/java/com/duylongtech/backend/service/AssemblyWorkflowServiceTest.java
backend/src/test/java/com/duylongtech/backend/service/InventoryDocumentServiceFlowTest.java
backend/src/test/java/com/duylongtech/backend/controller/AssemblyOrderControllerIntegrationTest.java
```

Minimum cases: allowed/forbidden transitions, actor role, double approve, transaction rollback if second document creation fails, serial failures, import-before-export, complete when both post, cancel/unpost restrictions and concurrent requests.

## 9. Verification commands

```powershell
cd backend
.\mvnw.cmd -DskipTests compile
.\mvnw.cmd test

cd ..\frontend
npm.cmd run build
```

Run the Flyway migration against a disposable database before staging. Do not apply a state-mapping migration to production until the list of active old orders has been reviewed.

