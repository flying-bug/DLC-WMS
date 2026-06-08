# X-Ray Protocol — Vibecode Kit v6.0

## When to Activate
1. **Handover**: Transfer project to another team/client
2. **Upgrade Planning**: Major upgrade, technical debt assessment, refactoring plan
3. **Onboarding**: New developer joining project
4. **Archive**: Project archival
5. **Pre-build Scan**: Before adding new module to existing project → outputs SCAN REPORT for Contractor

## Goals
After completion, the receiver can:
1. Understand what the project does and why
2. Know the structure and how parts connect
3. Run the project locally
4. Fix basic bugs
5. Add new features
6. Deploy when needed
7. Understand RRI requirements behind each feature
8. Know TIP history — who built what, when

## 6-Step Process

```
SCAN → ANALYZE → DOCUMENT → TRACE → PACKAGE → VERIFY
```

### Step 1: Project Scan
Output the full Scan Report (tech stack, codebase metrics, modules, patterns, reusable components, gaps, code health, environment).

### Step 2: Deep Analysis
Generate: Project Overview, Architecture Diagram (ASCII), Key Dependencies, Data Flow diagram.

### Step 3: Documentation
Create `PROJECT_XRAY.md` with sections:
1. Overview
2. Quick Start
3. Architecture
4. Key Components
5. API Reference
6. Database Schema
7. Environment Variables
8. Build History (TIP Traceability) — since v5.0
9. Requirements Traceability (RRI) — since v5.0
10. Deployment
11. Common Tasks
12. Troubleshooting
13. Future Improvements

### Step 4: Trace (Vibecode projects only)
Map: TIP files → files changed → requirements implemented.
Extract from Completion Reports, RRI Report, Verify Report, Debug Reports.
Output: Build Traceability Section in PROJECT_XRAY.md.

### Step 5: Package
Handover Package Checklist:
- Documentation: PROJECT_XRAY.md, README.md, CHANGELOG.md, .env.example
- Vibecode Artifacts: RRI Report, Blueprint, Contract, TIP History, Verify Report, Debug Reports
- Code Quality: No debug console.logs, no unnecessary commented code, no critical TODOs, 0 TypeScript errors, 0 lint errors
- Deployment: Build works, no build errors, env vars documented
- Memory Capture: Patterns, common issues, tech choices documented

### Step 6: Verification
Fresh clone test: Clone → Follow README → npm install → npm run dev → All features work?
Traceability check: Feature → REQ-ID → RRI question traceable?

## Code Health Indicators

**Healthy**: TypeScript strict, ESLint configured, Tests present, README updated, No critical TODOs, Vibecode artifacts present

**Needs Attention**: Some console.logs, Outdated dependencies, Missing documentation, Few/no tests

**Technical Debt**: `any` type everywhere, No error handling, Hardcoded values, No env vars, Commented-out code blocks

## Security Checklist
- No secrets in code (API keys, passwords)
- No .env files committed
- .gitignore includes sensitive files
- No known vulnerabilities (npm audit)
- Auth properly implemented
- Input validation present
- CORS properly configured
