---
phase: 03-scoring-quality
plan: 02
subsystem: scoring
tags: [mbti, riasec, mi, values, nan-guard, emerging-type]

# Dependency graph
requires:
  - phase: 02-session-completion
    provides: Session completion flow with reveal-sequence and dashboard
provides:
  - deriveEmergingType with rawCounts parameter and hasEmerging return
  - NaN guards on all calculateAll* scoring functions
  - Still Emerging pill on EmergingType component
  - Canonical scoring imports in reveal-sequence and dashboard (no duplicates)
affects: [03-scoring-quality, dashboard, reveal-sequence]

# Tech tracking
tech-stack:
  added: []
  patterns: [Number.isFinite guard pattern for scoring outputs, rawCounts-aware MBTI emerging detection]

key-files:
  created:
    - lib/scoring/__tests__/nan-guard.test.ts
  modified:
    - lib/scoring/mbti.ts
    - lib/scoring/riasec.ts
    - lib/scoring/mi.ts
    - lib/scoring/values.ts
    - lib/scoring/__tests__/mbti.test.ts
    - components/charts/emerging-type.tsx
    - components/quest/reveal-sequence.tsx
    - app/quest/dashboard/page.tsx

key-decisions:
  - "rawCounts parameter optional with Infinity default for backward compatibility"
  - "Dashboard calls deriveEmergingType without rawCounts since persisted scores are already final"
  - "Zero-score frameworks show 'Answer more questions to refine' hint in reveal sequence"

patterns-established:
  - "NaN guard: Number.isFinite(score) ? score : 0 in all calculateAll* functions"
  - "Canonical scoring imports: all components use lib/scoring/* instead of local duplicates"

requirements-completed: [SCORE-01, SCORE-03]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 3 Plan 2: Still Emerging MBTI Label and NaN Safety Guards Summary

**Raw-count-aware "Still Emerging" MBTI indicator with NaN safety guards across all scoring functions and canonical import consolidation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-03T05:44:15Z
- **Completed:** 2026-04-03T05:48:33Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- deriveEmergingType now accepts optional rawCounts and returns hasEmerging boolean; dichotomies with fewer than 3 raw responses are forced to underscore regardless of score magnitude
- All four calculateAll* scoring functions (RIASEC, MI, MBTI, Values) guard against NaN with Number.isFinite pattern
- EmergingType component displays "Still Emerging" pill with explanatory subtext when any dichotomy is underdetermined
- Removed duplicated deriveClassLabel and deriveEmergingTypeCode from both reveal-sequence.tsx and dashboard/page.tsx, replaced with canonical lib/scoring imports
- Zero-score chart sections show "Answer more questions to refine" hint

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for rawCounts and NaN guards** - `3136961` (test)
2. **Task 1 (GREEN): deriveEmergingType rawCounts + NaN guards** - `6bb6dcb` (feat)
3. **Task 2: Still Emerging pill + consolidate imports** - `b6c6285` (feat)

_Note: Task 1 followed TDD with RED and GREEN commits._

## Files Created/Modified
- `lib/scoring/mbti.ts` - deriveEmergingType with rawCounts, hasEmerging return, NaN guard
- `lib/scoring/riasec.ts` - NaN guard on calculateAllRiasec
- `lib/scoring/mi.ts` - NaN guard on calculateAllMi
- `lib/scoring/values.ts` - NaN guard on calculateAllValues
- `lib/scoring/__tests__/mbti.test.ts` - New tests for rawCounts-aware deriveEmergingType
- `lib/scoring/__tests__/nan-guard.test.ts` - Cross-cutting NaN safety tests for all scoring functions
- `components/charts/emerging-type.tsx` - hasEmerging prop, Still Emerging pill
- `components/quest/reveal-sequence.tsx` - Canonical imports, mbti_raw counting, zero-score labels
- `app/quest/dashboard/page.tsx` - Canonical imports, hasEmerging passthrough

## Decisions Made
- Made rawCounts optional with Infinity default so existing callers are not broken
- Dashboard does not pass rawCounts since persisted scores are already final (only score threshold used)
- Extended reveal-sequence local ScoreState to include mbti_raw for raw count computation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test expectations for MBTI pole mapping**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** Plan test expectations had TF:-50 mapping to F, but DICHOTOMY_POLES maps negative TF to T (first letter)
- **Fix:** Corrected test expectations from "INFP" to "INTP" for scores {EI:-80, SN:60, TF:-50, JP:70}
- **Files modified:** lib/scoring/__tests__/mbti.test.ts
- **Verification:** Tests pass with correct pole mapping
- **Committed in:** 3136961 (RED phase commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test expectation correction only. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All scoring functions are NaN-safe and produce finite numbers for any input
- MBTI emerging type detection uses canonical single source of truth
- Ready for any additional scoring quality improvements or next phase work

---
## Self-Check: PASSED

All 9 files verified present. All 3 commit hashes verified in git log.

---
*Phase: 03-scoring-quality*
*Completed: 2026-04-03*
