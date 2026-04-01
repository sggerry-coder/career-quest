# Phase 1: Flow Engine Refactor - Research

**Researched:** 2026-04-01
**Domain:** React state management (useReducer), flow state machine, Supabase data fetching
**Confidence:** HIGH

## Summary

Phase 1 fixes a critical flow-blocking bug in the Session 1 quest engine. The root cause is a state synchronization issue: `handleAnswer` in `app/quest/session/[id]/page.tsx` manages flow phase (`flowPhase`) and question index (`currentIndex`) as independent `useState` hooks, plus the `useQuestState` hook maintains its own `current_question_index`. These three sources of truth can desync, especially at the engagement checkpoint where `setFlowPhase("engagement")` and `setCurrentIndex(nextIndex)` are separate calls.

The fix is a single `useReducer` state machine in `hooks/use-quest-state.ts` that absorbs the page-level `flowPhase`, `currentIndex`, `direction`, `transitionNarration`, `adaptiveQuestions`, and `confirmIndex` state. A discriminated-union action type ensures every state transition is atomic -- answering a question computes both the next index AND the next flow phase in one dispatch. The secondary fix reads the student's `avatar_class` from Supabase (already persisted during character creation) instead of hardcoding `"wanderer"`.

**Primary recommendation:** Refactor `useQuestState` to `useReducer` with typed actions; merge all 8 page-level `useState` hooks into the reducer state; fetch `avatar_class` from Supabase on session page mount.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Merge page-level `flowPhase`/`currentIndex` into existing `use-quest-state.ts` hook -- eliminate dual state tracking between session page and hook
- Use typed discriminated union actions: `ANSWER_QUESTION`, `ADVANCE_BLOCK`, `SHOW_ENGAGEMENT`, `DISMISS_ENGAGEMENT`, `SHOW_DISCOVERY`, `ENTER_SELFMAP`, `ENTER_REVEAL`, `ENTER_CONFIRMATORY`, `COMPLETE_SESSION`, `UNDO`
- Reducer computes the next flow phase deterministically -- given current state + action, the reducer decides if it's engagement/transition/questions. No separate `check*` functions
- Engagement checkpoint triggered via index-based threshold in reducer -- when `ANSWER_QUESTION` lands on engagement index, reducer atomically sets `flowPhase: "engagement"` + advances index in one dispatch
- Cosmetic interrupt -- pauses visually, single "Keep going!" button, no data collection. Reducer resumes to the correct next question atomically
- Triggers on 7th question answered in the RIASEC block -- matches current behavior, fix via reducer
- One checkpoint per session -- keep simple for Phase 1
- Read student's selected class from Supabase on session page load -- character creation already persists class selection
- Fall back to "Wanderer" if class data is missing -- graceful degradation
- Use existing `classDefinitions` lookup in `lib/theme.ts` for dynamic narration per class -- the narration map already exists

### Claude's Discretion
None specified -- standard reducer refactor with bug fix.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLOW-01 | Engagement checkpoints do not block progression -- atomic state transitions via useReducer | Root cause confirmed: dual `setFlowPhase`/`setCurrentIndex` calls desync. Reducer makes these atomic. Engagement index = blockStartIndex + 7 (global index 12). |
| FLOW-02 | Flow state machine refactored from scattered useState to single useReducer with typed actions | 8 useState hooks in page + 1 in useQuestState identified. Discriminated union action type with 10 actions specified. Reducer absorbs all flow logic. |
| FLOW-03 | Session narration uses student's selected class, not hardcoded "Wanderer" | `avatar_class` column exists on `students` table. Character creation page writes it. Session page currently hardcodes `classDefinitions.find(c => c.id === "wanderer")`. Fix: fetch from Supabase, pass to `classDefinitions.find(c => c.id === studentClass)`. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Next.js 16 breaking changes**: CLAUDE.md says "Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices." This applies when modifying the session page component.
- **Tech stack locked**: Next.js 16 + Supabase + Vercel -- no changes
- **Zero API cost**: Sessions 1-2 must be all client-side scoring -- no external API calls in flow engine
- **Conventions**: All exported functions need explicit return type annotations. camelCase for variables. PascalCase for types/interfaces. `@/` import alias. No console logging.
- **Error handling**: Silent catch with fallback rendering. No error logging.
- **Test runner**: Vitest 4.1.2 via `npm test` (runs `vitest run`)

## Architecture Patterns

### Current State Architecture (BEFORE -- the bug)

```
page.tsx (8 useState hooks)          use-quest-state.ts (1 useState)
  flowPhase ----+                      current_question_index
  currentIndex --+-- CAN DESYNC        current_block
  direction      |                     responses
  transitionNarration                  questions_answered
  adaptiveQuestions                    ...
  confirmIndex
  consecutiveNeutrals
  avatarClassName (hardcoded "wanderer")
```

