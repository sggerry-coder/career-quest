# Domain Pitfalls

**Domain:** Gamified career assessment app (multi-session psychometric quiz with RIASEC, MI, MBTI, Values scoring)
**Researched:** 2026-04-01
**Focus:** Flow completion, scoring accuracy, state persistence, quality assurance

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or fundamentally broken assessment outcomes.

### Pitfall 1: Implicit State Machine Causes Flow Deadlocks

**What goes wrong:** The session flow has 8 phases (`questions`, `block_transition`, `engagement`, `discovery_prompt`, `selfmap`, `reveal`, `confirmatory`, `complete`) managed through scattered `useState` hooks and conditional callbacks. When transition logic has gaps -- such as missing transition keys in the `checkBlockTransition` map or off-by-one errors in `checkEngagement` -- users get stuck in a phase with no way forward.

**Why it happens:** The current code in `app/quest/session/[id]/page.tsx` uses a `FlowPhase` string union and ad-hoc `setFlowPhase()` calls. There is no explicit transition graph defining which phases can follow which. A developer adding a new block or rearranging question order can easily break transitions they do not realize exist.

**THIS IS ALREADY HAPPENING:** The PROJECT.md documents that flow "blocks at engagement checkpoint ('Halfway there'), remaining question blocks never load." This is exactly this pitfall manifesting.

**Warning signs:**
- Users report getting "stuck" at interstitials or checkpoints
- Flow phases only work when questions are in a specific order
- Adding or removing questions breaks unrelated transitions
- No unit tests cover phase transitions

**Prevention:**
1. Extract the flow into an explicit state machine (even a simple object map of `{fromPhase: {event: toPhase}}`) with exhaustive transition validation
2. Add a guard: if no valid transition exists, log an error and fall through to the next question rather than silently stalling
3. Write integration tests that walk through every phase transition path
4. Add a "flow completed" assertion at the end -- if the user answered all questions but never reached `complete`, something broke

**Detection:** Add telemetry/logging for every `setFlowPhase` call. If a user stays in a non-terminal phase for more than 60 seconds, it is likely a deadlock.

**Phase to address:** Current milestone (Session 1 flow fix). This is the active blocker.

---

### Pitfall 2: Dual State Tracking Creates Score-Response Drift

**What goes wrong:** The session page maintains its own `currentIndex` state via `useState` while `useQuestState` independently tracks `current_question_index` inside `answerQuestion` (which increments the index in its own `setState`). These two counters can diverge: the session page sets `currentIndex` in `handleAnswer` AFTER calling `answerQuestion` which already incremented the quest state's index. If any re-render or async operation causes them to go out of sync, the user sees question N but the scoring system thinks they are on question N+1.

**Why it happens:** The session page was built to manage its own flow (transitions, engagement checks) before advancing the index, but `useQuestState.answerQuestion` also advances the index as a side effect. Two sources of truth for the same value.

**Warning signs:**
- Score arrays have more entries than expected for a given question count
- Undo goes back to the wrong question (mismatched indices)
- `processResponse` receives the wrong `currentQuestion` data because the index has already moved

**Prevention:**
1. Single source of truth: either the session page owns the index OR `useQuestState` does, not both
2. The `advanceBlock` callback in `useQuestState` resets `current_question_index` to 0, which would conflict with the session page's global `currentIndex` -- another drift source. Audit all index mutations.
3. Add an invariant check: `assert(sessionPageIndex === questState.current_question_index)` after each answer

**Phase to address:** Current milestone (quality audit). Must be resolved before Session 2 is built on the same engine.

---

### Pitfall 3: Silent Data Loss on Persistence Failure

**What goes wrong:** When `persistCheckpoint` fails (network error, Supabase outage), the code sets `persistence_failed: true` but no UI component displays this to the user. The student completes the entire session believing their results are saved. On reload, everything is gone -- responses, scores, achievements.

**Why it happens:** The `quest-provider.tsx` sets a flag but the session page never reads or renders it. The retry logic (`retryWithBackoff`) also retries non-recoverable errors (auth failures, permission errors) which wastes time and still fails silently.

**Warning signs:**
- `persistence_failed` flag is set but never consumed in JSX
- No error boundary or toast notification on save failure
- Students report "lost progress" after completing sessions

