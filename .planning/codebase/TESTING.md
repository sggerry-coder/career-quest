# Testing Patterns

**Analysis Date:** 2026-04-01

## Test Framework

**Runner:**
- Vitest 4.1.2
- Config: No dedicated vitest.config.ts file — uses defaults
- TypeScript support enabled via tsconfig.json

**Assertion Library:**
- Vitest built-in expect() API (compatible with Jest)

**Run Commands:**
```bash
npm run test              # Run all tests (vitest run)
npm run test:watch       # Watch mode (vitest)
npm run lint             # ESLint validation
```

**Current test coverage:**
- 6 test files in `lib/scoring/__tests__/`
- 787 total test lines
- All test files focus on calculation and utility functions
- No E2E or integration tests present
- No component tests present

## Test File Organization

**Location:**
- Co-located pattern: Tests live in `__tests__/` subdirectory adjacent to source
- Structure: `lib/scoring/__tests__/` for tests of `lib/scoring/*.ts`
- Examples: `adaptive.test.ts` tests `adaptive.ts`, `mbti.test.ts` tests `mbti.ts`

**Naming:**
- Pattern: `[module].test.ts`
- All scoring tests use this convention

**Directory structure:**
```
lib/scoring/
├── __tests__/
│   ├── adaptive.test.ts       (246 lines)
│   ├── riasec.test.ts         (171 lines)
│   ├── mbti.test.ts           (126 lines)
│   ├── mi.test.ts             (121 lines)
│   ├── values.test.ts         (69 lines)
│   └── strengths.test.ts      (54 lines)
├── adaptive.ts
├── riasec.ts
├── mbti.ts
├── mi.ts
├── values.ts
└── strengths.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";
import { functionToTest } from "../module";

describe("functionToTest", () => {
  it("describes expected behavior", () => {
    expect(result).toBe(expectedValue);
  });
});
```

**Patterns:**

1. **Single responsibility per describe block:**
   - One describe per exported function
   - Related test cases grouped under function name

2. **Setup:**
   - No formal setup/teardown observed
   - Test data created inline in test blocks
   - Helper factories used for complex objects (see `makeRiasecQuestion`, `makeMbtiQuestion` in adaptive.test.ts)

3. **Execution/Assertion:**
   - Arrange-act-assert pattern within each test
   - Clear expected values commented when calculation is non-obvious
   - Descriptive test names explain the scenario

**Example from `lib/scoring/__tests__/mbti.test.ts`:**
```typescript
describe("calculateMbtiDichotomy", () => {
  it("normalizes [-3, -3] to -100", () => {
    expect(calculateMbtiDichotomy([-3, -3])).toBe(-100);
  });

  it("normalizes [-2, -2] to approximately -67", () => {
    // sum=-4, count=2, norm = (-4 / (2*3)) * 100 = -66.67
    expect(calculateMbtiDichotomy([-2, -2])).toBeCloseTo(-66.7, 0);
  });
});
```

## Mocking

