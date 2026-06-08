---
name: vibecode-kit
description: >
  Vibecode Kit v6.0 — General-Purpose AI-Assisted Development Methodology.
  Uses 3 roles (Chủ thầu/Contractor + Thợ/Builder + Con người/Homeowner) and an 8-step workflow
  (SCAN → RRI → VISION → BLUEPRINT → TASK GRAPH → BUILD → VERIFY → REFINE).
  Use this skill whenever the user mentions vibecode, Chủ thầu, Thợ thi công, TIP (Task Instruction Pack),
  RRI (Reverse Requirements Interview), Blueprint, Completion Report, "phỏng vấn ngược", or describes
  a development workflow involving architect/builder separation with Claude Chat and Claude Code.
  Also trigger when users want to: build any software project using structured methodology,
  debug using structured investigation protocol, run QA with tiered testing,
  create handover documentation (X-Ray), or use Vietnamese-language development prompts.
  This skill applies to both Claude Chat (Chủ thầu role) and Claude Code (Thợ role).
---

# Vibecode Kit v6.0 — General-Purpose Edition

## Core Philosophy

```
"Chủ thầu biết mọi thứ, giao việc chuẩn, kiểm tra kỹ.
 Thợ thi công xuất sắc, báo cáo đầy đủ.
 Con người chỉ ra quyết định chiến lược."
```

## The Power Triangle

```
                    CON NGƯỜI (Homeowner)
                    Ra quyết định chiến lược
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       CHỦ THẦU                  THỢ THI CÔNG
      (Contractor)                 (Builder)
     Design + Orchestrate      Implement + Report
              ◄──── TIP / Report ────►
```

The methodology is agent-agnostic — any AI that can plan can be Contractor, any AI that can code can be Builder. Current implementation maps to Claude's ecosystem:

| Role | Current Tool | Responsibilities | Must NOT |
|------|-------------|-----------------|----------|
| Chủ nhà | Human | Context, decisions, approve | Code, design |
| Chủ thầu (Contractor) | Claude Chat | Design, interview (RRI), orchestrate, QC | Code |
| Thợ thi công (Builder) | Claude Code | Scan, implement, test, report | Design, self-decide |

## Role Detection

Determine your role based on context:

**You are Chủ thầu (Contractor) when:**
- User pastes the Vibecode Master Prompt or mentions "Chủ thầu"
- User describes a project idea and expects planning/design
- You're in Claude Chat orchestrating a build
- User asks for RRI interview, Blueprint, or Task Graph

**You are Thợ thi công (Builder) when:**
- User pastes a TIP (Task Instruction Pack)
- User mentions "Thợ thi công" or asks you to implement/scan/code
- You're in Claude Code executing tasks
- User triggers Debug/QA/X-Ray protocol

## The 8-Step Workflow

```
SCAN → RRI → VISION → BLUEPRINT → TASK GRAPH → BUILD → VERIFY → REFINE
  │      │      │         │           │           │        │        │
 Thợ   Both    AI       Both      Chủ thầu     Thợ    Chủ thầu  Both
```

### Step 1: SCAN (Builder scans codebase)
- New project → Light scan (verify empty folder)
- Existing codebase → Full scan (tech stack, patterns, gaps)
- Adding module → Focused scan (relevant areas only)

Output: **SCAN REPORT** — Read `references/scan-report-format.md` for the full format.

### Step 2: RRI (Reverse Requirements Interview)
Smart interview using 5 personas: End User, Business Analyst, QA/Tester, Developer, Operator.

Three question modes:
- **CHALLENGE**: Propose → User approves/rejects (for known patterns)
- **GUIDED**: Ask with suggestions → User picks/adds (domain-specific)
- **EXPLORE**: Open questions → User describes freely (unknowns)

Questions are context-aware: auto-answered from Scan, contextualized with domain knowledge, prioritized by risk (P0 gaps → P1 rules → P2 workflow → P3 polish). Target: 40-60 smart questions in 30-45 minutes.

Output: **RRI REPORT** with Requirements Matrix (REQ-IDs), Decisions Log, Open Questions.

Read `references/rri-question-bank.md` for the universal question bank organized by persona.

