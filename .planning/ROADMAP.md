# Roadmap: Career Quest - Session 1 Completion

## Overview

Career Quest has Session 1 roughly 80% built -- scoring, charts, badges, and reveal animations all exist but are unreachable due to a flow engine deadlock at the engagement checkpoint. This roadmap fixes the flow engine first (unblocking everything), then delivers the session completion experience with reliable persistence, hardens scoring correctness, and finishes with a quality audit pass. Each phase is independently shippable and builds on the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Flow Engine Refactor** - Fix the engagement checkpoint deadlock and replace scattered useState with a single useReducer state machine
- [ ] **Phase 2: Session Completion & Persistence** - Deliver the full end-of-session experience with reliable data persistence
- [ ] **Phase 3: Scoring Quality** - Harden scoring correctness, undo behavior, and edge case handling
- [ ] **Phase 4: Quality Audit** - Code quality review, test coverage, performance, and robustness hardening

## Phase Details

### Phase 1: Flow Engine Refactor
**Goal**: Students can progress through all Session 1 question blocks without getting stuck, reaching the Profile Reveal sequence
**Depends on**: Nothing (first phase)
**Requirements**: FLOW-01, FLOW-02, FLOW-03
**Success Criteria** (what must be TRUE):
  1. Student progresses past the "Halfway there" engagement checkpoint without the flow stalling
  2. Student reaches the Profile Reveal sequence after answering all Session 1 questions
  3. Narration text reflects the student's selected character class (not hardcoded "Wanderer")
  4. All flow transitions are deterministic -- no race conditions between index and phase updates
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — TDD: Create questReducer with typed actions and unit tests (FLOW-01, FLOW-02)
- [x] 01-02-PLAN.md — Wire reducer into session page and fetch avatar_class from Supabase (FLOW-02, FLOW-03)

### Phase 2: Session Completion & Persistence
**Goal**: Students see a satisfying completion experience after Session 1 and their progress is reliably saved
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Student sees an animated Profile Reveal with their RIASEC, MI, and MBTI scores after completing all questions
  2. Student sees celebration particles and a clear "Session 1 Complete" screen with badges earned
  3. Returning student who completed Session 1 sees their saved dashboard (not a restart prompt)
  4. Student can save and exit after completion, with confirmation that their data is preserved
  5. When persistence fails, student sees an error message with a retry button (not silent failure)
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Scoring Quality
**Goal**: Scoring results are accurate, honest about uncertainty, and handle edge cases gracefully
**Depends on**: Phase 2
**Requirements**: SCORE-01, SCORE-02, SCORE-03
**Success Criteria** (what must be TRUE):
  1. MBTI results display "still emerging" label when fewer than 3 questions per dichotomy have been answered
  2. Undoing a response correctly reverses score changes across all affected frameworks (not just one)
  3. Charts and score displays handle empty or minimal response sets without NaN values or blank renders
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

### Phase 4: Quality Audit
**Goal**: The codebase is clean, well-tested, performant, and robust against failure modes
**Depends on**: Phase 3
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. No dead code, consistent naming conventions, and all public functions have TypeScript types
  2. Unit tests cover scoring edge cases including boundary values, empty inputs, and single-response sets
  3. Animations run without visible jank on mid-range hardware; no unnecessary component re-renders
  4. Error boundaries catch rendering failures; network errors trigger recovery UI instead of blank screens
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Flow Engine Refactor | 0/2 | Not started | - |
| 2. Session Completion & Persistence | 0/0 | Not started | - |
| 3. Scoring Quality | 0/0 | Not started | - |
| 4. Quality Audit | 0/0 | Not started | - |
