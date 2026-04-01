# Codebase Concerns

**Analysis Date:** 2026-04-01

## Tech Debt

**Incomplete API Implementations:**
- Issue: Five API endpoints are stubs with TODO comments, blocking Phase 3/4 features
- Files:
  - `app/api/ask/route.ts` - Freeform Q&A with Claude (unimplemented)
  - `app/api/career-analysis/route.ts` - Career analysis with Claude (unimplemented)
  - `app/api/programme-match/route.ts` - Programme matching with Claude (unimplemented)
  - `app/api/roadmap/route.ts` - Roadmap generation with Claude (unimplemented)
  - `app/api/report/route.ts` - Report generation with Claude (unimplemented)
- Impact: These endpoints currently return placeholder responses, making dependent features unusable. Any client attempting to call these endpoints gets empty data.
- Fix approach: Implement each endpoint with proper Claude API integration, request validation, and error handling. Add request/response types for each.

**No Input Validation Layer:**
- Issue: API routes and form submissions accept data without schema validation
- Files: `app/quest/character/page.tsx`, `app/api/*.ts`
- Impact: Invalid or malicious data could be persisted to Supabase. Type checking is TypeScript-only (compile-time, not runtime).
- Fix approach: Add Zod or similar runtime schema validation to all API routes and form submissions. Validate before database operations.

**Type Unsafety in Tests:**
- Issue: Type casting with `as unknown` bypasses type checking
- Files: `lib/scoring/__tests__/riasec.test.ts` (line 112)
- Impact: Tests may pass with incorrect types, masking real bugs in production code
- Fix approach: Refactor test data to match actual types properly rather than casting

**Error Handling in Quest Provider Lacks Granularity:**
- Issue: All persistence errors silently set `persistence_failed: true` without distinguishing root causes
- Files: `providers/quest-provider.tsx` (lines 226-229)
- Impact: Client can't distinguish between network errors, auth errors, data validation errors, etc. Makes debugging harder and prevents targeted recovery strategies.
- Fix approach: Catch specific error types and store error details (error code, message) in state for proper error recovery UI

## Known Bugs

**Silent Persistence Failures Without User Visibility:**
- Symptoms: Quiz answers may not save to database if Supabase is unreachable, but user sees no error
- Files: `providers/quest-provider.tsx` (persistCheckpoint method)
- Trigger: Network disconnection or Supabase outage during persistCheckpoint calls
- Workaround: User can manually retry by reloading, but quiz answers are lost. `persistence_failed` flag is set but no UI component displays it to user.

**Unsafe Anonymous Auth Flow:**
- Symptoms: New user creates account as anonymous, but if auth fails mid-flow (line 100-108), user is partially created in database
- Files: `app/quest/character/page.tsx` (lines 87-184)
- Trigger: Auth success but student insert fails, or auth success but network drops after student creation
- Issue: No transaction handling - student record created even if subsequent operations fail, leaving orphaned records
- Fix approach: Implement client-side transaction simulation (rollback student if scoring insert fails) or use Supabase RLS policies to enforce atomicity

**Retry Logic Doesn't Handle All Failure Modes:**
- Symptoms: `retryWithBackoff` retries on all error objects, but some errors are not recoverable (auth errors, permission errors)
- Files: `providers/quest-provider.tsx` (lines 55-75)
- Impact: Wastes time retrying permission/auth errors that will never succeed
- Fix approach: Inspect error type before retrying - only retry network/timeout errors

**Class Definition Hardcoded as "wanderer":**
- Symptoms: Session page always narrates as "wanderer" regardless of user's selected avatar class
- Files: `app/quest/session/[id]/page.tsx` (lines 66-81)
- Impact: If user selected "scholar" class, narration still uses "wanderer" class flavor text
- Fix approach: Pass selected class from character creation through session context or route params

## Security Considerations

**No Rate Limiting on API Endpoints:**
- Risk: Unprotected endpoints can be hammered with requests, causing DOS or API quota exhaustion
- Files: All files in `app/api/`
- Current mitigation: Supabase auth check only (lines 10-11 in each route)
- Recommendations:
  - Add rate limiting middleware (e.g., Upstash Redis-backed rate limiter)
  - Implement per-user request quotas
  - Add request size limits

