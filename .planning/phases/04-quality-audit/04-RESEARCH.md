# Phase 4: Quality Audit - Research

**Researched:** 2026-04-03
**Domain:** Code quality, testing, performance, error resilience (Next.js 16 / React 19 / Vitest)
**Confidence:** HIGH

## Summary

Phase 4 is a hardening phase with no new features. The codebase is in good shape: 840 tests pass, TypeScript compiles clean, and Phases 1-3 addressed the major functional gaps. The remaining work falls into four categories: (1) dead code and lint cleanup, (2) scoring test boundary gaps, (3) bundle hygiene, and (4) error boundaries for crash resilience.

The ESLint report already identifies specific unused imports and variables across 4 files. The `@anthropic-ai/sdk` dependency is installed but never imported anywhere in the codebase -- it is dead weight for Phase 1. Error boundaries do not exist at any level (no `error.tsx` files, no React ErrorBoundary components). Next.js 16 provides `error.tsx` file convention with `unstable_retry` prop, plus React class-based ErrorBoundary for component-level wrapping.

**Primary recommendation:** Fix all ESLint warnings/errors first (quick wins), then add error boundaries at route and section level, fill remaining scoring boundary tests, and run a bundle audit to catch import hygiene issues.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Prioritize AUDIT-01 (dead code/conventions) and AUDIT-04 (error boundaries) as primary targets. AUDIT-02 (test coverage) and AUDIT-03 (performance) are partially addressed by Phase 3 -- fill remaining gaps but don't over-invest.
- **D-02:** Per-section error boundaries -- wrap chart groups, quest flow sections, and persistence areas. A crashing chart section doesn't take down the whole page, but individual charts are NOT wrapped separately.
- **D-03:** Fallback UI: "Something went wrong" message with a retry button per section. Not silent degradation -- students should know something broke and have a recovery path.
- **D-04:** Audit bundle size and ensure no unnecessary imports. Remove unused imports, check for tree-shaking issues. canvas-confetti and framer-motion are the heaviest deps -- verify they're dynamically imported or tree-shaken where possible.
- **D-05:** Fix all issues found during bundle audit -- not just flag them.
- **D-06:** No specific animation jank to investigate. No re-render profiling unless bundle audit reveals a hot path. Focus on import hygiene over runtime profiling.
- **D-07:** Phase 3 added 165 tests (840 total). Remaining gaps: boundary values (score exactly 0 or 100), single-response sets, and any untested public functions discovered during AUDIT-01 dead code review.

### Claude's Discretion
- Which specific files have dead code -- discover and remove during execution
- Exact error boundary component implementation pattern
- Which scoring edge cases are still untested -- find and fill gaps
- Bundle analysis tooling choice (e.g., `next build --analyze` or `@next/bundle-analyzer`)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIT-01 | Code quality review -- conventions adherence, dead code removal, type safety improvements | ESLint already flags 7 unique issues across 4 main files; `@anthropic-ai/sdk` is unused dependency; `handlePostConfirmatory` is dead code in reveal-sequence; unused imports in use-scores.ts |
| AUDIT-02 | Scoring accuracy verification -- unit tests cover edge cases, boundary values, empty inputs | NaN guard tests exist but boundary values (score exactly 0, exactly 100, exactly -100) not explicitly tested; `deriveClassLabel` missing boundary-at-50 tests; `mergeIpsativeScores` missing all-null ipsative test |
| AUDIT-03 | Performance check -- no animation jank, reasonable bundle size, no unnecessary re-renders | canvas-confetti already dynamically imported; framer-motion (5.5MB node_modules) and recharts (8.5MB) are the heaviest; `@next/bundle-analyzer` v16.2.2 available; `@anthropic-ai/sdk` (5.1MB) is dead weight |
| AUDIT-04 | Robustness check -- error boundaries, network failure recovery, state consistency | Zero error boundaries exist; Next.js 16 `error.tsx` with `unstable_retry` for route-level; React class ErrorBoundary needed for section-level wrapping per D-02 |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.1.2 | Test runner | Already in use, 840 tests passing |
| ESLint | 9.39.4 | Linting | Already configured with Next.js + TypeScript presets |
| TypeScript | 5.9.3 | Type checking | Strict mode enabled, compiles clean |

### Supporting (to add for this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @next/bundle-analyzer | 16.2.2 | Bundle size visualization | One-time audit, devDependency only |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @next/bundle-analyzer | `next build` + manual inspection | Bundle analyzer provides visual treemap; manual inspection is sufficient for this scope but less informative |

**Installation (one-time dev dependency):**
```bash
npm install --save-dev @next/bundle-analyzer@16.2.2
```

