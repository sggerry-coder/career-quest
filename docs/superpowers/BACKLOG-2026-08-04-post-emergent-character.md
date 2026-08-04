# Backlog — deferred from the emergent character system branch

**Date:** 2026-08-04
**Source:** the final whole-branch review of `feat/emergent-character-system`
(55 commits, 98 files), plus the eight task reviews that preceded it.
**Status:** none of these block merge. None of them make the app tell a
student something untrue about themselves — that class of defect was fixed
on the branch. These are the next tier down.

Full review: `.superpowers/sdd/2026-08-04-naming-pipeline-and-contradictions/final-review.md`
(git-ignored — regenerate from the branch if it is gone).

## Important

Ordered roughly by student impact.

1. **Legacy `avatar_class` values have no migration.** Rows written before
   the class system changed hold `warrior`, `sorceress` and friends. These
   resolve to Wanderer. `main` is deployed, so these rows exist.
2. **Accessibility, several.** aria-label/visible-label mismatches; no focus
   management when a screen swaps; a button that is invisible but still
   clickable; `likert-slider` is a radiogroup with four tab stops and no
   arrow-key support; contrast between 1.9:1 and 3.7:1 on text that carries
   meaning. The 4.5:1 floor applies to all of it.
3. **`prefers-reduced-motion` is ignored.** Framer Motion runs regardless.
   No `MotionConfig` at the root. The correct pattern already exists in
   `components/quest/completion-screen.tsx:82` — lift it.
4. **The reveal cannot be skipped**, and its Continue button sits below the
   fold. A student who has seen it once must sit through it again.
5. **48.5% of students answer a confirmatory MI question into an empty
   `else if`** (`hooks/use-scores.ts:347-352`). The answer is collected and
   discarded.
6. **Skipping one ipsative item deflates three interest types by 30%.**
   `mergeIpsativeScores` never receives `null` because `calculateAllRiasec`
   returns 0 for an empty array, so "no data" and "scored zero" are
   indistinguishable.
7. **The `emerging_type` reveal beat is an empty tap** — it advances and
   shows nothing.
8. **Three "answer more questions" fallbacks are unreachable**, and
   "Balanced for now" cannot render: each values dimension has exactly one
   spectrum item and the scale has no midpoint.
9. **MBTI is quantised to −100 / 0 / +100**, so the dots render half off
   their track.
10. **A partial save shows "no results yet" over real data.**
11. **A full `structuredClone` plus `JSON.stringify` of `ScoreState` runs on
    every answer.** Matters on a slow phone.
12. **Worst-case final-save retry is ~63 s of spinner** (3 writes × 4
    attempts × 1+2+4 s backoff) before the failure screen appears.
13. **`students.facilitator_id` is unconstrained** — a student can
    self-assign to any facilitator's roster. Data integrity, not privilege
    escalation. RLS is otherwise clean.

## Minor

1. `hooks/use-scores.ts:174,456` maps ipsative ranks to `{1:5, 2:3, 3:1}`.
   The `5` is off the 1–4 scale and survives only because `sanitizeLikert`
   clamps it. `lib/scoring/__tests__/riasec.test.ts:57` calls that clamp a
   *legacy* accommodation while it is in fact load-bearing.
2. **Dead code:** `persistence_failed`, `selected_adaptive_ids`,
   `ScoreState.class_label` (recomputed on every answer, read nowhere),
   `lib/theme.ts:161-168 getClassName` (returns a raw id on a miss), and
   `ThemeProvider`'s four `--theme-*` properties plus `useTheme` — zero
   consumers, and the value would be wrong if anything used it.
3. `app/page.tsx:236-237` still shows "Still forming · Chapter 1" to a
   mid-quest student with no checkpoint.
4. `lib/persistence/__tests__/final-persist.test.ts:258-274` asserts via
   `h.calls.find()` (first match) against a module-level array cleared in
   `beforeEach` — a leaked in-flight call reads another test's default.
5. **The confirmatory pool has no reverse-scored items** across its 18
   RIASEC questions, so five same-direction taps land in `rating_responses`.
   Harmless today only because the reveal precedes the confirmatory round
   and the acquiescence flag is read nowhere after it. This becomes a
   false-positive source the moment that flag is surfaced later — see the
   next item.
6. **`acquiescence_flag` cannot reach the dashboard**: it is not persisted
   and `assessment_scores` has no column for it. The reveal is the only
   surface reachable without a migration. A straight-lining student is told
   "You are a Mage-Guardian" with full confidence on the reveal's class
   label, the completion screen and the dashboard badge, and gets one grey
   caveat under the bars on one transient screen. Caveating the reveal's
   `ClassLabel` and the completion screen needs no migration and is the
   cheap half.
7. **MI volume is invisible.** Scores are a rate, so two picks tie five
   picks at 100. The inversion is fixed; the tie is not misleading on real
   data, but a volume cue would be better. A metric that ranks volume
   *and* keeps rarely-offered dimensions (`musical`, `naturalistic` appear
   in two options all session) from capping at ~44 needs opportunity-aware
   denominators and a question-level signature change through footprints
   and snapshots.

## Ruled fine to ship, recorded so they are not re-litigated

- UNDO desyncing `current_block` — **structurally unreachable**: `canUndo`
  requires `currentIndex > currentBlock.startIndex`, so undo cannot cross a
  block boundary.
- The `isNamed` gate on `SET_AVATAR_CLASS` is untested and cannot be tested
  — `isNamed === (primary !== "wanderer")` is an invariant, so no path
  reaches the dispatch in the guarded state. Dead defence-in-depth,
  correctly kept.
- `getSession` → `getUser` costs one blocking round trip before "Welcome
  back". Worth measuring, not worth blocking.
- Client-side score forgery is inherent to the zero-API-cost design for
  Chapters 1–2. Accepted, not an oversight.
- Two free one-line type tightenings the review recommended and the fix
  wave deliberately did not take, to keep the merge gate clean:
  narrowing `applyClassTheme` to `CharacterClassId` (all five call sites
  already pass a parsed `.primary`), and making `reason` required on the
  `ProvisionResult` failure variant.
