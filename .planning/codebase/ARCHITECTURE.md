# Architecture

**Analysis Date:** 2026-04-01

## Pattern Overview

**Overall:** Client-Server Monolith with Client State Management + Server Persistence

**Key Characteristics:**
- Next.js 16 App Router framework
- Client-heavy state with React Server Components for critical operations
- Supabase for authentication, data persistence, and API
- Layered question block progression through quest session
- Multi-framework assessment scoring (RIASEC, MI, MBTI, Values) in-memory
- Server-side persistence with retry logic for state snapshots

## Layers

**Presentation Layer:**
- Purpose: Render interactive UI components and handle user interactions
- Location: `app/quest/`, `app/facilitator/`, `components/`
- Contains: Page components (TSX), UI building blocks (buttons, sliders, pickers), theme provider
- Depends on: Context providers, hooks, data queries
- Used by: Browser/frontend users

**State Management Layer:**
- Purpose: Manage quest progression, answer responses, scoring calculations in real-time
- Location: `hooks/` (useQuestState, useScores), `providers/quest-provider.tsx`
- Contains: React hooks for quest flow, score computation, cached snapshots
- Depends on: Types, scoring algorithms, Supabase client
- Used by: Page components, child components via context

**Scoring/Calculation Layer:**
- Purpose: Transform responses into normalized assessment scores using psychometric frameworks
- Location: `lib/scoring/`
- Contains: RIASEC normalization, MI dimension aggregation, MBTI indicator calculation, values computation, strength extraction
- Depends on: Assessment types, mathematical formulas
- Used by: useScores hook, result display components

**API Layer:**
- Purpose: Handle server-side operations: authentication checks, async Claude calls, data aggregation
- Location: `app/api/`
- Contains: Route handlers for /ask, /career-analysis, /programme-match, /report, /roadmap
- Depends on: Supabase server client, Anthropic SDK, scoring results
- Used by: Frontend page components via fetch

**Data Access Layer:**
- Purpose: Abstractions for Supabase client and server operations
- Location: `lib/supabase/`
- Contains: Client factory (browser), server factory (server), session middleware, auth
- Depends on: Supabase SDK (@supabase/ssr, @supabase/supabase-js)
- Used by: All layers that need database/auth

**Data Layer:**
- Purpose: Static question pools, scenarios, class definitions, educational data
- Location: `data/`
- Contains: Session 1 core questions, adaptive question pool, class definitions, destinations, strength categories, MBTI descriptors
- Depends on: Type definitions
- Used by: Session pages, character creation, result displays

## Data Flow

**Quest Session Flow:**

1. User lands on `/quest/session/[id]` (e.g., session 1)
2. `[id]/page.tsx` loads core questions from `data/questions/session-1-core.ts`
3. User answers question → `questionCard.tsx` captures response as `ClientResponse`
4. Response flows to `QuestProvider.answerQuestion()`:
   - Updates quest state (current block, index, responses array)
   - Calls `useScores.processResponse()` or `processResponseWithSignals()`
5. Scores hook updates raw arrays and recalculates normalized scores (RIASEC, MI, MBTI, Values)
6. Component re-renders with updated scores → progress bar updates
7. Discovery mode trigger: 3 consecutive neutral RIASEC Likert responses → Discovery Mode prompt
8. After engagement checkpoint or block completion → `persistCheckpoint("riasec" | "full")` writes to Supabase

**Character Creation Flow:**

1. `/quest/character` page renders `tone-toggle`, `avatar-select`, education cards, etc.
2. User selects class → theme CSS variable updated via `data-theme` attribute
3. Form submission → POST to Supabase `students` table
4. Student record created with: name, age, education_system, avatar_class, tone, destinations, curiosities
5. Response includes student ID → redirect to `/quest/session/1`

**Authentication Flow:**

1. Root layout wraps with `ThemeProvider`
2. Entry page (`app/page.tsx`) checks session: `supabase.auth.getSession()`
3. If session + student record exist → "returning" state (fast path)
4. If session but no student → Character creation page
5. If no session → Login/signup flow via Supabase Auth UI (delegated)
6. Middleware (`middleware.ts`) refreshes auth session on every request

**State Management:**

