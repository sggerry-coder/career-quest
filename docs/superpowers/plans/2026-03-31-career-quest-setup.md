# Career Quest Project Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Career Quest Next.js project with Supabase integration, auth, database schema, API route stubs, and Vercel deployment readiness.

**Architecture:** Next.js 15 App Router with Supabase for DB/auth, Claude API via edge functions, deployed on Vercel via GitHub auto-deploy. All development happens via push-to-deploy (no local dev server).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, Supabase (@supabase/supabase-js, @supabase/ssr), @anthropic-ai/sdk, Framer Motion 11, Recharts 2

---

## File Map

### Created by `create-next-app` (Task 1)
- `app/layout.tsx` — root layout (will be modified)
- `app/page.tsx` — landing page (will be modified)
- `app/globals.css` — Tailwind imports (will be modified)
- `tailwind.config.ts` — Tailwind config
- `tsconfig.json` — TypeScript config
- `next.config.ts` — Next.js config
- `package.json` — dependencies
- `public/` — static assets
- `.gitignore` — git ignores

### Created manually
- `.env.example` — env var documentation
- `middleware.ts` — Next.js auth middleware
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server Supabase client
- `lib/supabase/middleware.ts` — auth refresh helper
- `lib/types/student.ts` — student & academic types
- `lib/types/assessment.ts` — score & framework types
- `lib/types/quest.ts` — session, question, response types
- `lib/types/career.ts` — career direction & programme types
- `app/quest/layout.tsx` — quest shell layout
- `app/quest/character/page.tsx` — character creation placeholder
- `app/quest/session/[id]/page.tsx` — dynamic session placeholder
- `app/quest/dashboard/page.tsx` — dashboard placeholder
- `app/quest/report/page.tsx` — report placeholder
- `app/facilitator/layout.tsx` — facilitator shell layout
- `app/facilitator/page.tsx` — facilitator dashboard placeholder
- `app/facilitator/student/[id]/page.tsx` — student view placeholder
- `app/api/career-analysis/route.ts` — Claude career deep-dive stub
- `app/api/programme-match/route.ts` — Claude uni matching stub
- `app/api/roadmap/route.ts` — Claude prep roadmap stub
- `app/api/report/route.ts` — Claude report generation stub
- `app/api/ask/route.ts` — Claude freeform Q&A stub
- `supabase/migrations/00001_initial_schema.sql` — full database schema
- `data/badges.ts` — badge definitions
- `data/questions/.gitkeep` — question bank placeholder
- `data/scenarios/.gitkeep` — scenario content placeholder
- `components/ui/.gitkeep` — UI components placeholder
- `components/quest/.gitkeep` — quest components placeholder
- `components/charts/.gitkeep` — chart components placeholder
- `components/badges/.gitkeep` — badge components placeholder
- `lib/scoring/.gitkeep` — scoring logic placeholder
- `hooks/.gitkeep` — hooks placeholder
- `providers/.gitkeep` — providers placeholder

---

### Task 1: Initialize Next.js Project and Git Repo

**Files:**
- Create: Next.js project via `create-next-app` (generates all base files)
- Create: `.git/` via `git init`

- [ ] **Step 1: Move existing files temporarily**

The directory already has `career-quest-scope.md` and `docs/`. Move them out before scaffolding:

```bash
cd "/Users/gerrygan/Career Quest"
mkdir -p /tmp/career-quest-backup
mv career-quest-scope.md /tmp/career-quest-backup/
mv docs /tmp/career-quest-backup/
```

- [ ] **Step 2: Create Next.js project**

```bash
cd "/Users/gerrygan/Career Quest"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src=no --import-alias="@/*" --use-npm
```

When prompted, accept defaults. This creates the Next.js project in the current directory.

- [ ] **Step 3: Restore existing files**

```bash
mv /tmp/career-quest-backup/career-quest-scope.md "/Users/gerrygan/Career Quest/"
mv /tmp/career-quest-backup/docs "/Users/gerrygan/Career Quest/"
rmdir /tmp/career-quest-backup
```

- [ ] **Step 4: Verify project was created**

