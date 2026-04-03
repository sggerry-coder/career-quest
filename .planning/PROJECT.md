# Career Quest

## What This Is

A gamified career exploration web app for high school students (13–18). Students work through a multi-session "quest" that discovers their personality, strengths, values, and interests — visualised with animated charts and cards — then uses Claude AI for career analysis and university recommendations. Currently in Phase 1 (Core Quest MVP) with Session 1 flow, scoring, and dashboard partially built.

## Core Value

Students can complete Session 1 end-to-end — from character creation through all question blocks to an animated Profile Reveal — and feel a sense of discovery and completion.

## Requirements

### Validated

- ✓ Character creation flow (avatar, education system, tone, curiosities, destination) — existing
- ✓ Question flow engine with block progression, card transitions, and discovery mode — existing
- ✓ Input types: Likert slider, spectrum slider, ipsative picker, option grid — existing
- ✓ RIASEC, MI, MBTI, Strengths, Values scoring modules with unit tests — existing
- ✓ Live profile dashboard: RIASEC bars, MI preview, MBTI sliders, values compass, badges, XP bar — existing
- ✓ Engagement checkpoints and block transition interstitials — existing
- ✓ Supabase auth (anonymous) and session state persistence — existing
- ✓ Dark theme with Framer Motion animations — existing
- ✓ Fix Session 1 flow — useReducer state machine replaces scattered useState, engagement checkpoint deadlock resolved. Validated in Phase 1: Flow Engine Refactor
- ✓ Complete Session 1 end state — animated Profile Reveal with confetti celebration, score summary cards, badges unlocked, "Session Complete" state. Validated in Phase 2: Session Completion & Persistence
- ✓ Save & exit after Session 1 — completion persisted with validation/error classification, upsert idempotency, PersistenceBanner for failures, ConfirmationToast, completion-aware routing. Validated in Phase 2: Session Completion & Persistence

- ✓ Scoring quality — MBTI "Still Emerging" labels with raw count checks, multi-framework undo reversal with signal footprint tracking, NaN guards across all scoring functions. Validated in Phase 3: Scoring Quality

### Active
- [ ] Quality audit — robustness, code quality, scoring accuracy, efficiency, edge cases

### Out of Scope

- Session 2–4 content and flows — future phases
- Claude API integration (career deep-dives, programme matching) — Phase 3
- Facilitator mode — Phase 5
- PDF report generation — Phase 4
- Landing page polish — deferred, character creation is the current entry point
- Mobile-responsive refinement — deferred to Phase 6

## Context

- **Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, Recharts, Supabase, Vitest
- **Brownfield:** 80+ commits, Session 1 flow engine refactored (Phase 1), completion & persistence built (Phase 2)
- **Codebase map:** `.planning/codebase/` has full architecture, stack, conventions, and concerns documentation
- **Scope doc:** `career-quest-scope.md` contains the full 6-phase vision and data model
- **Known issues from codebase mapping:** No input validation on some paths, scoring edge cases to audit in Phase 3

## Constraints

- **Tech stack**: Next.js 16 + Supabase + Vercel — already established, no changes
- **API cost**: Sessions 1-2 must be zero API cost (all client-side scoring)
- **Target users**: High school students (13-18) — UI must be engaging and age-appropriate

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone app (not Auxano module) | Simpler deployment, validate concept first | — Pending |
| Anonymous auth with optional save | Lower friction for students | ✓ Good |
| Client-side scoring for Sessions 1-2 | Zero API cost per student | ✓ Good |
| Block-based question flow engine | Supports adaptive branching and engagement checkpoints | ✓ Good |
| useReducer state machine for quest flow | Atomic state transitions, eliminates engagement desync (FLOW-01) | ✓ Good — Phase 1 |
| PersistResult with error classification | Enables retry UI with distinct network/auth handling | ✓ Good — Phase 2 |
| session_responses upsert with onConflict | Idempotent retries prevent duplicate rows | ✓ Good — Phase 2 |
| onPersistStart callback from RevealSequence | Persist fires when CompletionScreen appears, not on user exit | ✓ Good — Phase 2 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-03 after Phase 3 completion*
