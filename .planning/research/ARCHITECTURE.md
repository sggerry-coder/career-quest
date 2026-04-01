# Architecture Patterns

**Domain:** Multi-step gamified assessment questionnaire (Career Quest)
**Researched:** 2026-04-01
**Focus:** Block progression, engagement checkpoints, session completion states

## Executive Problem Statement

The current flow engine is an implicit state machine: 8 flow phases managed by scattered `useState` hooks and conditional rendering in a 666-line page component. The engagement checkpoint ("Halfway there") blocks progression because `checkEngagement` sets the flow phase to `"engagement"` but the index has already advanced -- the resumed `"questions"` phase renders the next question correctly, yet the bug likely lives in the interaction between `currentIndex` advancing and the engagement check firing at the wrong boundary. The architecture needs a clear state machine with explicit transitions to make this debuggable and to support session completion.

## Recommended Architecture

### Pattern: Explicit Finite State Machine for Flow Orchestration

Use a **declarative state machine** (not XState -- too heavy for this use case) implemented as a pure reducer with a typed transition map. The state machine owns flow phase transitions; individual components own their own UI state.

**Why not XState:** The flow has ~8 states with simple linear transitions and 2-3 conditional branches. XState's actor model, spawn/invoke, and visualization tooling add dependency weight without proportional value. A typed reducer with an explicit transition map gives the same safety guarantees with zero dependencies.

**Why not current approach (scattered useState):** The current approach allows impossible states (e.g., `flowPhase === "engagement"` while `currentIndex` points past all questions), makes transitions implicit in callback chains, and is untestable without rendering the full component.

### State Machine Definition

```
States:
  questions        -- Showing a question card, accepting answers
  block_transition -- Interstitial narration between blocks
  engagement       -- Non-blocking encouragement checkpoint
  discovery_prompt -- Triggered by 3 consecutive neutral RIASEC answers
  selfmap          -- Self-map capture (end of core questions)
  reveal           -- Animated score reveal sequence
  confirmatory     -- Adaptive follow-up questions
  complete         -- Session finished, scores persisted

Transitions:
  questions -> block_transition   [when: next question crosses block boundary]
  questions -> engagement         [when: reaching engagement index within block]
  questions -> discovery_prompt   [when: 3 consecutive neutral Likert]
  questions -> selfmap            [when: currentIndex >= sessionQuestions.length]
  block_transition -> questions   [on: animation complete]
  engagement -> questions         [on: user clicks continue]
  discovery_prompt -> questions   [on: user acknowledges]
  selfmap -> reveal               [on: self-map data submitted]
  reveal -> confirmatory          [on: reveal animation complete]
  confirmatory -> complete        [on: all adaptive questions answered]
  reveal -> complete              [on: user skips confirmatory / no adaptive Qs]
```

**Critical invariant:** `currentIndex` must only advance AFTER the transition target is determined. The current bug occurs because `handleAnswer` calls `setCurrentIndex(nextIndex)` and then checks engagement/transitions -- but React batches these, so the check sees the old index while the render sees the new one. The fix: compute the next state and next index together, apply atomically.

### Component Boundaries

| Component | Responsibility | Communicates With | Owns State |
|-----------|---------------|-------------------|------------|
| `SessionPage` | Layout shell, reads route params, provides context | FlowOrchestrator, QuestProvider | Route params only |
| `FlowOrchestrator` | State machine: determines which phase to render, manages transitions | SessionPage (parent), all phase components (children) | `flowPhase`, `currentIndex`, `direction` |
| `QuestionPhase` | Renders QuestionCard + input, handles answer submission | FlowOrchestrator (via callback) | None (stateless, receives question + handlers) |
| `BlockTransition` | Narration interstitial animation | FlowOrchestrator (via onComplete) | Animation state only |
| `EngagementCheckpoint` | Encouragement message + continue button | FlowOrchestrator (via onContinue) | None |
| `DiscoveryModePrompt` | Discovery mode explanation + continue | FlowOrchestrator (via onContinue) | None |
| `SelfMapCapture` | Self-reflection form | FlowOrchestrator (via onComplete) | Form state only |
| `RevealSequence` | Animated score reveal | FlowOrchestrator (via onRevealComplete) | Animation phase |
| `ConfirmatoryPhase` | Adaptive follow-up questions | FlowOrchestrator (via callbacks) | `confirmIndex` |
| `CompletionScreen` | Session complete UI, dashboard link | None (terminal) | None |
| `QuestProvider` | Context: quest state + scores + persistence | All children via context | Quest responses, scores |
| `useQuestState` | Response tracking, undo, discovery mode flag | QuestProvider | Responses array, flags |
| `useScores` | Score computation across frameworks | QuestProvider | Raw + normalized scores |
| `persistCheckpoint` | Writes state snapshots to Supabase | QuestProvider (called by FlowOrchestrator at boundaries) | None (side effect) |

