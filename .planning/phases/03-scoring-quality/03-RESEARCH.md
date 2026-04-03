# Phase 3: Scoring Quality - Research

**Researched:** 2026-04-03
**Domain:** Client-side scoring correctness, undo reversal, edge case handling
**Confidence:** HIGH

## Summary

Phase 3 hardens three specific scoring quality issues: MBTI "still emerging" presentation (SCORE-01), multi-framework undo reversal (SCORE-02), and empty/minimal data handling in charts and scoring functions (SCORE-03). All three requirements are well-bounded -- they touch existing code with clear bug locations and existing test coverage to extend.

The codebase already has the right architecture for these fixes. Scoring functions already return 0 for empty arrays. The `deriveEmergingType` function already produces `_` for underdetermined dichotomies. The primary gaps are: (1) no raw-count check in the emerging logic, (2) `removeLastResponse` does not handle multi-signal or ipsative undo, (3) `handleUndo` in the session page dispatches UNDO to quest state but never calls `removeLastResponse` on score state, and (4) chart components lack explicit NaN clamping on their score consumption.

**Primary recommendation:** Fix the three bugs in priority order -- undo reversal first (highest complexity), then emerging label, then NaN guards -- with edge case tests for each.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: "Still Emerging" pill/badge next to the type code on dashboard and reveal. Not a tooltip (too hidden for teens), not a banner (too alarming). Brief explanatory subtext.
- D-02: Threshold stays at 35. If fewer than 3 raw responses for a dichotomy, force `_` regardless of score magnitude.
- D-03: Undo MUST reverse ALL framework signals atomically. Store the full signal footprint per response so undo knows what to reverse.
- D-04: Ipsative undo pops ranked scores from `riasec_ipsative_raw`. No change to undo availability.
- D-05: System provides enough questions -- defensive UI is safety net only.
- D-06: Charts clamp scores to 0 (no NaN). Zero-response frameworks show chart at all-zero with "Answer more questions to refine" label.
- D-07: Division-by-zero guards in all `calculateAll*` functions -- return 0 for empty input arrays.

### Claude's Discretion
- "Still emerging" visual treatment (pill vs badge vs inline label) -- choose what fits the dark theme
- Undo signal storage structure -- choose the cleanest approach
- Which chart components need NaN guards -- scan and fix all

### Deferred Ideas (OUT OF SCOPE)
- Minimum coverage gate before allowing completion (flow engine change, not scoring)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCORE-01 | MBTI results prominently display "emerging" label when fewer than 3 questions per dichotomy answered | `deriveEmergingType` in `lib/scoring/mbti.ts` already produces `_` via score threshold; needs raw count check added. `EmergingType` component needs "Still Emerging" pill. Dashboard `deriveEmergingTypeCode` duplicates this logic and needs same fix. |
| SCORE-02 | Undo correctly reverses all framework signal scores, not just one framework | `removeLastResponse` in `use-scores.ts` only handles single-framework (riasec/mbti/values). Multi-signal warmup/MI questions via `processResponseWithSignals` touch riasec + MI + strengths atomically -- undo must mirror this. Additionally, `handleUndo` in session page dispatches UNDO but never calls `removeLastResponse`. Ipsative undo not implemented at all. |
| SCORE-03 | Graceful handling for empty/minimal response sets (no NaN, no blank charts) | All `calculateAll*` functions already return 0 for empty arrays. Chart components use `?? 0` but `Math.round(NaN)` produces NaN. Need defensive `Math.max(0, score)` or `isNaN` guards at chart consumption points. |
</phase_requirements>

## Architecture Patterns

### Bug Location Map