**Anonymous Auth Creates Unrestricted User Accounts:**
- Risk: Each anonymous user gets full database write access via RLS policies
- Files: `app/quest/character/page.tsx` (lines 97-98)
- Current mitigation: Supabase RLS policies presumably restrict access
- Recommendations:
  - Document exact RLS policy constraints
  - Consider email/SMS verification for data persistence (even anonymous users)
  - Audit RLS policies for privilege escalation risks

**No CSRF Protection on State Mutations:**
- Risk: No explicit CSRF tokens on form submissions
- Files: Character creation and question submission flows
- Current mitigation: Relying on implicit SameSite cookie policies
- Recommendations:
  - Add CSRF token generation/validation if handling high-value operations
  - Document SameSite policy requirements in deployment guide

**Unvalidated Client Score Data:**
- Risk: Client-side score calculations are sent to server but not revalidated
- Files: `providers/quest-provider.tsx` (line 186-191 sends client-calculated scores to DB)
- Impact: Malicious client could send fake scores, bypassing assessment validity
- Fix approach: Recompute scores server-side from raw responses, not client scores

## Performance Bottlenecks

**Large Redux-Like State Objects on Session Page:**
- Problem: Session page maintains local state for all adaptive questions, current question, flow phase, etc.
- Files: `app/quest/session/[id]/page.tsx` (lines 43-424)
- Cause: 666 lines with deeply nested callback chains and multiple useState hooks. Any state change re-renders the entire component tree.
- Improvement path:
  - Extract question rendering to memoized sub-component
  - Use Zustand or React Context to avoid prop drilling
  - Implement React.memo on question components

**No Pagination on Assessment Data:**
- Problem: If student completes many sessions, loading all assessment_scores at once could be slow
- Files: `app/quest/dashboard/page.tsx` (presumed)
- Improvement path: Implement pagination/lazy loading for historical session data

**Animation State Not Memoized:**
- Problem: Reveal sequence animations recalculate on every render
- Files: `components/quest/reveal-sequence.tsx` (361 lines)
- Improvement path: Use `useMemo` for phase transitions, cache animation variants

## Fragile Areas

**Quiz Flow State Machine is Implicit:**
- Files: `app/quest/session/[id]/page.tsx` (flow phases: "questions", "block_transition", "engagement", etc.)
- Why fragile: 8 different flow phases managed with scattered state variables. No state machine library or clear transition rules. Easy to accidentally skip states or create invalid transitions (e.g., go to "reveal" without completing "selfmap").
- Safe modification:
  - Add comprehensive type-safe state machine (e.g., XState) to formalize transitions
  - Add unit tests for each transition rule
  - Document valid state graph
- Test coverage: Flow phase transitions are not unit tested

**Character Creation Wizard Missing Validation:**
- Files: `app/quest/character/page.tsx`
- Why fragile: Form state (step, name, age, destinations, etc.) is scattered across multiple useState hooks. If user refreshes mid-wizard, all input is lost. No validation prevents invalid data like negative age.
- Safe modification:
  - Use form library (React Hook Form) to centralize state
  - Add browser localStorage to persist mid-wizard progress
  - Add explicit validation for each field
- Test coverage: No tests for character creation flow

**Supabase Client Creation Pattern Not Protected:**
- Files: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Why fragile: `createClient()` is called multiple times without checking if credentials are loaded. If env vars are missing, silent failures occur.
- Safe modification:
  - Add validation on client creation with clear error messages
  - Use singleton pattern to ensure only one client instance
  - Test with missing env vars

**Type Safety Gaps Between Client and Server:**
- Files: All API routes and their callers
- Why fragile: Client sends data with inferred types, but server doesn't validate shape. If client refactors and server isn't updated, data corruption occurs silently.
- Safe modification:
  - Add explicit request/response types to all API routes
  - Use zod or tRPC to enforce contracts
  - Add integration tests verifying client-server contract

## Scaling Limits

**No Database Query Optimization:**
- Current capacity: Single session with sequential question answering
- Limit: If 1000+ concurrent users take quizzes, Supabase will hit query limits without indexes
- Scaling path:
  - Add database indexes on student_id, session_number, question_id
  - Implement connection pooling
  - Monitor Supabase metrics for slow queries

**Anonymous Auth Session Accumulation:**
- Current capacity: No cleanup of anonymous user sessions
- Limit: Supabase storage will grow indefinitely as each unique visitor creates a new anonymous user
- Scaling path:
  - Implement scheduled cleanup job to delete inactive anonymous users after N days
  - Archive old session responses to cold storage
  - Add retention policy to database schema

