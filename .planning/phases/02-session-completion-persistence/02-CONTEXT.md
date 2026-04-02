# Phase 2: Session Completion & Persistence - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the full end-of-session experience after all Session 1 questions are answered. Students see an animated Profile Reveal with scores, a celebration "Session Complete" screen with badges, and reliable data persistence. Returning students see their saved dashboard. Persistence failures are surfaced with retry UI.

</domain>

<decisions>
## Implementation Decisions

### Profile Reveal & Completion Experience
- Extend existing `reveal-sequence.tsx` with a "Session Complete" final phase after badge_unlock — reuses existing staggered animation system
- Canvas-confetti burst (1-2 seconds) + animated checkmark + "Quest Chapter 1 Complete" header — age-appropriate celebration
- Static summary cards on completion screen — scores already explored during reveal, completion is about celebration
- Tone-variant completion text: Quest mode "Chapter 1 Complete — Your profile has been forged!" / Explorer mode "Session 1 Complete — Here's what we discovered" — matches existing tone toggle

### Persistence & Error Recovery
- Toast-style banner at bottom with "Couldn't save — Retry" button — non-blocking, doesn't interrupt celebration
- Network/timeout errors auto-retry 3x with exponential backoff, then show retry UI. Auth/permission errors show "Please sign in again" with redirect — extends existing `persistCheckpoint` pattern
- Pre-save validation: check no NaN values, all framework scores present, response count matches expected — lightweight client-side guard
- Final checkpoint persists after reveal completes and completion screen renders — single "final" checkpoint with scores + badges + completion flag

### Return User & Save-Exit Flow
- Returning completed student redirected to `/quest/dashboard` with saved scores — dashboard already exists, needs session-complete awareness
- "Save & Exit" button on completion screen → confirmation toast "Your progress is saved!" → redirect to landing page
- Completion state: `students.has_completed_session1 = true` in Supabase + existing `assessment_scores` for score data — one new boolean column
- No redo in v1 — completed is completed, dashboard shows final results

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/quest/reveal-sequence.tsx` — Full reveal animation with 11 phases (transition → riasec → class_label → mi_preview → mbti → emerging_type → values → explanation → confirmatory_intro → badge_unlock → done). Has `onRevealComplete` and `onSessionComplete` callbacks
- `components/charts/` — All 6 chart components exist (riasec-bars, mi-preview-bars, mbti-sliders, values-sliders, class-label, emerging-type)
- `components/badges/badge-unlock.tsx` — Badge unlock animation component
- `providers/quest-provider.tsx` — `persistCheckpoint("final")` already exists with retry logic (1s, 2s, 4s exponential backoff)
- `hooks/use-quest-state.ts` — `COMPLETE_SESSION` action already defined in reducer

### Established Patterns
- Framer Motion for all animations (AnimatePresence, motion.div)
- `persistCheckpoint` with "riasec" | "full" | "final" types
- Tone toggle ("quest" | "explorer") throughout UI
- `data-theme` attribute for class-based theming

### Integration Points
- `app/quest/session/[id]/page.tsx` — Already dispatches `COMPLETE_SESSION` from reveal's `onSessionComplete`
- `app/quest/dashboard/page.tsx` — Existing dashboard, needs session-complete state check
- `app/page.tsx` — Landing page with session routing, needs completion-aware redirect
- `supabase/migrations/` — New migration needed for `has_completed_session1` column

</code_context>

<specifics>
## Specific Ideas

No specific requirements — all recommended approaches accepted.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
