# QA Protocol — Vibecode Kit v6.0

## When to Activate
1. **Verify Phase** (Step 7): After all TIPs complete
2. **Milestone-based**: After TIP groups complete, before REFINE, before deploy
3. **On-demand**: User says "nghiệm thu", "test", "QA", "kiểm tra"

## Principles
1. Test per REQUIREMENTS (not just UI) — map to REQ-IDs, TIP ACs, Contract deliverables
2. Tiered approach — Tier 1 must pass before release
3. Evidence-based — Pass = demonstrable + AC met; Fail = evidence + REQ-ID affected
4. Traceability — test case → REQ-ID → RRI question

## 6-Step Process

```
CONTEXT → GENERATE → EXECUTE → REPORT → FIX → VERIFY
```

## Tiered Test Plan

### Tier 1: CORE FUNCTIONALITY (Mandatory)

**Section A: TIP Acceptance Criteria**
- Auto-generate test cases from each TIP's acceptance criteria
- Every Gherkin scenario = one test case
- All must pass

**Section B: Requirement Coverage**
- Map each REQ-ID from RRI Matrix to implemented feature
- Verify: does the implementation satisfy the requirement?
- Coverage target: 100% of P0, >90% of P1

**Section C: Basic Health**
- Application starts without errors
- Core user flow works end-to-end
- Navigation between main areas works
- No placeholder content (Lorem ipsum, TODO markers)
- No broken links or missing assets

### Tier 2: EDGE CASES & ROBUSTNESS (Recommended)

**Section D: RRI Scenario Walkthrough**
- Walk through End User persona flows from RRI
- Test each distinct user type's primary journey
- Verify business rule edge cases from Business Analyst persona

**Section E: Responsive & Cross-platform** (if UI project)
- Mobile: 375px width
- Tablet: 768px width
- Desktop: 1440px width
- Test on target platforms identified in RRI

**Section F: Error Handling**
- Invalid input → appropriate error messages
- Empty states → helpful guidance (not blank screens)
- Loading states → feedback during async operations
- Network errors → graceful degradation
- Concurrent access → no data corruption

### Tier 3: PERFORMANCE & SECURITY (Optional)

**Section G: Performance**
- Initial load within acceptable time
- No layout shift during loading
- Assets optimized (images, bundles)
- No memory leaks in sustained usage

**Section H: Accessibility**
- Keyboard navigation works for core flows
- Alt text on meaningful images
- Color contrast meets WCAG AA
- Heading hierarchy is logical
- Screen reader can navigate core flows

**Section I: Security**
- No secrets in client-side code or console
- Input sanitized against injection
- Authentication/authorization enforced correctly
- Sensitive data not exposed in URLs or logs

## Result Formats

```
PASS — Works as expected + acceptance criteria met
FAIL — Not as expected (describe issue + REQ-ID affected)
SKIP — Not applicable or not yet implemented
PARTIAL — Works but has minor issues
```

## QA Completion Report

```markdown
# QA REPORT: [Project Name]
Date: [Date] | Version: [Version] | Environment: [Local/Staging/Production]

## Summary
| Tier | Passed | Failed | Skip | Total | Status |
|------|--------|--------|------|-------|--------|

Requirement Coverage: [X/Y] = [Z]%
TIP AC Pass Rate: [X/Y] = [Z]%
Overall Status: APPROVED / NEEDS WORK

## Issues — Fixed During QA / Deferred
## Sign-off checklist
- [ ] Tier 1: 100% Pass
- [ ] Critical issues: 0
- [ ] Requirement coverage: >90%
```

## Quick QA (5 minutes)
```
[ ] App runs without console errors
[ ] Main user flow works
[ ] Mobile view not broken (if UI)
[ ] No placeholder content
[ ] Links not broken
[ ] Assets load correctly
[ ] Build succeeds
```

## Responsive Breakpoints (for UI projects)
Mobile: 375×667 (iPhone SE), 390×844 (iPhone 14)
Tablet: 768×1024 (iPad), 1024×1366 (iPad Pro)
Desktop: 1366×768 (Laptop), 1920×1080 (Desktop)
