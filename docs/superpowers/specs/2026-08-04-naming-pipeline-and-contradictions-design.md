# Naming pipeline, and the places the app goes back on itself — design

**Date:** 2026-08-04
**Status:** approved in discussion, awaiting written review
**Follows:** `2026-08-04-emergent-character-system-design.md`, which shipped on branch
`feat/emergent-character-system` (22 commits, 391 tests green) but is **not merged**. This
spec fixes what the whole-branch review and three independent audits found in it.

## Problem

The emergent character system is not emergent. It is decided by five ice-breaker questions
and then locked, and the app contradicts itself about the result in several places.

### Measured, not asserted

Probed directly against the shipped scoring code:

| Input | Interest score produced |
|---|---|
| One warm-up pick | **100** |
| Four warm-up picks of the *same* type | **100** |
| One warm-up pick + two genuine "I dislike this" answers | **56** |

The scoring averages per response, so a single ice-breaker click saturates a type and
frequency is invisible. A student who picks *"help someone out"* four times and *"build
something"* once has both interests at 100; the tie breaks on the internal R-I-A-S-E-C
ordering, and they are named **Warsmith** — the thing they picked once — permanently.

A student who spreads five picks across three or more options — a very normal answering
pattern — produces a three-way tie, which `deriveClassLabel` reads as "no clear lean" and
returns `EXPLORER` → **Rogue, locked at question 6**, before a single interest question is
asked. The lock added to stop classes flipping then guarantees the ~20 real interest
questions can never displace it.

### One root cause behind three symptoms

**The class is decided too early, saved too late, and read differently by different
screens.** That single fault produces:

1. **The app contradicts itself in one glance.** The dashboard renders `CLASS: WARSMITH-GUARDIAN`
   directly above a chart where *Helper* is the tallest bar, because the class froze at
   question 6 while the bars kept updating. Same juxtaposition at the reveal and on the
   completion screen.
2. **Named → Wanderer → named.** The class lives only in client state until the final save,
   so a student named Guardian at question 6 who closes the tab returns to a home page
   greeting them as **"Wanderer"** in slate grey — or, in plain tone, the non-sentence
   **"Still forming"**. Resuming turns them back into a Guardian.
3. **"Adventurer" forever.** A dual-class graduate is stored as `"guardian-mage"`. The
   dashboard parses it; `app/page.tsx` looks it up by exact id, fails, and shows
   **"Adventurer"** with no icon — and calls `applyClassTheme("guardian-mage")`, which fails
   and poisons the cached theme to slate. Every home visit is grey Adventurer; every
   dashboard visit is jade Guardian-Mage.

### Two further families

**The UI promises what the question budget cannot fund.**
- The reveal has an animated beat for the four-letter personality card. `deriveEmergingType`
  requires ≥3 answers per dichotomy; Session 1 ships exactly **2 per dichotomy**, and the
  reveal runs before the confirmatory round. **Every student, every time, sees `_ _ _ _`
  with "Still Emerging"** as a climax. Even a student who answered both questions at maximum
  certainty gets underscores, because the count rule fires before the score is consulted.
- The same saturation bug exists in Learning Styles: one click on a musical option scores
  **Musical 100** and puts it top of "your strongest learning styles".

**Dead safety valves — a condition is recorded and the response is unreachable.**
- Indecision is detected (three consecutive mild answers set `discovery_mode_active`) and
  then read by nothing. `SHOW_DISCOVERY` is dispatched nowhere, so the "Hard to choose?"
  screen — which promises *"you'll choose between two options — no middle ground"* — can
  never render, and no code changes the question format anyway.
- The failed-save rescue on the dashboard only runs when no `assessment_scores` row exists,
  but `provisionStudent` creates a zeroed row at character creation. So a student whose save
  failed sees a fully rendered profile of **zeros** — every bar at 0, "CLASS: Wanderer",
  `_ _ _ _` — contradicting both the completion they just experienced and the failure
  screen's promise that *"Your answers are safe on this device."*

### Separately urgent: shared devices destroy data

Not a self-contradiction, but the most damaging thing found. `provisionStudent` reuses the
browser's existing anonymous account. On a shared classroom device, the second student
tapping **"Start a new quest instead"** overwrites the first student's profile and deletes
their `session_responses` and `achievements`. That is the default classroom setup, and the
loss is silent and unrecoverable.

## Decisions taken

| Decision | Chosen |
|---|---|
| What warm-ups feed | **Strengths and learning styles only.** They stop feeding interest scores. |
| When the class is named | **After the interest questions**, on evidence, not at question 6 |
| The blank `_ _ _ _` reveal beat | **Replaced** with what was genuinely measured |
| Discovery mode | Removed honestly rather than left as an unreachable promise |
| Shared-device overwrite | Explicit informed confirmation before anything is destroyed |

## Fix 1 — Warm-ups stop deciding interests

Remove the `riasec_*` keys from every warm-up option's `framework_signals` in
`data/questions/session-1-core.ts`. Keep each option's `mi_*` signal and its
`strength_signal` — those are the jobs the warm-up was designed for, and strengths and
relics continue to work unchanged.