### Data Flow

```
User answers question
  |
  v
QuestionPhase.handleAnswer(value, label)
  |
  v
FlowOrchestrator receives answer event
  |---> QuestProvider.answerQuestion(response)  -- updates responses[]
  |---> QuestProvider.processResponse(response) -- updates scores
  |
  v
FlowOrchestrator computes next state:
  1. Build nextIndex = currentIndex + 1
  2. Check: nextIndex >= totalQuestions? --> transition to "selfmap"
  3. Check: block boundary crossed? --> transition to "block_transition"
  4. Check: engagement index hit? --> transition to "engagement"
  5. Check: discovery mode triggered? --> transition to "discovery_prompt"
  6. Default: stay in "questions", advance index
  |
  v
State + index update applied atomically (single dispatch)
  |
  v
FlowOrchestrator renders phase component based on new flowPhase
```

**Persistence triggers (non-blocking):**

```
Block boundary (riasec -> riasec_mi):  persistCheckpoint("riasec")  -- lightweight
Selfmap reached:                       persistCheckpoint("full")    -- all scores
Session complete:                      persistCheckpoint("final")   -- scores + badge
```

Persistence is fire-and-forget with retry. It must never block flow progression. If persistence fails, set a flag and show a non-intrusive warning; allow the user to complete the session and retry persistence at completion.

### Engagement Checkpoints: Non-Blocking Design

Engagement checkpoints are **encouragement pauses**, not gates. They should:

1. **Not block progression** -- if the component fails to render or the user force-navigates, the session continues normally
2. **Not affect scoring** -- no data is captured at engagement checkpoints
3. **Not persist state** -- engagement checkpoints are purely cosmetic flow interruptions
4. **Be skippable** -- a timeout or tap-anywhere should dismiss them

The current bug: `checkEngagement` fires based on `nextIndex === (currentBlock?.startIndex ?? 0) + 7`, but `currentBlock` is derived from `currentIndex` (the OLD index before advancing). When the engagement fires at the boundary of question 7, `currentIndex` has already been set to the next value, so `currentBlock` may have shifted. The fix is to compute the engagement check against the pre-advance index, not the post-advance derived block.

### Session Completion States

A session moves through these completion states:

| State | Stored In | Meaning |
|-------|-----------|---------|
| `not_started` | Absence of session record | Student hasn't begun this session |
| `in_progress` | `current_question_index` in localStorage + partial responses in memory | Student is actively answering |
| `checkpoint_saved` | `assessment_scores` row exists | Partial scores persisted at block boundary |
| `core_complete` | All core questions answered, selfmap submitted | Ready for reveal |
| `reveal_viewed` | Reveal sequence completed | Student has seen their scores |
| `session_complete` | `persistCheckpoint("final")` succeeded, badge inserted | Full completion, ready for dashboard |

**Resume logic:** On page load, check localStorage for `currentIndex` and Supabase for existing `session_responses`. If both exist, offer "Continue where you left off?" If only Supabase data exists, fast-forward past already-answered questions. If neither, start fresh.

## Patterns to Follow

### Pattern 1: Reducer-Based State Machine

**What:** All flow state transitions go through a single reducer function with an explicit transition map. No scattered `setState` calls.

**When:** Always, for the flow orchestration layer.

**Example:**

