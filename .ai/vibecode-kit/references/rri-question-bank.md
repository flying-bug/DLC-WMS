# RRI Universal Question Bank — Vibecode Kit v6.0

## How to Use

These questions are organized by **persona**, not by project type. The Contractor selects and adapts questions based on:
1. What the Scan revealed (auto-answer what's already known)
2. What the project context requires (skip irrelevant dimensions)
3. Risk priority: P0 (critical gaps) → P1 (business rules) → P2 (workflow) → P3 (polish)

Target: 40-60 smart questions in 30-45 minutes.

---

## End User Persona

### Identity & Context
- Who are the primary users? How many distinct user types?
- What's their technical proficiency level?
- What environment do they use this in? (office, mobile, field, etc.)
- Usage frequency? (daily / weekly / ad-hoc / seasonal)

### Workflow & Goals
- What's the user's main goal when they open this?
- Describe a typical end-to-end workflow
- What are they doing BEFORE and AFTER using this? (context switching)
- What's the most critical action they perform?

### Pain Points & Expectations
- Current frustrations with existing solutions (if replacing something)?
- What would make them abandon this tool?
- What would delight them beyond basic functionality?
- Speed expectations? (instant / acceptable wait / batch processing OK)

### Access & Devices
- Primary device: desktop, tablet, mobile, or mixed?
- Offline access needed?
- Accessibility requirements? (screen reader, keyboard-only, color blind)
- Language / localization needs?

---

## Business Analyst Persona

### Goals & Metrics
- What is the primary business goal?
- How will success be measured? (KPIs, metrics, conversion targets)
- What's the business impact if this fails or is delayed?
- Revenue model: direct sales, subscriptions, leads, internal efficiency?

### Rules & Logic
- Top 3-5 most important features? (prioritized)
- Complex business rules? (approval workflows, calculations, conditional logic)
- Data relationships: what entities exist and how do they connect?
- Reporting / analytics requirements?

### Compliance & Constraints
- Regulatory / compliance requirements? (GDPR, HIPAA, SOC2, industry-specific)
- Audit trail needed?
- Data retention policies?
- Budget or timeline constraints affecting scope?

### Stakeholders & Process
- Who approves / reviews the output?
- Integration with existing business processes?
- Notification / alerting requirements?
- Export / import: what data formats are needed?

---

## QA / Tester Persona

### Input Validation & Boundaries
- What are the valid input ranges and formats?
- Expected behavior for empty states?
- Maximum data volumes to handle?
- Concurrent user expectations?

### Error Handling
- How should errors be communicated to users?
- Error messages language?
- Recovery options: retry, undo, rollback?
- Graceful degradation: what happens when dependencies fail?

### Security & Data
- Data sensitivity level? (public, internal, PII, financial, health)
- Authentication method? (email/password, SSO, OAuth, API key)
- Authorization model? (roles, permissions, row-level access)
- Input sanitization concerns?

### Quality Gates
- Performance targets? (response time, throughput, memory usage, load time if UI)
- Uptime / availability requirements?
- Platform support matrix? (browsers/devices for UI; OS/runtime versions for CLI/API; cloud providers for infra)
- Automated testing expectations? (unit, integration, e2e, contract tests)

---

## Developer Persona

### Architecture & Patterns (from Scan if available)
- Which existing patterns to reuse?
- Technical debt that should be addressed first?
- Performance bottlenecks in current codebase?
- Dependency health: outdated packages, security vulnerabilities?

### Code Quality
- Type safety requirements? (strict mode, type hints, schemas, etc.)
- Linting / formatting standards?
- Test coverage expectations?
- Documentation standards? (inline, API docs, README)

### Integration
- External APIs / services to integrate with?
- Authentication with external services?
- Data synchronization strategy?
- Webhook / event handling needs?

### Developer Experience
- Local development setup complexity acceptable?
- CI/CD pipeline requirements?
- Feature flags / staged rollout needed?
- Logging / debugging tools?

---

## Operator Persona

### Deployment & Infrastructure
- Deploy target: cloud (which provider?), self-hosted, hybrid?
- Containerization needed? (Docker, K8s)
- Environment count: dev, staging, production?
- Deployment frequency and strategy? (blue-green, canary, rolling)

### Monitoring & Observability
- Monitoring requirements? (uptime, errors, performance)
- Alerting thresholds and channels?
- Log aggregation needs?
- Tracing / APM requirements?

### Backup & Recovery
- Backup strategy and frequency?
- RPO (Recovery Point Objective) and RTO (Recovery Time Objective)?
- Disaster recovery plan?
- Data migration / rollback strategy?

### Scaling
- Expected growth trajectory?
- Auto-scaling requirements?
- Cost constraints?
- Geographic distribution needs? (CDN, multi-region)

---

## Question Mode Guide

| Mode | When to Use | Example |
|------|-------------|---------|
| **CHALLENGE** | Known patterns, common choices | "I propose JWT auth with refresh tokens. OK?" |
| **GUIDED** | Domain-specific, multiple valid options | "For data export: CSV only, or also PDF and Excel?" |
| **EXPLORE** | Unknowns, complex workflows | "Describe what happens when an order is disputed" |