**Prevention:**
1. Add a visible persistence status indicator (subtle when OK, prominent on failure)
2. Classify errors: only retry on network/timeout errors, fail immediately on auth/permission errors
3. Implement local backup: write responses to `localStorage` or `IndexedDB` as they are collected, not just at checkpoints
4. Add a "retry save" button when persistence fails, with clear feedback
5. Block the "Session Complete" screen if final persistence has not succeeded

**Detection:** Monitor Supabase dashboard for orphaned `students` records without corresponding `session_responses` or `assessment_scores`.

**Phase to address:** Current milestone (quality audit). This is a trust-breaking bug for a career assessment.

---

### Pitfall 4: Client-Side Scores Are Unverifiable and Tamperable

**What goes wrong:** All scoring happens client-side in `use-scores.ts`. The computed scores (RIASEC percentages, MBTI indicators, values compass, strengths) are sent directly to Supabase. A student (or someone helping them) could modify the JavaScript to send fake scores, producing career recommendations based on fabricated data.

**Why it happens:** The design decision for "zero API cost" means no server-side validation. Raw responses ARE persisted (in `session_responses`), but the persisted `assessment_scores` come from client-computed values, not from recomputing on the server.

**Warning signs:**
- `assessment_scores` in the database do not match what you would get from recomputing from `session_responses`
- Scores outside valid ranges (RIASEC > 100, MBTI outside -100 to +100)

**Prevention:**
1. Store raw responses as the source of truth (already done via `session_responses`)
2. Add a server-side score verification step: after final persist, a serverless function recomputes scores from raw responses and flags discrepancies
3. Add score range validation before persisting: RIASEC must be 0-100, MBTI must be -100 to +100, etc.
4. For the quality audit: add a script that can recompute all scores from raw responses to verify integrity

**Phase to address:** Quality audit for the validation layer. Server-side recomputation can be deferred to Phase 3 (when the Claude API integration will need verified scores anyway).

---

### Pitfall 5: MBTI Scores Near Center Flip on Retest (False Precision)

**What goes wrong:** With only 2 questions per MBTI dichotomy, the possible scores are -100, -33, 0, +33, +100. A student answering neutrally on one question and slightly leaning on another gets +33 -- barely past the `STILL_EMERGING_THRESHOLD` of 35. But the code uses `<` not `<=`, so +33 is marked as "still emerging" (correct) while +34 would not be (and with integer inputs, +33 is the boundary). The real problem: students may feel their type is definitive when it is based on a single question's slight lean.

**Why it happens:** Psychometric assessments need 5-10 items per dimension for reliable measurement. Two questions per dichotomy is inherently unstable. The `isStillEmerging` function exists to flag this, but the UI may present the emerging type as a definitive result rather than a tentative signal.

**Warning signs:**
- Students report their MBTI type "changed" between sessions
- Students take the type letter seriously when it was based on a single question
- Reveal sequence presents MBTI type without sufficient "this is emerging" caveats

**Prevention:**
1. The UI must prominently display the "still emerging" status with language like "Your type is still taking shape" rather than showing a definitive 4-letter code
2. Add confirmatory MBTI questions in the adaptive/confirmatory round to increase reliability
3. Use the `deriveEmergingType` function consistently -- any display of MBTI should use underscores for unclear dimensions
4. Consider widening the `STILL_EMERGING_THRESHOLD` to 50 given only 2 questions per dimension

**Phase to address:** Current milestone (quality audit for scoring accuracy). The threshold and UI messaging should be audited now; additional questions are a Session 2+ concern.

---

## Moderate Pitfalls

### Pitfall 6: Undo Does Not Reverse Framework Signals Correctly

**What goes wrong:** The `removeLastResponse` function in `use-scores.ts` handles undo for RIASEC, MBTI, and values by popping the last entry from raw arrays. But for responses processed via `processResponseWithSignals` (warmup and MI questions), the function does not know how to reverse multi-framework signals. If a warmup question added signals to both `riasec_R` and `mi_bodily`, undoing it only pops from one framework (whichever `response.framework` matches), leaving stale data in the other.

**Prevention:**
1. Store the full signal map alongside each response so undo can reverse all affected frameworks
2. Alternatively, recompute all scores from scratch on undo (rebuild from `responses.slice(0, -1)`)
3. Test undo specifically on warmup/MI questions that have `framework_signals`

**Phase to address:** Current milestone (quality audit).

---

### Pitfall 7: Acquiescence Bias Detection Without Recovery Path

