---
quick_id: 260803-uz4
description: Raise Career Curiosities cap from 3 to 5 and explain the cap in the UI
date: 2026-08-03
status: complete
commit: 56d107d
---

# Summary

Students can now pick 5 career curiosities instead of 3, and the screen explains itself
when they hit the limit.

## What changed

**`components/character/curiosities-picker.tsx`**
- `MAX_SELECTIONS` 3 → 5. The heading interpolates the constant, so it now reads "Pick up
  to 5" with no copy edit.
- The hint no longer disappears at the cap. It counts down "(N remaining)" and then says
  "(5 of 5 — tap one to swap)". Previously the branch was gated on `remainingPicks > 0`,
  so the one moment the student most needed an explanation was the one moment there was
  none.
- The hint sits in an `aria-live="polite"` region, so a screen reader announces the cap
  instead of leaving it to be inferred from taps that do nothing.
- Capped-out chips went from `opacity: 0.5` to `0.65`. They are not permanently disabled —
  the student has to read them to decide what to swap out.

**`lib/types/student.ts`** — `SelfMap.curiosities` comment `0-3` → `0-5`.

**`components/character/__tests__/curiosities-picker.test.tsx`** (new, 8 tests) — five
picks allowed, sixth ignored rather than silently replacing, countdown then swap hint,
`aria-disabled` set at the cap and cleared after a swap, "Don't know yet" still mutually
exclusive.

## Why it was safe

`curiosities` is write-only. Collected in character creation, written to
`students.self_map` by `lib/persistence/provision-student.ts:93`, then never read —
confirmed zero references in `lib/scoring/`, `data/`, `app/api/`, and all components bar
the picker. The dashboard types it but renders `perceived_strengths` instead. `self_map`
is unconstrained jsonb, so no migration was needed.

The user's concern that a wider interest web would make results harder to generate does
not apply today, because nothing consumes the field yet. The payoff is later: a richer
`self_map` for the Session 3+ Claude career analysis.

## Deliberately unchanged

`components/selfmap/self-map-capture.tsx:177` — the mid-session "What do you think you're
naturally good at? Pick up to 3". That 3 is load-bearing: `SelfVsMeasured` compares those
picks against the top measured strengths.

## Verification

`npx tsc --noEmit` clean · `npm run lint` clean · `npm test` 256 pass in 26 files (was
248 in 25) · `npm run build` succeeds.

Not yet checked in a browser: how the new hint and the 0.65 opacity read on a real phone.
