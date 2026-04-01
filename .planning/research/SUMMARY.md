# Project Research Summary

**Project:** Career Quest - Session 1 Completion Flow & Quality Hardening
**Domain:** Gamified career assessment (multi-session psychometric quiz for high school students)
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

Career Quest is a gamified career assessment app targeting high school students (13-18), built on Next.js 16 + React 19 + Supabase. The current milestone is about finishing what is already 80% built: a Session 1 flow that walks students through RIASEC, MI, MBTI, and Values questions, then reveals their personality profile in an RPG-themed sequence. The critical blocker is a state management bug where the flow deadlocks at the engagement checkpoint ("Halfway there"), preventing users from ever reaching the reveal sequence, completion state, or any of the polish features already coded. Most of the UI components -- charts, badges, reveal animations, scoring -- already exist and work in isolation. The problem is purely in flow orchestration.

The recommended approach is surgical: refactor the flow engine from scattered `useState` hooks into a single `useReducer`-based state machine with atomic index-plus-phase updates. This fixes the root cause (index advancing before phase determination), makes transitions explicit and testable, and requires zero new dependencies. The only new library needed is `canvas-confetti` (6KB) for the celebration moment at badge unlock. Everything else is refactoring existing code and writing tests against the reducer.

The key risks are: (1) silent data loss when persistence fails -- students complete a 20-minute session and lose everything on reload; (2) dual index tracking between the session page and quest state hook causing score-response drift; and (3) MBTI scores based on only 2 questions per dimension giving false precision. All three are addressable in this milestone through explicit state management, persistence status UI, and honest "still emerging" labeling in the reveal sequence.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, Framer Motion 12, Recharts, Vitest) is solid and should not change. The milestone requires exactly one new dependency.

**Core technologies (additions only):**
- **useReducer (built-in):** Flow state machine -- replaces scattered useState hooks; zero dependencies, trivially testable, fixes the atomic update problem
- **canvas-confetti v1.9.4:** Session completion celebration -- 6KB gzipped, off-main-thread rendering via Web Workers, built-in `disableForReducedMotion` accessibility support

**Explicitly rejected:** XState (overkill for 8 linear states), react-confetti (heavier, React-managed canvas), Zustand/Redux (wrong tool for flow orchestration), Playwright/Cypress (separate initiative, not this milestone).

**Future note:** Framer Motion's `framer-motion` package should migrate to `motion/react` imports in a future milestone. Same code, cosmetic change, not worth doing mid-milestone.

### Expected Features

**Must have (table stakes):**
- Flow progression past engagement checkpoint (THE blocking bug)
- Profile reveal sequence with staggered chart animations (built, unreachable)
- Class label / archetype reveal ("You are a MAKER-INVESTIGATOR")
- Badge unlock "Self-Discoverer" at session end
- Completion state persisted to database with `session_1_completed` flag
- Clear "Session 1 Complete" terminal screen with next-step CTA
- Returning user detection (completed students see dashboard, not restart)

**Should have (differentiators):**
- Celebration particles on badge unlock (high emotional impact, ~30 lines)
- Confirmatory round ("Sharpen your results") with live chart updates
- Tone-aware narration based on selected character class (not hardcoded "Wanderer")
- XP bar visible and animated at completion
- Emerging MBTI type with uncertainty markers (honest "_" for unclear dimensions)

**Defer (v2+):**
- Save & exit mid-session (needs resume logic -- non-trivial)
- Social sharing (privacy concerns for minors)
- Career recommendations (insufficient data from Session 1 alone)
- PDF/report export (incomplete profile)
- Peer comparison / leaderboards (counterproductive for honest self-assessment)

### Architecture Approach

The architecture centers on replacing the implicit state machine (scattered `useState` calls in a 666-line page component) with an explicit reducer-based flow orchestrator. The critical invariant is atomic updates: `currentIndex` and `flowPhase` must change together in a single dispatch, never separately. Persistence follows a write-ahead log pattern: localStorage after every answer (synchronous, survives refresh), Supabase at block boundaries (durable, batched). Engagement checkpoints are strictly cosmetic/non-blocking -- they must never gate flow progression or affect scoring.

**Major components:**
1. **FlowOrchestrator (useReducer)** -- Owns `flowPhase` + `currentIndex`; all transitions go through a single reducer with explicit transition map
2. **QuestProvider (context)** -- Owns responses, scores, persistence; consumed by all phase components
3. **Phase components (stateless)** -- QuestionPhase, BlockTransition, EngagementCheckpoint, RevealSequence, CompletionScreen -- each dispatches events to the orchestrator, owns only UI state
4. **persistCheckpoint** -- Fire-and-forget writes to Supabase at block boundaries; localStorage as fast recovery path