**What goes wrong:** `detectAcquiescenceBias` returns `true` when all 6 RIASEC types score above 80, and the flag is stored in `scoreState.acquiescence_flag`. But nothing in the flow acts on this flag. The student gets a flat, meaningless profile and the system shrugs.

**Prevention:**
1. When acquiescence bias is detected mid-flow, trigger a coaching moment: "It seems like you're agreeing with everything -- try to think about what you enjoy MOST"
2. Consider injecting reverse-keyed questions when bias is detected
3. At minimum, flag the result in the reveal sequence: "Your profile is unusually flat -- you might benefit from retaking with more selective answers"
4. The adaptive/confirmatory round should prioritize differentiating questions when bias is flagged

**Phase to address:** Current milestone (Session 1 flow completion) for the coaching moment; Phase 2 for reverse-keyed questions.

---

### Pitfall 8: No Mid-Session Progress Persistence

**What goes wrong:** If the browser tab closes, crashes, or refreshes during the session, all in-progress responses are lost. `currentIndex` is only in React state. `persistCheckpoint` is only called at specific points (RIASEC completion, full completion, final), not continuously.

**Prevention:**
1. Persist `currentIndex` and `responses` to `localStorage` on every answer
2. On session page mount, check `localStorage` for saved progress and offer to resume
3. Add periodic auto-save (every 5 answers or every 2 minutes) to Supabase as a draft
4. Implement a "save and exit" button that persists partial progress

**Warning signs:** Students report restarting from the beginning after accidental page navigation or browser crash.

**Phase to address:** Current milestone (save and exit feature is in Active requirements).

---

### Pitfall 9: Hardcoded "Wanderer" Class Breaks Narrative Immersion

**What goes wrong:** The session page always uses `classDefinitions.find((c) => c.id === "wanderer")` regardless of what class the student chose in character creation. All narration text, block transitions, and engagement checkpoints use wanderer-flavored text.

**Prevention:**
1. Pass the selected class ID through session context, URL params, or fetch from Supabase on session load
2. Make `avatarClassName` and `getNarration` dynamic based on the student's actual character selection
3. Add a test that verifies narration text changes based on class selection

**Phase to address:** Current milestone (this is a known bug from CONCERNS.md).

---

### Pitfall 10: Skip Without Recording Creates Scoring Gaps

**What goes wrong:** The `handleSkip` function advances `currentIndex` without recording a response. This means the scoring modules receive fewer data points for the skipped question's framework. If several RIASEC questions are skipped, the scores become unreliable because the denominator in the normalization formula (`count * 4`) decreases, making remaining answers disproportionately weighted.

**Prevention:**
1. Track skipped questions explicitly so the scoring module knows the intended question count vs. answered count
2. Consider not allowing skip for psychometric questions (currently skip is allowed for RIASEC blocks)
3. At minimum, flag in the results when significant questions were skipped: "Your Maker score is based on only 2 of 5 questions"
4. Add a minimum-answer threshold per framework before displaying scores

**Phase to address:** Quality audit.

---

## Minor Pitfalls

### Pitfall 11: `structuredClone` on Every Score Update Is Expensive

**What goes wrong:** `use-scores.ts` calls `structuredClone(prev)` on every single answer submission. For late-session answers, this clones all raw score arrays (6 RIASEC types, 8 MI dimensions, 4 MBTI dichotomies, 5 values axes plus all computed scores). With 30+ questions, this creates significant GC pressure.

**Prevention:**
1. Use immutable update patterns (spread operator on only the changed paths) instead of deep cloning the entire state
2. Or use Immer for surgical mutations with structural sharing
3. Profile with React DevTools to confirm this is not causing visible jank on lower-end devices (the target audience is students who may have older hardware)

**Phase to address:** Quality audit (performance).

---

### Pitfall 12: Chart Rendering Crashes on NaN/Infinity Scores

**What goes wrong:** If a scoring calculation produces `NaN` (e.g., dividing by zero when no questions are answered for a type) or `Infinity`, Recharts will crash without an error boundary, taking down the entire dashboard or reveal sequence.

**Prevention:**
1. Add `isNaN`/`isFinite` guards in all scoring functions (currently `calculateRiasecType` returns 0 for empty input, which is good, but `mergeIpsativeScores` does not check for NaN from upstream)
2. Wrap all chart components in React error boundaries
3. Add fallback UI: "Not enough data to display this chart"

