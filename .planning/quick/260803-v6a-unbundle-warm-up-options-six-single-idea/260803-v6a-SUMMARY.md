---
quick_id: 260803-v6a
description: Unbundle warm-up options — six single-idea choices, one per interest type
date: 2026-08-03
status: complete
commit: f7fda94
---

# Summary

All five warm-up questions rewritten. Each now offers six options, every option is one
idea, and every option points at a different RIASEC type.

## Why

Student feedback while testing: "Hang out with friends and help someone" and "Read,
research, or learn something new" each glue two different activities into one choice. The
scoring treats them as a single signal — the first as Social/helping, the second as
Investigative — so a student who wanted only one half got scored for the other.

## Design rules now recorded in the file header

1. **One idea per option.** An "or" is allowed only when both halves carry the same signal
   ("Make art or music" — both Artistic). Never merge two different signals into one label.
2. **Six options, one per RIASEC type.** Only one option can be picked, so two options
   sharing a type would give that type two chances to be chosen and inflate it.
3. **Equal weight.** Every option is `riasec_X: 2` plus one `mi_*: 1`. Removed the blended
   signals (`{ riasec_I: 1, riasec_A: 1 }`), which made an option worth less to each type
   than its single-type neighbours.
4. **Six distinct strength_signals per question.** `lib/scoring/strengths.ts` is a raw
   frequency count over just these five answers and the winner is displayed as "Top
   Strength", so no strength may have two paths to winning inside one question. Previously
   "Achiever" sat on both the Realistic and Conventional options.

## Side effect worth noting

Warm-up now covers **Enterprising** and **Conventional**, which it never offered before.
Q1 previously covered only R/I/A/S, so a student whose real leaning was leadership or
organising had no way to say so in the warm-up.

## Decision recorded

The user chose "pick 1" over multi-select. Reason: picking one of six is what tells the app
what a student prefers *over* other things. Breadth is already captured by the 14 Likert
rating questions in the RIASEC block, where every activity is rated separately.

## Verification

`npx tsc --noEmit` clean · `npm run lint` clean · `npm test` 256 pass in 26 files ·
`npm run build` compiles.

No test asserted warm-up option content, so nothing needed updating. `hooks/__tests__/use-quest-state.test.ts`
depends on there being 5 warm-up questions (block transition at index 5), which is unchanged.

## Not verified

How six options look on a real phone. The grid is 2 columns
(`components/quest/option-grid.tsx`), so this goes from 2 rows to 3 rows and may need
scrolling on smaller screens.
