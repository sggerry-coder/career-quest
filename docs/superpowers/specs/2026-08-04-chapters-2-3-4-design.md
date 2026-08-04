# Chapters 2, 3 and 4 — design

**Date:** 2026-08-04
**Status:** approved in discussion, awaiting written review
**Follows:** `2026-08-04-naming-pipeline-and-contradictions-design.md`, shipped and deployed.

## Where Chapter 1 actually leaves the student

Measured against the shipped code, not the roadmap.

| | Asked | State at the end of Chapter 1 |
|---|---|---|
| Interests (RIASEC) | 14 rating + 2 ranking + 5 mixed + 5 confirmatory | **Complete.** Drives the class. |
| Learning styles (MI) | ~10 signals over 8 dimensions | **Partial by design.** Dimensions below `MIN_MI_SIGNALS` read as no data. |
| Personality (MBTI) | **2 per dichotomy** | **Structurally incomplete.** `deriveEmergingType` needs ≥3. The type can never resolve. |
| Values | 1 spectrum item per dimension × 5 | **Thin.** One answer per dimension, no midpoint. |

Chapter 1 asks 40 questions; 19 are skippable. XP tops out at 450 with nothing further to earn. Every Chapter 2 promise in the UI was softened to "planned" on 2026-08-04.

So Chapter 2 inherits a real, non-invented job: **the personality type is unfinishable in Chapter 1, and the values readings rest on one answer each.**

## Chapter 2 — the deeper dive

**Shape:** one sitting, ~25 scenarios, 25–30 minutes. Zero API cost, consistent with the standing constraint that Chapters 1–2 score entirely client-side.

**Format change, and the reason for it.** Chapter 1 asks for ratings. Chapter 2 asks for decisions:

> **Your party is behind schedule.** The map you drew doesn't match the ground you're standing on.
> - Redraw the route to fit the time you have left
> - Hold the route and push the party harder
> - Ask the party which they'd rather do

The scenario is framed around the student's own class, so it reads as *their character in action*. It plays as a dilemma rather than a self-assessment, which is both more engaging and less vulnerable to the self-report bias that straight-lining detection exists to catch.

**What it measures.** Each scenario scores **two or three dimensions at once**. This is a requirement, not an optimisation — the coverage below does not fit in 25 single-purpose questions.

1. **Finish the personality type.** At least 2 further answers per dichotomy (8 minimum) so every letter clears the ≥3 threshold and the type resolves for the first time.
2. **Thicken the values.** At least 2 further answers per dimension (10 minimum) so no values reading rests on a single answer.
3. **Three new signals**, each needing ≥3 measurements (9 minimum):
   - **Under pressure** — time short, stakes high: cut scope, push harder, ask for help, or stall.
   - **With other people** — disagreement, credit, and people who work differently.
   - **Without enough information** — gather more, act on instinct, ask someone, or wait.

Minimum measurements: 27 across 25 scenarios, hence the multi-scoring requirement.

**The three new signals are new frameworks**, not extensions of existing ones. They need their own scoring module, their own minimum-evidence rules mirroring `MIN_MI_SIGNALS`, and their own honest empty states. They must not be bolted onto RIASEC or MBTI.

**The class may change.** If 25 scenarios genuinely contradict Chapter 1, the class changes and **the app shows the student what changed it** — naming the answers responsible, in their tone. This extends the pattern already shipped on the completion screen ("Those last answers redrew your class: X → Y") rather than inventing a second mechanism.

This reverses the "may deepen, must not flip" constraint from the previous spec **deliberately and at the owner's direction**. That constraint was written when the class could flip for bad reasons — saturated warm-up scores, a lock at question 6. Those causes are fixed. A change driven by 25 scenarios is evidence, not noise. The acceptance criterion from the previous spec still governs: **the class shown must be derivable from the chart shown beside it.**

**Reward.** The XP ceiling rises and the milestone scaling in `lib/xp.ts` extends to Chapter 2. Chapter 2 completion unlocks Chapter 3.

## The data spine — how nothing gets fabricated

The owner's requirement: careers may be drawn widely, but **every result must be backed by real data. Nothing fabricated.**

Free generation and zero fabrication are in tension. They resolve by moving the facts out of the model.

**O\*NET** (US Department of Labor, public domain, ~900 occupations) supplies, per occupation: tasks, skills, knowledge, work activities, typical education level, and — critically — **Holland/RIASEC interest codes**, the same six-dimension system Chapter 1 already measures.

Consequences:

- **Matching is arithmetic, not inference.** A student's RIASEC profile scores against each occupation's interest profile directly. No model decides which careers fit.
- **Claude never supplies a fact.** It reads the matched occupation's real attributes and writes the explanation in the student's language, referencing their own answers. Facts come from the dataset; voice comes from the model.
- **900 occupations is effectively unbounded** from a student's perspective — wider than any list that could be hand-maintained, and no student will exhaust it.

**Two known limits, handled explicitly:**

