# Requirements: Career Quest

**Defined:** 2026-04-01
**Core Value:** Students can complete Session 1 end-to-end — from character creation through all question blocks to an animated Profile Reveal — and feel a sense of discovery and completion.

## v1 Requirements

Requirements for Phase 1 completion and quality hardening.

### Flow Engine

- [x] **FLOW-01**: Engagement checkpoints do not block progression — atomic state transitions via useReducer
- [x] **FLOW-02**: Flow state machine refactored from scattered useState to single useReducer with typed actions
- [x] **FLOW-03**: Session narration uses student's selected class, not hardcoded "Wanderer"

### Session Completion

- [x] **COMP-01**: Animated Profile Reveal displays after all Session 1 questions are answered (RIASEC, MI, MBTI scores, badges)
- [x] **COMP-02**: Clear "Session Complete" visual state with celebration particles (canvas-confetti)
- [x] **COMP-03**: Completion flag persisted to Supabase so returning users see their progress
- [x] **COMP-04**: Save & exit option after Session 1 completion with confirmation

### Data Integrity

- [x] **DATA-01**: Persistence failures surfaced to user with actionable retry UI (not silent)
- [x] **DATA-02**: Retry logic distinguishes recoverable errors (network/timeout) from non-recoverable (auth/permission)
- [x] **DATA-03**: Scores validated before persistence to catch calculation errors

### Scoring Quality

- [ ] **SCORE-01**: MBTI results prominently display "emerging" label when fewer than 3 questions per dichotomy answered
- [ ] **SCORE-02**: Undo correctly reverses all framework signal scores, not just one framework
- [ ] **SCORE-03**: Graceful handling for empty/minimal response sets (no NaN, no blank charts)

### Quality Audit

- [ ] **AUDIT-01**: Code quality review — conventions adherence, dead code removal, type safety improvements
- [ ] **AUDIT-02**: Scoring accuracy verification — unit tests cover edge cases, boundary values, empty inputs
- [ ] **AUDIT-03**: Performance check — no animation jank, reasonable bundle size, no unnecessary re-renders
- [ ] **AUDIT-04**: Robustness check — error boundaries, network failure recovery, state consistency

## v2 Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Session 2+ Content

- **SESS-01**: Session 2 question flows (academic check, family context, scenarios, elimination)
- **SESS-02**: Values Compass full assessment
- **SESS-03**: Contradiction detection and resolution UI
- **SESS-04**: Day-in-the-life scenario cards

### AI Integration

- **AI-01**: Claude API integration for career deep-dives
- **AI-02**: Programme matching with web search
- **AI-03**: Career cards UI (progression, salary, prospects, wellbeing)

### Infrastructure

- **INFRA-01**: Input validation layer (Zod or similar) for API routes and forms
- **INFRA-02**: localStorage write-ahead log for crash recovery
- **INFRA-03**: Transaction-wrapped auth flow to prevent orphaned records

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Session 2-4 content | Future phases, not Phase 1 |
| Claude API endpoints | Phase 3 scope |
| Facilitator mode | Phase 5 scope |
| PDF report generation | Phase 4 scope |
| Landing page design | Deferred to polish phase |
| Mobile-responsive refinement | Phase 6 scope |
| OAuth / social login | Anonymous auth sufficient for Phase 1 |
| Mid-session save & resume | Non-trivial resume logic, not needed for "complete Session 1" goal |
| Social sharing of results | Privacy concerns — target users are minors |
| Peer comparison features | Assessment integrity — no competition |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLOW-01 | Phase 1 | Complete |
| FLOW-02 | Phase 1 | Complete |
| FLOW-03 | Phase 1 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| SCORE-01 | Phase 3 | Pending |
| SCORE-02 | Phase 3 | Pending |
| SCORE-03 | Phase 3 | Pending |
| AUDIT-01 | Phase 4 | Pending |
| AUDIT-02 | Phase 4 | Pending |
| AUDIT-03 | Phase 4 | Pending |
| AUDIT-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-04-01*
*Last updated: 2026-04-01 after roadmap creation*
