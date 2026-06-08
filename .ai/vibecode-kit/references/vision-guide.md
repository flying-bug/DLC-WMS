# Vision Guide — Vibecode Kit v6.0

## Purpose

This guide helps the Contractor propose a coherent Vision for ANY type of software project — web app, mobile app, CLI tool, API service, data pipeline, or anything else. Instead of matching against predefined templates, the Contractor analyzes project signals and constructs a vision from first principles.

---

## 4-Step Vision Process

### Step 1: Classify Project Dimensions

Analyze the project across these dimensions to understand its nature:

| Dimension | Question | Examples |
|-----------|----------|----------|
| **Interface** | How do users interact? | Web UI, Mobile, CLI, API-only, Desktop, Embedded |
| **Data flow** | Where does data come from / go to? | User input, External APIs, Database, Files, Streams |
| **User model** | Who uses it and how? | Single user, Multi-tenant, Roles/permissions, Anonymous |
| **Lifecycle** | What's the core loop? | CRUD, Event-driven, Pipeline, Request-response, Realtime |
| **Scale** | What's the expected load? | Personal, Team, Enterprise, Public |
| **State** | Where does state live? | Stateless, Session, Persistent DB, Local storage |

### Step 2: Derive Architecture from Dimensions

Based on the dimension analysis, propose:

**Structure** — What are the major building blocks?
```
Identify:
├── Entry points (pages, routes, commands, endpoints)
├── Core modules (business logic units)
├── Data layer (models, schemas, connections)
├── Integration points (external services, APIs)
└── Cross-cutting concerns (auth, logging, error handling)
```

**User Flows** — What are the primary journeys?
```
For each user type:
├── Entry → What do they see/do first?
├── Core loop → What's their main repeated action?
├── Edge cases → What happens when things go wrong?
└── Exit → How do they finish / leave?
```

### Step 3: Propose Design Direction (if UI project)

For projects with a user interface, propose:

**Layout Pattern** — Sketch the spatial arrangement:
```
Describe using ASCII art:
┌─────────────────────────────────┐
│           [Zone 1]              │
├──────┬──────────────────────────┤
│      │       [Zone 2]           │
│[Nav] │                          │
│      │       [Zone 3]           │
└──────┴──────────────────────────┘
```

**Visual Direction** — Font, color, spacing:

| Element | Decision | Rationale |
|---------|----------|-----------|
| Font pairing | [Heading] + [Body] | [Why this fits] |
| Primary color | [Hex] | [Psychology / brand alignment] |
| Density | Spacious / Compact / Mixed | [Based on content type] |
| Motion | None / Subtle / Expressive | [Based on audience] |

### Step 4: Propose Tech Stack

**Decision framework:**

```
IF existing codebase (from Scan):
  → Reuse existing stack unless there's a strong reason to change
  → Document what to reuse vs what to add

IF new project:
  → Choose based on: requirements, team familiarity, ecosystem maturity
  → Prefer stable, well-documented tools with active communities
  → Always use latest stable versions (not pinned to old versions)
```

---

## Design System Defaults

> **GATE: UI Projects Only.** The following section applies ONLY when the project has a user interface (Web UI, Mobile, Desktop). For CLI tools, APIs, data pipelines, embedded systems, and other non-UI projects, skip this entire section.

### Font Pairing Reference (UI only)

| Style | Heading | Body |
|-------|---------|------|
| Modern Tech | Plus Jakarta Sans | Inter |
| Professional | DM Sans | Source Sans Pro |
| Creative | Playfair Display | Lato |
| Friendly | Poppins | Open Sans |
| Elegant | Cormorant Garamond | Montserrat |
| Startup | Space Grotesk | Work Sans |

### Color Psychology Reference (UI only)

| Purpose | Color | Hex |
|---------|-------|-----|
| Trust / Professional | Blue | #2563EB |
| Energy / Action | Orange | #F97316 |
| Growth / Health | Green | #22C55E |
| Luxury / Premium | Purple | #7C3AED |
| Warning / Urgency | Red | #EF4444 |
| Neutral / Modern | Gray | #6B7280 |

### Common Content Patterns (UI with marketing/landing pages only)

- **Headlines**: [Number] + [Timeframe] + [Outcome] / [Verb] + [Object] + [Benefit]
- **CTA**: [Action verb] + [Value] / [Get] + [Desired outcome]
- **Social Proof**: Logo bar (5-7), Stats (3 numbers), Testimonials (3 with photos)

### Non-UI Project Considerations

For projects without a user interface, focus design direction on:
- **CLI**: Command naming conventions, output formatting (table/json/plain), help text patterns, exit codes
- **API**: Endpoint naming, response format, error schema, versioning strategy, documentation (OpenAPI/Swagger)
- **Data Pipeline**: DAG structure, scheduling, retry policy, monitoring hooks, data quality checks
- **Library/SDK**: Public API surface, naming conventions, documentation, example code

---

## Vision Proposal Output Format

```
Chào Chủ nhà!

Based on [Scan Report / your description], I propose:

═══════════════════════════════════════════════════
PROJECT: [Name]
NATURE: [Interface] + [Lifecycle] + [Scale]
═══════════════════════════════════════════════════

ARCHITECTURE
[Building blocks + how they connect]

USER FLOWS
[Primary journeys per user type]

DESIGN DIRECTION (if UI)
[Layout sketch + visual direction]

TECH STACK
[Stack choices + rationale]

═══════════════════════════════════════════════════

This covers the core structure. I'll start the RRI interview
to discover requirements and customize the details.

Ready?
```
