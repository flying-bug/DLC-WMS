# Templates — Vibecode Kit v6.0

## Vision Proposal Template

```
Chào Chủ nhà!

[IF SCAN REPORT EXISTS]:
Based on the current codebase ([tech stack], [X] modules, [patterns]),
I propose the following VISION:

[IF NEW PROJECT]:
Based on your description and proven patterns, I propose this VISION:

═══════════════════════════════════════════════════════════════
PROJECT: [Name]
NATURE: [Interface type] + [Core lifecycle] + [Scale]
═══════════════════════════════════════════════════════════════

ARCHITECTURE
[Building blocks + how they connect]

USER FLOWS
[Primary journeys per user type]

DESIGN DIRECTION (if UI)
[Layout sketch + visual direction]

TECH STACK
[Stack — reuse from Scan if available, otherwise best fit]

═══════════════════════════════════════════════════════════════

This covers the core structure.
I'll start the RRI interview to discover requirements
and customize the details.
Ready?
```

## Refine Request Template

```
Module [X] is [Y]% complete.

COMPLETED: [X/Y] tasks, [A/B] requirements

DECISIONS NEEDED:
- [Issue 1]: [Options] — I recommend [X] because [reason]
- [Issue 2]: [Options]

DEFERRED (Next phase):
- [Feature 1]: [Reason for deferral]

You want to:
[A] Ship as-is ([Y]%)
[B] Fix [issue 1] (+[X] min)
[C] Fix both [issue 1] + [issue 2] (+[Y] min)
[D] Custom selection
```

## Refine Boundaries

**CAN REFINE** (Contractor creates small TIP):
- Text/copy changes
- Minor color adjustments
- Add/remove content within existing sections
- Fix issues from Verify Report

**CANNOT REFINE** (go back to Step 3 — VISION):
- Add entirely new section/feature
- Change layout/structure
- Change tech stack
- Add new module

## Task Graph Dependency Template

```
TIP-001: Scaffold ──────────────────────────────┐
    │                                            │
    ▼                                            │
TIP-002: Data Layer ───────────┐                 │
    │                          │                 │
    ▼                          ▼                 ▼
TIP-003: Core Logic    TIP-004: Interface   TIP-005: Secondary
    │                          │                 │
    └────────────┬─────────────┘                 │
                 │                               │
                 ▼                               │
           TIP-006: Integration ◄────────────────┘
                 │
                 ▼
           TIP-007: Polish + Test
                 │
                 ▼
           TIP-008: VERIFY
```

## Escalation Templates

### Level 2: Builder → Contractor
```
ESCALATION REPORT — Level 2

TIP: TIP-[XXX]
Issue: [Description]
Category: [Spec ambiguity / Pattern choice / Performance trade-off / Dependency conflict]

Options:
A: [Option A] — Pros: [...] Cons: [...]
B: [Option B] — Pros: [...] Cons: [...]

My recommendation: [Option X] because [reason]
Awaiting Contractor decision.
```

### Level 3: Contractor → Human
```
ESCALATION REPORT — Level 3

Issue: [Description]
Impact: [What's affected]
Category: [Scope change / Architecture / Business rule / Budget / Security]

Options:
A: [Option A] — Impact: [...]
B: [Option B] — Impact: [...]

My recommendation: [Option X] because [reason]
Need your decision to proceed.
```
