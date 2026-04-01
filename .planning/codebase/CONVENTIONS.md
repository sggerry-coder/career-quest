# Coding Conventions

**Analysis Date:** 2026-04-01

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `ToneToggle.tsx`, `XpBar.tsx`)
- Pages: lowercase kebab-case with square brackets for dynamic routes (e.g., `dashboard/page.tsx`, `[id]/page.tsx`)
- Utilities and modules: camelCase (e.g., `adaptive.ts`, `riasec.ts`)
- Test files: filename with `.test.ts` or `.test.tsx` suffix in `__tests__` directory (e.g., `mbti.test.ts`)

**Functions:**
- PascalCase for React component exports (e.g., `export default function Dashboard()`, `export function ToneToggle()`)
- camelCase for utility functions (e.g., `calculateRiasecType`, `selectAdaptiveQuestions`, `detectAcquiescenceBias`)
- Private helper functions: camelCase with optional underscore prefix if intentionally internal (e.g., `sanitizeValue`)

**Variables:**
- camelCase for all variables and constants (e.g., `currentXp`, `maxXp`, `riasecScores`, `hasCompletedSession1`)
- SCREAMING_SNAKE_CASE for true constants (e.g., `RIASEC_TYPES`, `STILL_EMERGING_THRESHOLD`, `MAX_RIASEC_PER_TYPE`)
- Record/dictionary keys: lowercase (e.g., `{ R: "MAKER", I: "INVESTIGATOR" }`)

**Types:**
- PascalCase for interfaces and type aliases (e.g., `StudentData`, `ScoresData`, `Tone`, `AdaptiveInput`, `RiasecType`)
- Props interfaces: `[ComponentName]Props` pattern (e.g., `XpBarProps`, `ToneToggleProps`)

**Arrays and collections:**
- Plural naming for arrays (e.g., `unlockedBadgeIds`, `selectedQuestions`, `RIASEC_TYPES`)

## Code Style

**Formatting:**
- ESLint 9 with Next.js configuration (ESLint core web vitals + TypeScript support)
- No explicit Prettier config found — uses default ESLint formatting via `eslint-config-next`
- File: `eslint.config.mjs` (flat config format)

**Linting:**
- Tool: ESLint 9
- Base configs: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`
- Run: `npm run lint`
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**Indentation & spacing:**
- 2-space indentation (observed throughout)
- Single space around operators
- No trailing commas in single-line constructs, trailing commas in multiline arrays/objects

## Import Organization

**Order:**
1. Next.js imports (`"next/server"`, `"next/navigation"`)
2. Third-party React/UI libraries (`react`, `framer-motion`, `recharts`)
3. Supabase and auth utilities (`@supabase/...`)
4. Local project imports with `@/` path alias
5. Type-only imports on separate lines when needed

**Path Aliases:**
- Single alias defined: `@/*` maps to project root
- Used consistently throughout: `@/lib`, `@/components`, `@/app`, `@/data`, `@/providers`

**Example pattern from `app/quest/dashboard/page.tsx`:**
```typescript
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RiasecBars from "@/components/charts/riasec-bars";
import { badges as allBadgeDefinitions } from "@/data/badges";
```

## Error Handling

**Patterns:**
- Silent catch with fallback rendering (empty state)
- Try/finally blocks to ensure cleanup (e.g., `setLoading(false)`)
- No error logging or console output
- Explicit null/undefined checks before data access (e.g., `if (studentRes.data) { ... }`)
- Type assertions with `as` for Supabase response casting

**Example from `app/quest/dashboard/page.tsx`:**
```typescript
try {
  // async operations
} catch {
  // Silently handle — dashboard shows empty state
} finally {
  setLoading(false);
}
```

## Logging

**Framework:** Not used
- No console logging in codebase
- No dedicated logging library
- Silent failures accepted with fallback UI states

## Comments

**When to Comment:**
- JSDoc blocks for exported functions with multiple parameters (observed in `lib/scoring/riasec.ts`, `lib/scoring/adaptive.ts`)
- Inline comments for complex business logic (e.g., ambiguity calculations, normalization formulas)
- Comments explaining "why" not "what" (e.g., explaining formula reasoning)

**JSDoc/TSDoc:**
- Single-line documentation blocks above function signatures
- Include parameter and return descriptions
- Formulas documented with arithmetic notation

**Example from `lib/scoring/riasec.ts`:**
```typescript
/**
 * Normalize raw Likert responses for a single RIASEC type.
 * Formula: ((sum - count) / (count * 4)) * 100
 * Returns 0-100. Returns 0 for empty input.
 */
export function calculateRiasecType(rawScores: number[]): number {
```

## Function Design

**Size:**
- Small, focused functions (30-100 lines typical)
- Utility functions 10-50 lines
- Components vary 50-400 lines for complex pages

**Parameters:**
- Destructuring used for interface parameters (e.g., `{ value, onChange }` in `ToneToggle`)
- Single-object parameter preferred over multiple params
- TypeScript strict mode enforces explicit types

**Return Values:**
- Explicit return type annotations on all exported functions
- Return 0 for empty/null inputs in calculation functions
- Return null state for missing Supabase data
- Components return JSX.Element (implicit)

**Early returns:**
- Used for validation and guard clauses (e.g., `if (!user) { return; }`)

## Module Design

**Exports:**
- Named exports for utilities and helper functions
- Default exports for React components (pages and reusable components)
- Type exports with `export type` for interfaces/types
- Barrel exports used in some directories (e.g., `@/data/badges`)

**Barrel Files:**
- Used selectively (observed in `@/data` and chart components)
- Simplify imports from component groups

**Internal vs External:**
- Private helper functions stay in same file (no export)
- Single-purpose modules (e.g., `riasec.ts`, `mbti.ts`, `adaptive.ts`)
- Shared types in `lib/types/` directory

## Special Patterns

**React Patterns:**
- Functional components throughout
- `"use client"` directive for client-side interactivity
- Custom hooks not observed in codebase yet
- Prop destructuring in function parameters

**Next.js Patterns:**
- API routes in `app/api/route.ts` with HTTP method exports
- Edge runtime declared: `export const runtime = "edge"`
- Middleware pattern: `middleware.ts` at app root
- Dynamic route segments: `[id]` syntax in file paths

**Type Safety:**
- Strict mode enabled (`"strict": true` in `tsconfig.json`)
- Explicit `as` type assertions for Supabase casts
- Interface definitions before usage
- Type-only imports where appropriate

**Data Normalization:**
- Consistent formula approach: `(sanitized - count) / (count * 4) * 100`
- Utility functions handle edge cases (empty arrays, out-of-range values)
- Sanitize raw values before calculation (clamping and rounding)

---

*Convention analysis: 2026-04-01*