```typescript
type FlowPhase = "questions" | "block_transition" | "engagement" |
  "discovery_prompt" | "selfmap" | "reveal" | "confirmatory" | "complete";

type FlowEvent =
  | { type: "ANSWER_SUBMITTED"; nextIndex: number; crossesBlock: boolean; engagementHit: boolean; discoveryTriggered: boolean }
  | { type: "TRANSITION_COMPLETE" }
  | { type: "ENGAGEMENT_CONTINUE" }
  | { type: "DISCOVERY_CONTINUE" }
  | { type: "SELFMAP_COMPLETE" }
  | { type: "REVEAL_COMPLETE"; adaptiveQuestions: Question[] }
  | { type: "CONFIRMATORY_ANSWER"; nextConfirmIndex: number; isLast: boolean }
  | { type: "SESSION_COMPLETE" };

interface FlowState {
  phase: FlowPhase;
  currentIndex: number;
  confirmIndex: number;
  direction: "left" | "right";
  transitionNarration: string;
  adaptiveQuestions: Question[];
}

function flowReducer(state: FlowState, event: FlowEvent): FlowState {
  // Explicit transition map -- every valid transition documented
  // Invalid transitions return state unchanged (no-op, not crash)
}
```

**Why:** Testable without rendering. Every transition is explicit. Impossible states are impossible.

### Pattern 2: Atomic Index + Phase Updates

**What:** Never update `currentIndex` separately from `flowPhase`. They must change together in a single state update.

**When:** Every time a user answers a question or transitions between phases.

**Why:** The current bug exists because `setCurrentIndex` and `setFlowPhase` are separate calls that can get out of sync during React's batched rendering.

### Pattern 3: Checkpoint Persistence at Block Boundaries

**What:** Persist scores to Supabase at block boundaries (when transitioning between question blocks), not after every question.

**When:** Block transition events, selfmap completion, session completion.

**Why:** Reduces Supabase writes from ~35 (one per question) to ~4 (one per block boundary). Balances data safety with API efficiency. If the user abandons mid-block, they lose at most one block's worth of responses -- acceptable for a 5-15 question block.

### Pattern 4: LocalStorage as Write-Ahead Log

**What:** Write `currentIndex` and in-progress responses to localStorage after each answer. Use this as the resume source, not Supabase.

**When:** After every answer submission, before any async persistence.

**Why:** Synchronous, zero-latency, survives page refresh. Supabase persistence is the durable store; localStorage is the fast recovery path. On session load: check localStorage first, validate against Supabase, reconcile if needed.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Implicit State Machine via Conditional Rendering

**What:** Using `if (flowPhase === "X") return <Component />` chains in the render body with phase transitions scattered across multiple callbacks.

**Why bad:** Flow transitions become invisible -- you have to read every callback to understand what triggers what. Adding a new phase requires touching 3-5 different functions. Testing requires rendering the entire page component.

**Instead:** Single reducer function owns all transitions. Render body reads `flowPhase` from reducer state and renders accordingly. Callbacks dispatch events to reducer.

### Anti-Pattern 2: Advancing Index Before Determining Phase

**What:** Calling `setCurrentIndex(nextIndex)` and then checking if a transition should happen.

**Why bad:** The engagement/block-transition checks run against stale state because React batches updates. This is the root cause of the current "stuck at engagement" bug.

**Instead:** Compute the full next state (phase + index) before applying any updates. Apply once, atomically.

### Anti-Pattern 3: Mixing Cosmetic and Structural Checkpoints

**What:** Treating engagement checkpoints (cosmetic encouragement) the same as block transitions (structural flow control) or persistence checkpoints (data safety).

**Why bad:** If engagement checkpoint code has a bug, it shouldn't break the ability to progress through questions or persist data.

**Instead:** Three separate concerns:
- **Flow progression**: Which question to show next (structural)
- **Interstitials**: What to show between questions (cosmetic, non-blocking)
- **Persistence**: When to save data (background, non-blocking)

### Anti-Pattern 4: Server Round-Trip for Every Answer

**What:** Persisting each individual response to Supabase as the user answers.

**Why bad:** Adds latency between questions (even with optimistic UI), burns Supabase quota, creates partial-write failure scenarios where some responses are saved but not others.

**Instead:** Batch persistence at block boundaries. Keep everything in memory + localStorage until a natural pause point.

## Suggested Build Order

Based on the dependency graph, the fix/build order should be:

### Phase 1: Fix the Flow Engine (unblocks everything else)

**Step 1a: Extract flow state into a reducer**
- Create `lib/flow/flow-reducer.ts` with typed state, events, and transition map
- Unit test every valid transition
- Unit test that invalid transitions are no-ops