```
SCORE-01 (Emerging label):
  lib/scoring/mbti.ts              -- Add raw count param to deriveEmergingType
  components/charts/emerging-type.tsx  -- Add "Still Emerging" pill
  components/charts/mbti-sliders.tsx   -- Already has per-dichotomy "Still emerging..." text
  components/quest/reveal-sequence.tsx -- Duplicated deriveEmergingTypeCode (line 80-95)
  app/quest/dashboard/page.tsx         -- Duplicated deriveEmergingTypeCode (line 86-102)

SCORE-02 (Undo reversal):
  hooks/use-scores.ts              -- removeLastResponse needs multi-signal + ipsative support
  app/quest/session/[id]/page.tsx  -- handleUndo (line 370) dispatches UNDO but NEVER calls removeLastResponse
  hooks/use-quest-state.ts         -- UNDO action pops responses array (quest state side is fine)

SCORE-03 (NaN/empty guards):
  lib/scoring/riasec.ts            -- calculateRiasecType already returns 0 for empty
  lib/scoring/mi.ts                -- calculateMiDimension already returns 0 for empty, guards maxWeight=0
  lib/scoring/mbti.ts              -- calculateMbtiDichotomy already returns 0 for empty
  lib/scoring/values.ts            -- calculateValuesDimension already returns 0 for empty
  components/charts/riasec-bars.tsx -- Uses Math.round(scores[key] ?? 0) -- safe if scores exist
  components/charts/mi-preview-bars.tsx -- Uses Math.round(scores[key] ?? 0) -- same
  components/charts/mbti-sliders.tsx -- Uses scores[key] ?? 0 -- safe
  components/charts/values-sliders.tsx -- Uses scores[key] ?? 0 -- safe
```

### Pattern: Signal Footprint for Undo

The core pattern for SCORE-02 is storing what each response touched so undo can reverse it:

```typescript
// Extend ClientResponse or create a parallel tracking array
interface ResponseSignalFootprint {
  question_id: string;
  // What was added to each raw array (for precise reversal)
  riasec_additions: Record<string, number[]>;  // e.g., { R: [4] }
  mi_additions: Record<string, number[]>;      // e.g., { bodily: [2] }
  mbti_additions: Record<string, number[]>;    // e.g., { EI: [-2] }
  values_additions: Record<string, number[]>;  // e.g., { solo_team: [1] }
  ipsative_additions: Record<string, number[]>; // e.g., { R: [5], I: [3], A: [1] }
  strength_signal?: string;                    // e.g., "curiosity"
}
```

The cleanest approach: add a `signal_history: ResponseSignalFootprint[]` array to `ScoreState`. Each `processResponse`, `processResponseWithSignals`, and `processIpsativeResponse` call pushes a footprint. Undo pops the last footprint and reverses exactly what was recorded.

**Why this is better than re-deriving from the response:** Multi-signal questions (warmup) have `framework_signals` on the *question option*, not on the `ClientResponse`. The response only stores `framework: "multi"` and `response_value`. Without the footprint, undo would need access to the original question definition to know what signals were applied.

### Pattern: Emerging Type with Raw Count Check

```typescript
// Modified deriveEmergingType signature
export function deriveEmergingType(
  scores: Record<string, number>,
  rawCounts: Record<string, number>  // NEW: count of raw responses per dichotomy
): { type: string; display: string; hasEmerging: boolean } {
  const letters: string[] = [];
  let hasEmerging = false;

  for (const dichotomy of MBTI_DICHOTOMIES) {
    const score = scores[dichotomy] ?? 0;
    const count = rawCounts[dichotomy] ?? 0;
    // D-02: raw count < 3 forces emerging regardless of score magnitude
    if (count < 3 || isStillEmerging(score)) {
      letters.push("_");
      hasEmerging = true;
    } else {
      const [negativeLetter, positiveLetter] = DICHOTOMY_POLES[dichotomy];
      letters.push(score < 0 ? negativeLetter : positiveLetter);
    }
  }

  return { type: letters.join(""), display: letters.join(" "), hasEmerging };
}
```

The `hasEmerging` boolean is returned so the UI knows whether to show the "Still Emerging" pill.

### Anti-Patterns to Avoid
- **Duplicated scoring logic:** `reveal-sequence.tsx` and `dashboard/page.tsx` both duplicate `deriveEmergingTypeCode` and `deriveClassLabel`. Phase 3 should consolidate these to use the canonical `lib/scoring/mbti.ts` export. Otherwise the raw-count fix has to be applied in 3 places.
- **Undo via full recomputation from responses:** Tempting but wrong. Recomputing all scores from the responses array requires access to each question's `framework_signals`, which are not stored on `ClientResponse`. The footprint approach avoids this dependency.
- **NaN guards in every chart component:** The guard belongs in the scoring functions and/or `useScores` hook, not scattered across chart components. Charts should receive clean data.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signal footprint tracking | Custom undo diffing system | Simple append/pop array on ScoreState | Keeps undo O(1) and avoids recomputing from response history |
| NaN clamping | Per-component NaN checks | Single guard in each `calculateAll*` or a `sanitizeScores` wrapper | Centralizes defense, chart components stay clean |