**Version verification:** @next/bundle-analyzer 16.2.2 confirmed via `npm view` (matches Next.js 16.x).

## Architecture Patterns

### Error Boundary Architecture

Next.js 16 provides two mechanisms:

**1. Route-level `error.tsx` (file convention)**
- Place `error.tsx` in a route directory to catch errors in that segment's page and children
- Receives `error` and `unstable_retry` props (new in Next.js 16.2.0)
- Must be a Client Component (`"use client"`)
- Does NOT catch errors in the layout of the same segment -- only page and children

**2. Component-level React ErrorBoundary (class component)**
- For wrapping specific sections within a page (per D-02: chart groups, quest flow, persistence)
- React class component with `getDerivedStateFromError` and `componentDidCatch`
- Must be a Client Component
- Provides reset/retry via state management

**Per D-02, the architecture is:**
```
app/quest/session/[id]/
  error.tsx                     # Route-level catch-all for session page
app/quest/dashboard/
  error.tsx                     # Route-level catch-all for dashboard

components/ui/
  section-error-boundary.tsx    # Reusable per-section wrapper

# Usage in dashboard:
<SectionErrorBoundary name="Charts">
  <RiasecBars ... />
  <MiPreviewBars ... />
  <MbtiSliders ... />
  <ValuesSliders ... />
</SectionErrorBoundary>

<SectionErrorBoundary name="Quest Log">
  <QuestLog ... />
  <BadgeRow ... />
</SectionErrorBoundary>
```

### Error Boundary Component Pattern (from Next.js 16 docs)

```typescript
// Source: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md
'use client'

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => unstable_retry()}>Try again</button>
    </div>
  )
}
```

**Key detail:** Next.js 16 uses `unstable_retry` (not `reset`) as the primary retry mechanism. The `reset` function still exists but `unstable_retry` is preferred -- it re-fetches and re-renders the segment.

### Section-Level ErrorBoundary Pattern

