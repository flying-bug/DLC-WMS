# Walkthrough Example — Vibecode Kit v6.0

This is a condensed example showing how the 8-step workflow runs in practice. The project is a simple REST API for task management, built from scratch.

---

## Step 1: SCAN

**Human → Chủ thầu:** "Chủ thầu, tôi cần build API quản lý task cho team nhỏ, dùng Node.js."

**Chủ thầu:** Trước tiên, bạn có codebase sẵn không?

**Human:** Chưa, bắt đầu từ đầu.

**Chủ thầu → Thợ:** Scan empty folder.

**Thợ → SCAN REPORT:**
```
TECH_STACK: Empty project
EXISTING_MODULES: None
GAPS_DETECTED: Everything
ESTIMATED_SIZE: 0
```

---

## Step 2: RRI (condensed — 12 questions from 40-60)

**Chủ thầu (End User persona, CHALLENGE mode):**
"Tôi đề xuất: 1 loại user duy nhất, không phân quyền. OK?"

**Human:** Không, cần 2 roles: Admin và Member.

**Chủ thầu (Business Analyst persona, GUIDED mode):**
"Task có workflow không? Ví dụ: Todo → In Progress → Done, hay phức tạp hơn?"

**Human:** Todo → In Progress → Review → Done. Admin có thể move bất kỳ, Member chỉ move forward.

**Chủ thầu (QA persona, CHALLENGE mode):**
"Tôi đề xuất: validation email + password 8 ký tự cho auth. Agree?"

**Human:** Agree.

**Chủ thầu (Developer persona, CHALLENGE mode):**
"Tech stack: Express.js + PostgreSQL + Prisma + JWT auth. OK?"

**Human:** Đổi PostgreSQL thành SQLite cho đơn giản.

**Chủ thầu (Operator persona, EXPLORE mode):**
"Deploy ở đâu? Monitoring cần gì?"

**Human:** Local trước, deploy sau. Không cần monitoring lúc này.

**→ RRI REPORT:**
```
REQUIREMENTS MATRIX:
| REQ-ID  | Requirement              | Priority | Persona   |
|---------|--------------------------|----------|-----------|
| REQ-001 | JWT auth (email+pass)    | P0       | QA        |
| REQ-002 | 2 roles: Admin, Member   | P0       | End User  |
| REQ-003 | Task CRUD                | P0       | Business  |
| REQ-004 | Workflow: 4 states       | P0       | Business  |
| REQ-005 | Role-based state transitions | P1    | Business  |
| REQ-006 | Task assignment          | P1       | End User  |
| REQ-007 | Task filtering/search    | P2       | End User  |

DECISIONS LOG:
| Decision | Chosen      | Rationale          |
|----------|-------------|--------------------|
| D-001    | SQLite      | Human preference   |
| D-002    | No deploy   | Deferred to later  |

OPEN QUESTIONS: None
```

---

## Step 3: VISION

**Chủ thầu:**
```
PROJECT: Task Manager API
NATURE: API-only + CRUD + Team scale

ARCHITECTURE:
├── Auth module (register, login, JWT)
├── User module (CRUD, roles)
├── Task module (CRUD, workflow, assignment)
└── Middleware (auth guard, role check)

TECH STACK:
Express.js + SQLite + Prisma + JWT + bcrypt

Ready for BLUEPRINT?
```

**Human:** Ready.

---

## Step 4: BLUEPRINT & CONTRACT

**Chủ thầu:** [Presents detailed Blueprint with file structure, API endpoints, DB schema, RRI matrix mapping]

**Human:** APPROVED.

**Chủ thầu:** [Generates Contract]

**Human:** CONFIRM.

---

## Step 5: TASK GRAPH

```
TIP-001: Scaffold (Express + Prisma + project structure)
    └──► TIP-002: DB Schema (User + Task models)
             ├──► TIP-003: Auth (register, login, JWT middleware)
             └──► TIP-004: Task CRUD + Workflow
                      └──► TIP-005: Role-based access + assignment
                               └──► TIP-006: VERIFY
```

---

## Step 6: BUILD (showing TIP-004 as example)

**Chủ thầu → Thợ (via Human):**
```
TIP-004: Task CRUD + Workflow

CONTEXT:
- Working directory: /src
- Key files: prisma/schema.prisma, src/middleware/auth.ts
- Patterns: Follow TIP-003 route pattern

TASK:
Implement Task CRUD endpoints with 4-state workflow.

SPECIFICATIONS:
- POST /tasks — create task (default: TODO)
- GET /tasks — list tasks (with filters)
- PATCH /tasks/:id — update task fields
- PATCH /tasks/:id/transition — move state
- DELETE /tasks/:id — soft delete
- Workflow: TODO → IN_PROGRESS → REVIEW → DONE
- Validation: title required, max 200 chars

ACCEPTANCE CRITERIA:
Given: authenticated user
When: POST /tasks with valid data
Then: task created with status TODO, 201 response

Given: task in TODO state
When: PATCH /tasks/:id/transition {to: "IN_PROGRESS"}
Then: state changes to IN_PROGRESS, 200 response

Given: task in DONE state
When: PATCH /tasks/:id/transition {to: "TODO"}
Then: 400 error, backward transition not allowed
```

**Thợ → COMPLETION REPORT:**
```
STATUS: DONE

FILES CHANGED:
- Created: src/routes/tasks.ts (5 endpoints)
- Created: src/services/taskService.ts (business logic)
- Created: src/validators/taskValidator.ts
- Modified: src/app.ts (mount task routes)

TEST RESULTS:
- AC 1 (create task): PASS
- AC 2 (forward transition): PASS
- AC 3 (backward blocked): PASS

ISSUES DISCOVERED:
- Minor: Prisma doesn't support SQLite enum natively,
  used string + validation instead. No impact on API contract.

SUGGESTIONS FOR CHỦ THẦU:
- Consider adding pagination to GET /tasks for REQ-007 (filtering).
  Current implementation returns all tasks.
```

---

## Step 7: VERIFY

**Chủ thầu (after all TIPs complete):**
```
VERIFY REPORT: Task Manager API

REQUIREMENT COVERAGE:
├── Total: 7
├── Implemented: 7
├── Missing: 0
└── Coverage: 100%

SCENARIO RESULTS:
├── Passed: 14/15
├── Failed: 1 (pagination not implemented for large datasets)
└── Severity: Low (P2 requirement)

TECHNICAL HEALTH:
├── Build: PASS
├── Type Errors: 0
├── Lint Errors: 0
└── Tests: 14/15 pass

OVERALL STATUS: READY (1 minor issue deferred)
```

---

## Step 8: REFINE

**Chủ thầu → Human:**
```
API hoàn thành 100% requirements. 1 issue nhỏ:
- REQ-007 (filtering): works but no pagination.

Options:
[A] Ship as-is (pagination later)
[B] Add pagination (+15 min)
```

**Human:** A, ship.

**→ Done.**

---

## Key Takeaways

1. Human made 3 strategic decisions: role model, workflow states, tech stack override
2. Contractor handled all design: architecture, endpoint design, task decomposition
3. Builder only coded: no design decisions, reported deviation (enum workaround)
4. Every requirement is traceable: REQ-004 → TIP-004 → AC 2 → PASS
5. Escalation worked: Builder's pagination suggestion went to Contractor → Human decided to defer