**Step 1b: Fix the engagement checkpoint bug**
- Root cause: index advances before phase check
- Fix: compute next phase and next index together in the reducer
- The reducer receives `ANSWER_SUBMITTED` with pre-computed flags (crossesBlock, engagementHit, etc.)
- Test: answering question 7 in RIASEC block shows engagement, then continues to question 8

**Step 1c: Refactor SessionPage to use the reducer**
- Replace scattered `useState` + callbacks with `useReducer(flowReducer, initialState)`
- Each phase component dispatches events; reducer determines transitions
- SessionPage becomes a thin rendering switch over `state.phase`

### Phase 2: Add Session Completion

**Step 2a: Define completion states**
- Add `session_status` field to student record or separate `session_progress` table
- States: `not_started`, `in_progress`, `core_complete`, `session_complete`

**Step 2b: Implement the "complete" flow phase**
- After confirmatory questions (or reveal if no adaptive), transition to "complete"
- `persistCheckpoint("final")` writes all scores + achievement badge
- Render completion screen with dashboard link

**Step 2c: Add progress persistence (localStorage)**
- Write `currentIndex` + `responses` to localStorage on each answer
- On session page mount, check localStorage for resume data
- Offer "Continue where you left off?" if data exists

### Phase 3: Quality and Edge Cases

**Step 3a: Handle persistence failures gracefully**
- Show non-intrusive toast when `persistence_failed` is true
- Offer "Retry save" button on completion screen
- Never block flow progression due to persistence failure

**Step 3b: Add block boundary persistence**
- Call `persistCheckpoint("riasec")` when transitioning from riasec to riasec_mi
- Call `persistCheckpoint("full")` when entering selfmap
- These are fire-and-forget; failures are logged but don't interrupt flow

### Dependency Graph

```
Step 1a (flow reducer)
  --> Step 1b (engagement fix -- needs reducer to fix atomically)
  --> Step 1c (refactor page -- needs reducer)
      --> Step 2b (complete phase -- needs refactored page)
      --> Step 2c (progress persistence -- needs refactored page)
          --> Step 3a (failure handling -- needs persistence in place)
          --> Step 3b (block persistence -- needs persistence in place)
Step 2a (completion states in DB -- independent, can parallel with 1a-1c)
```

## Current Architecture vs. Recommended

| Aspect | Current | Recommended |
|--------|---------|-------------|
| Flow state | 4 separate `useState` hooks | Single `useReducer` with typed state |
| Transitions | Implicit in callback chains | Explicit transition map in reducer |
| Index + phase sync | Separate updates, can desync | Atomic update in reducer return |
| Engagement checkpoints | Same priority as structural transitions | Clearly separated as cosmetic/non-blocking |
| Progress persistence | Only at explicit checkpoint calls | localStorage after every answer + Supabase at boundaries |
| Session completion | Basic "complete" screen, no persisted status | Typed completion states with resume support |
| Testability | Requires full component render | Reducer is pure function, unit testable |

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|------------|-------|
| Reducer pattern fixes the engagement bug | HIGH | Direct code analysis -- the bug is a state sync issue that atomic updates solve |
| Block-boundary persistence is sufficient | HIGH | Standard pattern in survey platforms (Qualtrics, etc.) |
| localStorage as write-ahead log | HIGH | Well-established pattern for form/wizard resume |
| XState is overkill here | MEDIUM | Judgment call -- 8 states with linear flow doesn't justify the dependency, but XState would also work fine |
| Completion state schema | MEDIUM | Reasonable inference from the data model; actual Supabase schema may need adjustment |

## Sources

- Direct codebase analysis of `app/quest/session/[id]/page.tsx`, `hooks/use-quest-state.ts`, `providers/quest-provider.tsx`
- [State Machines in React (Medium)](https://medium.com/@ignatovich.dm/state-machines-in-react-advanced-state-management-beyond-redux-33ea20e59b62)
- [XState Best Practices (DhiWise)](https://www.dhiwise.com/post/mastering-state-management-with-xstate-react-best-practices)
- [Solving the Wizard Problem (Chris Zempel)](https://chriszempel.com/posts/thewizardproblem/)
- [Qualtrics Incomplete Survey Responses](https://www.qualtrics.com/support/survey-platform/survey-module/survey-options/partial-completion/)
- [State Machine Design Pattern (GeeksforGeeks)](https://www.geeksforgeeks.org/system-design/state-design-pattern/)

---

*Architecture research: 2026-04-01*
