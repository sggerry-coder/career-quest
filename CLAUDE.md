@AGENTS.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Career Quest**

A gamified career exploration web app for high school students (13–18). Students work through a multi-session "quest" that discovers their personality, strengths, values, and interests — visualised with animated charts and cards — then uses Claude AI for career analysis and university recommendations. Currently in Phase 1 (Core Quest MVP) with Session 1 flow, scoring, and dashboard partially built.

**Core Value:** Students can complete Session 1 end-to-end — from character creation through all question blocks to an animated Profile Reveal — and feel a sense of discovery and completion.

### Constraints

- **Tech stack**: Next.js 16 + Supabase + Vercel — already established, no changes
- **API cost**: Sessions 1-2 must be zero API cost (all client-side scoring)
- **Target users**: High school students (13-18) — UI must be engaging and age-appropriate
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - All application code, types, and build configuration
- JavaScript (ES2017 target) - Runtime compatibility target
- SQL - Supabase database migrations in `supabase/migrations/`
- CSS - Tailwind utility styles in `app/globals.css`
## Runtime
- Node.js (version not pinned, inferred from package.json compatibility)
- Edge Runtime support for selected API routes (e.g., `app/api/ask/route.ts` uses `export const runtime = "edge"`)
- Node.js runtime fallback for complex operations (e.g., `app/api/report/route.ts` uses `export const runtime = "nodejs"`)
- npm (package-lock.json present in git)
## Frameworks
- Next.js 16.2.1 - Full-stack React framework with App Router (`next dev`, `next build`, `next start`)
- React 19.2.4 - UI component library and hooks
- React DOM 19.2.4 - DOM rendering
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind processing
- Framer Motion 12.38.0 - React animation library used in components
- Recharts 3.8.1 - React charting library for data visualization (used in dashboard)
- Vitest 4.1.2 - Unit/integration test runner
- Test command: `npm test` (runs `vitest run`)
- Watch mode: `npm run test:watch` (runs `vitest`)
- TypeScript 5.x - Language compiler and type checking
- ESLint 9.x - Code linting with Next.js configuration
- PostCSS 4.x - CSS transformation pipeline (configured in `postcss.config.mjs`)
## Key Dependencies
- @supabase/supabase-js 2.101.0 - Supabase client for database/auth operations
- @supabase/ssr 0.10.0 - Server-side rendering utilities for auth middleware and cookie handling
- @anthropic-ai/sdk 0.80.0 - Claude API client (installed but not yet integrated in API endpoints)
- next 16.2.1 - Web framework and build tooling
- react 19.2.4 - Component library
- react-dom 19.2.4 - React rendering
- @types/node 20.x - Node.js type definitions
- @types/react 19.x - React type definitions
- @types/react-dom 19.x - React DOM type definitions
- eslint-config-next 16.2.1 - Next.js ESLint configuration (uses core-web-vitals and typescript presets)
## Configuration
- `.env.example` documents required configuration:
- Environment variables are read from `process.env` at runtime
- Session cookies managed via `Next.js cookies()` API in middleware
- `tsconfig.json` - TypeScript configuration with:
- `next.config.ts` - Empty placeholder for future Next.js configuration
- `postcss.config.mjs` - PostCSS pipeline with Tailwind plugin
- `eslint.config.mjs` - ESLint with Next.js core-web-vitals and TypeScript presets
- `package.json` - Standard npm configuration with dev/production split
## Platform Requirements
- Node.js (version compatible with ES2017 target)
- npm package manager
- TypeScript 5.x compiler
- Modern browser with ES2017 support
- Deployment target: Vercel (evidenced by `.vercel/project.json`)
- Next.js App Router compatible hosting
- Edge Runtime support (optional, for performance)
- Node.js runtime for complex operations (PDF generation, etc.)
- PostgreSQL database via Supabase
- HTTPS/TLS for secure communication
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase (e.g., `ToneToggle.tsx`, `XpBar.tsx`)
- Pages: lowercase kebab-case with square brackets for dynamic routes (e.g., `dashboard/page.tsx`, `[id]/page.tsx`)
- Utilities and modules: camelCase (e.g., `adaptive.ts`, `riasec.ts`)
- Test files: filename with `.test.ts` or `.test.tsx` suffix in `__tests__` directory (e.g., `mbti.test.ts`)
- PascalCase for React component exports (e.g., `export default function Dashboard()`, `export function ToneToggle()`)
- camelCase for utility functions (e.g., `calculateRiasecType`, `selectAdaptiveQuestions`, `detectAcquiescenceBias`)
- Private helper functions: camelCase with optional underscore prefix if intentionally internal (e.g., `sanitizeValue`)
- camelCase for all variables and constants (e.g., `currentXp`, `maxXp`, `riasecScores`, `hasCompletedSession1`)
- SCREAMING_SNAKE_CASE for true constants (e.g., `RIASEC_TYPES`, `STILL_EMERGING_THRESHOLD`, `MAX_RIASEC_PER_TYPE`)
- Record/dictionary keys: lowercase (e.g., `{ R: "MAKER", I: "INVESTIGATOR" }`)
- PascalCase for interfaces and type aliases (e.g., `StudentData`, `ScoresData`, `Tone`, `AdaptiveInput`, `RiasecType`)
- Props interfaces: `[ComponentName]Props` pattern (e.g., `XpBarProps`, `ToneToggleProps`)
- Plural naming for arrays (e.g., `unlockedBadgeIds`, `selectedQuestions`, `RIASEC_TYPES`)
## Code Style
- ESLint 9 with Next.js configuration (ESLint core web vitals + TypeScript support)
- No explicit Prettier config found — uses default ESLint formatting via `eslint-config-next`
- File: `eslint.config.mjs` (flat config format)
- Tool: ESLint 9
- Base configs: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`
- Run: `npm run lint`
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- 2-space indentation (observed throughout)
- Single space around operators
- No trailing commas in single-line constructs, trailing commas in multiline arrays/objects
## Import Organization
- Single alias defined: `@/*` maps to project root
- Used consistently throughout: `@/lib`, `@/components`, `@/app`, `@/data`, `@/providers`
## Error Handling
- Silent catch with fallback rendering (empty state)
- Try/finally blocks to ensure cleanup (e.g., `setLoading(false)`)
- No error logging or console output
- Explicit null/undefined checks before data access (e.g., `if (studentRes.data) { ... }`)
- Type assertions with `as` for Supabase response casting
## Logging
- No console logging in codebase
- No dedicated logging library
- Silent failures accepted with fallback UI states
## Comments
- JSDoc blocks for exported functions with multiple parameters (observed in `lib/scoring/riasec.ts`, `lib/scoring/adaptive.ts`)
- Inline comments for complex business logic (e.g., ambiguity calculations, normalization formulas)
- Comments explaining "why" not "what" (e.g., explaining formula reasoning)
- Single-line documentation blocks above function signatures
- Include parameter and return descriptions
- Formulas documented with arithmetic notation
## Function Design
- Small, focused functions (30-100 lines typical)
- Utility functions 10-50 lines
- Components vary 50-400 lines for complex pages
- Destructuring used for interface parameters (e.g., `{ value, onChange }` in `ToneToggle`)
- Single-object parameter preferred over multiple params
- TypeScript strict mode enforces explicit types
- Explicit return type annotations on all exported functions
- Return 0 for empty/null inputs in calculation functions
- Return null state for missing Supabase data
- Components return JSX.Element (implicit)
- Used for validation and guard clauses (e.g., `if (!user) { return; }`)
## Module Design
- Named exports for utilities and helper functions
- Default exports for React components (pages and reusable components)
- Type exports with `export type` for interfaces/types
- Barrel exports used in some directories (e.g., `@/data/badges`)
- Used selectively (observed in `@/data` and chart components)
- Simplify imports from component groups
- Private helper functions stay in same file (no export)
- Single-purpose modules (e.g., `riasec.ts`, `mbti.ts`, `adaptive.ts`)
- Shared types in `lib/types/` directory
## Special Patterns
- Functional components throughout
- `"use client"` directive for client-side interactivity
- Custom hooks not observed in codebase yet
- Prop destructuring in function parameters
- API routes in `app/api/route.ts` with HTTP method exports
- Edge runtime declared: `export const runtime = "edge"`
- Middleware pattern: `middleware.ts` at app root
- Dynamic route segments: `[id]` syntax in file paths
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Explicit `as` type assertions for Supabase casts
- Interface definitions before usage
- Type-only imports where appropriate
- Consistent formula approach: `(sanitized - count) / (count * 4) * 100`
- Utility functions handle edge cases (empty arrays, out-of-range values)
- Sanitize raw values before calculation (clamping and rounding)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Next.js 16 App Router framework
- Client-heavy state with React Server Components for critical operations
- Supabase for authentication, data persistence, and API
- Layered question block progression through quest session
- Multi-framework assessment scoring (RIASEC, MI, MBTI, Values) in-memory
- Server-side persistence with retry logic for state snapshots
## Layers
- Purpose: Render interactive UI components and handle user interactions
- Location: `app/quest/`, `app/facilitator/`, `components/`
- Contains: Page components (TSX), UI building blocks (buttons, sliders, pickers), theme provider
- Depends on: Context providers, hooks, data queries
- Used by: Browser/frontend users
- Purpose: Manage quest progression, answer responses, scoring calculations in real-time
- Location: `hooks/` (useQuestState, useScores), `providers/quest-provider.tsx`
- Contains: React hooks for quest flow, score computation, cached snapshots
- Depends on: Types, scoring algorithms, Supabase client
- Used by: Page components, child components via context
- Purpose: Transform responses into normalized assessment scores using psychometric frameworks
- Location: `lib/scoring/`
- Contains: RIASEC normalization, MI dimension aggregation, MBTI indicator calculation, values computation, strength extraction
- Depends on: Assessment types, mathematical formulas
- Used by: useScores hook, result display components
- Purpose: Handle server-side operations: authentication checks, async Claude calls, data aggregation
- Location: `app/api/`
- Contains: Route handlers for /ask, /career-analysis, /programme-match, /report, /roadmap
- Depends on: Supabase server client, Anthropic SDK, scoring results
- Used by: Frontend page components via fetch
- Purpose: Abstractions for Supabase client and server operations
- Location: `lib/supabase/`
- Contains: Client factory (browser), server factory (server), session middleware, auth
- Depends on: Supabase SDK (@supabase/ssr, @supabase/supabase-js)
- Used by: All layers that need database/auth
- Purpose: Static question pools, scenarios, class definitions, educational data
- Location: `data/`
- Contains: Session 1 core questions, adaptive question pool, class definitions, destinations, strength categories, MBTI descriptors
- Depends on: Type definitions
- Used by: Session pages, character creation, result displays
## Data Flow
- **Client-side transient:** Quest responses, current question index, discovery mode flag (in `useQuestState`)
- **Client-side cached:** All computed scores (RIASEC, MI, MBTI, Values, strengths) in `useScores`
- **Server-persisted:** Student record, assessment_scores table, session_responses table, achievements
- **Checkpoint pattern:** `persistCheckpoint()` writes snapshots at "riasec" (lightweight), "full" (complete), or "final" (end + badge)
## Key Abstractions
- Purpose: Represents a single answer to a question
- Examples: `{ question_id: "s1-warmup-01", response_value: 2, response_label: "Read, research, or learn", framework: "multi", ... }`
- Pattern: Immutable data object passed through event handlers
- Purpose: Definition of a question with options, framework signals, and metadata
- Examples: Warm-up multiple choice, RIASEC Likert scale, ipsative forced choice
- Pattern: Loaded from static data files, cached in memory, not persisted per-session
- Purpose: Groups questions into phases: warmup, riasec, riasec_mi, mbti_values, selfmap, reveal, confirmatory
- Pattern: State machine progression in `useQuestState`
- RIASEC: 6-type occupational interest (Realistic, Investigative, Artistic, Social, Enterprising, Conventional)
- MI (Multiple Intelligences): 8 dimensions (linguistic, logical, spatial, musical, bodily, interpersonal, intrapersonal, naturalistic)
- MBTI: 4 dichotomies (EI, SN, TF, JP) with emerging type detection
- Values: 5 spectrum dimensions (security/adventure, income/impact, prestige/fulfillment, structure/flexibility, solo/team)
- Purpose: Derived from RIASEC scores to group students into archetypes
- Pattern: deriveClassLabel() produces "MAKER-INVESTIGATOR", "SEEKER", "EXPLORER", etc.
- Used by: Character avatars, themed narration, results display
## Entry Points
- Location: `app/page.tsx`
- Triggers: User visits root URL
- Responsibilities: Check session state, show intro carousel or welcome screen, route to character/session
- Location: `app/quest/character/page.tsx`
- Triggers: User has no student record yet
- Responsibilities: Gather tone, avatar, demographics, destinations, curiosities; create student in DB
- Location: `app/quest/session/[id]/page.tsx`
- Triggers: Student clicks "Start Quest" or "Continue Quest"
- Responsibilities: Load session questions, manage block progression, persist checkpoints
- Location: `app/quest/dashboard/page.tsx`
- Triggers: Student completes session and views results
- Responsibilities: Display computed scores, charts, achievements, generated insights
- Location: `app/facilitator/`
- Triggers: Facilitator user role (role-based access controlled)
- Responsibilities: View student progress, manage cohorts, access reports
- Location: `app/api/report/route.ts`
- Triggers: Student requests report export
- Responsibilities: Aggregate scores, call Claude API for narrative, generate document
## Error Handling
- **Network errors:** Try-catch blocks, retry with exponential backoff (1s, 2s, 4s) in `persistCheckpoint()`
- **Persistence failures:** Flag `persistence_failed` in quest state; show toast warning; allow continue but mark for manual sync
- **Auth errors:** Redirect to login on 401; maintain session via middleware
- **Validation errors:** Client-side validation on character form fields; disable submit if invalid
- **Missing data:** Fallback to default values (e.g., default class "Wanderer" if avatar_class not found)
## Cross-Cutting Concerns
- Client-side: Form validation in character creation (name, age, education, selections)
- Type safety: Full TypeScript with explicit types for Student, Question, ClientResponse, ScoreState
- Provider: Supabase Auth (email/password, social providers)
- Session storage: HTTP-only cookies managed by Supabase SSR
- Refresh: Automatic via middleware on every request
- Provider: `ThemeProvider` in root layout
- Method: CSS custom properties (--cq-primary, --cq-bg-card, etc.)
- Dynamic class theme: Selected during character creation, stored in `data-theme` attribute
- Fallback: "purple-teal" theme
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