**Phase to address:** Quality audit.

---

### Pitfall 13: Anonymous Auth Creates Orphaned Records on Partial Failure

**What goes wrong:** Character creation creates a Supabase anonymous user, then inserts a `students` record, then inserts `assessment_scores`. If the student insert succeeds but the scores insert fails, or vice versa, orphaned records accumulate. There is no transaction handling.

**Prevention:**
1. Use Supabase RPC (database function) to wrap the creation sequence in a transaction
2. Or implement client-side rollback: if step 2 fails, delete the record from step 1
3. Add a cleanup job for orphaned anonymous users without completed sessions

**Phase to address:** Quality audit (data integrity).

---

### Pitfall 14: Gamification Feels Decorative Rather Than Motivational

**What goes wrong:** Badges, XP bars, and animations are present but may feel like cosmetic additions rather than genuine motivational mechanics. Students see through transactional rewards ("You answered 5 questions!") quickly. The target audience (13-18) is especially attuned to hollow gamification.

**Prevention:**
1. Tie badges to meaningful discoveries, not just completion ("You have a rare Maker-Creator combination" vs. "You completed Block 2")
2. Make the reveal sequence feel like genuine discovery, not a reward screen
3. Use narrative progression (the "quest" framing) to create intrinsic motivation
4. Test with actual students in the target age range -- what they find engaging may surprise you

**Phase to address:** Quality audit (UX review). Ongoing concern for all sessions.

---

## Phase-Specific Warnings

| Phase/Milestone | Likely Pitfall | Mitigation |
|-----------------|---------------|------------|
| Session 1 flow fix | Pitfall 1 (flow deadlock) | Extract explicit state machine; test all transitions |
| Session 1 flow fix | Pitfall 9 (hardcoded wanderer) | Pass class from character creation through session context |
| Session 1 completion | Pitfall 3 (silent data loss) | Add persistence status UI; block completion screen on save failure |
| Session 1 completion | Pitfall 8 (no mid-session persistence) | Add localStorage backup; implement save and exit |
| Quality audit: scoring | Pitfall 2 (dual index tracking) | Single source of truth for question index |
| Quality audit: scoring | Pitfall 5 (MBTI false precision) | Widen threshold; ensure UI shows "emerging" status |
| Quality audit: scoring | Pitfall 6 (undo signal reversal) | Store full signal map per response for clean reversal |
| Quality audit: scoring | Pitfall 7 (acquiescence bias) | Add coaching moment when bias detected |
| Quality audit: scoring | Pitfall 10 (skip gaps) | Track skips; add minimum-answer thresholds |
| Quality audit: robustness | Pitfall 4 (unverifiable scores) | Add score range validation; plan server recomputation |
| Quality audit: robustness | Pitfall 12 (chart NaN crash) | Error boundaries on all chart components |
| Quality audit: robustness | Pitfall 13 (orphaned records) | Transaction-wrap auth flow |
| Quality audit: performance | Pitfall 11 (structuredClone cost) | Profile on target devices; switch to immutable updates |
| All sessions | Pitfall 14 (hollow gamification) | User testing with target demographic |

---

## Sources

- [Career Quest PROJECT.md and CONCERNS.md](internal codebase documentation)
- [Gamification of Assessments: Fun or Flawed?](https://askatechteacher.com/gamification-of-assessments-fun-or-flawed/)
- [10 Best Gamification Education Apps (Octalysis Analysis)](https://yukaichou.com/gamification-examples/10-best-gamification-education-apps/)
- [MBTI Validity Challenges - Truity](https://www.truity.com/blog/myers-briggs/mbti-validity-challenges)
- [RIASEC Test Accuracy: Reliability and Validity Explained](https://riasectest.com/blog/riasec-test-accuracy-reliability-validity-explained)
- [Holland Code Assessment - Career Key](https://www.careerkey.org/fit/personality/holland-code-assessment-riasec)
- [React Multi-Step Form Wizard Pattern](https://medium.com/@vandanpatel29122001/react-building-a-multi-step-form-with-wizard-pattern-85edec21f793)
- [Mastering React State Management at Scale in 2025](https://dev.to/ash_dubai/mastering-react-state-management-at-scale-in-2025-52e8)
- [Gamification in Learning and Assessment](https://assess.com/gamification-in-learning-assessment/)

---

*Pitfalls audit: 2026-04-01*
