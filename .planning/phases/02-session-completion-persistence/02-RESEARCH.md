# Phase 02: Session Completion & Persistence - Research

**Researched:** 2026-04-02
**Domain:** UI completion experience, client-side celebration effects, Supabase persistence, error recovery patterns
**Confidence:** HIGH

## Summary

This phase adds the end-of-session celebration experience and reliable data persistence after a student completes all Session 1 questions. The existing codebase is well-structured for this work: `reveal-sequence.tsx` already has 11 animation phases with `onSessionComplete` callback, `persistCheckpoint("final")` exists with retry logic, and the `COMPLETE_SESSION` reducer action transitions to a `complete` flow phase. The current `complete` phase renders a placeholder screen -- this phase replaces it with a proper celebration + persistence flow.

The main work areas are: (1) extending `reveal-sequence.tsx` with a "Session Complete" celebration phase after badge_unlock, (2) integrating `canvas-confetti` for particle effects, (3) adding a `has_completed_session1` column to the students table, (4) adding pre-save score validation, (5) surfacing persistence errors with retry UI, and (6) making the landing page and dashboard completion-aware.

**Primary recommendation:** Wire the completion flow through the existing reveal sequence lifecycle -- confetti fires on session_complete phase entry, persistence happens after celebration renders, and error state is managed via a toast banner that does not block the celebration UI.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Extend existing `reveal-sequence.tsx` with a "Session Complete" final phase after badge_unlock -- reuses existing staggered animation system
- Canvas-confetti burst (1-2 seconds) + animated checkmark + "Quest Chapter 1 Complete" header -- age-appropriate celebration
- Static summary cards on completion screen -- scores already explored during reveal, completion is about celebration
- Tone-variant completion text: Quest mode "Chapter 1 Complete -- Your profile has been forged!" / Explorer mode "Session 1 Complete -- Here's what we discovered" -- matches existing tone toggle
- Toast-style banner at bottom with "Couldn't save -- Retry" button -- non-blocking, doesn't interrupt celebration
- Network/timeout errors auto-retry 3x with exponential backoff, then show retry UI. Auth/permission errors show "Please sign in again" with redirect -- extends existing `persistCheckpoint` pattern
- Pre-save validation: check no NaN values, all framework scores present, response count matches expected -- lightweight client-side guard
- Final checkpoint persists after reveal completes and completion screen renders -- single "final" checkpoint with scores + badges + completion flag
- Returning completed student redirected to `/quest/dashboard` with saved scores -- dashboard already exists, needs session-complete awareness
- "Save & Exit" button on completion screen -> confirmation toast "Your progress is saved!" -> redirect to landing page
- Completion state: `students.has_completed_session1 = true` in Supabase + existing `assessment_scores` for score data -- one new boolean column
- No redo in v1 -- completed is completed, dashboard shows final results

### Claude's Discretion
No areas marked as Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | Animated Profile Reveal displays after all Session 1 questions are answered (RIASEC, MI, MBTI scores, badges) | Reveal sequence already exists with all chart phases + badge_unlock. Extend with session_complete phase |
| COMP-02 | Clear "Session Complete" visual state with celebration particles (canvas-confetti) | canvas-confetti 1.9.4 available. Fire on session_complete phase entry in reveal-sequence |
| COMP-03 | Completion flag persisted to Supabase so returning users see their progress | New migration: `has_completed_session1 boolean default false` on students table. Set during final checkpoint |
| COMP-04 | Save & exit option after Session 1 completion with confirmation | "Save & Exit" button on completion screen with toast confirmation before redirect |
| DATA-01 | Persistence failures surfaced to user with actionable retry UI (not silent) | Toast banner with "Retry" button. Non-blocking, positioned at bottom |
| DATA-02 | Retry logic distinguishes recoverable errors (network/timeout) from non-recoverable (auth/permission) | Extend existing `retryWithBackoff` to classify errors. Auth errors -> sign-in redirect |
| DATA-03 | Scores validated before persistence to catch calculation errors | Pre-save validation function checks NaN, framework score completeness, response count |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| canvas-confetti | 1.9.4 | Celebration particle effects | De facto standard for web confetti. Zero-dependency, ~6KB. Used by GitHub, Vercel |
| framer-motion | 12.38.0 | Animation (already installed) | Already used throughout codebase for all animations |
| @supabase/supabase-js | 2.101.0 | Database persistence (already installed) | Already used for all data operations |