**In-Memory State on Session Page:**
- Current capacity: All questions and responses held in component state
- Limit: With 1000+ questions or large response sets, browser memory could exceed limits
- Scaling path:
  - Paginate questions on client
  - Stream responses to IndexedDB
  - Implement virtual scrolling for large question lists

## Dependencies at Risk

**Next.js 16.2.1 Breaking Changes Not Documented:**
- Risk: Next.js 16 has significant API changes. Code may break on minor updates.
- Impact: Routes, middleware, components may need refactoring with each release
- Files: Project wide (all .ts, .tsx, layout files)
- Current state: `AGENTS.md` warns about breaking changes but no version lock or compatibility notes
- Migration plan:
  - Pin exact next version in package.json (currently `"next": "16.2.1"` - good)
  - Document migration path if upgrading to 17.x
  - Test on staging before upgrading

**Recharts 3.8.1 Missing Error Boundaries:**
- Risk: Chart rendering errors could crash entire page
- Impact: If scores contain NaN or Infinity, charts fail silently
- Files: `components/charts/*.tsx` (riasec-bars, mi-preview-bars, etc.)
- Current mitigation: None observed
- Recommendation: Wrap chart components in error boundaries

**Supabase SDK Version Drift:**
- Risk: Types may not match actual Supabase behavior between SDK versions
- Files: All files using `@supabase/supabase-js` (^2.101.0)
- Impact: Type safety issues could be masked by version mismatches
- Recommendation: Lock to exact version, document upgrade path

## Missing Critical Features

**No Offline Mode:**
- Problem: If user loses network during quiz, all answers are lost on reload
- Blocks: Reliable assessment completion in poor network areas
- Files: Would need: `lib/storage/offline.ts`, service worker, IndexedDB persistence
- Approach: Implement PWA with service worker, queue responses locally, sync on reconnect

**No Progress Persistence Within Session:**
- Problem: User's current question index is only in React state, not stored anywhere
- Blocks: Resuming mid-quiz if page reloads
- Files: `hooks/use-quest-state.ts`
- Approach: Persist currentIndex to localStorage, restore on component mount

**No Admin Dashboard:**
- Problem: No way for facilitators to view student progress, scores, or results
- Blocks: Phase 2 "Facilitator" feature (visible in routes but no implementation)
- Files: Entire `app/facilitator/` directory is stubbed out
- Approach: Create pages for student list, individual student results, class analytics

**No Result Comparison Feature:**
- Problem: User can't compare their results to other types or career fields
- Blocks: "Comparison hint" phase in reveal sequence exists but has no UI
- Files: Mentioned in `components/quest/reveal-sequence.tsx` (line 41) but never rendered

## Test Coverage Gaps

**No Tests for Happy Path Quiz Flow:**
- What's not tested: Complete session flow from character creation through reveal
- Files: No integration test for `app/quest/session/[id]/page.tsx`
- Risk: Quiz could be fundamentally broken (wrong questions shown, answers not recorded) without detection
- Priority: High - this is the core product

**No Tests for Score Calculation Edge Cases:**
- What's not tested: Score merging with null values, acquiescence bias detection
- Files: `lib/scoring/riasec.ts` has unit tests but missing edge cases
- Risk: Users could get incorrect career recommendations
- Priority: High - trust-breaking bug

**No Tests for Data Persistence:**
- What's not tested: Checkpoint saving, retry logic, network failure recovery
- Files: `providers/quest-provider.tsx` persistence logic untested
- Risk: Silent data loss, duplicate records, orphaned data
- Priority: High - data integrity

**No Tests for Authentication Edge Cases:**
- What's not tested: Anonymous auth failures, session expiration, token refresh
- Files: No tests in codebase for auth flows
- Risk: Broken access, session hijacking
- Priority: Medium - affects security

**No Tests for UI State Transitions:**
- What's not tested: Flow phase transitions, block transitions, engagement checkpoints
- Files: `app/quest/session/[id]/page.tsx` has 7+ flow phases, none tested
- Risk: Users stuck in wrong state, incomplete quiz flow
- Priority: High - core UX

**No Component Snapshot or Visual Tests:**
- What's not tested: Chart rendering (Recharts), animations (Framer Motion), theme switching
- Files: All files in `components/` and `components/charts/`
- Risk: Visual regressions, broken accessibility
- Priority: Medium

---

*Concerns audit: 2026-04-01*
