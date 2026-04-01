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

### Active

- [ ] Fix Session 1 flow — progression blocks at engagement checkpoint ("Halfway there"), remaining question blocks never load
- [ ] Complete Session 1 end state — animated Profile Reveal with score summary, badges unlocked, "Session Complete" state
- [ ] Save & exit after Session 1 — clear completion state persisted, option to return later
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
- **Brownfield:** 62 commits, Session 1 flow engine and scoring are functional but flow is broken mid-session
- **Codebase map:** `.planning/codebase/` has full architecture, stack, conventions, and concerns documentation
- **Scope doc:** `career-quest-scope.md` contains the full 6-phase vision and data model
- **Known issues from codebase mapping:** Silent persistence failures, hardcoded "wanderer" class, no input validation, retry logic doesn't distinguish error types

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
*Last updated: 2026-04-01 after initialization*
