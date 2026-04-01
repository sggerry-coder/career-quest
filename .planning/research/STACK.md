# Technology Stack

**Project:** Career Quest - Completion Flow & Quality Hardening
**Researched:** 2026-04-01
**Context:** Subsequent milestone on existing Next.js 16 + React 19 + Supabase app. This research covers *additions and upgrades* only -- not the established core stack.

## Current Stack (Do Not Change)

Already established and working. Listed for reference only.

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.2.1 | App Router, SSR/SSG framework |
| React | 19.2.4 | UI components |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Supabase | 2.101.0 | Auth + Postgres persistence |
| Framer Motion | 12.38.0 | Animation (26 files import it) |
| Recharts | 3.8.1 | Dashboard charts |
| Vitest | 4.1.2 | Testing |

## Recommended Additions

### Flow Engine: Do NOT Add XState -- Use useReducer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React `useReducer` | (built-in) | Quest flow state machine | See rationale below |

**Confidence:** HIGH

**Rationale:** The current flow engine uses `useState` in `use-quest-state.ts` with manual state transitions. The milestone's core bug is that progression blocks at the engagement checkpoint -- this is a state transition problem.

XState v5 (5.30.0) is the gold standard for complex state machines, but it is **overkill here** because:

1. The quest flow has ~8 linear states (warmup -> riasec -> checkpoint -> strengths -> values -> mbti -> adaptive -> reveal) with minimal branching (only discovery mode).
2. The team already built the flow with React hooks -- adding XState means rewriting working code and learning the actor model.
3. The bug is likely a missing transition case in plain state logic, not a fundamental architecture problem.

**Recommendation:** Refactor `use-quest-state.ts` from `useState` to `useReducer` with an explicit action/state mapping. This gives:
- Explicit, enumerated state transitions (like a state machine)
- Easy to test (pure reducer function)
- Zero new dependencies
- Clear "impossible state" prevention

```typescript
// Pattern: typed reducer for quest flow
type QuestPhase =
  | "warmup" | "riasec" | "checkpoint"
  | "strengths" | "values" | "mbti"
  | "adaptive" | "reveal" | "complete";

type QuestAction =
  | { type: "ANSWER_QUESTION"; payload: ClientResponse }
  | { type: "ADVANCE_BLOCK"; payload: QuestionBlock }
  | { type: "COMPLETE_CHECKPOINT" }
  | { type: "COMPLETE_SESSION" };

function questReducer(state: QuestState, action: QuestAction): QuestState {
  // Explicit transitions -- impossible states are compile errors
}
```

**When XState WOULD be warranted:** If Sessions 2-4 introduce complex branching (adaptive paths, conditional skips, parallel tracks), revisit XState at that point. For Session 1's linear flow, a reducer is the right tool.

### Celebration Effects: canvas-confetti

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| canvas-confetti | ^1.9.4 | Session completion celebration | Lightweight, framework-agnostic, performant |

**Confidence:** HIGH

**Rationale:** The milestone requires an animated "Session Complete" state. For a gamified teen-facing app, visual celebration is table stakes. canvas-confetti is the right choice because:

1. **6KB gzipped** -- far lighter than react-confetti (which renders on every frame via React reconciliation)
2. **Off-main-thread rendering** via Web Workers -- won't jank during the reveal animation sequence
3. **Imperative API** -- call `confetti()` from event handlers, no React component tree pollution
4. **`disableForReducedMotion`** -- accessibility built in
5. **Zero React dependency** -- works with any version, no peer dep conflicts

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

**Do NOT use:** `react-confetti` (heavier, re-renders on every frame, canvas managed by React lifecycle), `react-confetti-explosion` (CSS-only, less customizable), `tsparticles` (massive bundle for what we need).

### Animation Patterns: Stay on Framer Motion 12, but Migrate Import Path

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| framer-motion | 12.38.0 (keep) | All animations | Already in use across 26 files |

**Confidence:** HIGH

**No version change needed.** Framer Motion was rebranded to "Motion" (motion.dev) and the new canonical import is `motion/react` instead of `framer-motion`. However:

- The `framer-motion` package at 12.38.0 IS the same code as `motion` 12.38.0
- All 26 files currently import from `framer-motion`
- Migration to `motion/react` imports is a nice-to-have, NOT a blocker
- The current package works fine with React 19

**For the completion flow, use these Framer Motion patterns:**

1. **AnimatePresence + exit props** for block-to-block transitions (already partially in use)
2. **Staggered children** via `staggerChildren` in parent variants for reveal sequence
3. **Layout animations** via `layout` prop for score bars growing into place
4. **useInView** for scroll-triggered animations on the profile reveal page

**Do NOT add:** View Transitions API (experimental, poor Safari support), react-spring (redundant with Framer Motion), GSAP (wrong paradigm for React component trees).

### Testing: No New Libraries Needed

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 4.1.2 (keep) | Unit + integration tests | Already configured |

**Confidence:** HIGH

The quality hardening part of this milestone is about writing more tests with the existing Vitest setup, not adding testing libraries. The `useReducer` pattern makes the flow engine trivially testable -- just assert `reducer(state, action) === expectedState`.

**Do NOT add:** Playwright or Cypress for this milestone. E2E testing is valuable but is a separate initiative -- the immediate need is unit-testing the flow transitions and scoring edge cases.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Flow state | useReducer | XState v5 | Overkill for linear flow; adds learning curve and dependency for ~8 states |
| Flow state | useReducer | Zustand | Wrong tool -- Zustand is for shared app state, not flow orchestration |
| Flow state | useReducer | Redux Toolkit | Massive overhead for a single flow; app has no other global state needs |
| Celebration | canvas-confetti | react-confetti | Heavier, React-managed canvas, worse perf during reveal animations |
| Celebration | canvas-confetti | tsparticles | Huge bundle (100KB+) for a single confetti burst |
| Animation | Framer Motion 12 | Motion (new pkg) | Same code, 26-file import migration not worth it mid-milestone |
| Animation | Framer Motion 12 | react-spring | Redundant; FM already deeply integrated |
| Animation | Framer Motion 12 | CSS View Transitions | Poor browser support, doesn't handle AnimatePresence exit patterns |

## Import Migration Note (Future)

Framer Motion's `framer-motion` package is in maintenance mode. The active package is now `motion` with imports from `motion/react`. Plan to migrate in a future milestone:

```bash
# Future: replace framer-motion with motion
npm uninstall framer-motion
npm install motion
# Then update 26 files: "framer-motion" -> "motion/react"
```

This is cosmetic -- same API, same features. Not worth doing mid-milestone when the focus is fixing flow bugs and adding completion state.

## Installation (This Milestone)

```bash
# Only new dependency
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

That's it. One new dependency. The flow engine fix and completion state are achieved by refactoring existing code patterns, not adding libraries.

## Sources

- [XState v5 docs](https://stately.ai/docs/xstate) -- v5.30.0 current
- [@xstate/react](https://stately.ai/docs/xstate-react) -- v6.1.0 current
- [Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide) -- framer-motion to motion migration
- [Motion for React docs](https://motion.dev/docs/react) -- v12 features
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) -- v1.9.4
- [React state management 2025](https://makersden.io/blog/react-state-management-in-2025) -- ecosystem overview
- [React managing state (official)](https://react.dev/learn/managing-state) -- useReducer patterns

---

*Stack research: 2026-04-01*