## Common Pitfalls

### Pitfall 1: handleUndo Never Calls removeLastResponse
**What goes wrong:** The UNDO dispatch removes the response from `QuestState.responses` and decrements the index, but score state is never updated. After undo, the student's scores still reflect the undone answer.
**Why it happens:** `handleUndo` only dispatches to the quest reducer. The score state lives in a separate `useState` via `useScores()` hook -- it's not connected.
**How to avoid:** `handleUndo` must (1) get the last response from quest state, (2) call `removeLastResponse` (or the new multi-signal undo), and (3) dispatch UNDO.
**Warning signs:** Undo appears to work (question goes back) but score charts don't change.

### Pitfall 2: Duplicated Scoring Functions in reveal-sequence.tsx and dashboard
**What goes wrong:** The raw-count check for SCORE-01 is added to `lib/scoring/mbti.ts` but the duplicated `deriveEmergingTypeCode` in `reveal-sequence.tsx` (line 80) and `dashboard/page.tsx` (line 86) still use the old threshold-only logic.
**Why it happens:** Copy-paste of scoring logic into component files instead of importing from canonical modules.
**How to avoid:** Delete the duplicated functions and import from `lib/scoring/mbti.ts`. Same for `deriveClassLabel` duplicated in `reveal-sequence.tsx` (line 52) -- import from `lib/scoring/riasec.ts`.
**Warning signs:** Reveal sequence and dashboard show different MBTI codes for the same data.

### Pitfall 3: structuredClone Performance in Undo Path
**What goes wrong:** `removeLastResponse` calls `structuredClone(prev)` on every undo. With large raw arrays, this is fine for Session 1 (small data). But the pattern is set for future sessions.
**Why it happens:** `structuredClone` is the established pattern in `use-scores.ts` for all state updates.
**How to avoid:** Keep using `structuredClone` -- it's correct and fast enough for this data size. Don't optimize prematurely.
**Warning signs:** None for Phase 1 scope.

### Pitfall 4: NaN from Upstream, Not from Scoring Functions
**What goes wrong:** The `calculateAll*` functions already return 0 for empty arrays. But if a score key is entirely *missing* from the Record (not just empty array), `scores[key]` returns `undefined`, and `Math.round(undefined)` returns `NaN`.
**Why it happens:** Charts use `scores[key] ?? 0` which handles `undefined`. But if someone passes a score object without all keys, the `?? 0` fallback works. The real NaN risk is if a scoring function somehow returns NaN (e.g., 0/0 in a formula).
**How to avoid:** Add explicit `isNaN` or `Number.isFinite` guards as a safety net in each `calculateAll*` function's output, clamping any NaN to 0. This is belt-and-suspenders with the existing empty-array check.
**Warning signs:** Charts showing "NaN" text or bars with 0-width when they should show a value.

## Code Examples

### Example 1: Wiring handleUndo to Score State

```typescript
// In app/quest/session/[id]/page.tsx
const handleUndo = useCallback((): void => {
  const lastResponse = questState.responses[questState.responses.length - 1];
  if (!lastResponse) return;
  
  // Reverse score state FIRST (needs the response to know what to pop)
  removeLastResponse(lastResponse);  // or the new multi-signal variant
  
  // Then reverse quest state
  dispatch({ type: "UNDO" });
}, [dispatch, questState.responses, removeLastResponse]);
```

### Example 2: NaN Safety Net in Scoring Output

```typescript
// Add to each calculateAll* function, e.g. calculateAllRiasec
export function calculateAllRiasec(raw: Record<string, number[]>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    const score = calculateRiasecType(raw[type] || []);
    result[type] = Number.isFinite(score) ? score : 0;
  }
  return result;
}
```

### Example 3: Still Emerging Pill Component