The `handleAnswer` function calls `answerQuestion(response)` (which increments `current_question_index` inside `useQuestState`) AND separately calls `setCurrentIndex(nextIndex)` AND conditionally calls `setFlowPhase("engagement")`. Three independent state updates. React batches these in event handlers, but the logic is still split across multiple functions (`checkEngagement`, `checkBlockTransition`, `checkDiscoveryMode`) that each call `setFlowPhase` with different values.

### Target State Architecture (AFTER -- the fix)

```
use-quest-state.ts (single useReducer)
  State {
    flowPhase: FlowPhase
    currentIndex: number
    direction: "left" | "right"
    transitionNarration: string
    adaptiveQuestions: Question[]
    confirmIndex: number
    consecutiveNeutrals: number
    current_block: QuestionBlock
    questions_answered: number
    responses: ClientResponse[]
    selected_adaptive_ids: string[]
    persistence_failed: boolean
    discovery_mode_active: boolean
    last_response_undoable: boolean
    avatarClass: string          // fetched from Supabase
  }

  dispatch(action) -> deterministic next state
```

### Recommended Reducer Structure

```typescript
// Discriminated union action type
type QuestAction =
  | { type: "ANSWER_QUESTION"; response: ClientResponse; question: Question; sessionQuestions: Question[] }
  | { type: "ADVANCE_BLOCK"; nextBlock: QuestionBlock }
  | { type: "SHOW_ENGAGEMENT" }
  | { type: "DISMISS_ENGAGEMENT" }
  | { type: "SHOW_DISCOVERY" }
  | { type: "ENTER_SELFMAP" }
  | { type: "ENTER_REVEAL" }
  | { type: "ENTER_CONFIRMATORY"; adaptiveQuestions: Question[] }
  | { type: "COMPLETE_SESSION" }
  | { type: "UNDO" };

function questReducer(state: QuestState, action: QuestAction): QuestState {
  switch (action.type) {
    case "ANSWER_QUESTION": {
      const nextIndex = state.currentIndex + 1;
      const newResponses = [...state.responses, action.response];

      // Engagement checkpoint: 7th answered in RIASEC block
      // (blockStartIndex + 7 === nextIndex && block is riasec && not already shown)
      if (shouldShowEngagement(state, nextIndex, action.sessionQuestions)) {
        return {
          ...state,
          responses: newResponses,
          questions_answered: state.questions_answered + 1,
          currentIndex: nextIndex,       // ATOMIC with flowPhase
          flowPhase: "engagement",       // ATOMIC with currentIndex
          last_response_undoable: true,
          direction: "right",
        };
      }

      // Block transition check
      if (shouldShowBlockTransition(state, nextIndex, action.sessionQuestions)) {
        return {
          ...state,
          responses: newResponses,
          questions_answered: state.questions_answered + 1,
          currentIndex: nextIndex,
          flowPhase: "block_transition",
          transitionNarration: getTransitionNarration(state, nextIndex, action.sessionQuestions),
          last_response_undoable: true,
          direction: "right",
        };
      }

      // End of core questions -> selfmap
      if (nextIndex >= action.sessionQuestions.length) {
        return {
          ...state,
          responses: newResponses,
          questions_answered: state.questions_answered + 1,
          flowPhase: "selfmap",
          last_response_undoable: true,
        };
      }

      // Normal advance
      return {
        ...state,
        responses: newResponses,
        questions_answered: state.questions_answered + 1,
        currentIndex: nextIndex,
        direction: "right",
        last_response_undoable: true,
      };
    }
    // ... other cases
  }
}
```

### Key Design Insight: Passing Context via Actions

The reducer needs to know the session questions array to compute block transitions and engagement thresholds. Two approaches:

1. **Pass via action payload** (recommended): `dispatch({ type: "ANSWER_QUESTION", response, question, sessionQuestions })` -- reducer is a pure function of state + action.
2. **Store in state**: Put `sessionQuestions` in state at init. More data in state but avoids passing on every dispatch.

Approach 1 is cleaner because `sessionQuestions` is static and doesn't belong in mutable state.

### Block Index Map (verified from codebase)

| Block | Questions | Global Start Index | Global End Index |
|-------|-----------|-------------------|-----------------|
| warmup | 5 | 0 | 4 |
| riasec | 14 (12 Likert + 2 Ipsative) | 5 | 18 |
| riasec_mi | 5 | 19 | 23 |
| mbti_values | 11 | 24 | 34 |
| **Total** | **35 core questions** | | |

