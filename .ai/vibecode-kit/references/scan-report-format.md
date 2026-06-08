# Scan Report Format — Vibecode Kit v6.0

> **Note:** The canonical Scan Report format is defined in `tip-and-report-formats.md`.
> This file provides additional guidance on scan types and contractor response.

## When to Scan

| Scenario | Scan Type |
|----------|-----------|
| Brand new project | LIGHT SCAN (verify empty folder) |
| Existing codebase | FULL SCAN |
| Adding module to existing project | FOCUSED SCAN (relevant areas) |

## Scan Instruction for Builder

See `tip-and-report-formats.md` → Scan Instruction section for the full instruction to give to Builder.

Key tasks:
1. Scan folder structure → report tree (max 3 levels)
2. Read project manifest (package.json / pyproject.toml / Cargo.toml / go.mod / etc.) → tech stack + dependencies
3. List existing routes/pages/entry points/commands
4. Identify patterns (auth, API, DB, state management, config)
5. Read README / docs / CHANGELOG if present
6. Check existing tests
7. Find .env.example or config templates → list required env vars
8. Assess code health (type safety, linting, debug artifacts, TODO count)

## Output Format

See `tip-and-report-formats.md` → Scan Report Format for the canonical output format.

## Contractor Response After Receiving Scan Report

```
Chủ nhà, I've received the Scan Report from the Builder.

CODEBASE OVERVIEW:
[Brief summary from Scan Report]

Based on the scan, I will:
- Skip [X] questions already answered by codebase
- Contextualize questions based on detected patterns
- Add questions about discovered gaps

Ready for RRI interview?
```
