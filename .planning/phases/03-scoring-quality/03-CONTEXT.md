# Phase 3: Scoring Quality - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden scoring correctness, undo behavior, and edge case handling. Charts and labels display honest results — no NaN, no blank renders, no misleading type codes. This phase does NOT add new questions, change the flow engine, or modify persistence.

</domain>

<decisions>
## Implementation Decisions

### "Still Emerging" MBTI Presentation
- **D-01:** Claude's discretion. Recommended: replace the type code letter with `_` for underdetermined dichotomies (existing `deriveEmergingTypeCode` already does this with a 35-threshold). Add a visible "Still Emerging" pill/badge next to the type code on the dashboard and reveal sequence — not a tooltip (too hidden for teens), not a banner (too alarming). Brief explanatory subtext: "Some preferences need more data to pin down."
- **D-02:** Threshold stays at 35 (existing value in `deriveEmergingTypeCode`). If fewer than 3 raw responses exist for a dichotomy, force `_` regardless of score magnitude — raw count is a stronger signal than score magnitude with tiny samples.

### Undo Reversal Scope
- **D-03:** Claude's discretion. Recommended: undo MUST reverse ALL framework signals atomically. Current `removeLastResponse` only handles single-framework (riasec, mbti, values). Multi-signal questions (warmup/MI via `processResponseWithSignals`) touch riasec + MI + strengths in one answer — undo must pop from all affected raw arrays. Store the full signal footprint per response so undo knows exactly what to reverse.
- **D-04:** Ipsative undo: pop the ranked scores from `riasec_ipsative_raw` for the undone question. The reducer already restricts undo to certain blocks — no change to undo availability, just correctness of the reversal.

### Empty/Minimal Chart Behavior
- **D-05:** There must always be results — the system provides enough questions via the existing confirmatory adaptive round. Phase 3 adds defensive UI as a safety net, not the primary path.
- **D-06:** Charts clamp scores to 0 (no NaN). If a framework has zero responses, show the chart at all-zero with a subtle "Answer more questions to refine" label — not hidden, not blank. Students always see their full profile shape.
- **D-07:** Division-by-zero guards in all scoring functions (`calculateAllRiasec`, `calculateAllMi`, `calculateAllMbti`, `calculateAllValues`) — return 0 for empty input arrays, not NaN.

### Claude's Discretion
- "Still emerging" visual treatment (pill vs badge vs inline label) — choose what fits the existing dark theme and component patterns
- Undo signal storage structure — implementation detail, choose the cleanest approach
- Which specific chart components need NaN guards — scan and fix all, prioritize by risk

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scoring Modules
- `lib/scoring/riasec.ts` — RIASEC normalization, ipsative merge, acquiescence detection, class label derivation
- `lib/scoring/mi.ts` — MI dimension aggregation
- `lib/scoring/mbti.ts` — MBTI indicator calculation, `deriveEmergingType` with 35-threshold
- `lib/scoring/values.ts` — Values spectrum computation
- `lib/scoring/strengths.ts` — Strength signal extraction
- `lib/scoring/adaptive.ts` — Adaptive question selection for confirmatory round

### Score State & Undo
- `hooks/use-scores.ts` — ScoreState interface, `processResponse`, `processResponseWithSignals`, `processIpsativeResponse`, `removeLastResponse` (SCORE-02 bug lives here)
- `hooks/use-quest-state.ts` — Quest reducer with UNDO action

### Display Components
- `components/charts/riasec-bars.tsx` — RIASEC bar chart
- `components/charts/mi-preview-bars.tsx` — MI preview bars
- `components/charts/mbti-sliders.tsx` — MBTI dichotomy sliders
- `components/charts/values-sliders.tsx` — Values compass sliders
- `components/charts/emerging-type.tsx` — Emerging type display (SCORE-01 target)
- `components/charts/class-label.tsx` — Class label display

### Test Suites
- `lib/scoring/__tests__/` — All scoring test files (riasec, mi, mbti, values, strengths, adaptive)

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` — Known bugs and tech debt relevant to scoring

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deriveEmergingTypeCode` in `lib/scoring/mbti.ts` — already produces `_` for underdetermined dichotomies, needs raw count check added
- `EmergingType` component in `components/charts/emerging-type.tsx` — renders the type code, needs "Still Emerging" indicator
- `structuredClone` used throughout `use-scores.ts` for immutable state updates — pattern to follow for undo changes
- Existing test suites for all scoring modules — extend with edge case tests

### Established Patterns
- Raw arrays per framework dimension (`riasec_raw`, `mi_raw`, `mbti_raw`, `values_raw`) — all scoring is recomputed from raw arrays, not incrementally adjusted
- `processResponseWithSignals` handles multi-framework signal distribution — undo must mirror this logic in reverse
- `calculateAll*` functions take raw arrays and return normalized scores — add zero-guards here

### Integration Points
- `removeLastResponse` in `use-scores.ts` — needs expansion for multi-signal and ipsative undo (SCORE-02)
- Chart components consume `ScoreState` — add NaN/empty guards at the scoring function level (not in each chart)
- `EmergingType` component — add "still emerging" visual treatment (SCORE-01)
- Reveal sequence in `components/quest/reveal-sequence.tsx` — uses `deriveEmergingTypeCode`, will automatically benefit from improvements

</code_context>

<specifics>
## Specific Ideas

- User explicitly stated: "there must be results" — the system should provide enough questions to always have data. The confirmatory adaptive round already does this. Phase 3 adds defensive UI as a safety net only.
- No specific visual references provided — Claude has discretion on "still emerging" treatment.

</specifics>

<deferred>
## Deferred Ideas

- **Minimum coverage gate** — Before allowing completion, verify each framework has minimum N responses. If not, generate targeted questions. This is a flow engine change, not a scoring fix. Consider for a future phase or Session 2 planning.

</deferred>

---

*Phase: 03-scoring-quality*
*Context gathered: 2026-04-03*
