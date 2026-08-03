---
quick_id: 260803-vp2
description: Fix duplicate class label and add Values Compass readout
date: 2026-08-03
status: complete
commit: 4ae3129
---

# Summary

Two results-screen defects the user found. Two more they reported turned out to be
already fixed — worth recording so nobody "fixes" them again.

## Fixed

**Duplicate class badge.** "CLASS: EXPLORER" printed twice, one directly above the other.
`RiasecBars` rendered its own badge while `reveal-sequence` also animated in a `ClassLabel`
as a separate beat. `classLabel` is now optional: the reveal omits it, the dashboard — where
that badge is the only class label on the page — still passes it.

**Values Compass said nothing.** The card showed a dot on a track and no words, so a student
could not tell whether they leaned Security or Adventure. Character Traits prints its
tendency underneath; this card now does too — "Leans Security", or "Balanced for now" when
the answer is too close to centre to call. Threshold is 20 points either side of centre.

## Already fixed — do not re-investigate

**Overlapping header text.** The session page passes `blockName=""` and `timeEstimate=""` to
`QuestionCard`, which renders each only when truthy. Fixed in Wave 1 as "confirmatory header
overlap". The screenshots showing it came from the 125-day-old deployment.

**Ability bars looked inverted** — high scores (58, 53, 53) appeared empty while low ones
(42, 38, 44) appeared filled. `RiasecBars` colours a bar `bg-[var(--color-accent)]` when the
score exceeds 50 and `bg-white/20` otherwise. `--color-accent` was undefined until `d28d318`,
so every bar above 50 rendered transparent while every bar below 50 showed. Same root cause
as the invisible "Keep going!" button. Fixed by deploying.

The same undefined variable explains the Values Compass and MBTI dots being invisible in
those screenshots: both use `var(--color-accent)` / `var(--color-primary)`.

## Verification

`npx tsc --noEmit` clean · `npm run lint` clean · `npm test` 263 pass in 27 files (+7 new
`describeLean` and `ValuesSliders` tests) · `npm run build` compiles.