```bash
ls -la "/Users/gerrygan/Career Quest"
```

Expected: `app/`, `public/`, `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `node_modules/`, etc.

- [ ] **Step 5: Initialize git repo**

```bash
cd "/Users/gerrygan/Career Quest"
git init
```

- [ ] **Step 6: Create GitHub repo and push initial commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add -A
git commit -m "chore: scaffold Next.js 15 project with TypeScript and Tailwind"
gh repo create career-quest --public --source=. --push
```

- [ ] **Step 7: Verify GitHub repo exists**

```bash
gh repo view --web
```

Expected: Browser opens to the new GitHub repo with the initial commit.

---

### Task 2: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
cd "/Users/gerrygan/Career Quest"
npm install @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk framer-motion recharts
```

- [ ] **Step 2: Verify all dependencies are in package.json**

```bash
cat package.json | grep -E "supabase|anthropic|framer|recharts"
```

Expected: All 5 packages listed under `dependencies`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add package.json package-lock.json
git commit -m "chore: add Supabase, Anthropic, Framer Motion, Recharts dependencies"
```

---

### Task 3: Environment Variables and Config

**Files:**
- Create: `.env.example`
- Modify: `.gitignore` (verify `.env*.local` is ignored)
- Modify: `next.config.ts` (no changes needed if default is fine)

- [ ] **Step 1: Create .env.example**

Create file `.env.example`:

```
# Supabase (public — safe for client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Claude API (server-only — NEVER prefix with NEXT_PUBLIC_)
ANTHROPIC_API_KEY=
```

- [ ] **Step 2: Verify .gitignore excludes .env files**

Read `.gitignore` and confirm it contains:
```
.env*.local
```

If not present, add it. The default Next.js `.gitignore` includes this.

- [ ] **Step 3: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add .env.example .gitignore
git commit -m "chore: add environment variable template"
```

---

### Task 4: Supabase Client Utilities

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create file `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create server Supabase client**

Create file `lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create middleware Supabase helper**

Create file `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth session
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/supabase/
git commit -m "feat: add Supabase client utilities (browser, server, middleware)"
```

---

### Task 5: Next.js Middleware

**Files:**
- Create: `middleware.ts` (project root)

- [ ] **Step 1: Create middleware**

Create file `middleware.ts` (in project root, NOT inside `app/`):

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add middleware.ts
git commit -m "feat: add Next.js middleware for Supabase auth session refresh"
```

---

### Task 6: TypeScript Types

**Files:**
- Create: `lib/types/student.ts`
- Create: `lib/types/assessment.ts`
- Create: `lib/types/quest.ts`
- Create: `lib/types/career.ts`

- [ ] **Step 1: Create student types**

Create file `lib/types/student.ts`:

```typescript
export interface Student {
  id: string;
  name: string;
  age: number;
  education_system: string;
  preferred_country: string | null;
  preferred_universities: string[] | null;
  current_session: number;
  strong_subjects: string[] | null;
  weak_subjects: string[] | null;
  predicted_grades: Record<string, string> | null;
  study_confidence: number | null;
  grades_reflect_effort: boolean | null;
  facilitator_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FamilyContext {
  id: string;
  student_id: string;
  family_career_expectations: string | null;
  support_level: "very_supportive" | "some_expectations" | "strong_expectations" | null;
  financial_constraints: string | null;
  created_at: string;
}

export interface Facilitator {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Create assessment types**

Create file `lib/types/assessment.ts`:

```typescript
export interface RiasecScores {
  R: number;
  I: number;
  A: number;
  S: number;
  E: number;
  C: number;
}

export interface MiScores {
  linguistic: number;
  logical: number;
  spatial: number;
  musical: number;
  bodily: number;
  interpersonal: number;
  intrapersonal: number;
  naturalistic: number;
}

export interface MbtiIndicators {
  EI: number;
  SN: number;
  TF: number;
  JP: number;
}

export interface ValuesCompass {
  security_adventure: number;
  income_impact: number;
  prestige_fulfilment: number;
  structure_flexibility: number;
  solo_team: number;
}

