# Career Quest — Project Setup Design

## Overview

Gamified career exploration web app for high school students (13-18). This spec covers the initial project scaffolding: Next.js project, Supabase integration, Vercel deployment, auth, database schema, and API route structure.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v3
- **Database & Auth:** Supabase (existing paid project)
- **AI:** Anthropic Claude API via `@anthropic-ai/sdk`
- **Animations:** Framer Motion v11
- **Charts:** Recharts v2
- **Deployment:** Vercel (auto-deploy from GitHub)
- **Development flow:** Push to GitHub → Vercel auto-builds → preview/production URLs for testing

## Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0",
    "@anthropic-ai/sdk": "^0",
    "framer-motion": "^11",
    "recharts": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

No state management library — React context + hooks is sufficient.

## Project Structure

```
career-quest/
├── app/
│   ├── layout.tsx                  # Root layout (fonts, metadata, providers)
│   ├── page.tsx                    # Landing page
│   ├── globals.css                 # Tailwind imports
│   │
│   ├── quest/
│   │   ├── layout.tsx              # Quest shell (progress bar, session nav)
│   │   ├── character/page.tsx      # Character creation
│   │   ├── session/[id]/page.tsx   # Dynamic route for sessions 1-4
│   │   ├── dashboard/page.tsx      # Live profile dashboard
│   │   └── report/page.tsx         # Final report view
│   │
│   ├── facilitator/
│   │   ├── layout.tsx              # Facilitator shell
│   │   ├── page.tsx                # Facilitator dashboard
│   │   └── student/[id]/page.tsx   # Individual student view
│   │
│   └── api/
│       ├── career-analysis/route.ts   # Claude: career deep-dives
│       ├── programme-match/route.ts   # Claude: uni matching
│       ├── roadmap/route.ts           # Claude: prep roadmap
│       ├── report/route.ts            # Claude: report generation
│       └── ask/route.ts              # Claude: freeform career Q&A
│
├── components/
│   ├── ui/                         # Generic UI (buttons, cards, modals)
│   ├── quest/                      # Question cards, option cards, progress bar
│   ├── charts/                     # RIASEC hexagon, MI bars, MBTI sliders, Values compass
│   └── badges/                     # Badge gallery, badge card
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client (RSC / API routes)
│   │   └── middleware.ts           # Auth session refresh helper
│   ├── scoring/
│   │   ├── riasec.ts               # RIASEC scoring logic
│   │   ├── mi.ts                   # Multiple Intelligences scoring
│   │   ├── mbti.ts                 # MBTI spectrum scoring
│   │   └── values.ts               # Values Compass scoring
│   └── types/
│       ├── student.ts              # Student, academic, family types
│       ├── assessment.ts           # Score types, framework types
│       ├── quest.ts                # Session, question, response types
│       └── career.ts               # Career direction, programme types
│
├── hooks/
│   ├── use-quest-state.ts          # Session progress & navigation
│   ├── use-scores.ts               # Real-time score computation
│   └── use-supabase.ts             # Supabase query helpers
│
├── providers/
│   └── quest-provider.tsx          # React context for quest state
│
├── data/
│   ├── questions/                  # Question bank JSON per session
│   ├── scenarios/                  # Day-in-the-life scenario content
│   └── badges.ts                   # Badge definitions
│
├── supabase/
│   └── migrations/
│       └── 00001_initial_schema.sql
│
├── public/                         # Static assets, OG images
├── middleware.ts                    # Next.js middleware (auth refresh, route protection)
├── .env.example                    # Documents required env vars
├── .gitignore
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── package.json
```

## Database Schema

7 tables. RLS enabled on all tables.

### students

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users(id) |
| name | text | |
| age | smallint | |
| education_system | text | |
| preferred_country | text | nullable |
| preferred_universities | jsonb | nullable, array |
| current_session | smallint | default 0 |
| strong_subjects | jsonb | nullable, array |
| weak_subjects | jsonb | nullable, array |
| predicted_grades | jsonb | nullable |
| study_confidence | smallint | nullable, 1-5 |
| grades_reflect_effort | boolean | nullable |
| facilitator_id | uuid | nullable, FK to facilitators |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### assessment_scores

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK to students, UNIQUE |
| riasec_scores | jsonb | {R: 0, I: 0, A: 0, S: 0, E: 0, C: 0} |
| mi_scores | jsonb | {linguistic: 0, logical: 0, spatial: 0, ...} |
| mbti_indicators | jsonb | {EI: 0, SN: 0, TF: 0, JP: 0} |
| strengths | jsonb | array |
| values_compass | jsonb | {security_adventure: 0, income_impact: 0, ...} |
| updated_at | timestamptz | default now() |