### Supporting
No additional libraries needed. All other dependencies are already in the project.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | react-confetti | canvas-confetti is lighter, imperative API fits "fire once" pattern better than react-confetti's declarative approach |
| Toast banner (custom) | react-hot-toast | Adding a library for one toast is overkill. Custom component matches existing styling patterns |

**Installation:**
```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

**Version verification:** canvas-confetti 1.9.4 confirmed via npm registry 2026-04-02.

## Architecture Patterns

### Relevant Existing Structure
```
components/
  quest/
    reveal-sequence.tsx    # ADD: session_complete phase after comparison_hint
  ui/
    persistence-toast.tsx  # NEW: error/retry toast banner
hooks/
  use-quest-state.ts       # EXISTING: COMPLETE_SESSION action already defined
providers/
  quest-provider.tsx       # MODIFY: extend persistCheckpoint with validation + completion flag
lib/
  validation/
    score-validation.ts    # NEW: pre-save score validation
supabase/
  migrations/
    00003_session_completion.sql  # NEW: has_completed_session1 column
app/
  page.tsx                 # MODIFY: completion-aware redirect
  quest/
    session/[id]/page.tsx  # MODIFY: wire persistence + error UI into complete phase
    dashboard/page.tsx     # MODIFY: use has_completed_session1 for state check
```

### Pattern 1: Reveal Sequence Extension
**What:** Add `session_complete` as a new RevealPhase after `comparison_hint`, before the existing `done` terminal state.
**When to use:** When the reveal sequence reaches `comparison_hint` and user clicks "View Dashboard".
**How it works:**

The current flow is: `badge_unlock` -> `comparison_hint` -> `onSessionComplete()`. The new flow inserts a celebration phase:

`badge_unlock` -> `comparison_hint` -> `session_complete` (NEW: confetti + celebration) -> persist final checkpoint -> show "Save & Exit" or "View Dashboard"

```typescript
// In reveal-sequence.tsx, add to RevealPhase union:
type RevealPhase = ... | "session_complete";

// In handleNext, replace comparison_hint -> onSessionComplete with:
} else if (phase === "comparison_hint") {
  setPhase("session_complete");
}

// New session_complete render block fires confetti on mount:
if (phase === "session_complete") {
  return <SessionCompleteScreen tone={tone} onViewDashboard={onSessionComplete} />;
}
```

### Pattern 2: Error Classification in Persistence
**What:** Distinguish recoverable (network/timeout) from non-recoverable (auth/permission) errors in `persistCheckpoint`.
**When to use:** When any Supabase operation fails during final checkpoint.
**How it works:**

```typescript
interface PersistResult {
  success: boolean;
  errorType?: "network" | "auth" | "validation" | "unknown";
  message?: string;
}

// Supabase errors have a `code` field:
// - PGRST301, 401, 403 -> auth errors (non-recoverable)
// - Network errors / timeouts -> recoverable
// - Everything else -> unknown (treat as recoverable)
```

### Pattern 3: Pre-Save Validation
**What:** Validate score state integrity before persisting to Supabase.
**When to use:** Called before `persistCheckpoint("final")`.
**How it works:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateScoresBeforePersist(
  scoreState: ScoreState,
  responseCount: number
): ValidationResult {
  const errors: string[] = [];

  // Check for NaN in all score records
  for (const [framework, scores] of Object.entries({
    riasec: scoreState.riasec,
    mi: scoreState.mi,
    mbti: scoreState.mbti,
    values: scoreState.values,
  })) {
    for (const [key, value] of Object.entries(scores)) {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push(`${framework}.${key} is NaN or not a number`);
      }
    }
  }

  // Check all expected framework keys present
  const expectedRiasec = ["R", "I", "A", "S", "E", "C"];
  const expectedMi = ["linguistic", "logical", "spatial", "musical", "bodily", "interpersonal", "intrapersonal", "naturalistic"];
  const expectedMbti = ["EI", "SN", "TF", "JP"];
  const expectedValues = ["security_adventure", "income_impact", "prestige_fulfilment", "structure_flexibility", "solo_team"];

  // ... check each set of keys

  // Check response count is reasonable (at least 10 responses for session 1)
  if (responseCount < 10) {
    errors.push(`Response count ${responseCount} is suspiciously low`);
  }

  return { valid: errors.length === 0, errors };
}
```

