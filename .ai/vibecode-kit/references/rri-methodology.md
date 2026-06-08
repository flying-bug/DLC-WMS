# RRI Methodology Family — Vibecode Kit v6.0

## Overview

RRI (Reverse Requirements Interview) is the core discovery methodology. Instead of asking "What do you want?", it asks "I see it like this — correct?"

```
RRI (Requirements Discovery)
  → RRI-T (Quality Verification): "Prove BUILD is CORRECT"
  → RRI-UX (Experience Perfection): "Is the user HAPPY?"
  → RRI-UI (UI Design): RRI-UX + RRI-T combined for UI
```

---

## RRI 3.0: Context-Aware Adaptive Interview

### Philosophy
Instead of 100+ exhausting questions, ask 40-60 smart, context-aware questions in 30-45 minutes.

### Three Layers
- **AUTO-ANSWERED**: From Scan → don't ask again
- **SMART-ASKED**: Contextualized from Scan + Domain knowledge
- **CHALLENGE-PROPOSED**: Propose → Human approves/rejects

### 5 Interview Personas

| Persona | Perspective | Focus |
|---------|------------|-------|
| End User | "If I were the end user..." | UX, workflow, accessibility, mobile, frustrations |
| Business Analyst | "From a business perspective..." | Rules, edge cases, compliance, reporting, ROI |
| QA / Tester | "If I tried to break the system..." | Validation, error handling, security, stress, limits |
| Developer | "With the current codebase..." | Technical debt, performance, scalability, patterns (only with existing codebase) |
| Operator | "When running production..." | Deploy, monitoring, backup, disaster recovery, scaling (optional) |

### 3 Question Modes

| Mode | Speed | When | Example |
|------|-------|------|---------|
| CHALLENGE | Fast | Known patterns | "I propose auto-save every 30s. OK?" |
| GUIDED | Medium | Domain-specific | "Budget approval: 1 level or multi-level?" |
| EXPLORE | Deep | Unknowns | "Describe a typical work day with this module" |

### Question Generation Process

1. **LOAD** base questions by persona (see RRI Question Bank)
2. **FILTER OUT** auto-answered from Scan (~30% reduction)
3. **CONTEXTUALIZE** remaining questions with Scan data
4. **ADD** questions from Scan gaps
5. **PRIORITIZE** by risk: P0 (gaps) → P1 (rules) → P2 (workflow) → P3 (polish)

---

## RRI-T: Testing Methodology

### Formula
5 Personas × 7 Dimensions × 8 Stress Axes = Complete Quality

### 5 Testing Personas
Same as RRI core (End User, BA, QA, Developer, Operator) but focused on testing perspective.

### 7 Testing Dimensions
1. **D1: UI/UX** — Visual, interaction, responsive
2. **D2: Business Logic** — Rules, calculations, workflows
3. **D3: Data Integrity** — CRUD, validation, persistence
4. **D4: Integration** — APIs, third-party, cross-module
5. **D5: Performance** — Load time, scalability, resource usage
6. **D6: Security** — Auth, input sanitization, data protection
7. **D7: Operational** — Deploy, monitoring, backup, recovery

### 8 Stress Axes
1. **TIME** — Peak hours, deadlines, concurrent usage
2. **DATA** — Large datasets, empty states, edge values
3. **ERROR** — Network failure, invalid input, system crashes
4. **COLLABORATION** — Multi-user, conflicts, permissions
5. **EMERGENCY** — Disaster recovery, rollback, data loss
6. **SCALE** — 10x users, 100x data, geographic distribution
7. **COMPLIANCE** — Audit trail, data retention, regulatory
8. **EVOLUTION** — Version upgrades, migration, backward compatibility

### 4-Level Results
- **PASS** ✅ — Works correctly
- **ACCEPTABLE** ⚡ — Works but suboptimal
- **PAINFUL** ⚠️ — Not a bug but causes user friction
- **FAIL** ❌ — Broken or incorrect

---

## RRI-UX: UX Critique Methodology

### Formula
5 UX Personas × 7 UX Dimensions × 8 Flow Physics Axes = Perfect UX

### 5 UX Personas
1. **First-Timer** — Never used the app, onboarding experience
2. **Daily User** — Uses daily, efficiency and muscle memory
3. **Power User** — Pushes limits, shortcuts, advanced features
4. **Reluctant User** — Forced to use, low motivation, frustration tolerance
5. **Accessibility User** — Screen reader, keyboard only, color blind, motor impaired

### 7 UX Dimensions
1. **Discoverability** — Can users find features?
2. **Learnability** — How fast do users learn?
3. **Efficiency** — How many steps for common tasks?
4. **Error Prevention** — Does UI prevent mistakes?
5. **Recovery** — Can users undo/recover from errors?
6. **Satisfaction** — Does it feel good to use?
7. **Consistency** — Are patterns consistent throughout?

### 8 Flow Physics Axes
1. **FRICTION** — Unnecessary steps, confusing UI
2. **COGNITIVE LOAD** — Too much info, complex decisions
3. **INTERRUPTION** — Popups, unnecessary confirmations
4. **DEAD ENDS** — No way forward, unclear next action
5. **SPEED BUMPS** — Loading, waiting, slow transitions
6. **ANXIETY** — Uncertainty, fear of data loss, unclear consequences
7. **FRUSTRATION** — Repetitive tasks, lost work, unclear errors
8. **DELIGHT** — Positive surprises, smooth animations, helpful defaults

---

## RRI-UI: UI Design Methodology

Combines RRI-UX (critique before design) + RRI-T D1:UI/UX (testing after design) into a single pipeline that runs BEFORE and DURING the design process.

### Pipeline
1. **Phase 0: Setup** — Gather RRI output, wireframes, business rules
2. **Phase 1: RRI-UX Critique** — Run all 5 UX Personas × 7 Dimensions × 8 Axes on proposed design
3. **Phase 2: Design Iteration** — Fix violations found in Phase 1
4. **Phase 3: RRI-T Validation** — Run testing dimensions on implemented design
5. **Phase 4: Final Polish** — Address remaining issues

### Key Insight
RRI-UX finds UX anti-patterns BEFORE coding.
RRI-T validates correctness AFTER coding.
Together they ensure both good design AND correct implementation.