### session_responses

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK to students |
| session_number | smallint | |
| question_id | text | matches question data file IDs |
| question_text | text | |
| response_text | text | |
| framework_signals | jsonb | which frameworks this answer informed |
| created_at | timestamptz | default now() |

Index on `(student_id, session_number)`.

### family_context

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK to students, UNIQUE |
| family_career_expectations | text | nullable |
| support_level | text | nullable, enum-like: very_supportive / some_expectations / strong_expectations |
| financial_constraints | text | nullable |
| created_at | timestamptz | default now() |

All fields nullable — this section is optional and sensitive. Separate table for granular RLS.

### career_directions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK to students |
| direction_name | text | |
| status | text | candidate / selected / eliminated |
| ai_analysis | jsonb | nullable, cached Claude response |
| programmes | jsonb | nullable, cached programme recommendations |
| created_at | timestamptz | default now() |

Index on `(student_id)`.

### achievements

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| student_id | uuid | FK to students |
| badge_id | text | |
| unlocked_at | timestamptz | default now() |

UNIQUE constraint on `(student_id, badge_id)`. Index on `(student_id)`.

### facilitators

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users(id) |
| name | text | |
| email | text | |
| organisation | text | nullable |
| created_at | timestamptz | default now() |

### RLS Policies

- **students:** `auth.uid() = id` for all operations; facilitators can SELECT their linked students via `facilitator_id = auth.uid()`
- **assessment_scores, session_responses, career_directions, achievements:** `student_id = auth.uid()` for all operations; facilitators can SELECT linked students' data
- **family_context:** `student_id = auth.uid()` for all operations; facilitators can SELECT only if student has a matching `facilitator_id`
- **facilitators:** `auth.uid() = id` for all operations

## Auth Design

### Anonymous Sessions (Lazy)

- Anonymous auth user created only when student clicks "Start Quest" — not on page load
- Prevents orphaned auth users from casual visitors
- Session persists via Supabase auth cookies

### Email Linking ("Save My Progress")

- Soft nudge prompts at end of Session 1 and Session 2
- Uses `supabase.auth.updateUser({ email })` to convert anonymous → email user
- Future logins via fresh magic link or OTP on demand — no stored links

### Facilitator Auth

- Email + password sign-up via `/facilitator`
- Verified against `facilitators` table via RLS
- Separate flow from student auth

### Cookie Security

- Verify `@supabase/ssr` defaults: `HttpOnly`, `Secure` (HTTPS), `SameSite=Lax`

## Middleware

### Next.js Middleware (`middleware.ts`)

- Refreshes Supabase auth session cookies
- Route matcher excludes static assets:
  ```ts
  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)']
  }
  ```
- Facilitator routes (`/facilitator/*`) verify user exists in `facilitators` table

## API Routes

All API routes under `app/api/`:

| Route | Purpose | Runtime |
|-------|---------|---------|
| `/api/career-analysis` | Career deep-dives | Edge |
| `/api/programme-match` | University matching with web search | Edge |
| `/api/roadmap` | Preparation roadmap | Edge |
| `/api/report` | Final report generation | Node.js (PDF later) |
| `/api/ask` | Freeform career Q&A | Edge |

### API Route Security

- Every route verifies valid Supabase session before processing
- Every route verifies the user has a corresponding student profile
- `ANTHROPIC_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix)
- Per-user rate limiting: max 10 Claude API calls per student per hour (mechanism chosen at implementation time — e.g., Supabase counter or in-memory store)

## Vercel Deployment

- GitHub repo connected to Vercel for auto-deployments
- Framework preset: Next.js (auto-detected)
- Every push to `main` deploys to production
- Every PR gets a preview URL for testing

### Environment Variables (Vercel Dashboard)

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Publishable key |
| `ANTHROPIC_API_KEY` | Server only | Never NEXT_PUBLIC_ |

### `.env.example` (documentation only)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Claude API (server-only)
ANTHROPIC_API_KEY=
```

## What This Spec Does NOT Cover

- UI component implementation (Phase 1 work)
- Question bank content
- Scoring algorithm details
- Claude prompt engineering
- PDF generation implementation
- Local development tooling (developing via Vercel deployments)