export interface AssessmentScores {
  id: string;
  student_id: string;
  riasec_scores: RiasecScores;
  mi_scores: MiScores;
  mbti_indicators: MbtiIndicators;
  strengths: string[];
  values_compass: ValuesCompass;
  updated_at: string;
}
```

- [ ] **Step 3: Create quest types**

Create file `lib/types/quest.ts`:

```typescript
export type QuestionType = "multiple_choice" | "free_text" | "scenario" | "spectrum";

export interface QuestionOption {
  label: string;
  value: string;
  framework_signals?: Record<string, number>;
}

export interface Question {
  id: string;
  session_number: number;
  phase: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  framework_mapping: Record<string, string[]>;
  age_range: "13-14" | "15-16" | "17-18" | "all";
  follow_up_triggers: Record<string, unknown> | null;
}

export interface SessionResponse {
  id: string;
  student_id: string;
  session_number: number;
  question_id: string;
  question_text: string;
  response_text: string;
  framework_signals: Record<string, number>;
  created_at: string;
}

export interface Scenario {
  id: string;
  career_field: string;
  title: string;
  description: string;
  morning_activities: string;
  afternoon_activities: string;
  riasec_mapping: Record<string, number>;
}
```

- [ ] **Step 4: Create career types**

Create file `lib/types/career.ts`:

```typescript
export type CareerDirectionStatus = "candidate" | "selected" | "eliminated";

export interface CareerDirection {
  id: string;
  student_id: string;
  direction_name: string;
  status: CareerDirectionStatus;
  ai_analysis: CareerAnalysis | null;
  programmes: Programme[] | null;
  created_at: string;
}

export interface CareerAnalysis {
  summary: string;
  progression_timeline: string[];
  salary_range: { entry: string; mid: string; senior: string };
  growth_outlook: string;
  ai_risk: string;
  work_life_balance: number;
  stress_level: number;
  why_it_fits: string;
}

export interface Programme {
  university: string;
  programme_name: string;
  country: string;
  duration: string;
  entry_requirements: string;
  url: string | null;
}

export interface Achievement {
  id: string;
  student_id: string;
  badge_id: string;
  unlocked_at: string;
}
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/types/
git commit -m "feat: add TypeScript type definitions for all domain models"
```

---

### Task 7: Database Migration

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql`

- [ ] **Step 1: Create migration file**

Create file `supabase/migrations/00001_initial_schema.sql`:

```sql
-- Career Quest: Initial Schema
-- Run this in the Supabase SQL Editor

-- =============================================================================
-- TABLES
-- =============================================================================

-- Facilitators (created before students due to FK)
create table public.facilitators (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  organisation text,
  created_at timestamptz not null default now()
);

-- Students
create table public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age smallint not null,
  education_system text not null,
  preferred_country text,
  preferred_universities jsonb,
  current_session smallint not null default 0,
  strong_subjects jsonb,
  weak_subjects jsonb,
  predicted_grades jsonb,
  study_confidence smallint check (study_confidence between 1 and 5),
  grades_reflect_effort boolean,
  facilitator_id uuid references public.facilitators(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_students_facilitator on public.students(facilitator_id);

-- Assessment Scores (1:1 with students)
create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  riasec_scores jsonb not null default '{"R":0,"I":0,"A":0,"S":0,"E":0,"C":0}',
  mi_scores jsonb not null default '{"linguistic":0,"logical":0,"spatial":0,"musical":0,"bodily":0,"interpersonal":0,"intrapersonal":0,"naturalistic":0}',
  mbti_indicators jsonb not null default '{"EI":0,"SN":0,"TF":0,"JP":0}',
  strengths jsonb not null default '[]',
  values_compass jsonb not null default '{"security_adventure":0,"income_impact":0,"prestige_fulfilment":0,"structure_flexibility":0,"solo_team":0}',
  updated_at timestamptz not null default now()
);

-- Session Responses
create table public.session_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_number smallint not null,
  question_id text not null,
  question_text text not null,
  response_text text not null,
  framework_signals jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_session_responses_student_session
  on public.session_responses(student_id, session_number);

-- Family Context (1:1 with students, separate for privacy)
create table public.family_context (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  family_career_expectations text,
  support_level text check (support_level in ('very_supportive', 'some_expectations', 'strong_expectations')),
  financial_constraints text,
  created_at timestamptz not null default now()
);

-- Career Directions
create table public.career_directions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  direction_name text not null,
  status text not null default 'candidate' check (status in ('candidate', 'selected', 'eliminated')),
  ai_analysis jsonb,
  programmes jsonb,
  created_at timestamptz not null default now()
);

create index idx_career_directions_student on public.career_directions(student_id);

-- Achievements
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (student_id, badge_id)
);

create index idx_achievements_student on public.achievements(student_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger students_updated_at
  before update on public.students
  for each row execute function public.handle_updated_at();

create trigger assessment_scores_updated_at
  before update on public.assessment_scores
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.facilitators enable row level security;
alter table public.students enable row level security;
alter table public.assessment_scores enable row level security;
alter table public.session_responses enable row level security;
alter table public.family_context enable row level security;
alter table public.career_directions enable row level security;
alter table public.achievements enable row level security;

-- Facilitators: own data only
create policy "Facilitators can view own profile"
  on public.facilitators for select
  using (auth.uid() = id);

create policy "Facilitators can update own profile"
  on public.facilitators for update
  using (auth.uid() = id);

create policy "Facilitators can insert own profile"
  on public.facilitators for insert
  with check (auth.uid() = id);

-- Students: own data + facilitator can read linked students
create policy "Students can manage own profile"
  on public.students for all
  using (auth.uid() = id);

create policy "Facilitators can view linked students"
  on public.students for select
  using (facilitator_id = auth.uid());

-- Assessment Scores: own data + facilitator read
create policy "Students can manage own scores"
  on public.assessment_scores for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student scores"
  on public.assessment_scores for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Session Responses: own data + facilitator read
create policy "Students can manage own responses"
  on public.session_responses for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student responses"
  on public.session_responses for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Family Context: own data + facilitator read (only if linked)
create policy "Students can manage own family context"
  on public.family_context for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student family context"
  on public.family_context for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Career Directions: own data + facilitator read
create policy "Students can manage own career directions"
  on public.career_directions for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student career directions"
  on public.career_directions for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Achievements: own data + facilitator read
create policy "Students can manage own achievements"
  on public.achievements for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student achievements"
  on public.achievements for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add supabase/
git commit -m "feat: add database migration with full schema and RLS policies"
```

---

### Task 8: Page Route Placeholders

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `app/quest/layout.tsx`
- Create: `app/quest/character/page.tsx`
- Create: `app/quest/session/[id]/page.tsx`
- Create: `app/quest/dashboard/page.tsx`
- Create: `app/quest/report/page.tsx`
- Create: `app/facilitator/layout.tsx`
- Create: `app/facilitator/page.tsx`
- Create: `app/facilitator/student/[id]/page.tsx`

- [ ] **Step 1: Update root layout**

Replace the content of `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Career Quest",
  description: "Discover your career path through a gamified quest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Update landing page**

Replace the content of `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Career Quest</h1>
      <p className="text-lg text-gray-600 mb-8">
        Discover your career path through a gamified quest
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Create quest layout**

Create file `app/quest/layout.tsx`:

```tsx
export default function QuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <h2 className="text-lg font-semibold">Career Quest</h2>
      </header>
      <main className="mx-auto max-w-4xl p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create quest page placeholders**

Create file `app/quest/character/page.tsx`:

```tsx
export default function CharacterCreation() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Character Creation</h1>
      <p className="text-gray-600 mt-2">Create your quest profile</p>
    </div>
  );
}
```

Create file `app/quest/session/[id]/page.tsx`:

```tsx
export default async function Session({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold">Session {id}</h1>
      <p className="text-gray-600 mt-2">Quest session {id}</p>
    </div>
  );
}
```

Create file `app/quest/dashboard/page.tsx`:

```tsx
export default function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Profile Dashboard</h1>
      <p className="text-gray-600 mt-2">Your career quest profile</p>
    </div>
  );
}
```

Create file `app/quest/report/page.tsx`:

```tsx
export default function Report() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Career Report</h1>
      <p className="text-gray-600 mt-2">Your personalised career report</p>
    </div>
  );
}
```

- [ ] **Step 5: Create facilitator page placeholders**

Create file `app/facilitator/layout.tsx`:

```tsx
export default function FacilitatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <h2 className="text-lg font-semibold">Career Quest — Facilitator</h2>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
```

Create file `app/facilitator/page.tsx`:

```tsx
export default function FacilitatorDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Facilitator Dashboard</h1>
      <p className="text-gray-600 mt-2">Manage your students</p>
    </div>
  );
}
```

Create file `app/facilitator/student/[id]/page.tsx`:

```tsx
export default async function StudentView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold">Student Profile</h1>
      <p className="text-gray-600 mt-2">Viewing student {id}</p>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add app/