```tsx
// In components/charts/emerging-type.tsx
{hasEmerging && (
  <div className="mt-2 flex flex-col items-center gap-1">
    <span className="rounded-full bg-white/10 border border-white/20 px-3 py-0.5 text-xs font-medium text-white/60">
      Still Emerging
    </span>
    <p className="text-xs text-white/30 max-w-[200px] text-center">
      Some preferences need more data to pin down
    </p>
  </div>
)}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest inferred from package.json |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test -- --run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCORE-01a | `deriveEmergingType` forces `_` when rawCount < 3 regardless of score | unit | `npx vitest run lib/scoring/__tests__/mbti.test.ts -t "raw count"` | Wave 0 |
| SCORE-01b | `hasEmerging` is true when any dichotomy is underdetermined | unit | `npx vitest run lib/scoring/__tests__/mbti.test.ts -t "hasEmerging"` | Wave 0 |
| SCORE-02a | `removeLastResponse` reverses multi-signal response (riasec + MI + strengths) | unit | `npx vitest run hooks/__tests__/use-scores.test.ts -t "multi-signal undo"` | Wave 0 |
| SCORE-02b | `removeLastResponse` reverses ipsative response | unit | `npx vitest run hooks/__tests__/use-scores.test.ts -t "ipsative undo"` | Wave 0 |
| SCORE-02c | Undo with empty response history is no-op | unit | `npx vitest run hooks/__tests__/use-scores.test.ts -t "empty undo"` | Wave 0 |
| SCORE-03a | `calculateAllRiasec` returns 0 for all types when all arrays empty | unit | `npx vitest run lib/scoring/__tests__/riasec.test.ts -t "empty"` | Likely exists |
| SCORE-03b | `calculateAllMbti` returns 0 for all dichotomies when arrays empty | unit | `npx vitest run lib/scoring/__tests__/mbti.test.ts -t "empty"` | Exists |
| SCORE-03c | No NaN in any scoring function output for any input | unit | `npx vitest run lib/scoring/__tests__/nan-guard.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `hooks/__tests__/use-scores.test.ts` -- covers SCORE-02 undo reversal (file may not exist yet)
- [ ] Additional test cases in `lib/scoring/__tests__/mbti.test.ts` for raw count threshold
- [ ] `lib/scoring/__tests__/nan-guard.test.ts` -- cross-cutting NaN safety tests

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Score threshold only for emerging | Score threshold + raw count < 3 | Phase 3 | More honest MBTI reporting with tiny samples |
| Single-framework undo | Multi-framework atomic undo via signal footprint | Phase 3 | Correct score reversal for warmup/MI questions |
| Trust scoring output is clean | NaN guards as safety net | Phase 3 | Prevents blank/broken chart renders |

## Open Questions

1. **Dashboard deriveEmergingTypeCode duplication**
   - What we know: Dashboard and reveal-sequence both duplicate `deriveEmergingTypeCode` and `deriveClassLabel` from scoring modules
   - What's unclear: Whether consolidating these is in scope for Phase 3 or Phase 4 (AUDIT-01)
   - Recommendation: Consolidate during Phase 3 since the SCORE-01 fix requires touching these functions anyway. Leaving duplicates means the raw-count fix must be applied in 3 places.

2. **Score state not connected to undo dispatch**
   - What we know: `handleUndo` dispatches UNDO to quest reducer but never calls `removeLastResponse`. This means undo is currently broken for scores.
   - What's unclear: Whether this was intentional (scores auto-recompute from responses?) -- but they don't. Scores are accumulated incrementally.
   - Recommendation: This is the SCORE-02 bug. Fix by calling removeLastResponse before dispatching UNDO.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all files listed in Canonical References
- `lib/scoring/mbti.ts` -- `deriveEmergingType` logic verified line by line
- `hooks/use-scores.ts` -- `removeLastResponse` gaps confirmed via code read
- `app/quest/session/[id]/page.tsx` -- `handleUndo` confirmed to only dispatch UNDO without score reversal
- Vitest suite: 54 files, 675 tests, all passing

### Secondary (MEDIUM confidence)
- Architecture patterns inferred from existing codebase conventions (structuredClone, raw array pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all changes within existing code
- Architecture: HIGH - clear bug locations, established patterns to follow
- Pitfalls: HIGH - confirmed via direct code analysis, not speculation

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- no external dependencies)
