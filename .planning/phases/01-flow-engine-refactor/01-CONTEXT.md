# Phase 1: Flow Engine Refactor - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the Session 1 flow engine so students can progress through all question blocks without getting stuck at the engagement checkpoint. Replace scattered useState with a single useReducer state machine. Fix hardcoded "Wanderer" class to use the student's selected class.

</domain>

<decisions>
## Implementation Decisions

### State Machine Design
- Merge page-level `flowPhase`/`currentIndex` into existing `use-quest-state.ts` hook — eliminate dual state tracking between session page and hook
- Use typed discriminated union actions: `ANSWER_QUESTION`, `ADVANCE_BLOCK`, `SHOW_ENGAGEMENT`, `DISMISS_ENGAGEMENT`, `SHOW_DISCOVERY`, `ENTER_SELFMAP`, `ENTER_REVEAL`, `ENTER_CONFIRMATORY`, `COMPLETE_SESSION`, `UNDO`
- Reducer computes the next flow phase deterministically — given current state + action, the reducer decides if it's engagement/transition/questions. No separate `check*` functions
- Engagement checkpoint triggered via index-based threshold in reducer — when `ANSWER_QUESTION` lands on engagement index, reducer atomically sets `flowPhase: "engagement"` + advances index in one dispatch

### Engagement Checkpoint Behavior
- Cosmetic interrupt — pauses visually, single "Keep going!" button, no data collection. Reducer resumes to the correct next question atomically
- Triggers on 7th question answered in the RIASEC block — matches current behavior, fix via reducer
- One checkpoint per session — keep simple for Phase 1

### Class/Narration Fix
- Read student's selected class from Supabase on session page load — character creation already persists class selection
- Fall back to "Wanderer" if class data is missing — graceful degradation
- Use existing `classDefinitions` lookup in `lib/theme.ts` for dynamic narration per class — the narration map already exists

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hooks/use-quest-state.ts` — existing quest state hook, will be refactored to useReducer
- `hooks/use-scores.ts` — scoring hook, stays separate
- `lib/theme.ts` — `classDefinitions` with narration text per class
- `components/quest/engagement-checkpoint.tsx` — working component, just needs correct props
- `components/quest/block-transition.tsx` — working transition component
- `components/quest/reveal-sequence.tsx` — existing reveal component

### Established Patterns
- Single `useState` object pattern in `use-quest-state.ts` — will become `useReducer`
- `useMemo` for derived state (blocks, currentBlock, currentQuestion)
- `useCallback` for all event handlers
- Framer Motion for component transitions

### Integration Points
- `app/quest/session/[id]/page.tsx` — main consumer, currently has dual state (~8 useState hooks to consolidate)
- `providers/quest-provider.tsx` — persistence layer, consumes quest state
- `lib/supabase/client.ts` — for reading student's class selection on page load

### Root Cause of Bug
The engagement checkpoint bug is a state synchronization issue: `checkEngagement` calls `setFlowPhase("engagement")` while `handleAnswer` separately calls `setCurrentIndex(nextIndex)`. These are independent state updates that can desync. The reducer fix makes these atomic — a single dispatch computes both the next index AND the next flow phase.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard reducer refactor with bug fix.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
