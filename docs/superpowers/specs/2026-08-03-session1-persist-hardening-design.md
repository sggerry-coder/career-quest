# Session 1 persistence hardening — design

**Date:** 2026-08-03
**Branch:** `fix/v1.0-completion-and-enhancements`
**Status:** approved, ready for implementation planning

## Problem

A student can finish Session 1, see confetti and "Your profile has been forged!", click
**View Dashboard**, and land on an empty dashboard. Nothing was saved.

This is not hypothetical — it happened during the 2026-07-24 browser walkthrough. Migration
`00004_mbti_raw_counts.sql` had not been applied, so the `assessment_scores` upsert failed,
and because `has_completed_session1` is written *after* the scores row, the completion flag
never flipped either.

The migration is now applied, so that specific trigger is gone. This work removes the class
of failure: **any** failed write — expired session, dead Wi-Fi, RLS change, future migration
drift — currently presents as success.

### Why the current UI fails

`app/quest/session/[id]/page.tsx:697` renders the complete phase like this:

- Badge unlock overlay, then `CompletionScreen` — **unconditionally**, whatever persistence did.
- `CompletionScreen` fires confetti on mount and shows "Quest Chapter 1 Complete".
- `PersistenceBanner` appears at `position: fixed; bottom-4`, *underneath* the celebration,
  and only once the write has already failed.
- **View Dashboard stays enabled**, so the student's next click lands on the empty dashboard.
- `persistResult: PersistResult | null` conflates "not started" with "in flight", so there is
  no state that means *saving*.
- `handleSaveExit` (`page.tsx:232`) retries on failure and, if the retry also fails, does
  nothing visible — no toast, no redirect, no error. Silently stuck.

## Design

### 1. An explicit status, in its own hook

New file `hooks/use-final-persist.ts` owning the completion-save state machine:

```
idle → saving → saved
             ↘ failed → (retry) → saving → …
```

Exposes `{ status, errorType, start(), retry() }`. It owns the one-shot ref currently at
`page.tsx:247`, the status, and the error detail. It wraps `runFinalPersist`, which is
unchanged — retry-with-backoff still happens inside the persistence layer, and this hook's
`retry()` remains the manual last resort after those retries are exhausted.

It lives in its own file rather than in the 805-line session page so the machine can be
tested without mounting the whole quest. It keeps the existing React 19 Compiler pattern of
separating the pure async call from `setState` (Phase 04 decision).

**No artificial minimum display time for the saving state.** Persistence fires on *entry* to
the complete phase (`page.tsx:260`), in parallel with the badge-unlock overlay — it does not
wait for `showBadgeUnlock`. A fast save therefore completes while the badge animation is still
playing, and `CompletionScreen` renders with no visible saving screen at all. A visible saving
screen means the save is genuinely slow, so a floor would add test-timing fragility and buy
nothing.

### 2. Gate the complete phase

```
flowPhase === "complete"
  ├─ showBadgeUnlock       → <BadgeUnlock />          (unchanged; celebrates the badge,
  │                                                    claims nothing about saving)
  ├─ status idle | saving  → <SavingResults />
  ├─ status failed         → <SaveFailedScreen />
  └─ status saved          → <CompletionScreen />     ← confetti + "forged" live here only
```

The whole branch stays inside `SectionErrorBoundary name="Completion"`.

Because a mounted `CompletionScreen` now *means* saved:

- Its `persistResult`, `onRetryPersist` and `onSignIn` props are removed.
- Its embedded `PersistenceBanner` is removed.
- `handleSaveExit` loses its failure branch — it toasts and redirects.
- `components/ui/persistence-banner.tsx` is deleted. Its only real importer is
  `completion-screen.tsx`; the copies under `.claude/worktrees/` are dead worktrees already
  excluded from vitest and ESLint.

The two snapshot effects at `page.tsx:293` and `page.tsx:301` switch their
`persistResult?.success` guard to `status === "saved"`. Their relative order must be preserved:
the save-snapshot effect is declared first and early-returns on success, so the clear-snapshot
effect that follows is what actually removes the checkpoint.

### 3. Close the unauthenticated hang

`studentId` starts `null` and is set by an async auth lookup (`page.tsx:177`). The persist
effect only fires when it is non-null, so a student with no session never triggers a save.
Today that is invisible. Under gating it becomes an infinite spinner.