- **Wage data is US-only.** With "international / generic" chosen, **pay figures are omitted entirely** rather than quoted with a caveat. A wrong number a student remembers is worse than no number.
- **Titles lean American** ("Postsecondary Teacher"). A translation layer maps titles to neutral phrasing. This layer is data, editable without a deploy.

**Education routes stay generic** — "a degree in this area", "a vocational route" — since no education system was chosen. The data structure must let a country-specific route layer be added later without touching the matching logic.

**Verification required before building:** confirm O\*NET's current licence terms, attribution requirements, and bulk-download/API terms. If they do not permit this use, the spine changes but the architecture does not — any occupational dataset carrying RIASEC codes substitutes directly.

## Chapter 3 — the map

**Not a verdict.** Chapter 3 is a place the student returns to. This is the structural decision that makes the whole thing defensible: nothing is ever closed off for a 15-year-old.

**What they get:** a shortlist of matched occupations, each with
- a plain explanation of which of *their* answers point there,
- **what would make it a bad fit** — stated as plainly as the good fit,
- concrete next steps: subjects, things to try, people to talk to.

**How it narrows:** the app proposes, the student reacts — yes / no / not sure. The list re-sorts as they go. Their reactions are recorded as signal, not just as filtering.

Stating the poor fit is not a hedge. A career tool for minors that only lists reasons to say yes is not giving advice, it is selling.

## Chapter 4 — the deep dive, and the loop

**One career, explored properly:** what the work actually involves day to day, what to study, what is genuinely hard about it. All drawn from the occupation's real attributes.

**Then the loop.** Afterwards the app asks what appealed and what put them off. Those answers feed back into Chapter 3, so the next visit is better informed. Explore Architect, dislike the deadline pressure, and pressure-heavy occupations move down — which is exactly what the Chapter 2 "under pressure" signal is for.

**Repeatable by design.** The same machinery serves every career the student ever opens. Build once, use for all 900.

## Cost — two tiers behind a backend switch

| Tier | Behaviour | Cost shape |
|---|---|---|
| **Cheap** | Each occupation's write-up is generated once and stored. Every later student reads the stored copy. | Falls per student over time; also faster. |
| **Expensive** | Regenerated per student, referencing their own answers throughout. | Paid on every view; never amortises. |

Both are built. Selection is server-side configuration, not a user setting. Billing is deferred.

The cheap tier requires **a new table for generated write-ups**, keyed by occupation, with the generating model and a content version recorded so stored copies can be invalidated deliberately rather than going quietly stale.

## Schema

| Change | For |
|---|---|
| `chapter2_scores` (or extend `assessment_scores`) | The three new signals plus their raw counts, mirroring `mbti_raw_counts` / `values_raw_counts`. |
| `career_reactions` | Per-student yes/no/not-sure and post-deep-dive feedback. |
| `career_writeups` | Cheap-tier stored generations, with model and content version. |
| `riasec_raw_counts` (migration `00006`) | **Already written, unapplied, unwired.** Blocks the interest-bar fix from shipping. |

Every migration follows the established rule, learned from a production failure in this project: **the column is applied to the live database before any code writes it.** Writing an unknown column fails the entire save for every student.

## Out of scope

- Real accounts and login. Identity remains an anonymous browser session.
- The facilitator area.
- Country-specific education routes (structured for, not built).
- Wage and salary data.
- Any change to Chapter 1's question set.

## Risks

1. **The 25 scenarios are the largest single piece of work here, and it is writing, not engineering.** They must be balanced so no dimension is under-measured, and they must read well to a 13-18 year old. This is the most likely thing to be under-estimated.
2. **The five API routes are currently empty stubs** returning a static message. Chapters 3 and 4 are the first real use of the Claude API in this project — there is no existing pattern to follow for prompting, error handling, rate limiting, or cost control.
3. **Feeding unevidenced zeros into a prompt** is the bug class fixed three times on 2026-08-04, with a much wider blast radius once a model is narrating the result. Every score reaching a prompt must carry its evidence count, and the prompt must be told what was never asked.
4. **A model writing about careers for minors** needs explicit constraints: no invented facts, no pay figures, no claims about the student's ability, and no language that forecloses options.
5. **Class change in Chapter 2** must not reintroduce the contradictions closed on 2026-08-04. The acceptance criterion holds: the class shown must be derivable from the chart shown beside it, at every moment.

## Verification

`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, plus:

- **No fabricated fact reaches a student.** Every fact in a Chapter 3 or 4 output traces to a dataset field. Tested by asserting the model is never the source of a fact — not by reading its output and judging it plausible.
- **The class shown never contradicts the chart shown beside it**, carried forward from the previous spec and extended to Chapter 2's class change.
- **Every new signal has an honest empty state**, verified the way `hasValuesReading` and `hasRiasecReading` were: absence must render differently from a genuine low score.
- **The loop converges.** Repeated Chapter 4 visits must sharpen the shortlist, not oscillate.
