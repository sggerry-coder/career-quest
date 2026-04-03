# Phase 4: Quality Audit - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Code quality review, test coverage gaps, performance check, and robustness hardening. This is a hardening phase — no new user-facing features. Focus on dead code removal, error boundaries, bundle audit, and filling remaining test gaps.

</domain>

<decisions>
## Implementation Decisions

### Audit Priority
- **D-01:** Prioritize AUDIT-01 (dead code/conventions) and AUDIT-04 (error boundaries) as primary targets. AUDIT-02 (test coverage) and AUDIT-03 (performance) are partially addressed by Phase 3 — fill remaining gaps but don't over-invest.

### Error Boundary Strategy
- **D-02:** Per-section error boundaries — wrap chart groups, quest flow sections, and persistence areas. A crashing chart section doesn't take down the whole page, but individual charts are NOT wrapped separately.
- **D-03:** Fallback UI: "Something went wrong" message with a retry button per section. Not silent degradation — students should know something broke and have a recovery path.

### Performance & Bundle
- **D-04:** Audit bundle size and ensure no unnecessary imports. Remove unused imports, check for tree-shaking issues (e.g., importing entire libraries when only a function is needed). canvas-confetti and framer-motion are the heaviest deps — verify they're dynamically imported or tree-shaken where possible.
- **D-05:** Fix all issues found during bundle audit — not just flag them.
- **D-06:** No specific animation jank to investigate. No re-render profiling unless bundle audit reveals a hot path. Focus on import hygiene over runtime profiling.

### Test Coverage Gaps
- **D-07:** Phase 3 added 165 tests (840 total). Remaining gaps: boundary values (score exactly 0 or 100), single-response sets, and any untested public functions discovered during AUDIT-01 dead code review.

### Claude's Discretion
- Which specific files have dead code — discover and remove during execution
- Exact error boundary component implementation pattern
- Which scoring edge cases are still untested — find and fill gaps
- Bundle analysis tooling choice (e.g., `next build --analyze` or `@next/bundle-analyzer`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` — Known tech debt and bugs (some already fixed in Phases 1-3)
- `.planning/codebase/CONVENTIONS.md` — Naming and code style patterns to enforce
- `.planning/codebase/STRUCTURE.md` — File organization to validate against

### Prior Phase Artifacts
- `.planning/phases/03-scoring-quality/03-VERIFICATION.md` — What Phase 3 already verified (scoring coverage)
- `.planning/phases/02-session-completion-persistence/02-VERIFICATION.md` — What Phase 2 verified (persistence/error handling)

### Scoring Modules (test coverage audit)
- `lib/scoring/__tests__/` — All existing scoring test files
- `hooks/__tests__/use-scores.test.ts` — Undo tests from Phase 3

### UI Components (error boundary targets)
- `app/quest/session/[id]/page.tsx` — Main quest flow (section: question flow, reveal, confirmatory)
- `app/quest/dashboard/page.tsx` — Dashboard (section: charts, quest log, badges)
- `components/quest/reveal-sequence.tsx` — Reveal (section: chart cards, completion)

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Error classification (`lib/validation/error-classification.ts`) — can inform error boundary retry logic
- PersistenceBanner pattern (`components/ui/persistence-banner.tsx`) — reference for error fallback UI style
- 840 tests across 68 files — strong baseline, focus on gaps not rewrites

### Established Patterns
- `"use client"` directive on all interactive components — error boundaries must also be client components
- Silent catch with fallback rendering (project convention) — error boundaries formalize this pattern
- Dynamic imports used for canvas-confetti — extend this pattern for other heavy deps if needed

### Integration Points
- Error boundaries wrap existing page sections — no new routes or providers needed
- Bundle audit may reveal unused imports in `app/` and `components/` — straightforward cleanup
- Test gap filling extends existing `__tests__/` directories

</code_context>

<specifics>
## Specific Ideas

- User wants all bundle issues fixed, not just flagged
- Per-section error boundaries: chart groups, quest flow, persistence — not per-chart granularity
- Prioritize AUDIT-01 and AUDIT-04 since AUDIT-02 and AUDIT-03 are partially done

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-quality-audit*
*Context gathered: 2026-04-03*