```typescript
"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Silent per project convention -- no console logging
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-800">
              Something went wrong in {this.props.name}
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-3 rounded-md bg-red-100 px-4 py-2 text-sm text-red-700 hover:bg-red-200"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

### Anti-Patterns to Avoid
- **Wrapping every individual chart in an error boundary:** D-02 explicitly says per-section, not per-chart. Over-granular boundaries add DOM noise and complexity.
- **Using `console.error` in error boundaries:** Project convention is silent failures with fallback UI. No console logging.
- **Forgetting `"use client"` on error boundaries:** Both `error.tsx` and custom ErrorBoundary must be client components.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bundle analysis | Manual inspection of `node_modules` sizes | `@next/bundle-analyzer` | Visual treemap shows actual bundle impact, not just node_modules size |
| Route-level error catching | Custom error wrapper around every page | Next.js `error.tsx` file convention | Built-in, handles re-fetching, consistent with App Router |
| Dead code detection | Manual file-by-file search | ESLint `no-unused-vars` + TypeScript `noUnusedLocals` | Already configured, just need to fix existing warnings |

## Common Pitfalls

### Pitfall 1: Bundle Size vs node_modules Size Confusion
**What goes wrong:** Developers see `framer-motion` is 5.5MB in `node_modules` and try to remove it, when the actual bundle impact after tree-shaking is much smaller.
**Why it happens:** `node_modules` size is not the same as bundle contribution. Tree-shaking removes unused code.
**How to avoid:** Use `@next/bundle-analyzer` to see actual bundle contribution, not `du -sh node_modules/`.
**Warning signs:** Removing a dependency that is actually needed and used.

### Pitfall 2: Error Boundary Won't Catch Async Errors
**What goes wrong:** Error boundaries only catch errors during rendering (synchronous). `useEffect` errors, event handler errors, and async errors are NOT caught.
**Why it happens:** React ErrorBoundary is a rendering-phase mechanism.
**How to avoid:** Keep existing try-catch patterns for async operations (already in place for persistence). Error boundaries are for rendering crashes only -- e.g., a chart receiving NaN data and crashing.
**Warning signs:** Expecting error boundary to catch a failed `fetch` call.

### Pitfall 3: `unstable_retry` vs `reset` in Next.js 16
**What goes wrong:** Using the deprecated `reset` function instead of `unstable_retry` in error.tsx files.
**Why it happens:** Documentation and training data may reference the older `reset` API.
**How to avoid:** Use `unstable_retry` -- it re-fetches data and re-renders the segment. `reset` only clears error state without re-fetching.
**Warning signs:** Error recovery that doesn't refresh stale data.

### Pitfall 4: Removing Unused Exports That Tests Import
**What goes wrong:** A function appears unused in production code but is imported in test files. Removing the export breaks tests.
**Why it happens:** ESLint checks imports within the file, not across the project.
**How to avoid:** Before removing an export, grep for all usages across the entire project including test files. The lint warnings in `use-scores.ts` are about unused *imports* within that file, not unused *exports* from scoring modules.
**Warning signs:** Test failures after dead code cleanup.

### Pitfall 5: `@anthropic-ai/sdk` -- Dead Dependency vs Future Dependency
**What goes wrong:** Removing `@anthropic-ai/sdk` because it is unused, then needing to re-add it for Phase 3+ AI integration.
**Why it happens:** The SDK was added in anticipation of future features (v2 requirements AI-01, AI-02, AI-03).
**How to avoid:** Leave the dependency in `package.json` but note it in the audit. It is intentionally pre-installed for future use. Only flag it, do not remove it.
**Warning signs:** Bundle analyzer showing SDK in the client bundle (it should only be server-side).

## Code Examples

### Known Dead Code (discovered during research)

**ESLint warnings in main codebase (excluding .claude/worktrees/):**

| File | Issue | Fix |
|------|-------|-----|
| `app/quest/dashboard/page.tsx:9` | `ClassLabel` imported but never used | Remove import |
| `app/quest/dashboard/page.tsx:198` | `<a href="/">` instead of `<Link>` | Replace with `<Link href="/">` |
| `app/quest/session/[id]/page.tsx:369` | `data` variable defined but never used | Remove or use |
| `components/quest/reveal-sequence.tsx:136` | `handlePostConfirmatory` assigned but never used | Remove dead callback |
| `hooks/use-scores.ts:6` | `calculateRiasecType` imported but never used in this file | Remove import |
| `hooks/use-scores.ts:12` | `getTopMi` imported but never used in this file | Remove import (note: used internally via `calculateAllMi`) |
| `hooks/use-scores.ts:15` | `deriveEmergingType` imported but never used in this file | Remove import |

**Note on use-scores.ts:** The lint warnings are about imports that are not directly called in `use-scores.ts` itself. `calculateRiasecType` is called internally by `calculateAllRiasec`, `getTopMi` and `deriveEmergingType` are called in components that import from scoring modules directly. These are unused *imports* in this specific file, not unused *functions* globally.

### Scoring Boundary Test Gaps

Tests that exist cover empty arrays and single elements, but these specific boundary cases are missing:

1. **RIASEC score exactly 100:** `calculateRiasecType([5,5,5])` tested, but `calculateAllRiasec` with all-max inputs not tested at the `calculateAll` level
2. **RIASEC score exactly 0:** `calculateRiasecType([1,1,1])` tested, same gap at `calculateAll` level
3. **Values boundary -100 and +100:** `calculateValuesDimension([-3,-3])` and `[3,3]` tested individually, not at `calculateAllValues` level with mixed extremes
4. **MBTI boundary at exactly threshold (35/-35):** `isStillEmerging(35)` is false, `isStillEmerging(34)` is true -- tested, but `deriveEmergingType` with scores exactly at 35 not tested
5. **`deriveClassLabel` with scores exactly at 50:** Test case exists (`scores = { ..., I: 50, ... }`) but the function uses `> 50` (strict), so 50 is NOT above threshold. Worth an explicit boundary test at 50 and 51.
6. **`mergeIpsativeScores` with all null ipsatives:** Tests cover partial nulls but not all-null
7. **`getTopStrengths` with n=0:** Not tested
8. **`accumulateStrengths` with duplicate signals:** Tested, but single-signal-repeated-many-times not explicitly tested
9. **`selectAdaptiveQuestions` edge cases:** Need to check what boundary tests exist

### Error Boundary Section Targets (per D-02)

**Dashboard page (`app/quest/dashboard/page.tsx`):**
- Section 1: Chart group (RiasecBars, MiPreviewBars, MbtiSliders, ValuesSliders, EmergingType, ClassLabel)
- Section 2: Quest log + badges (BadgeRow, XP progress)

**Session page (`app/quest/session/[id]/page.tsx`):**
- Section 1: Question flow area (QuestionCard, input components)
- Section 2: Reveal sequence (RevealSequence component with all its chart cards)

**Reveal sequence (`components/quest/reveal-sequence.tsx`):**
- Section 1: Chart cards group (RIASEC, MI, MBTI, Values displays)
- Section 2: Completion screen (CompletionScreen with confetti)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `error.tsx` with `reset` prop | `error.tsx` with `unstable_retry` prop | Next.js 16.2.0 | `unstable_retry` re-fetches data; `reset` only clears error state |
| Class component ErrorBoundary only | File-based `error.tsx` + class ErrorBoundary | Next.js 13+ | Route-level errors handled by convention; section-level still needs class components |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIT-01 | No ESLint warnings/errors after cleanup | lint | `npm run lint` | N/A (lint, not test file) |
| AUDIT-01 | TypeScript compiles clean | typecheck | `npx tsc --noEmit` | N/A |
| AUDIT-02 | Boundary value tests for scoring (0, 100, -100, threshold) | unit | `npx vitest run lib/scoring/__tests__/ -x` | Partially -- nan-guard.test.ts covers empty/single, needs boundary additions |
| AUDIT-02 | deriveClassLabel boundary tests at 50/51 | unit | `npx vitest run lib/scoring/__tests__/riasec.test.ts -x` | Exists but needs boundary additions |
| AUDIT-03 | Bundle analysis passes (no unexpected large chunks) | build | `npm run build` with analyzer | N/A (manual/visual check) |
| AUDIT-04 | Error boundaries catch rendering failures | unit | `npx vitest run components/__tests__/section-error-boundary.test.tsx -x` | No -- Wave 0 gap |
| AUDIT-04 | error.tsx files exist at route level | smoke | `ls app/quest/session/\\[id\\]/error.tsx app/quest/dashboard/error.tsx` | No -- Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run && npm run lint && npx tsc --noEmit`
- **Per wave merge:** `npx vitest run && npm run lint && npx tsc --noEmit`
- **Phase gate:** Full suite green + zero ESLint errors/warnings before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `components/__tests__/section-error-boundary.test.tsx` -- covers AUDIT-04 (error boundary renders fallback on child throw)
- [ ] Boundary value additions to existing test files -- covers AUDIT-02
- [ ] `app/quest/session/[id]/error.tsx` -- covers AUDIT-04 route-level
- [ ] `app/quest/dashboard/error.tsx` -- covers AUDIT-04 route-level