**Framework:** None
- No mocking library (Vitest's built-in mocking not used)
- Tests focus on pure functions with no external dependencies
- No database, API, or file system mocks needed

**What to Mock:**
- N/A — pure utility functions dominate test suite

**What NOT to Mock:**
- None — tests work with actual function implementations

## Fixtures and Factories

**Test Data:**
- Inline literals for simple cases
- Helper factory functions for complex objects

**Factory pattern example from `lib/scoring/__tests__/adaptive.test.ts`:**
```typescript
function makeRiasecQuestion(
  id: string,
  target: string
): Question {
  return {
    id,
    session_number: 1,
    block: "confirmatory",
    question_text: `RIASEC ${target} adaptive question ${id}`,
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1 },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5 },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: target,
    is_adaptive: true,
  };
}
```

**Location:**
- Factories defined at top of test file
- Used to build test pools (e.g., 30-question adaptive question pool)
- Reduces duplication and improves readability

## Coverage

**Requirements:** Not enforced (no coverage thresholds in config)

**View Coverage:** Not configured

**Current situation:**
- Scoring logic heavily tested (554 lines of source, 787 lines of tests)
- Test-to-code ratio: ~1.4:1
- No coverage for: API routes, React components, middleware, UI logic
- Focus areas: Pure calculation functions

## Test Types

**Unit Tests:**
- Scope: Individual calculation functions (calculateMbtiDichotomy, calculateAllRiasec, etc.)
- Approach: Test formula correctness with known inputs/outputs
- Patterns:
  - Edge cases (empty arrays, boundary values)
  - Normal cases (typical scoring ranges)
  - Precision checks (floats with `toBeCloseTo()`)

**Integration Tests:**
- Multi-function workflows tested in `adaptive.test.ts`
- Example: `selectAdaptiveQuestions` combines RIASEC, MBTI, MI, and pool selection logic
- Tests verify interaction between multiple scoring dimensions

**E2E Tests:**
- Not present
- No Cypress, Playwright, or similar test runners configured

## Common Patterns

**Boundary Testing:**
```typescript
it("clamps values to -3 to +3 range", () => {
  // [-5, 7] → clamped to [-3, 3] → sum=0 → 0
  expect(calculateMbtiDichotomy([-5, 7])).toBe(0);
});
```

**Empty Input Handling:**
```typescript
it("returns 0 for empty array", () => {
  expect(calculateMbtiDichotomy([])).toBe(0);
});
```

**Floating-Point Precision:**
```typescript
it("normalizes [-2, -2] to approximately -67", () => {
  // sum=-4, count=2, norm = (-4 / (2*3)) * 100 = -66.67
  expect(calculateMbtiDichotomy([-2, -2])).toBeCloseTo(-66.7, 0);
});
```

**Multiple Assertions (less common):**
```typescript
it("produces full type for strong signals: I N T J", () => {
  const scores = { EI: -67, SN: 67, TF: -67, JP: -67 };
  const result = deriveEmergingType(scores);
  expect(result.type).toBe("INTJ");
  expect(result.display).toBe("I N T J");
});
```

**Async Testing:**
- Not observed in current test suite
- Scoring functions are synchronous

**Error Testing:**
- Not explicitly tested (functions return 0 for invalid input rather than throwing)
- Silent handling philosophy extends to tests

## Test Examples by File

**`lib/scoring/__tests__/adaptive.test.ts` (246 lines):**
- 5 main test cases
- Tests `selectAdaptiveQuestions` function
- Verifies selection limits (max 2 RIASEC per type, max 1 MI)
- Tests priority logic (ambiguous dimensions prioritized)
- Helper factories build question pools

**`lib/scoring/__tests__/riasec.test.ts` (171 lines):**
- 6 describe blocks for 6 functions
- Covers: normalization, merging, bias detection, class label derivation
- Each function tested across range of inputs (boundary, normal, edge)

**`lib/scoring/__tests__/mbti.test.ts` (126 lines):**
- 4 describe blocks for 4 main functions
- Tests dichotomy calculation, all-dichotomy calculation, emerging thresholds, type derivation
- Formula verification with detailed comments

**`lib/scoring/__tests__/mi.test.ts` (121 lines):**
- 3 describe blocks (dimension calculation, all dimensions, top-N selection)
- Tests variable max_weight parameter
- Sorting and selection logic validated

**`lib/scoring/__tests__/values.test.ts` (69 lines):**
- 2 describe blocks (single dimension, all dimensions)
- Tests 5-value compass calculation
- Edge cases: empty arrays, all zeros

**`lib/scoring/__tests__/strengths.test.ts` (54 lines):**
- 2 describe blocks (accumulation, top-N extraction)
- Tests frequency counting and sorting
- Tie-breaking logic for same-count strengths

## Untested Areas

**No tests for:**
- `app/api/*` route handlers
- `app/quest/*` and `app/facilitator/*` page components
- `components/**` React components
- `middleware.ts` session update logic
- `lib/supabase/client.ts` and `lib/supabase/server.ts`
- Error scenarios in Supabase queries

**Risk:** Changes to API endpoints, React UI, and auth flow can ship without validation

---

*Testing analysis: 2026-04-01*
