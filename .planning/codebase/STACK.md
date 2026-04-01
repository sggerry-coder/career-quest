# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- TypeScript 5.x - All application code, types, and build configuration
- JavaScript (ES2017 target) - Runtime compatibility target

**Secondary:**
- SQL - Supabase database migrations in `supabase/migrations/`
- CSS - Tailwind utility styles in `app/globals.css`

## Runtime

**Environment:**
- Node.js (version not pinned, inferred from package.json compatibility)
- Edge Runtime support for selected API routes (e.g., `app/api/ask/route.ts` uses `export const runtime = "edge"`)
- Node.js runtime fallback for complex operations (e.g., `app/api/report/route.ts` uses `export const runtime = "nodejs"`)

**Package Manager:**
- npm (package-lock.json present in git)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack React framework with App Router (`next dev`, `next build`, `next start`)
- React 19.2.4 - UI component library and hooks
- React DOM 19.2.4 - DOM rendering

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind processing

**Animation:**
- Framer Motion 12.38.0 - React animation library used in components

**Charts & Visualization:**
- Recharts 3.8.1 - React charting library for data visualization (used in dashboard)

**Testing:**
- Vitest 4.1.2 - Unit/integration test runner
- Test command: `npm test` (runs `vitest run`)
- Watch mode: `npm run test:watch` (runs `vitest`)

**Build/Development:**
- TypeScript 5.x - Language compiler and type checking
- ESLint 9.x - Code linting with Next.js configuration
- PostCSS 4.x - CSS transformation pipeline (configured in `postcss.config.mjs`)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.101.0 - Supabase client for database/auth operations
- @supabase/ssr 0.10.0 - Server-side rendering utilities for auth middleware and cookie handling
- @anthropic-ai/sdk 0.80.0 - Claude API client (installed but not yet integrated in API endpoints)

**Infrastructure:**
- next 16.2.1 - Web framework and build tooling
- react 19.2.4 - Component library
- react-dom 19.2.4 - React rendering

**Development:**
- @types/node 20.x - Node.js type definitions
- @types/react 19.x - React type definitions
- @types/react-dom 19.x - React DOM type definitions
- eslint-config-next 16.2.1 - Next.js ESLint configuration (uses core-web-vitals and typescript presets)

## Configuration

**Environment:**
- `.env.example` documents required configuration:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, safe for client)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (public, safe for client)
  - `ANTHROPIC_API_KEY` - Claude API key (server-only, must NOT be prefixed with NEXT_PUBLIC_)
- Environment variables are read from `process.env` at runtime
- Session cookies managed via `Next.js cookies()` API in middleware

**Build:**
- `tsconfig.json` - TypeScript configuration with:
  - Target: ES2017
  - Module: esnext with bundler resolution
  - Path alias: `@/*` maps to project root
  - Strict mode enabled
  - Next.js plugin enabled for type generation
- `next.config.ts` - Empty placeholder for future Next.js configuration
- `postcss.config.mjs` - PostCSS pipeline with Tailwind plugin
- `eslint.config.mjs` - ESLint with Next.js core-web-vitals and TypeScript presets
- `package.json` - Standard npm configuration with dev/production split

## Platform Requirements

**Development:**
- Node.js (version compatible with ES2017 target)
- npm package manager
- TypeScript 5.x compiler
- Modern browser with ES2017 support

**Production:**
- Deployment target: Vercel (evidenced by `.vercel/project.json`)
- Next.js App Router compatible hosting
- Edge Runtime support (optional, for performance)
- Node.js runtime for complex operations (PDF generation, etc.)
- PostgreSQL database via Supabase
- HTTPS/TLS for secure communication

---

*Stack analysis: 2026-04-01*