Interests then come from the instrument built to measure them: 14 Likert items and 2
ipsative items in the interest block, plus the `riasec_mi` block.

**Consequence, accepted:** the warm-up's careful one-option-per-interest-type balancing
(set 2026-08-03) no longer affects interests. It still matters for strengths, where each
question offers six distinct strength signals.

## Fix 2 — Name on evidence, not on position

`useEmergentClass` currently derives at every block boundary, so the first naming happens
leaving the warm-up. Gate it instead on the interest instrument having enough data:
**at least 10 interest responses** before any naming is attempted, still evaluated only at
block boundaries so the class cannot flicker per answer.

This makes the Wanderer phase real — roughly the first 20 questions — which is what the
whole feature was designed around, and it means the class is derived from the same evidence
the bars display.

**Tie-breaking.** With warm-ups removed, exact ties become rare, but the ordering-based
tie-break stays wrong. When the top two interests are within the noise of each other, the
honest answer is that no single class is earned yet: keep deriving at later boundaries
rather than freezing an arbitrary winner. `Rogue` must only be reachable from a genuinely
flat profile across the real instrument, never from a three-way ice-breaker tie.

## Fix 3 — One class truth, at every moment

- **`app/page.tsx` must use `parseCharacterClass` and `characterClassDisplayName`**, exactly
  as the dashboard does. This alone fixes the "Adventurer" regression.
- **Never call `applyClassTheme` with a value that failed to parse.** Resolve first, theme
  from the resolved primary. A failed lookup must not write the cached theme.
- **The landing page must not claim a student is a Wanderer when it can see otherwise.**
  The mid-quest class already lives in the localStorage checkpoint keyed by the same user
  id. Read it there before greeting a returning student, so named → Wanderer → named cannot
  happen.

## Fix 4 — The naming moment gets a screen

Today the colours change silently behind a generic interstitial and the first sight of the
class name is a passing *"Nice progress, Warsmith!"* — a name the student was never given.

Add a short screen shown **once**, when the class is first named, built from the per-class
tagline copy already written in `lib/theme.ts` and currently rendered nowhere:

> **You are a Guardian.**
> *You stand where someone else would have fallen.*

The signal that drives it must be a **monotonic naming counter** that consumers compare
against what they last saw — not the transient boolean removed earlier, which could not
survive React's double-rendering in development.

## Fix 5 — Replace the blank personality card

Remove the four-letter card from the reveal. In its place, show the personality leanings
that *are* evidenced, in the student's tone, with an honest line that the full type needs
more questions than this chapter asks. `deriveEmergingType` and its count rule stay as they
are for the dashboard, where later chapters may legitimately fill letters in.

Also apply a minimum-evidence rule to Learning Styles so a single click cannot produce a
score of 100 or a top-three placing.

## Fix 6 — Close the dead safety valves

- **Failed-save rescue:** the dashboard must treat `has_completed_session1 === false` as "no
  results yet", regardless of whether a zeroed `assessment_scores` row exists. A student
  whose save failed then sees the recovery path, not a profile of zeros.
- **Discovery mode:** remove `discovery_mode_active`, the `SHOW_DISCOVERY` action, the
  unreachable render branch, and `DiscoveryModePrompt`. Keeping a promise of *"no middle
  ground"* that nothing implements is worse than not making it. Record the idea for Chapter
  2, where a genuine forced-choice switch would belong.

## Fix 7 — Stop shared devices destroying work

Before `provisionStudent` overwrites an existing profile, the student must be told exactly
what will be lost and confirm it — naming the existing student, so a second student on a
classroom laptop recognises immediately that this is not their account. Offer a clear "this
isn't me" path that starts a genuinely separate account rather than overwriting.

**Note on a previous decision.** Wave 2 (2026-07-24) deliberately chose to reuse the auth
user and overwrite in place, rather than minting a new anonymous user, specifically to stop
orphaning minors' assessment data. This spec does not reverse that. It adds informed
consent before the destructive path runs, and a separate escape for the genuinely-different
student.

## Chapter 2 copy

Six places promise Chapter 2, of which the reveal's *"Chapter 2 will deepen these
results."* is the strongest, and the XP bar sits full at 450/450 with nothing left to earn.
Soften the promises to something the roadmap can honour, or hide the unbuilt chapters until
they exist. Copy decision, no logic change.

## Out of scope

- Building Chapter 2, or any new questions. Every fix here works within the existing
  question budget.
- Real accounts and login. The anonymous-session problem is real and larger than this spec;
  Fix 7 only stops the silent destruction.
- The facilitator area, the empty API routes, and `/quest/report`.

## Ruled out — do not re-investigate

Confirmed already fixed and sound: the reveal and dashboard agreeing on the class; dual
class surviving the save; the dashboard header matching its own chart; resume no longer
flipping the primary; reverse-scored items; undo desync; stale checkpoints from the retired
5-point scale; the XP bar; theme flash.

## Verification

`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Plus a specific check the
earlier work lacked: **assert that the class shown never contradicts the chart shown beside
it** — given any set of answers, the named class must be derivable from the interest scores
being displayed.