### Pattern 4: Completion-Aware Routing
**What:** Landing page and session page check `has_completed_session1` to route returning users correctly.
**When to use:** On mount of landing page (`app/page.tsx`) and session page.
**Current behavior in `app/page.tsx`:**

```typescript
// Current: checks current_session >= 1 to route to dashboard
if (student.current_session >= 1) {
  router.push("/quest/dashboard");
}
```

This already works but is fragile. The new `has_completed_session1` column provides an explicit completion flag. Update:

```typescript
// Updated: explicit completion check
if (student.has_completed_session1) {
  router.push("/quest/dashboard");
} else {
  router.push("/quest/session/1");
}
```

### Anti-Patterns to Avoid
- **Blocking celebration with persistence:** Never show a loading spinner over the confetti/celebration. Persist in background, show error only if it fails after retries.
- **Silent persistence failure:** The current `persistCheckpoint` returns boolean but nothing surfaces failure to the user. This is exactly what DATA-01 fixes.
- **Dual source of truth for completion:** Use `has_completed_session1` as the authoritative flag. Don't infer completion from `current_session >= 1` (which was the old fragile pattern).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confetti particles | Custom canvas particle system | canvas-confetti | Physics, performance, cleanup all handled. 6KB |
| Exponential backoff | New retry utility | Extend existing `retryWithBackoff` in quest-provider | Already tested pattern with 1s, 2s, 4s delays |
| Toast notifications | Full toast system | Single-purpose PersistenceToast component | Only need one toast type. Full library is overkill |

## Common Pitfalls

### Pitfall 1: Confetti Fires on Re-render
**What goes wrong:** Canvas-confetti fires every time the component re-renders, causing repeated bursts.
**Why it happens:** Calling `confetti()` inside render body or without proper guard.
**How to avoid:** Fire confetti in a `useEffect` with empty deps (or a ref guard) that runs once when the session_complete phase mounts.
**Warning signs:** Multiple confetti bursts, or confetti re-firing when state changes.

### Pitfall 2: Persistence Runs Before Scores Are Final
**What goes wrong:** Checkpoint persists intermediate scores if called too early in the reveal flow.
**Why it happens:** Calling `persistCheckpoint("final")` during reveal instead of after reveal completes.
**How to avoid:** Persist only after the session_complete screen renders (after all reveal phases and badge_unlock).
**Warning signs:** Dashboard shows different scores than reveal showed.

### Pitfall 3: Double Insert on session_responses
**What goes wrong:** If `persistCheckpoint("final")` is retried after a partial success, `session_responses.insert` creates duplicate rows.
**Why it happens:** The current code uses `.insert()` not `.upsert()` for session_responses.
**How to avoid:** Either use upsert with a unique constraint on (student_id, question_id, session_number), or check for existing responses before inserting, or use a transaction flag.
**Warning signs:** Duplicate response rows in the database after retry.

### Pitfall 4: has_completed_session1 Set But Scores Not Written
**What goes wrong:** Student is marked as completed but scores are missing, so dashboard shows empty state.
**Why it happens:** Setting the completion flag in a separate query from score upsert, and one succeeds while the other fails.
**How to avoid:** Set `has_completed_session1 = true` in the same `students.update()` call that sets `current_session`, and only after scores are successfully upserted.
**Warning signs:** Dashboard shows "No quest data found" for a student marked as completed.

### Pitfall 5: canvas-confetti SSR Import
**What goes wrong:** `canvas-confetti` references `window` and `document` at import time, causing SSR errors in Next.js.
**Why it happens:** canvas-confetti is a browser-only library.
**How to avoid:** Use dynamic import: `const confetti = (await import("canvas-confetti")).default;` inside a client-side effect or event handler.
**Warning signs:** "window is not defined" error during build or SSR.

## Code Examples

### Canvas-Confetti Integration (Safe for Next.js)
```typescript
// Source: canvas-confetti npm README + Next.js SSR safety pattern
"use client";

import { useEffect, useRef } from "react";

function useConfettiBurst() {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    async function fire() {
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#a855f7", "#6366f1", "#ec4899", "#f59e0b"],
      });
    }

    fire();
  }, []);
}
```