**Engagement checkpoint**: Triggers when `currentIndex` reaches `5 + 7 = 12` (the 8th riasec question, i.e., 7 answered in the riasec block). The current code checks `nextIndex === (currentBlock?.startIndex ?? 0) + 7`, which is correct but fragile because `currentBlock` is derived from a separate `blocks` useMemo.

### Fetching Student Class

```typescript
// In session page component (useEffect on mount)
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const { data: student } = await supabase
    .from("students")
    .select("avatar_class, tone")
    .eq("id", user.id)
    .single();
  // student.avatar_class is "warrior" | "mage" | "ranger" | etc.
  // Fall back to "wanderer" if null/missing
}
```

The `classDefinitions` array in `lib/theme.ts` already has per-class narration for all transition points (`riasec_intro`, `mbti_intro`, `reveal_intro`, `badge_unlock`) in both `quest` and `explorer` tones. The student's `tone` field determines which variant to use.

### Anti-Patterns to Avoid

- **Multiple dispatches for one logical action**: Never call `dispatch(A); dispatch(B);` where A and B should be atomic. The whole point of this refactor is that a single `ANSWER_QUESTION` dispatch computes the complete next state.
- **Derived state in reducer state**: Don't store `currentBlock` in state -- derive it via `useMemo` from `currentIndex` + `sessionQuestions`. It's read-only derived data.
- **Side effects in reducer**: The reducer must be pure. Scoring updates (`processResponse`) and Supabase calls happen outside the reducer, in the component or a custom hook wrapper.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State machine | Custom pub/sub or event emitter | `useReducer` with discriminated union | React's built-in, deterministic, debuggable with React DevTools |
| Block transition detection | Manual index comparison in callbacks | Pure function in reducer that compares `sessionQuestions[currentIndex].block !== sessionQuestions[nextIndex].block` | Single source of truth, no stale closures |
| Engagement threshold | Separate `checkEngagement` callback with closure over `currentBlock` | Inline check in `ANSWER_QUESTION` case using `sessionQuestions` from action payload | Eliminates stale closure bug that caused the original desync |

## Common Pitfalls

### Pitfall 1: Stale Closures in useCallback
**What goes wrong:** `checkEngagement` and `checkBlockTransition` capture stale values of `currentBlock` and `currentIndex` because they are `useCallback` with dependencies that may not update in time.
**Why it happens:** React batches state updates; the callback reads the pre-update value.
**How to avoid:** Move ALL transition logic into the reducer. The reducer always receives the current state, never a stale closure.
**Warning signs:** Flow works on first question but breaks after rapid clicking or on specific question indices.

### Pitfall 2: Scoring Side Effects Inside Reducer
**What goes wrong:** Calling `processResponse()` or `processResponseWithSignals()` inside the reducer breaks React's purity contract.
**Why it happens:** Temptation to consolidate ALL answer processing in one place.
**How to avoid:** Keep scoring in the component layer. Pattern: `dispatch(ANSWER_QUESTION)` then `processResponse(response)` in the same event handler. Both are synchronous, so they batch correctly.
**Warning signs:** React Strict Mode double-invocation causes duplicate score processing.

### Pitfall 3: Engagement Checkpoint Shown Multiple Times
**What goes wrong:** If the user undoes and re-answers question 7 in RIASEC, the engagement checkpoint triggers again.
**Why it happens:** The threshold check only looks at index, not whether engagement was already shown.
**How to avoid:** Add `engagementShown: boolean` to state. The reducer sets it to `true` when entering engagement, and the `ANSWER_QUESTION` case checks it before triggering.
**Warning signs:** Users seeing "Halfway there" message twice in one session.

### Pitfall 4: Forgetting to Handle Ipsative Questions in the Reducer
**What goes wrong:** Ipsative questions (in the riasec block) use `handleIpsativeComplete` which has its own separate advance logic. If this isn't migrated to the reducer, ipsative questions bypass the state machine.
**Why it happens:** The current codebase has two answer paths: `handleAnswer` (Likert/MC/forced choice/spectrum) and `handleIpsativeComplete` (ipsative). Both must dispatch to the same reducer.
**How to avoid:** Create a single `ANSWER_QUESTION` action that works for all question types. The ipsative-specific scoring stays outside the reducer; only the flow advancement goes through `ANSWER_QUESTION`.
**Warning signs:** Flow stalls or skips after ipsative ranking questions.

### Pitfall 5: Supabase Fetch Race on Page Load
**What goes wrong:** The session page renders with default "wanderer" class, then the Supabase fetch completes and causes a flash of incorrect narration.
**Why it happens:** `useEffect` fetch is async; component renders immediately with default state.
**How to avoid:** Either (a) show a loading skeleton until the fetch completes, or (b) initialize `avatarClass` as `null` and only render questions after it's populated. Option (b) is simpler given the page already has a "Loading questions..." fallback.
**Warning signs:** Brief flash of "Wanderer" text before correct class name appears.

