---
quick_id: 260803-wlz
description: Four-point Likert scale and apply reverse scoring
date: 2026-08-03
status: complete
commits: 12f8edd, 8d9d0a0, a4c7d61
---

# Summary

## 1. Four-point rating scale (owner's decision)

The midpoint is gone. Students who were unsure defaulted to "Neutral", which read as a skip
button and flattened their results. The scale now lives in `lib/scoring/likert.ts` —
`LIKERT_MIN`, `LIKERT_MAX`, `LIKERT_POINTS`, `sanitizeLikert`, `reverseLikert` — and every
renderer and formula reads it from there.

- `calculateRiasecType` divides by `(LIKERT_MAX - LIKERT_MIN)` rather than a hardcoded 4.
- `sanitizeLikert` clamps legacy 5s from stored rows and old checkpoints down to 4.
- All 30 Likert questions had a stale five-point `options` array with a "Neutral" entry.
  `LikertSlider` renders from `LIKERT_POINTS` so nothing displayed wrongly, but the data
  contradicted the scale it was scored on.
- Snapshot version bumped 1 → 2. A v1 checkpoint holds answers where 3 meant "Neutral";
  on the new scale 3 means "Like", so resuming one would silently reinterpret every unsure
  answer as positive. Refusing to restore is the honest outcome.

**Recorded objection.** Removing the midpoint forces a student with genuinely no opinion to
invent one. The owner weighed this and chose the four-point scale; noted here so the
trade-off isn't rediscovered as a bug.

## 2. Reverse scoring was never applied (bug, found during this work)

`reverse_scored` was declared on the `Question` type and set `true` on four RIASEC items —
and read by nothing.

| Question | Agreement should mean | Was recorded as |
|---|---|---|
| "I'd rather sit in a library than work outdoors with tools" | low R | **high R** |
| "I prefer following clear instructions rather than making things up" | low A | **high A** |
| "I'd rather follow someone else's plan than start my own" | low E | **high E** |
| "I find it boring to check details and follow procedures" | low C | **high C** |

Each RIASEC type has only two rating questions, so **half the evidence for four of the six
types was inverted**. A consistent student's real preference averaged away to the midpoint.

Fixed in the scoring layer via `scoredValue()` in `hooks/use-scores.ts`, applied both when
appending to `riasec_raw` and when building the undo footprint — if only one had been
flipped, undoing a reverse-worded question would corrupt the score instead of clearing it.
The raw `response_value` is stored unflipped so saved data still reflects what the student
actually picked.

## 3. Discovery mode kept alive

It triggered on three consecutive answers of exactly 3. With no midpoint that could never
fire, leaving the branch dead, so it now triggers on a run of three *mild* answers.
`consecutiveNeutrals` renamed to `consecutiveMild`.

Worth knowing: `discovery_mode_active` is set but **read by nothing** — it changes no
questions and no scoring. The only visible effect is one encouraging screen. Half-built.

## Verification

`npx tsc --noEmit` clean · `npm run lint` clean · `npm test` 297 pass in 31 files ·
`npm run build` compiles · deployed and confirmed live by fetching the deployed bundles
(old `label:"Neutral",value:3` absent, new `label:"Strongly Like",value:4` present).

## Open, not done

The **values questions still have a Neutral midpoint** — `SpectrumSlider` is a seven-point
−3..+3 control with "Neutral" at 0, used by the three Values Compass questions. The exact
fence-sitting problem that motivated this task still applies there. Not changed, because the
owner's decision was about the rating questions.