### Error Classification for Supabase
```typescript
// Extend existing retryWithBackoff pattern
type ErrorCategory = "network" | "auth" | "unknown";

function classifySupabaseError(error: unknown): ErrorCategory {
  if (!error || typeof error !== "object") return "unknown";

  const err = error as { code?: string; status?: number; message?: string };

  // Auth/permission errors -- non-recoverable via retry
  if (err.status === 401 || err.status === 403) return "auth";
  if (err.code === "PGRST301") return "auth"; // JWT expired

  // Network errors -- recoverable
  if (err.message?.includes("fetch") || err.message?.includes("network")) return "network";
  if (err.message?.includes("timeout")) return "network";

  return "unknown"; // Treat as recoverable
}
```

### Supabase Migration for Completion Flag
```sql
-- 00003_session_completion.sql
ALTER TABLE public.students
  ADD COLUMN has_completed_session1 boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.students.has_completed_session1
  IS 'True after student completes all Session 1 questions and reveal';
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Reveal sequence shows all score phases + badge | integration | Manual visual verification | N/A (UI) |
| COMP-02 | Confetti fires on session_complete phase | integration | Manual visual verification | N/A (UI) |
| COMP-03 | has_completed_session1 set after final persist | unit | `npx vitest run lib/validation/__tests__/score-validation.test.ts -x` | Wave 0 |
| COMP-04 | Save & exit redirects after confirmation | integration | Manual visual verification | N/A (UI) |
| DATA-01 | Error toast shown on persist failure | unit | `npx vitest run providers/__tests__/persist-checkpoint.test.ts -x` | Wave 0 |
| DATA-02 | Auth errors classified differently from network | unit | `npx vitest run lib/validation/__tests__/error-classification.test.ts -x` | Wave 0 |
| DATA-03 | NaN and missing scores caught before persist | unit | `npx vitest run lib/validation/__tests__/score-validation.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/validation/__tests__/score-validation.test.ts` -- covers DATA-03, COMP-03 validation
- [ ] `lib/validation/__tests__/error-classification.test.ts` -- covers DATA-02

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `current_session >= 1` as completion check | Explicit `has_completed_session1` boolean | This phase | Eliminates ambiguity between "in progress" and "completed" |
| Silent persistence failure (return false) | Classified errors with user-facing retry UI | This phase | Users know when save failed and can take action |
| Placeholder completion screen | Celebration with confetti + tone-aware messaging | This phase | Age-appropriate sense of accomplishment |

## Open Questions

1. **Duplicate session_responses on retry**
   - What we know: Current `persistCheckpoint` uses `.insert()` for session_responses. If a retry happens after partial success, duplicates are created.
   - What's unclear: Whether to add a unique constraint (student_id, question_id, session_number) and switch to upsert, or to delete-then-insert, or to check existence first.
   - Recommendation: Add unique constraint and use `.upsert()` with `onConflict`. This is the safest approach and matches the pattern already used for `assessment_scores` and `achievements`. Requires a migration addition.

2. **Student type needs `has_completed_session1`**
   - What we know: `lib/types/student.ts` defines the `Student` interface. The new column needs to be added there.
   - What's unclear: Nothing -- straightforward type addition.
   - Recommendation: Add `has_completed_session1: boolean` to Student interface.

## Sources

### Primary (HIGH confidence)
- Codebase analysis of `reveal-sequence.tsx`, `quest-provider.tsx`, `use-quest-state.ts`, `app/page.tsx`, `app/quest/dashboard/page.tsx`, `app/quest/session/[id]/page.tsx`
- Supabase migration files: `00001_initial_schema.sql`, `00002_phase1_additions.sql`
- npm registry: canvas-confetti 1.9.4, framer-motion 12.38.0

### Secondary (MEDIUM confidence)
- canvas-confetti API patterns from npm README (dynamic import for SSR safety is well-documented)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - canvas-confetti is the only new dependency, well-established library
- Architecture: HIGH - extending existing patterns (reveal phases, persistCheckpoint, retry logic)
- Pitfalls: HIGH - identified from direct codebase analysis (SSR import, double-insert, timing)

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable domain, no fast-moving dependencies)