## Code Examples

### Reducer Action Types (verified pattern from React docs)

```typescript
// Source: React useReducer documentation pattern
type FlowPhase =
  | "questions"
  | "block_transition"
  | "engagement"
  | "discovery_prompt"
  | "selfmap"
  | "reveal"
  | "confirmatory"
  | "complete";

type QuestAction =
  | { type: "ANSWER_QUESTION"; response: ClientResponse; question: Question; sessionQuestions: Question[] }
  | { type: "ANSWER_IPSATIVE"; response: ClientResponse; sessionQuestions: Question[] }
  | { type: "DISMISS_ENGAGEMENT" }
  | { type: "DISMISS_BLOCK_TRANSITION" }
  | { type: "SHOW_DISCOVERY" }
  | { type: "DISMISS_DISCOVERY" }
  | { type: "ENTER_SELFMAP" }
  | { type: "ENTER_REVEAL" }
  | { type: "ENTER_CONFIRMATORY"; adaptiveQuestions: Question[] }
  | { type: "ANSWER_CONFIRMATORY"; response: ClientResponse }
  | { type: "COMPLETE_SESSION" }
  | { type: "UNDO" }
  | { type: "SKIP"; sessionQuestions: Question[] }
  | { type: "SET_AVATAR_CLASS"; avatarClass: string };
```

### Atomic Engagement Transition

```typescript
// Inside questReducer, ANSWER_QUESTION case:
// This is the bug fix -- both flowPhase and currentIndex update atomically
const riasecStartIndex = findBlockStartIndex("riasec", action.sessionQuestions);
const isEngagementIndex = nextIndex === riasecStartIndex + 7;
const shouldEngage = isEngagementIndex && !state.engagementShown && currentBlockKey === "riasec";

if (shouldEngage) {
  return {
    ...state,
    responses: newResponses,
    questions_answered: state.questions_answered + 1,
    currentIndex: nextIndex,
    flowPhase: "engagement",
    engagementShown: true,
    direction: "right",
    last_response_undoable: true,
  };
}
```

### Fetching Avatar Class on Mount

```typescript
// In session page component
const [avatarClass, setAvatarClass] = useState<string | null>(null);

useEffect(() => {
  async function loadStudentClass(): Promise<void> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("students")
      .select("avatar_class, tone")
      .eq("id", user.id)
      .single();
    setAvatarClass(data?.avatar_class ?? "wanderer");
  }
  loadStudentClass();
}, []);

// Use avatarClass to look up classDefinitions
const classDef = useMemo(() => {
  if (!avatarClass) return null;
  return classDefinitions.find((c) => c.id === avatarClass) ?? classDefinitions.find((c) => c.id === "wanderer")!;
}, [avatarClass]);
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | None found (vitest uses package.json scripts) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLOW-01 | Engagement checkpoint does not block progression (atomic transition) | unit | `npx vitest run hooks/__tests__/use-quest-state.test.ts -t "engagement"` | Wave 0 |
| FLOW-02 | Reducer produces correct state for all action types | unit | `npx vitest run hooks/__tests__/use-quest-state.test.ts` | Wave 0 |
| FLOW-03 | Narration uses student's selected class, not hardcoded "Wanderer" | unit | `npx vitest run hooks/__tests__/use-quest-state.test.ts -t "narration"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `hooks/__tests__/use-quest-state.test.ts` -- covers FLOW-01, FLOW-02, FLOW-03 (reducer logic is pure function, easily testable without DOM)
- [ ] Need vitest config or verify vitest can resolve `@/` alias (existing tests in `lib/scoring/__tests__/` already work, so alias resolution is confirmed)

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** -- Direct reading of all source files involved:
  - `hooks/use-quest-state.ts` (current useState-based hook, 132 lines)
  - `app/quest/session/[id]/page.tsx` (session page with 8 useState hooks, 666 lines)
  - `lib/theme.ts` (classDefinitions with per-class narration, 307 lines)
  - `lib/types/quest.ts` (QuestionBlock, ClientResponse types)
  - `lib/types/student.ts` (Student interface with avatar_class field)
  - `data/questions/session-1-core.ts` (35 core questions across 4 blocks)
  - `providers/quest-provider.tsx` (persistence layer, not modified in this phase)
  - `components/quest/engagement-checkpoint.tsx` (existing component, receives className prop)

### Secondary (MEDIUM confidence)
- React useReducer documentation patterns (well-established, stable API across React 18-19)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, purely refactoring existing React hooks
- Architecture: HIGH -- root cause confirmed by direct code reading, fix pattern well-understood
- Pitfalls: HIGH -- all pitfalls derived from actual code patterns in the codebase

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- no external dependencies, purely internal refactor)