Fix: track that the auth lookup has **settled**, not merely that it produced an id. Fire
`start()` once settled even when the id is null; `runFinalPersist` already returns
`{ success: false, errorType: "auth" }` for a missing student id, which routes to the
sign-in variant of the failure screen. Deterministic — no timeout heuristic.

### 4. Two new components

**`components/quest/saving-results.tsx`** — spinner plus "Saving your results…", tone-aware
(`quest` / `explorer`) like every other quest screen. Presentational only.

**`components/quest/save-failed-screen.tsx`**

```
⚠  We couldn't save your results

   Your answers are safe on this device.
   This is usually the connection.

   [  Try saving again  ]   ← primary
   [  Leave for now  ]      ← secondary

   "We'll offer to pick up where you left off next time you open this."
```

- Primary shows "Trying again…" and is disabled while a retry is in flight.
- When `errorType === "auth"` the primary becomes **Sign in again** → `/`, because retrying a
  dead session cannot succeed.
- **No "View Dashboard".** The dashboard reads `assessment_scores` — exactly the write that
  failed.
- The resume promise is true, not reassurance: the checkpoint-save effect skips only on
  success, so a failed save leaves the localStorage snapshot intact.

"Leave for now" → `/`, which shows the Continue card; for a student with
`has_completed_session1 === false` that routes back to `/quest/session/1`
(`app/page.tsx:98-101`). No redirect loop.

### 5. Dashboard recovery screen

`app/quest/dashboard/page.tsx:158` currently renders one dead end for two different
situations — "No results yet… Start Your Quest!" — including for a student whose results
exist on their device but never reached the server.

Split it on whether a checkpoint exists:

```
!student || !scores
  ├─ student loaded, scores missing, loadSessionSnapshot(userId) returns a snapshot
  │     → "Your results haven't saved yet"
  │       [ Finish saving my results ] → /quest/session/1
  └─ otherwise
        → today's copy, unchanged
```

Requires holding the auth user id in state; it is already in scope at `page.tsx:101` but not
stored. `loadSessionSnapshot` is client-only and the dashboard is already a client component.

Verified the recovery path actually works: `"complete"` is in `VALID_FLOW_PHASES`
(`lib/persistence/session-snapshot.ts:29`) and `RESTORE_STATE` restores `flowPhase`, so a
checkpoint written at completion re-enters the complete phase and re-fires the save.

## Testing

**`hooks/__tests__/use-final-persist.test.ts`**
- `idle → saving → saved`
- `idle → saving → failed`, carrying `errorType`
- retry from `failed` reaches `saved`
- `start()` twice fires persistence exactly once

**`components/quest/__tests__/save-failed-screen.test.tsx`**
- network/unknown → "Try saving again"; auth → "Sign in again"
- "Leave for now" always present
- never renders "View Dashboard"

**`app/quest/session/__tests__/complete-wiring.test.tsx`** (rewrite of the failure case only)
- The four passing cases — real CompletionScreen, delta card, persistence-fires-once, View
  Dashboard navigation — must keep passing unchanged.
- Replace "shows PersistenceBanner on failure and Retry re-runs persistence" with the
  `SaveFailedScreen` equivalent.
- **New:** with a failing write, "Quest Chapter 1 Complete" and "View Dashboard" never appear.

**`app/quest/dashboard/__tests__/`**
- snapshot in localStorage + no scores → "Finish saving my results"
- no snapshot → today's copy

All component tests carry the `@vitest-environment jsdom` docblock (Phase 04 convention).

## Out of scope

- Offline write queue / service worker.
- Server-side guard on the dashboard route.
- `ResumePrompt` copy. Known and accepted risk: a student arriving via "Finish saving my
  results" meets the normal resume prompt, where "Start over" would discard their answers.
  It is an explicit, labelled destructive choice that already exists.

- The badge-unlock overlay. It plays before the save resolves, so on a failure the student
  sees a Self-Discoverer celebration for an `achievements` row that was never written. This
  is a milder instance of the same lie, deliberately left alone: gating the badge too would
  mean showing a bare spinner immediately after the last question, and the badge re-unlocks
  correctly once the retry succeeds. Worth revisiting if it reads badly in the browser pass.

## Verification gates

`npx tsc --noEmit`, `npm run lint`, `npm test` (248 tests currently pass; count rises with the
new files), `npm run build`. Plus a browser pass of both new screens — the failure screen is
reachable by pointing the client at a bad Supabase key or blocking the request in devtools.