## Open Questions

1. **`@anthropic-ai/sdk` in bundle**
   - What we know: It is a dependency (5.1MB in node_modules) but never imported. It is for future v2 AI integration.
   - What's unclear: Whether it ends up in the client bundle or is tree-shaken away. Bundle analyzer will answer this.
   - Recommendation: Keep the dependency but verify it is not in the client bundle. If it is, it may need to be moved to a server-only import guard.

2. **framer-motion tree-shaking effectiveness**
   - What we know: 5.5MB in node_modules, used in reveal-sequence, completion-screen, block-transition, persistence-banner, confirmation-toast.
   - What's unclear: How much actually ends up in the client bundle.
   - Recommendation: Bundle analyzer will answer this. If bundle is large, consider importing specific sub-modules (`framer-motion/m`).

## Sources

### Primary (HIGH confidence)
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` -- Next.js 16 error.tsx API reference with `unstable_retry` (v16.2.0+)
- `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md` -- Next.js 16 error handling patterns
- ESLint output from `npm run lint` -- exact warnings and errors in codebase
- `npx vitest run` output -- 840 tests, 68 files, all passing
- `npx tsc --noEmit` -- clean compilation
- `npm view @next/bundle-analyzer version` -- 16.2.2 confirmed

### Secondary (MEDIUM confidence)
- `.planning/codebase/CONCERNS.md` -- Pre-existing tech debt analysis (may be partially stale after Phases 1-3 fixes)
- `.planning/phases/03-scoring-quality/03-VERIFICATION.md` -- Phase 3 verification confirms 840 tests, scoring coverage
- `.planning/phases/02-session-completion-persistence/02-VERIFICATION.md` -- Phase 2 verification confirms persistence/error handling

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Next.js 16 + Supabase + Vercel -- no changes
- **API cost:** Sessions 1-2 must be zero API cost (all client-side scoring) -- relevant: do not add server-side score validation in this phase
- **Target users:** High school students (13-18) -- error fallback UI should be friendly, not technical
- **No console logging:** Project convention is silent failures with fallback UI
- **"use client" directive:** Required on all interactive components, including error boundaries
- **Test command:** `npm test` runs `vitest run`
- **Lint command:** `npm run lint` runs ESLint
- **AGENTS.md warning:** "This is NOT the Next.js you know" -- must read Next.js 16 docs before writing code. `unstable_retry` is the current API, not `reset`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools already installed and verified, only adding @next/bundle-analyzer
- Architecture: HIGH -- error boundary pattern confirmed from Next.js 16 bundled docs
- Pitfalls: HIGH -- based on direct codebase inspection and official docs
- Test gaps: HIGH -- based on reading every existing test file and scoring function

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- no fast-moving dependencies)