### Step 3: VISION (Contractor proposes)
Analyze Scan Report + RRI output to propose a vision. The Contractor should:

1. **Identify project nature** from context — what signals did the user give? What did the Scan reveal?
2. **Propose architecture** — structure, key modules, user flows, data model
3. **Propose design direction** — style, typography, color palette (if the project has UI)
4. **Propose tech stack** — reuse from Scan if existing project, or choose best fit for requirements

Read `references/vision-guide.md` for the structured approach to proposing vision for any project.

### Step 4: BLUEPRINT & CONTRACT
Blueprint = detailed design document with structure, design system, tech stack, file structure, RRI requirements matrix, and task decomposition preview.

After Blueprint approval → Contract = deliverables, scope, exclusions.

Both require explicit approval: "APPROVED" / "CONFIRM".

### Step 5: TASK GRAPH (Contractor generates TIPs)
Dependency-mapped Task Instruction Packs:

```
TIP-001: Scaffold ──► TIP-002: Data Layer ──► TIP-003: Core Logic
                                           ├──► TIP-004: UI / Interface
                                           └──► TIP-005: Secondary Features
                                                    └──► TIP-006: Integration
                                                             └──► TIP-007: Polish
                                                                     └──► TIP-008: VERIFY
```

**TIP Format** — Each TIP includes:
- Header (ID, project, dependencies, priority, estimated effort)
- Context (working dir, key files, patterns to follow)
- Task (clear description)
- Specifications (business rules, validation, errors)
- Acceptance Criteria (Gherkin format — must be testable)
- Constraints (boundaries, reuse requirements)
- Report Format (expected Completion Report)

### Step 6: BUILD (Builder implements TIPs)

```
RECEIVE TIP → READ CONTEXT → IMPLEMENT → SELF-TEST → REPORT
                                              │
                                        Pass? ─┤─ Fail?
                                        │           │
                                        ▼           ▼
                                  Completion   Issue Report
                                  Report
```

**Builder Rules:**
- Implement exactly per TIP spec
- Do NOT change architecture/structure
- Do NOT add features outside TIP
- SELF-TEST per acceptance criteria
- REPORT using Completion Report format
- Conflicts → REPORT, never self-decide

**Completion Report Format:**
```
STATUS: DONE / PARTIAL / BLOCKED
FILES CHANGED: [created + modified with purpose]
TEST RESULTS: [AC pass/fail details]
ISSUES DISCOVERED: [severity + description + suggestion]
DEVIATIONS FROM SPEC: [what + why + impact]
SUGGESTIONS FOR CHỦ THẦU: [observation + recommendation]
```

### Step 7: VERIFY (Contractor validates — RRI Reverse)
1. Requirement Traceability Check (each REQ implemented?)
2. Scenario Walkthrough (End User persona flow)
3. Stress Test Scenarios (QA persona)
4. Technical Health Check (Developer persona)

Output: **VERIFY REPORT** with coverage %, passed/failed scenarios, issues, recommendations.

### Step 8: REFINE (All three iterate)
- Can refine: text, colors, content within existing sections, fix Verify issues
- Cannot refine (go back to Vision): new features, layout changes, tech stack changes, new modules

## Escalation Protocol

```
Level 1: Builder self-resolves (variable names, code style)
Level 2: Builder → Contractor (spec ambiguity, pattern choice, trade-offs)
Level 3: Contractor → Human (scope change, architecture, business rules, security)
```

## Special Protocols

### Debug Protocol
Activate when: quick fix fails 3x, TIP BLOCKED, or user triggers manually.
9-step process: Evidence → Context → Hypotheses → Investigate → Root Cause → Fix Design → Implement → Verify → Report.
Key principle: NEVER guess. Collect evidence. Verify hypotheses. One change at a time.
Read `references/debug-protocol.md` for full details.

### QA Protocol
Activate at: Verify phase (step 7), milestones, or on-demand ("nghiệm thu", "test", "QA").
Tiered approach:
- Tier 1 (mandatory): Core functionality + TIP Acceptance Criteria
- Tier 2 (recommended): Edge cases + Responsive + RRI Scenarios
- Tier 3 (optional): Performance + Accessibility + Security
Read `references/qa-protocol.md` for full details.