### Critical Pitfalls

1. **Flow deadlock from implicit state machine** -- ALREADY HAPPENING. Fix by extracting explicit transition map in reducer; compute next phase before advancing index. Add fallthrough guard: if no valid transition exists, log error and continue to next question rather than stalling.

2. **Dual index tracking causes score drift** -- Session page and `useQuestState` both maintain `currentIndex` independently. Fix by establishing single source of truth in the reducer; audit all index mutations.

3. **Silent data loss on persistence failure** -- `persistence_failed` flag is set but never rendered. Fix by adding visible status indicator, classifying retryable vs. non-retryable errors, and blocking completion screen until final persistence succeeds.

4. **MBTI false precision with 2 questions per dimension** -- Scores of +33 look definitive but are based on a single question's lean. Fix by ensuring "still emerging" UI language is prominent, using underscores for unclear dimensions, and considering widening the threshold from 35 to 50.

5. **Hardcoded "Wanderer" class breaks narrative** -- All narration uses wanderer text regardless of student's class selection. Fix by passing selected class through session context and making narration dynamic.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Flow Engine Refactor & Bug Fix
**Rationale:** Everything else is blocked by this. The engagement checkpoint deadlock prevents users from reaching any completion feature. The reducer refactor is the foundation all subsequent phases build on.
**Delivers:** Working end-to-end Session 1 flow from first question through reveal sequence. All existing features become reachable.
**Addresses:** Profile reveal, chart animations, class label reveal, badge unlock (all already built, just unreachable)
**Avoids:** Pitfall 1 (flow deadlock), Pitfall 2 (dual index tracking)
**Work:**
- Extract `lib/flow/flow-reducer.ts` with typed state, events, transition map
- Fix engagement checkpoint: compute next phase + index atomically
- Refactor session page to use reducer
- Fix hardcoded "Wanderer" class (Pitfall 9)
- Unit test every valid transition and verify invalid transitions are no-ops

### Phase 2: Session Completion & Persistence
**Rationale:** Once flow works end-to-end, the session needs a proper terminal state with durable persistence. Without this, students lose their work.
**Delivers:** Persisted completion state, returning user detection, celebration moment, clear "Session 1 Complete" screen
**Addresses:** Completion persistence, returning user routing, celebration particles, XP bar at completion, "Session 1 Complete" terminal screen
**Avoids:** Pitfall 3 (silent data loss), Pitfall 8 (no mid-session persistence)
**Work:**
- Add `session_1_completed` flag to student record
- Implement `persistCheckpoint("final")` with success/failure UI
- Add localStorage write-ahead log (every answer)
- Build CompletionScreen with dashboard CTA
- Add canvas-confetti celebration on badge unlock
- Add persistence failure toast + retry button
- Implement returning user detection and routing

### Phase 3: Scoring Quality & Edge Cases
**Rationale:** With flow and persistence working, harden the scoring layer. This is about correctness and trust -- a career assessment that gives wrong results is worse than no assessment.
**Delivers:** Verified scoring accuracy, proper undo behavior, edge case handling, error boundaries
**Addresses:** Confirmatory round integration, emerging MBTI honest labeling, acquiescence bias coaching
**Avoids:** Pitfall 5 (MBTI false precision), Pitfall 6 (undo signal reversal), Pitfall 7 (acquiescence bias), Pitfall 10 (skip gaps), Pitfall 12 (chart NaN crashes)
**Work:**
- Audit and fix undo for multi-framework signal responses
- Add score range validation before persistence
- Widen MBTI `STILL_EMERGING_THRESHOLD` to 50; audit reveal UI language
- Add error boundaries on all chart components
- Wire confirmatory round (parent loads adaptive questions)
- Add acquiescence bias coaching moment
- Track skipped questions; add minimum-answer thresholds
- Replace `structuredClone` with immutable update patterns (Pitfall 11)

### Phase 4: Data Integrity & Robustness
**Rationale:** Final hardening pass before considering Session 2. Addresses server-side verification and database integrity.
**Delivers:** Verified data pipeline, transaction-wrapped auth flow, score recomputation capability
**Addresses:** Client-side score verification (Pitfall 4), orphaned records (Pitfall 13)
**Avoids:** Pitfall 4 (tamperable scores), Pitfall 13 (orphaned records)
**Work:**
- Add server-side score range validation
- Transaction-wrap character creation flow (auth + student + scores)
- Build score recomputation script from raw responses
- Cleanup job for orphaned anonymous users

