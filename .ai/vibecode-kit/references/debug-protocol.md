# Debug Protocol — Vibecode Kit v6.0

## When to Activate
1. **Auto-trigger**: Quick fix fails 3rd time → auto-switch to Debug Protocol
2. **Manual-trigger**: User drags prompt into terminal anytime
3. **TIP-BLOCKED**: Builder reports BLOCKED in Completion Report

## Core Principles
1. **Never guess blindly** — Collect evidence, form hypotheses, verify
2. **Collect first, fix later** — Error → Context → Analyze → Hypothesize → Verify → Fix
3. **One change at a time** — Fix 1 thing → Test → Confirm → Continue if needed
4. **Report everything** — Every debug session produces a Completion Report

## 9-Step Process

```
EVIDENCE → CONTEXT → HYPOTHESES → INVESTIGATE → ROOT CAUSE
→ FIX DESIGN → IMPLEMENT → VERIFY → REPORT
```

### Step 1: Evidence Collection
Gather: Error message (full stack trace), Steps to reproduce, Expected vs Actual, Visual evidence (screenshots, network tab, console), Context (when it started, recent changes), TIP history (if in BUILD flow).

### Step 2: Context Gathering
Auto-scan: Related files, Run diagnostic commands (dependency check, type check, git diff HEAD~3), Check Scan Report patterns.

### Step 3: Hypothesis Generation
Classify bug category: RUNTIME, LOGIC, UI/RENDER, API/NETWORK, STATE/DATA, BUILD/CONFIG, TIP CONFLICT.

Present 2-3 hypotheses with confidence levels, supporting evidence, and verification steps.

### Step 4-5: Investigate → Root Cause
Test each hypothesis starting with highest confidence. For each: specific action + command + expected result. Confirm/Reject → proceed accordingly.

Document root cause: what, why (evidence), where (file:line), escalation check (Level 1/2/3).

### Step 6-7: Fix Design → Implement
Document: WHAT changes, WHY it works, SCOPE (files affected, API changes), RISK (side effects, rollback plan), TIP ALIGNMENT (within scope?).

### Step 8-9: Verify → Report
Verification checklist: Bug fixed? No regression? Build passes? TIP acceptance criteria still pass?
Output: Debug Completion Report.

## Common Bug Patterns

### Universal Patterns
| Error Pattern | Likely Cause |
|--------------|-------------|
| Null/None reference error | Data not loaded, async issue, missing initialization |
| Name/symbol not defined | Import missing, typo, scope issue |
| Module/package not found | Wrong path, missing dependency, version mismatch |
| Permission denied / 401/403 | Auth token missing/expired, wrong credentials, RBAC issue |
| Connection refused / timeout | Service not running, wrong port/host, firewall |
| Type mismatch / type error | Wrong type passed, schema drift, serialization issue |
| TIP spec conflict | Spec vs codebase mismatch — escalate to Contractor |

### Web/Frontend Specific
| Error Pattern | Likely Cause |
|--------------|-------------|
| CORS error | Backend config, proxy needed |
| Hydration mismatch | Server/client render difference |
| Infinite re-render / max depth | State update loop, missing dependency array |

### Backend/API Specific
| Error Pattern | Likely Cause |
|--------------|-------------|
| Database connection pool exhausted | Leak, missing close, too many concurrent requests |
| Deadlock detected | Transaction ordering, missing index |
| Serialization error | Circular reference, missing encoder, schema mismatch |

## Investigation Commands

Adapt to your project's tech stack. Common patterns:

```bash
# Universal (all projects)
git diff HEAD~3               # Recent changes
git log --oneline -10         # Commit history

# Dependency check (use whichever applies)
npm list [package]            # Node.js
pip show [package]            # Python
cargo tree -p [package]       # Rust
go list -m all                # Go

# Type/lint check (use whichever applies)
npx tsc --noEmit              # TypeScript
mypy .                        # Python
cargo check                   # Rust
go vet ./...                  # Go

# Build test (use whichever applies)
npm run build                 # Node.js
python -m py_compile file.py  # Python
cargo build                   # Rust
go build ./...                # Go

# Clear cache (use whichever applies)
rm -rf node_modules/.cache .next dist  # Node.js
find . -type d -name __pycache__ -exec rm -rf {} +  # Python
cargo clean                   # Rust
```

## Escalation to Contractor
When stuck, create Debug Escalation Report with: Bug Summary, Evidence Collected, Hypotheses Tested, Current Blocker, Files Involved, TIP Context, Request for analysis.

Contractor responds with Debug TIP: Context analysis, Investigation steps, Likely root cause, Fix strategy, Constraints, Report format.
