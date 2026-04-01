# Codebase Structure

**Analysis Date:** 2026-04-01

## Directory Layout

```
career-quest/
├── app/                         # Next.js App Router (main application)
│   ├── layout.tsx               # Root layout, ThemeProvider, global styles
│   ├── page.tsx                 # Landing page (session check, intro carousel)
│   ├── globals.css              # Root CSS variables for theme system
│   ├── api/                     # API route handlers (server-only)
│   │   ├── ask/                 # Freeform Q&A with Claude (Phase 3 placeholder)
│   │   ├── career-analysis/     # Generate career insights from scores
│   │   ├── programme-match/     # Match student to programs/courses
│   │   ├── report/              # Generate comprehensive report
│   │   └── roadmap/             # Generate personalized learning roadmap
│   ├── quest/                   # Quest flow pages
│   │   ├── layout.tsx           # Quest header/layout wrapper
│   │   ├── character/page.tsx   # Character creation (tone, avatar, demographics)
│   │   ├── session/[id]/page.tsx # Main quest session (questions, scoring, progression)
│   │   ├── dashboard/page.tsx   # Results dashboard (scores, charts, badges)
│   │   └── report/page.tsx      # Report view/export
│   └── facilitator/             # Facilitator portal (role-based)
│       ├── layout.tsx           # Facilitator wrapper
│       ├── page.tsx             # Facilitator dashboard
│       └── student/[id]/page.tsx # Student progress view
│
├── components/                  # React components (UI building blocks)
│   ├── ui/                      # Design system components
│   │   ├── theme-provider.tsx   # Theme context + CSS variable application
│   │   └── xp-bar.tsx           # XP/progress bar display
│   ├── character/               # Character creation components
│   │   ├── avatar-select.tsx    # Class selection UI
│   │   ├── education-cards.tsx  # Education system picker
│   │   ├── destination-picker.tsx # Career destination multi-select
│   │   ├── curiosities-picker.tsx # Interest category multi-select
│   │   └── tone-toggle.tsx      # Quest vs Explorer mode toggle
│   ├── quest/                   # Quest session components
│   │   ├── question-card.tsx    # Question display wrapper
│   │   ├── likert-slider.tsx    # 5-point scale input
│   │   ├── spectrum-slider.tsx  # Spectrum/range input
│   │   ├── ipsative-picker.tsx  # Forced choice / rank-order picker
│   │   ├── option-grid.tsx      # Multiple choice button grid
│   │   ├── progress-bar.tsx     # Block + question progress indicator
│   │   ├── block-transition.tsx # Between-block animated transition + narration
│   │   ├── discovery-mode-prompt.tsx # Mid-quiz prompt for neutral responses
│   │   ├── engagement-checkpoint.tsx # Check-in prompt
│   │   └── reveal-sequence.tsx  # Score reveal animation sequence
│   ├── selfmap/                 # Self-mapping capture
│   │   └── self-map-capture.tsx # Clarity + strengths + curiosities picker
│   ├── charts/                  # Recharts visualizations
│   │   ├── riasec-bars.tsx      # Horizontal bar chart for RIASEC scores
│   │   ├── mi-preview-bars.tsx  # MI dimension preview bars
│   │   └── emerging-type.tsx    # MBTI type indicator visualization
│   └── badges/                  # Achievement badge components
│       └── badge-display.tsx    # Badge render + unlock animation
│
├── lib/                         # Shared utilities and types
│   ├── types/                   # TypeScript type definitions
│   │   ├── student.ts           # Student, SelfMap, FamilyContext, Facilitator types
│   │   ├── quest.ts             # Question, ClientResponse, SessionResponse types
│   │   ├── assessment.ts        # Assessment result types
│   │   └── career.ts            # Career, program, recommendation types
│   ├── supabase/                # Supabase client/server abstraction
│   │   ├── client.ts            # Browser client factory
│   │   ├── server.ts            # Server client factory
│   │   └── middleware.ts        # Session refresh middleware
│   ├── scoring/                 # Assessment scoring algorithms
│   │   ├── riasec.ts            # RIASEC normalization, class labeling
│   │   ├── mi.ts                # Multiple Intelligences aggregation
│   │   ├── mbti.ts              # MBTI indicator calculation
│   │   ├── values.ts            # Values spectrum calculation
│   │   ├── strengths.ts         # Strength extraction from signals
│   │   ├── adaptive.ts          # Adaptive question selection logic
│   │   └── __tests__/           # Scoring algorithm tests (vitest)
│   └── theme.ts                 # Class definitions, theme maps, narration
│
├── hooks/                       # Custom React hooks
│   ├── use-quest-state.ts       # Quest progression state (block, index, responses)
│   └── use-scores.ts            # Score computation state (RIASEC, MI, MBTI, Values)
│
├── providers/                   # React context providers
│   └── quest-provider.tsx       # QuestContext: merges quest + score state, persistence
│
├── data/                        # Static data files
│   ├── questions/               # Question definitions by session
│   │   ├── session-1-core.ts    # 50+ core questions (warmup, RIASEC, MI, MBTI, values, selfmap)
│   │   └── session-1-adaptive.ts # 30+ adaptive questions (contextual follow-ups)
│   ├── scenarios/               # Career scenario descriptions
│   │   └── index.ts             # Scenario data (morning/afternoon activities, RIASEC mapping)
│   ├── classes.ts               # Avatar class definitions (Wanderer, Seeker, etc.)
│   ├── destinations.ts          # Career pathway categories
│   ├── education-systems.ts     # Education system options (UK, IB, US, etc.)
│   ├── strength-categories.ts   # Strength signal categories
│   ├── mbti-descriptors.ts      # MBTI type narrative descriptions
│   └── badges.ts                # Achievement/badge definitions
│
├── public/                      # Static assets
│   └── [images, icons, fonts]
│
├── supabase/                    # Supabase config + migrations
│   ├── config.toml              # Supabase project settings
│   └── migrations/              # SQL migrations (schema, RLS)
│
├── .planning/                   # GSD planning artifacts
│   └── codebase/                # This analysis output
│
├── middleware.ts                # Next.js middleware (session refresh)
├── next.config.ts               # Next.js configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies (React 19, Next 16, Tailwind, Framer Motion, Recharts)
└── tailwind.config.ts           # Tailwind CSS configuration
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router routes and pages
- Contains: Page components (.tsx), API route handlers, layout wrappers
- Key files: `page.tsx` (root), `api/*/route.ts` (endpoints)

**`components/`:**
- Purpose: Reusable React components organized by feature area
- Contains: UI building blocks, form inputs, data visualizations
- Key files: Theme provider, question input types, result charts

**`lib/`:**
- Purpose: Shared utilities, types, algorithms, client factories
- Contains: TypeScript types, Supabase abstraction, scoring formulas
- Key files: `types/*.ts` (contracts), `scoring/*.ts` (algorithms), `supabase/*.ts` (data access)

**`hooks/`:**
- Purpose: Custom React hooks for state management
- Contains: Client-side state machines (quest progression, score computation)
- Key files: `use-quest-state.ts`, `use-scores.ts`

**`providers/`:**
- Purpose: React context providers for cross-component state sharing
- Contains: QuestContext that combines quest + score state, persistence actions
- Key files: `quest-provider.tsx`

**`data/`:**
- Purpose: Static, non-computed data (questions, scenarios, definitions)
- Contains: Question pools, avatar definitions, destination catalogs
- Key files: `questions/session-1-core.ts` (main question bank), `classes.ts` (avatars)

**`supabase/`:**
- Purpose: Database schema and configuration
- Contains: SQL migrations, RLS policies, table definitions
- Key files: `migrations/` directory with numbered .sql files

## Key File Locations

**Entry Points:**

- `app/layout.tsx`: Root layout wrapping all pages with ThemeProvider, metadata, global styles
- `app/page.tsx`: Landing page handling session detection and routing
- `app/quest/session/[id]/page.tsx`: Main quest progression engine
- `app/api/*/route.ts`: Serverless function handlers for async operations

**Configuration:**

- `next.config.ts`: Next.js build and runtime config
- `tsconfig.json`: TypeScript compiler settings
- `tailwind.config.ts`: Tailwind CSS design tokens
- `middleware.ts`: Next.js request middleware (session refresh)

**Core Logic:**

- `lib/scoring/riasec.ts`: RIASEC normalization, acquiescence detection, class labeling
- `lib/scoring/mi.ts`: MI dimension aggregation from framework signals
- `hooks/use-quest-state.ts`: Quest block progression, response collection, discovery mode trigger
- `hooks/use-scores.ts`: Real-time score calculation and snapshot management
- `providers/quest-provider.tsx`: Context wrapper orchestrating state + persistence

**Testing:**

- `lib/scoring/__tests__/*.test.ts`: Unit tests for scoring algorithms (vitest)

## Naming Conventions

**Files:**

- Pages: `page.tsx` (Next.js convention)
- Components: PascalCase (e.g., `AvatarSelect.tsx`, `QuestionCard.tsx`)
- Hooks: camelCase with `use-` prefix (e.g., `use-quest-state.ts`)
- Utils/types: camelCase or kebab-case (e.g., `riasec.ts`, `client-response.ts`)
- API routes: kebab-case (e.g., `ask/`, `career-analysis/`)
- Layout components: `layout.tsx` (Next.js convention)

**Directories:**

- Feature areas: lowercase kebab-case (e.g., `quest/`, `character/`, `selfmap/`)
- Utility dirs: lowercase (e.g., `lib/`, `hooks/`, `data/`)
- Component categories: lowercase (e.g., `components/ui/`, `components/charts/`)

## Where to Add New Code

**New Feature (e.g., New Assessment Type):**

- **Question data:** `data/questions/session-1-core.ts` or new session file
- **Scoring logic:** New file in `lib/scoring/` (e.g., `lib/scoring/new-framework.ts`)
- **Hook integration:** Update `hooks/use-scores.ts` to call new scorer
- **Display:** New chart component in `components/charts/`
- **Tests:** `lib/scoring/__tests__/new-framework.test.ts`

**New UI Component:**

- **Location:** `components/{feature}/` where feature matches its purpose
- **Pattern:** Functional component with TypeScript props, CSS classes using theme variables
- **Example:** Add `components/quest/confidence-slider.tsx` for a new question type
- **Usage:** Import in `app/quest/session/[id]/page.tsx` and wire to question rendering

**New API Endpoint:**

- **Location:** `app/api/{endpoint}/route.ts`
- **Pattern:** Use Supabase server client from `lib/supabase/server.ts`
- **Auth:** Check `supabase.auth.getUser()` and return 401 if unauthorized
- **Error handling:** Wrap async operations in try-catch, return appropriate HTTP status
- **Example:** `app/api/insights/route.ts` for new insight generation

**New Page/Route:**

- **Location:** `app/{feature}/page.tsx` or `app/{feature}/[id]/page.tsx`
- **Pattern:** Use `use client` for interactivity, can be server component for data fetching
- **Layout:** Wrap with layout.tsx in same directory if shared header/footer needed
- **Example:** `app/quest/gallery/page.tsx` for new gallery view

**Utility Functions:**

- **Shared helpers:** `lib/utils/` (not yet created; add if needed)
- **Type-specific:** Place near types (e.g., converter in `lib/types/`)
- **Algorithm:** `lib/scoring/` for assessment-related, generic in `lib/utils/`

**Database Schema Changes:**

- **Location:** `supabase/migrations/{timestamp}_{description}.sql`
- **Pattern:** Include CREATE TABLE, ALTER TABLE, RLS policies
- **Naming:** Use snake_case for columns, match TypeScript types in `lib/types/`

**Tests:**

- **Scoring tests:** `lib/scoring/__tests__/{module}.test.ts`
- **Run command:** `npm run test` or `npm run test:watch`
- **Pattern:** Use vitest, follow existing test structure

## Special Directories

**`app/api/`:**
- Purpose: Server-only API handlers (edge runtime)
- Generated: No
- Committed: Yes (source code)
- Pattern: Each endpoint is a subdirectory with `route.ts` file

**`.planning/`:**
- Purpose: GSD (Getting Stuff Done) planning artifacts and codebase analysis
- Generated: Yes (by GSD commands)
- Committed: Yes (historical planning record)

**`supabase/migrations/`:**
- Purpose: Version-controlled database schema changes
- Generated: No (manually created)
- Committed: Yes
- Pattern: Numbered SQL files applied in order

**`.next/`:**
- Purpose: Next.js build output directory
- Generated: Yes
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-04-01*