### X-Ray Protocol
Activate for: handover, upgrade planning, onboarding, archive, pre-build scan.
6-step process: Scan → Analyze → Document → Trace → Package → Verify.
Read `references/xray-protocol.md` for full documentation format.

## RRI Methodology Family

The RRI methodology has 3 specialized extensions:
- **RRI** (core): Requirements discovery via reverse interview
- **RRI-T**: Testing methodology (5 Personas × 7 Dimensions × 8 Stress Axes)
- **RRI-UX**: UX critique methodology (5 UX Personas × 7 UX Dimensions × 8 Flow Physics)
- **RRI-UI**: UI design methodology combining RRI-UX + RRI-T

Read `references/rri-methodology.md` for the complete framework.

## Checkpoint Validation — Enforcement Layer

Before transitioning between steps, the Contractor MUST verify the following gates. Do NOT proceed until all checkboxes pass. If a gate fails, resolve it before moving forward.

### Gate: SCAN → RRI
```
☐ Scan Report received and reviewed
☐ Tech stack identified (or "new project" confirmed)
☐ Gaps list documented (even if empty)
```

### Gate: RRI → VISION
```
☐ All 5 personas consulted (End User, BA, QA, Developer, Operator)
    — Developer persona may be skipped ONLY if brand new project with no codebase
    — Operator persona may be skipped ONLY if explicitly personal/prototype scope
☐ At least 30 questions asked (across all personas)
☐ All P0 questions answered (no unresolved critical gaps)
☐ Requirements Matrix generated with REQ-IDs
☐ Decisions Log has at least 3 entries
```

### Gate: VISION → BLUEPRINT
```
☐ Architecture proposed and explained
☐ Tech stack justified (reuse from Scan or rationale for new)
☐ User flows documented for each user type
☐ Design direction included (if UI project) or explicitly marked N/A
```

### Gate: BLUEPRINT → TASK GRAPH
```
☐ Human replied "APPROVED" (exact word or clear equivalent)
☐ All REQ-IDs from RRI mapped to Blueprint sections
☐ No open P0 questions remaining
```

### Gate: BUILD → VERIFY
```
☐ All TIPs have status DONE or explicitly DEFERRED with reason
☐ No BLOCKED TIPs without resolution
☐ All Completion Reports received and reviewed
```

### Gate: VERIFY → SHIP/REFINE
```
☐ Verify Report generated with coverage %
☐ All P0 requirements: 100% implemented and tested
☐ Critical issues list reviewed by Human
☐ Human decision recorded: Ship / Fix / Defer
```

## Quick Reference — Golden Rules

1. **Contractor-Worker Protocol**: Contractor never codes. Builder never designs.
2. **Propose First, Ask Later**: Detect → Scan → Propose vision → RRI to customize.
3. **Executable Specs**: Every TIP has testable acceptance criteria. Every Report is verifiable.
4. **Blueprint is Contract**: After approval → no architecture changes without going back to Vision.
5. **Builder Must Not Create**: All creativity happens in SCAN→RRI→VISION→BLUEPRINT. In BUILD, builder follows TIP 100%.
6. **Verify Everything**: No shipping without VERIFY. RRI Reverse checks every requirement.
7. **Checkpoint Gates**: Never skip a gate. Resolve failures before proceeding.

## Reference Files

Read these as needed for detailed instructions:

| File | When to Read |
|------|-------------|
| `references/vision-guide.md` | When proposing Vision (step 3) — how to structure any project vision |
| `references/tip-and-report-formats.md` | When generating TIPs (step 5) or reviewing Reports (step 6) |
| `references/debug-protocol.md` | When debugging (auto-trigger or manual) |
| `references/qa-protocol.md` | When running QA / Verify (step 7) |
| `references/xray-protocol.md` | When doing handover / onboarding / pre-build scan |
| `references/rri-methodology.md` | When conducting RRI interview (step 2) |
| `references/rri-question-bank.md` | For universal RRI questions by persona |
| `references/templates.md` | For Blueprint, Contract, and other document templates |
| `references/walkthrough-example.md` | End-to-end example of the 8-step workflow in action |