- **Client-side transient:** Quest responses, current question index, discovery mode flag (in `useQuestState`)
- **Client-side cached:** All computed scores (RIASEC, MI, MBTI, Values, strengths) in `useScores`
- **Server-persisted:** Student record, assessment_scores table, session_responses table, achievements
- **Checkpoint pattern:** `persistCheckpoint()` writes snapshots at "riasec" (lightweight), "full" (complete), or "final" (end + badge)

## Key Abstractions

**ClientResponse:**
- Purpose: Represents a single answer to a question
- Examples: `{ question_id: "s1-warmup-01", response_value: 2, response_label: "Read, research, or learn", framework: "multi", ... }`
- Pattern: Immutable data object passed through event handlers

**Question:**
- Purpose: Definition of a question with options, framework signals, and metadata
- Examples: Warm-up multiple choice, RIASEC Likert scale, ipsative forced choice
- Pattern: Loaded from static data files, cached in memory, not persisted per-session

**QuestionBlock:**
- Purpose: Groups questions into phases: warmup, riasec, riasec_mi, mbti_values, selfmap, reveal, confirmatory
- Pattern: State machine progression in `useQuestState`

**Scoring Frameworks:**
- RIASEC: 6-type occupational interest (Realistic, Investigative, Artistic, Social, Enterprising, Conventional)
- MI (Multiple Intelligences): 8 dimensions (linguistic, logical, spatial, musical, bodily, interpersonal, intrapersonal, naturalistic)
- MBTI: 4 dichotomies (EI, SN, TF, JP) with emerging type detection
- Values: 5 spectrum dimensions (security/adventure, income/impact, prestige/fulfillment, structure/flexibility, solo/team)

**Class Label:**
- Purpose: Derived from RIASEC scores to group students into archetypes
- Pattern: deriveClassLabel() produces "MAKER-INVESTIGATOR", "SEEKER", "EXPLORER", etc.
- Used by: Character avatars, themed narration, results display

## Entry Points

**Landing Page:**
- Location: `app/page.tsx`
- Triggers: User visits root URL
- Responsibilities: Check session state, show intro carousel or welcome screen, route to character/session

**Character Creation:**
- Location: `app/quest/character/page.tsx`
- Triggers: User has no student record yet
- Responsibilities: Gather tone, avatar, demographics, destinations, curiosities; create student in DB

**Quest Session:**
- Location: `app/quest/session/[id]/page.tsx`
- Triggers: Student clicks "Start Quest" or "Continue Quest"
- Responsibilities: Load session questions, manage block progression, persist checkpoints

**Dashboard:**
- Location: `app/quest/dashboard/page.tsx`
- Triggers: Student completes session and views results
- Responsibilities: Display computed scores, charts, achievements, generated insights

**Facilitator Portal:**
- Location: `app/facilitator/`
- Triggers: Facilitator user role (role-based access controlled)
- Responsibilities: View student progress, manage cohorts, access reports

**Report Generation:**
- Location: `app/api/report/route.ts`
- Triggers: Student requests report export
- Responsibilities: Aggregate scores, call Claude API for narrative, generate document

## Error Handling

**Strategy:** Graceful degradation with user feedback and retry logic

**Patterns:**

- **Network errors:** Try-catch blocks, retry with exponential backoff (1s, 2s, 4s) in `persistCheckpoint()`
- **Persistence failures:** Flag `persistence_failed` in quest state; show toast warning; allow continue but mark for manual sync
- **Auth errors:** Redirect to login on 401; maintain session via middleware
- **Validation errors:** Client-side validation on character form fields; disable submit if invalid
- **Missing data:** Fallback to default values (e.g., default class "Wanderer" if avatar_class not found)

## Cross-Cutting Concerns

**Logging:** Console logs only; no production logger configured. Comments and TODO marks present.

**Validation:**
- Client-side: Form validation in character creation (name, age, education, selections)
- Type safety: Full TypeScript with explicit types for Student, Question, ClientResponse, ScoreState

**Authentication:**
- Provider: Supabase Auth (email/password, social providers)
- Session storage: HTTP-only cookies managed by Supabase SSR
- Refresh: Automatic via middleware on every request

**Theme Management:**
- Provider: `ThemeProvider` in root layout
- Method: CSS custom properties (--cq-primary, --cq-bg-card, etc.)
- Dynamic class theme: Selected during character creation, stored in `data-theme` attribute
- Fallback: "purple-teal" theme

---

*Architecture analysis: 2026-04-01*