git commit -m "feat: add page route placeholders for quest and facilitator flows"
```

---

### Task 9: API Route Stubs

**Files:**
- Create: `app/api/career-analysis/route.ts`
- Create: `app/api/programme-match/route.ts`
- Create: `app/api/roadmap/route.ts`
- Create: `app/api/report/route.ts`
- Create: `app/api/ask/route.ts`

- [ ] **Step 1: Create career-analysis API route**

Create file `app/api/career-analysis/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement career analysis with Claude API (Phase 3)
  return NextResponse.json({ message: "Career analysis endpoint ready" });
}
```

- [ ] **Step 2: Create programme-match API route**

Create file `app/api/programme-match/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement programme matching with Claude API (Phase 3)
  return NextResponse.json({ message: "Programme match endpoint ready" });
}
```

- [ ] **Step 3: Create roadmap API route**

Create file `app/api/roadmap/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement roadmap generation with Claude API (Phase 4)
  return NextResponse.json({ message: "Roadmap endpoint ready" });
}
```

- [ ] **Step 4: Create report API route**

Create file `app/api/report/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Node.js runtime for PDF generation later
export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement report generation with Claude API (Phase 4)
  return NextResponse.json({ message: "Report endpoint ready" });
}
```

- [ ] **Step 5: Create ask API route**

Create file `app/api/ask/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Implement freeform Q&A with Claude API (Phase 3)
  return NextResponse.json({ message: "Ask endpoint ready" });
}
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add app/api/
git commit -m "feat: add API route stubs with auth checks for Claude endpoints"
```

---

### Task 10: Static Data and Directory Structure

**Files:**
- Create: `data/badges.ts`
- Create: `data/questions/.gitkeep`
- Create: `data/scenarios/.gitkeep`
- Create: `components/ui/.gitkeep`
- Create: `components/quest/.gitkeep`
- Create: `components/charts/.gitkeep`
- Create: `components/badges/.gitkeep`
- Create: `lib/scoring/.gitkeep`
- Create: `hooks/.gitkeep`
- Create: `providers/.gitkeep`

- [ ] **Step 1: Create badge definitions**

Create file `data/badges.ts`:

```typescript
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const badges: BadgeDefinition[] = [
  {
    id: "quest_started",
    name: "Quest Started",
    description: "Completed character creation",
    icon: "rocket",
  },
  {
    id: "self_discoverer",
    name: "Self-Discoverer",
    description: "Finished Session 1",
    icon: "magnifying-glass",
  },
  {
    id: "direction_finder",
    name: "Direction Finder",
    description: "Narrowed to 2-3 career fields",
    icon: "compass",
  },
  {
    id: "career_explorer",
    name: "Career Explorer",
    description: "Completed career deep-dives",
    icon: "map",
  },
  {
    id: "game_plan_ready",
    name: "Game Plan Ready",
    description: "Completed preparation roadmap",
    icon: "clipboard",
  },
  {
    id: "report_card",
    name: "Report Card",
    description: "Generated final career report",
    icon: "scroll",
  },
];
```

- [ ] **Step 2: Create placeholder directories**

```bash
cd "/Users/gerrygan/Career Quest"
mkdir -p data/questions data/scenarios components/ui components/quest components/charts components/badges lib/scoring hooks providers
touch data/questions/.gitkeep data/scenarios/.gitkeep components/ui/.gitkeep components/quest/.gitkeep components/charts/.gitkeep components/badges/.gitkeep lib/scoring/.gitkeep hooks/.gitkeep providers/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/gerrygan/Career Quest"
git add data/ components/ lib/scoring/ hooks/ providers/
git commit -m "feat: add badge definitions and project directory structure"
```

---

### Task 11: Run Migration in Supabase

**Files:** None (database operation)

- [ ] **Step 1: Copy migration SQL**

Open the Supabase dashboard at https://supabase.com/dashboard, navigate to the project, go to SQL Editor.

Copy the full content of `supabase/migrations/00001_initial_schema.sql` and paste it into the SQL Editor.

- [ ] **Step 2: Run the migration**

Click "Run" in the Supabase SQL Editor.

Expected: All tables created, RLS enabled, policies applied. No errors.

- [ ] **Step 3: Enable anonymous sign-ins**

In Supabase dashboard, go to Authentication → Providers → Anonymous Sign-Ins → Enable.

This allows students to start the quest without creating an account.

- [ ] **Step 4: Verify tables exist**

In Supabase dashboard, go to Table Editor. Verify these 7 tables exist:
- `facilitators`
- `students`
- `assessment_scores`
- `session_responses`
- `family_context`
- `career_directions`
- `achievements`

---

### Task 12: Set Up Vercel and Environment Variables

**Files:** None (Vercel dashboard operation)

- [ ] **Step 1: Connect GitHub repo to Vercel**

```bash
cd "/Users/gerrygan/Career Quest"
vercel link
```

Follow the prompts to connect the project to Vercel. Select "Create new project" and link it to the `career-quest` GitHub repo.

- [ ] **Step 2: Set environment variables in Vercel**

```bash
cd "/Users/gerrygan/Career Quest"
echo "https://dwisxkzywrpcbhosrytz.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development
echo "sb_publishable_cg2YmLw_MqPTSlY2Zm7IPw_TQ9AtGru" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development
```

For the Claude API key, the user must provide it:

```bash
vercel env add ANTHROPIC_API_KEY production preview development
```

Enter the API key when prompted. This is server-only (Vercel does not expose non-`NEXT_PUBLIC_` vars to the client).

- [ ] **Step 3: Deploy**

```bash
cd "/Users/gerrygan/Career Quest"
git push origin main
```

Vercel auto-deploys from the GitHub push. Alternatively:

```bash
vercel --prod
```

- [ ] **Step 4: Verify deployment**

```bash
vercel ls
```

Expected: The deployment is listed as "Ready". Open the production URL in a browser. You should see the "Career Quest" landing page.

- [ ] **Step 5: Verify all routes respond**

Visit these URLs on the deployed site:
- `/` — Landing page
- `/quest/character` — Character creation placeholder
- `/quest/session/1` — Session 1 placeholder
- `/quest/dashboard` — Dashboard placeholder
- `/quest/report` — Report placeholder
- `/facilitator` — Facilitator dashboard placeholder

All should render their placeholder content without errors.

---

### Task 13: Final Push and Verify

**Files:** None

- [ ] **Step 1: Push all commits to GitHub**

```bash
cd "/Users/gerrygan/Career Quest"
git push origin main
```

- [ ] **Step 2: Verify GitHub repo has all files**

```bash
gh repo view --web
```

Check that the repo contains:
- `app/` with all route files
- `lib/` with supabase clients and types
- `supabase/migrations/` with the schema
- `data/` with badges
- `middleware.ts`
- `.env.example`

- [ ] **Step 3: Verify Vercel deployment is live**

Open the Vercel production URL. Confirm the landing page loads. Check the browser console for any errors.

Setup is complete. The project is ready for Phase 1 (Core Quest MVP) implementation.