### Phase Ordering Rationale

- **Phase 1 must come first** because it unblocks everything. No feature can be tested or shipped while the flow deadlocks at the engagement checkpoint.
- **Phase 2 follows immediately** because a working flow without persistence is useless -- students need their results saved.
- **Phase 3 addresses correctness** once the flow works and data is persisted. Scoring bugs are less urgent than "can't complete the session" but still critical for a psychometric tool.
- **Phase 4 is hardening** that builds trust in the data layer. It can overlap with Phase 3 where there are no dependencies.
- Each phase is independently shippable. Phase 1 alone is a meaningful improvement (flow works). Phase 1+2 is a complete Session 1 experience. Phase 3+4 build confidence in the product's accuracy.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Needs careful code analysis of `app/quest/session/[id]/page.tsx` and `hooks/use-quest-state.ts` to confirm the exact engagement bug root cause before writing the reducer. The architecture research has a strong hypothesis but it should be validated against the actual code.
- **Phase 3 (confirmatory round):** The wiring between reveal sequence completion and loading adaptive questions is only partially documented. Needs implementation-level research into how `onRevealComplete` triggers question loading.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Persistence, localStorage, completion flags, returning user routing -- all well-documented patterns with clear implementation paths.
- **Phase 4:** Score validation, database transactions, cleanup jobs -- standard backend patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Minimal changes; one new 6KB dependency. Existing stack is proven and working. |
| Features | HIGH | Most features already exist in code. Research grounded in codebase inventory, not speculation. |
| Architecture | HIGH | Root cause analysis of the engagement bug is specific and testable. Reducer pattern is well-established. |
| Pitfalls | HIGH | Pitfall 1 is confirmed (already manifesting). Others identified through direct code analysis with specific file/function references. |

**Overall confidence:** HIGH

This is an unusually high-confidence research output because the project is about fixing and completing existing code, not building from scratch. The codebase already exists, the bug is reproducible, and the fix pattern (useReducer with atomic updates) is well-understood.

### Gaps to Address

- **Exact engagement bug reproduction:** The architecture research identifies the likely root cause (index advancing before phase check) but the fix should be validated by stepping through the actual code path with a debugger or targeted logging before writing the reducer.
- **Supabase schema for completion state:** The `session_1_completed` flag needs a home -- either a new column on the existing `students` table or `assessment_scores`, or a separate `session_progress` table. Schema decision should happen during Phase 2 planning.
- **Confirmatory question loading:** How the parent component loads adaptive questions after reveal completion is only partially documented. Needs code-level investigation in Phase 3.
- **Target device performance:** The app targets students who may have older hardware. The `structuredClone` performance concern (Pitfall 11) and animation smoothness should be tested on representative devices, not just developer machines.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `app/quest/session/[id]/page.tsx`, `hooks/use-quest-state.ts`, `providers/quest-provider.tsx`, `components/quest/reveal-sequence.tsx`, `lib/scoring/*`
- [React official docs: Managing State](https://react.dev/learn/managing-state) -- useReducer patterns
- [Motion for React docs](https://motion.dev/docs/react) -- Framer Motion v12 features
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) -- v1.9.4 API and performance

### Secondary (MEDIUM confidence)
- [XState v5 docs](https://stately.ai/docs/xstate) -- evaluated and rejected for this use case
- [Qualtrics Incomplete Survey Responses](https://www.qualtrics.com/support/survey-platform/survey-module/survey-options/partial-completion/) -- checkpoint persistence patterns
- [Duolingo micro-interactions analysis](https://medium.com/@Bundu/little-touches-big-impact-the-micro-interactions-on-duolingo-d8377876f682) -- celebration design
- [16Personalities](https://www.16personalities.com/) -- personality reveal UX patterns
- [RIASEC Test Accuracy](https://riasectest.com/blog/riasec-test-accuracy-reliability-validity-explained) -- psychometric validity

### Tertiary (LOW confidence)
- [MBTI Validity Challenges - Truity](https://www.truity.com/blog/myers-briggs/mbti-validity-challenges) -- threshold recommendations are judgment calls, not validated for 2-question-per-dimension instruments
- [Gamification hollow rewards concern](https://yukaichou.com/gamification-examples/10-best-gamification-education-apps/) -- Pitfall 14 is subjective; needs user testing

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
