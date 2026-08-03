# Emergent character system — design

**Date:** 2026-08-04
**Status:** approved in discussion, awaiting written review
**Scope:** Project A of two. Project B — the trial-life episode that becomes Chapter 2 — gets
its own spec. ("Chapter" below always means the renamed session, never a project split.)

## Problem

A student declares who they are before the app knows anything about them. Character
creation asks them to pick an avatar class — Sorceress, Valkyrie, Huntress — which then
drives the colour theme and narration for the whole quest. The choice is a costume,
unconnected to anything measured. (Several of those names are also gendered, which sits
badly with not asking a student's gender.)

Meanwhile `deriveClassLabel()` already computes a real class from their answers
(MAKER-INVESTIGATOR, EXPLORER, SEEKER) and shows it at the reveal. So the app has two class
systems: one chosen and cosmetic, one earned and ignored.

Invert it. **The class becomes the result of playing, not a costume picked in advance.**

## Decisions taken

| Decision | Chosen | Notes |
|---|---|---|
| What a student walks away with from Chapter 2 | A sharper profile, no careers yet | Careers wait for Chapter 3, where AI switches on |
| Chapter 2's shape | A playable episode, not a questionnaire | Events happen to you; every choice is a hidden measurement |
| Story branching | Same scenes for everyone, narration reacts to earlier choices | Real branching would make scores non-comparable between students |
| Class source | Interests set the class; personality sets the focus | Reuses `deriveClassLabel` — no new scoring maths |
| Class chosen up front | No — everyone starts as a Wanderer | |
| Relics | Represent demonstrated traits; never alter scores | |
| Word for "session" | **Chapter** | Already half-shipped: quest tone says "Quest Chapter 1 Complete" |
| Colour system | Per-class palettes, structured like 16Personalities' families | |
| Gender | Not asked. Character figure selection instead | Avoids asking minors to declare gender to a school app |

## The three layers

Two Guardians must not be clones. Three independent layers, each from a different source:

| Layer | Source | Example |
|---|---|---|
| **Class** | Interests (RIASEC) | Guardian |
| **Focus** | Personality + values | works alone, prefers steady ground to risk |
| **Relics** | Demonstrated strengths | Healer's Kit — chose to help three times |

### Class names

The six interest types map to classes. `deriveClassLabel` already produces the underlying
label; this is a rename layer over it, not new logic.

| Interest type | Class |
|---|---|
| Maker (R) | **Warsmith** |
| Investigator (I) | **Mage** |
| Creator (A) | **Bard** |
| Helper (S) | **Guardian** |
| Leader (E) | **Vanguard** |
| Organizer (C) | **Paladin** |

Plus two honest states, both already produced by the existing logic:

- **Rogue** — genuinely open, no clear lean (currently `EXPLORER`). A real answer, not a
  failure state.
- **Wanderer** — not enough signal yet (currently `SEEKER`). Also the starting state.

Strong in two types gives a dual class: **Guardian-Mage**.

**The naming rule: the app never names a student before it has earned the right to.** The
existing thresholds in `deriveClassLabel` decide this; no new maths is introduced.

**Names considered and rejected.** An earlier draft used Artificer / Scholar / Healer /
Champion / Warden, which read as job titles rather than classes worth earning. A classic-RPG
set was chosen instead. Two names from that set were then swapped: **Templar → Paladin**
(Templar carries a specific crusading and religious association, awkward in a classroom) and
**Warlord → Vanguard** (a cohort report full of Warlords reads badly to a facilitator, even
though students would enjoy it). No name in the final set is gendered.

## Crystallisation

The class emerges in stages rather than appearing at the end.

| Point | What the student sees |
|---|---|
| Character creation | Wanderer. No colour, no title, nothing claimed. |
| After the warm-up block | *"Something is taking shape."* Still no name. |
| Partway through the interest block | Class appears **and the theme changes with it.** The moment. |
| The reveal | Class confirmed or sharpened, with the written description. |
| Chapter 2 | The story can shift it. |

Once named, a class may **deepen** (Guardian → Guardian-Mage) but must not flip question by
question. Re-evaluate at block boundaries only, never per answer.

## Relics

Earned from `strength_signal` counts, which `lib/scoring/strengths.ts` already tallies.
Threshold: **two demonstrations**.

| Strength | Relic |
|---|---|
| Achiever | Finisher's Seal |
| Ideation | Spark Stone |
| Empathy | Healer's Kit |
| Command | Rallying Banner |
| Creativity | Dreamer's Brush |
| Analytical | Truthseeker's Lens |
| Communication | Orator's Ring |
| Adaptability | Traveller's Boots |

Each shows **why** it was earned: *"you chose to help three times."*

**Relics never modify a score.** If a relic raised Empathy, the profile would measure the
student's loot rather than the student, and two identical sets of answers would produce
different results. Same rule already applied to the XP bar.

## Character description

Generated client-side from templates. Zero API cost, per the project constraint that
Chapters 1–2 make no API calls.

Slots: class + focus (personality letters above threshold, strongest value leans) + the
leading relic.

> *"A Guardian who thinks things through alone before speaking, and would rather have steady
> ground than a big gamble."*

**Degrades honestly.** A personality letter below the "still emerging" threshold is omitted
from the sentence rather than asserted. If nothing is certain yet, the description says so
plainly instead of inventing a character.

## Colour system

Themes already carry `--cq-primary`, `--cq-accent`, `--cq-glow`, `--cq-glow-accent` and
`--cq-radius`, so a class can differ in **shape** as well as colour. Eight palettes, grouped
into families the way 16Personalities groups Analysts, Diplomats, Sentinels and Explorers.

| Class | Family | Primary | Accent | Radius | Character |
|---|---|---|---|---|---|
| Wanderer | neutral | `#475569` | `#94a3b8` | 10px | Colourless. Nothing claimed yet. |
| Mage | Analyst | `#8b5cf6` | `#2dd4bf` | 6px | Violet, precise corners |
| Guardian | Diplomat | `#059669` | `#6ee7b7` | 16px | Jade, soft corners |
| Paladin | Sentinel | `#3b82f6` | `#38bdf8` | 4px | Steel blue, near-square |
| Vanguard | Mover | `#b45309` | `#fbbf24` | 12px | Deep gold |
| Bard | Creator | `#db2777` | `#f0abfc` | 20px | Magenta, fluid |
| Warsmith | Maker | `#c2410c` | `#fb923c` | 8px | Copper, solid |
| Rogue | Open | `#0d9488` | `#5eead4` | 14px | Teal, fresh |

Mage reuses the existing `purple-teal` values, Paladin reuses `blue-indigo`.

**Contrast.** Every primary above was chosen to clear roughly 4.5:1 against white text at
normal weight. Two existing themes do **not**: `magenta-violet` `#ec4899` (~3.3:1) and any
bright amber. Bard and Vanguard therefore use deepened variants (`#db2777`, `#b45309`) rather
than inheriting the current values. Ratios are approximate and must be verified against the
real dark background during implementation.

## "Chapter" rename

User-facing "Session" wording appears across **10 component and page files**, including:

- `app/page.tsx` — "Session 1 Complete", "Session {n}", and the destructive-replace warning
- `app/quest/dashboard/page.tsx` — "Session 1: Discovery Quest", "Deepens in Session 2" (×2),
  "Begin Session 2 — Coming soon", "Complete Session 1 to see your profile"
- `app/quest/session/[id]/page.tsx` — "Your quest continues in Session 1"
- `components/charts/mi-preview-bars.tsx` — "More detail in Session 2"
- `components/charts/values-sliders.tsx` — "More dimensions in Session 2"
- `components/quest/reveal-sequence.tsx` — "Session 2 will deepen these results"

Quest tone uses **Chapter**; explorer tone uses **Part**. Both already flow through the
existing tone mechanism.

**Only display text changes.** Route paths (`/quest/session/1`), database columns
(`has_completed_session1`, `current_session`), type names and variable names stay as they
are. Renaming those would mean a migration and a much larger diff for no user-visible gain.

## Data model

**No migrations.** This is deliberate given the two migration failures on 2026-08-03.

- `students.avatar_class` already exists and is already written. It now stores the class the
  student **became** rather than the one they picked.
- Relics and the character description are derived at render time from data already stored
  (`strengths`, `riasec_scores`, `mbti_indicators`, `values_compass`). Nothing new is saved.

## Testing

- Class derivation, including the not-enough-signal case returning Wanderer rather than
  guessing, and the open case returning Rogue.
- A class deepens but never flips: feeding answers that move scores mid-block must not
  rename the student until the block boundary.
- Relic threshold at exactly two demonstrations, and that relics leave every score untouched
  — assert scores are identical with and without relics applied.
- Description generation with partial data: an emerging personality letter is omitted, not
  asserted.
- Character creation completes with no class selected.
- Every new theme name resolves to a real palette, with no silent fallback.

## Risks and limitations

1. **Existing profiles will change.** Any student who picked a class will have it
   recalculated from their real answers on next load. With effectively one test user this is
   acceptable; it would not be after launch.
2. **The theme swap mid-quest is a visible interruption.** It is intended as a moment, but if
   it lands badly during the interest block it may need to be deferred to a block transition.
3. **Contrast figures above are calculated, not measured.** Verify in the browser.

## Out of scope

- Chapter 2's trial-life episode — separate spec.
- Career directions and the career library — Chapter 3, and it needs AI.
- Academic check-in and family context — the user excluded both from Chapter 2.
- Renaming routes, columns or types away from "session".
