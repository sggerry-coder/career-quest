# External Integrations

**Analysis Date:** 2026-04-01

## APIs & External Services

**Claude AI:**
- Service: Anthropic Claude API
- What it's used for: Career analysis, roadmap generation, report creation, and freeform Q&A (planned for Phases 3-4)
- SDK/Client: @anthropic-ai/sdk 0.80.0
- Auth: `ANTHROPIC_API_KEY` environment variable (server-only, never exposed to client)
- Current Status: SDK installed but not yet integrated in API endpoints
  - `app/api/ask/route.ts` - TODO: Implement freeform Q&A with Claude API (Phase 3)
  - `app/api/career-analysis/route.ts` - TODO: Implement career analysis with Claude API (Phase 3)
  - `app/api/roadmap/route.ts` - TODO: Implement roadmap generation with Claude API (Phase 4)
  - `app/api/report/route.ts` - TODO: Implement report generation with Claude API (Phase 4)

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Client: @supabase/supabase-js 2.101.0
  - Client Initialization:
    - Browser: `lib/supabase/client.ts` uses `createBrowserClient()`
    - Server: `lib/supabase/server.ts` uses `createServerClient()` with cookie-based session management
  - Schema Location: `supabase/migrations/`
    - `00001_initial_schema.sql` - Core tables: facilitators, students, assessment_scores, session_responses, family_context, career_directions, achievements
    - `00002_phase1_additions.sql` - Student profile enhancements: avatar_class, tone, self_map, preferred_destinations
  - Key Tables:
    - `public.facilitators` - User profiles for educators (auth.users FK)
    - `public.students` - Student profiles with education context and current_session tracking
    - `public.assessment_scores` - 1:1 mapping with students storing RIASEC, MI, MBTI, strengths, values compass
    - `public.session_responses` - Session-by-session question responses and framework signals
    - `public.family_context` - Family background, support level, financial constraints (privacy-separated)
    - `public.career_directions` - Candidate/selected/eliminated career paths with AI analysis
    - `public.achievements` - Badge unlocks with timestamps

**File Storage:**
- Local filesystem only (no external file storage service detected)
- PDF report generation planned for future phases

**Caching:**
- Not implemented (no caching service detected)

## Authentication & Identity

**Auth Provider:**
- Supabase Authentication (built-in PostgreSQL + JWT)
  - Implementation: Supabase Auth with session cookies
  - Session Management:
    - Middleware: `middleware.ts` uses `updateSession()` from `lib/supabase/middleware.ts`
    - Cookie Handling: `lib/supabase/middleware.ts` refreshes auth session via `supabase.auth.getUser()`
    - Logout: Managed by Supabase auth (no custom logout implementation detected)
  - User Lookup: All authenticated endpoints verify `supabase.auth.getUser()` returns valid user
  - Authorization: User ID (UUID) used as primary key in facilitators and students tables

## Monitoring & Observability

**Error Tracking:**
- Not implemented (no error tracking service detected)

**Logs:**
- Browser Console (client-side): Standard `console.*` logging
- Server Logs: Next.js runtime logs (Vercel or local)
- No centralized logging service detected

## CI/CD & Deployment

**Hosting:**
- Vercel (evidenced by `.vercel/project.json`)
- Next.js optimized deployment with automatic builds and edge function support

**CI Pipeline:**
- Not explicitly configured (no GitHub Actions, GitLab CI, or CircleCI detected)
- Vercel automatic deployments from git (inferred from project structure)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous API key
- `ANTHROPIC_API_KEY` - Claude API key (server-only)

**Secrets location:**
- `.env` file (git-ignored, not committed)
- `.env.example` documents the schema (safe reference without secrets)
- Local development: `.env.local` or `.env` in project root
- Vercel: Environment variables stored in project dashboard

## Webhooks & Callbacks

**Incoming:**
- Not detected (no webhook endpoints in `app/api/`)

**Outgoing:**
- Not detected (no external API calls to services with callbacks)

## Authentication Flow & Security

**Client Authentication:**
1. User authenticates via Supabase Auth UI (not built in-app, external redirect)
2. Supabase returns session JWT stored in HTTP-only cookie
3. Middleware (`middleware.ts`) intercepts all requests to refresh session
4. Server endpoints validate user via `supabase.auth.getUser()`
5. Return 401 Unauthorized if user not authenticated

**API Security:**
- Edge Runtime used for lightweight auth checks (`app/api/ask/route.ts`)
- Node.js Runtime used for complex operations (`app/api/report/route.ts`)
- All API endpoints require valid authentication before processing
- Supabase RLS (Row-Level Security) not explicitly configured but available

---

*Integration audit: 2026-04-01*
