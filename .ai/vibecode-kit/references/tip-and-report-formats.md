# TIP & Report Formats — Vibecode Kit v6.0

## Table of Contents
1. [Scan Instruction](#scan-instruction)
2. [Scan Report Format](#scan-report-format)
3. [RRI Report Format](#rri-report-format)
4. [Blueprint Template](#blueprint-template)
5. [Contract Template](#contract-template)
6. [Task Instruction Pack (TIP)](#task-instruction-pack-tip)
7. [TIP Handover Template](#tip-handover-template)
8. [Completion Report](#completion-report)
9. [Debug Completion Report](#debug-completion-report)
10. [Verify Report](#verify-report)

---

## Scan Instruction

Give this to Builder (Claude Code) via the Human:

```markdown
# SCAN INSTRUCTION — Vibecode Kit v6.0

## ROLE
You are the Builder. Task: Scan codebase and report.

## TASKS
1. Scan folder structure → report tree (max 3 levels)
2. Read package.json / pyproject.toml / Cargo.toml / go.mod (whatever applies) → tech stack + dependencies
3. List existing routes/pages/entry points
4. Identify patterns (auth, API, DB, state management, config)
5. Read README / docs / CHANGELOG if present
6. Check existing tests
7. Find .env.example or config templates → list required env vars
8. Assess code health (type safety, linting, console.logs, TODO count)

## OUTPUT: SCAN REPORT
[See Scan Report Format below]
```

---

## Scan Report Format

```
TECH_STACK:
  Language: [e.g., TypeScript, Python, Go, Rust]
  Framework: [e.g., Next.js, Django, FastAPI, Gin]
  Styling: [e.g., Tailwind CSS, CSS Modules, N/A]
  Database: [e.g., PostgreSQL, MongoDB, SQLite, None]
  Auth: [e.g., NextAuth, custom JWT, None]
  State: [e.g., Zustand, Redux, None]
  Other: [notable tools, e.g., Docker, Redis, S3]

EXISTING_MODULES:
  - [Module 1]: [brief description]
  - [Module 2]: [brief description]

PATTERNS_DETECTED:
  - [Pattern]: [where used]

REUSABLE_COMPONENTS:
  - [Component]: [path] — [purpose]

GAPS_DETECTED:
  - [Gap 1]: [description]

CODE_HEALTH:
  Type Safety: [Strict / Partial / None]
  Linting: [Configured / Not]
  Tests: [X files / None]
  Debug Artifacts: [X console.logs / Clean]
  TODO/FIXME: [X found]

ESTIMATED_SIZE:
  Files: [count]
  Lines of Code: ~[estimate]
  Components/Modules: [count]
  API Routes/Endpoints: [count]
```

---

## RRI Report Format

```markdown
# RRI REPORT: [Project Name]
Generated: [Date]

## REQUIREMENTS MATRIX

| REQ-ID  | Requirement          | Source    | Priority | Persona    |
|---------|----------------------|-----------|----------|------------|
| REQ-001 | [Description]        | RRI Q#12  | P0       | End User   |
| REQ-002 | [Description]        | RRI Q#15  | P1       | Business   |
| REQ-003 | [Description]        | Scan Gap  | P0       | Developer  |

## AUTO-ANSWERED (from Scan)
- AUTH: [details] → Reuse
- DB: [details] → Reuse schema patterns
- UI: [details] → Reuse components

## DECISIONS LOG
| Decision | Options Considered | Chosen | Rationale |
|----------|--------------------|--------|-----------|
| [D-001]  | A vs B             | A      | [Reason]  |

## OPEN QUESTIONS
- [OQ-001]: [Unanswered question]
```

---

## Blueprint Template

```markdown
# BLUEPRINT: [Project Name]
## Vibecode Kit v6.0

### PROJECT INFO
| Field | Value |
|-------|-------|
| Project | [Name] |
| Nature | [Interface + Lifecycle + Scale] |
| Date | [Date] |

### GOALS
**Primary Goal:** [Goal]
**Target Audience:** [Audience]
**Key Message:** [Message]

### ARCHITECTURE
[Building blocks, how they connect, data flow]

### DESIGN SYSTEM (if UI project)
#### Colors
Primary: #______ | Secondary: #______ | Accent: #______
#### Typography
Headings: [Font] | Body: [Font]

### TECH STACK
[Stack — reuse from Scan if available, otherwise derived from Vision]

### FILE STRUCTURE
[Appropriate structure for this specific project]

### RRI REQUIREMENTS MATRIX
| Blueprint Section | Requirements | Source (RRI Q#) |
|-------------------|-------------|-----------------|
| [Section 1]       | REQ-001..005| Q12-Q15         |

### TASK DECOMPOSITION PREVIEW
Estimated Tasks: [X]
├── TIP-001: [Task 1]
├── TIP-002: [Task 2]
└── ...
Estimated Effort: [X] min Claude Code time

### CHECKPOINT
- [ ] Architecture matches expectations
- [ ] Design is appropriate (if UI)
- [ ] Requirements are complete (from RRI)
- [ ] Task decomposition is reasonable
- [ ] Nothing important is missing

Reply "APPROVED" to continue.
```

---

## Contract Template

```markdown
# CONTRACT: [Project Name]

## DELIVERABLES
| # | Item | Details | Requirements |
|---|------|---------|--------------|
| 1 | [Main deliverable] | [Detail] | REQ-001..010 |

## TECH STACK
[List]

## TASK GRAPH SUMMARY
[X] TIPs, estimated [Y] minutes

## NOT INCLUDED
[List exclusions]

## CONFIRM
Reply "CONFIRM" to receive Task Graph.
```

---

## Task Instruction Pack (TIP)

```markdown
# TIP-[XXX]: [Task Name]

## HEADER
- TIP-ID: TIP-[XXX]
- Project: [name]
- Module: [name]
- Depends on: [TIP-IDs or "None"]
- Priority: P0 / P1 / P2
- Estimated effort: [minutes]

## CONTEXT
- Working directory: [path]
- Key files to reference: [list]
- Patterns to follow: [reference to existing code]

## TASK
[Clear, specific description of what to do]

## SPECIFICATIONS
[Detailed specs: business rules, validation, error handling]

## ACCEPTANCE CRITERIA
Given: [Condition]
When: [Action]
Then: [Expected result]

## CONSTRAINTS
- [What not to do]
- [What to reuse]
- [Boundaries]

## REPORT FORMAT
Create COMPLETION REPORT per standard format after completion.
```

---

## TIP Handover Template

Paste this into Claude Code when sending a TIP:

```markdown
# Vibecode Kit v6.0 — Task Instruction Pack

## ROLE
You are the BUILDER in Vibecode Kit v6.0.
The Contractor (Claude Chat) and Homeowner have AGREED on the design.

## ABSOLUTE RULES
1. IMPLEMENT exactly per TIP specification below
2. DO NOT change architecture / structure
3. DO NOT add features outside TIP
4. DO NOT change tech stack / dependencies (unless TIP requires)
5. SELF-TEST per acceptance criteria
6. REPORT per Completion Report format
7. Encounter conflict → REPORT in detail, DO NOT self-decide

## PROJECT CONTEXT
[Paste SCAN REPORT or brief project description]

## TASK INSTRUCTION PACK
[Paste TIP content]

## AFTER COMPLETION
Create COMPLETION REPORT per format below.
```

---

## Completion Report

```markdown
## COMPLETION REPORT — TIP-[XXX]

**STATUS:** DONE / PARTIAL / BLOCKED

**FILES CHANGED:**
- Created: [list + purpose]
- Modified: [list + change description]

**TEST RESULTS:**
- Acceptance criteria tested: [X/Y passed]
- Details: [pass/fail per criteria]

**ISSUES DISCOVERED:**
- [Issue]: [severity] — [description] — [suggestion]

**DEVIATIONS FROM SPEC:**
- [Deviation]: [what] — [why] — [impact]

**SUGGESTIONS FOR CHỦ THẦU:**
- [Suggestion]: [observation] — [recommendation]
```

---

## Debug Completion Report

```markdown
## DEBUG COMPLETION REPORT

**STATUS:** FIXED / PARTIAL / BLOCKED
**BUG SUMMARY:** [Short description]
**ROOT CAUSE:** [Root cause identified]

**FIX APPLIED:**
- File: [path]
- Change: [Description of change]

**VERIFICATION:**
- Bug fixed: Yes/No
- No regression: Yes/No
- Build passes: Yes/No

**ISSUES DISCOVERED:**
- [Issue]: [severity] — [description]

**SUGGESTIONS FOR CHỦ THẦU:**
- [Suggestion]: [observation] — [recommendation]

**LESSONS LEARNED:**
- [Lesson]
- [Prevention strategy]

**RELATED TIPs:**
- [TIP-XXX]: [Impact on this TIP]
```

---

## Verify Report

```
VERIFY REPORT: [Project Name]

REQUIREMENT COVERAGE:
├── Total Requirements: [X]
├── Implemented: [Y]
├── Missing: [Z]
├── Deferred (P2): [W]
└── Coverage: [Y/X]%

SCENARIO RESULTS:
├── Passed: [X]
├── Failed: [Y]
└── Untestable: [Z]

TECHNICAL HEALTH:
├── Build: PASS / FAIL
├── Type Errors: [count]
├── Lint Errors: [count]
└── Tests: [pass/fail count]

CRITICAL ISSUES:
1. [Issue]: [description] — [recommendation]

DECISIONS NEEDED FROM CHỦ NHÀ:
1. [Decision]: [options] — [Contractor recommendation]

OVERALL STATUS: READY / NEEDS FIXES / MAJOR ISSUES
```
