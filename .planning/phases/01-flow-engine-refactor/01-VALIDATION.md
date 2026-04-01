# Phase 1: Flow Engine Refactor - Validation

**Created:** 2026-04-01

## Requirement-to-Test Map

| Req ID | Description | Vitest Command | Test File | Exists? |
|--------|-------------|----------------|-----------|---------|
| FLOW-01 | Engagement checkpoint does not block progression (atomic state transitions) | `npx vitest run hooks/__tests__/use-quest-state.test.ts -t "engagement"` | `hooks/__tests__/use-quest-state.test.ts` | Wave 0 (created in 01-01, Task 1) |
| FLOW-02 | Flow state machine refactored to single useReducer with typed actions | `npx vitest run hooks/__tests__/use-quest-state.test.ts` | `hooks/__tests__/use-quest-state.test.ts` | Wave 0 (created in 01-01, Task 1) |
| FLOW-03 | Session narration uses student's selected class, not hardcoded "Wanderer" | `npx vitest run hooks/__tests__/use-quest-state.test.ts -t "SET_AVATAR_CLASS"` | `hooks/__tests__/use-quest-state.test.ts` | Wave 0 (created in 01-01, Task 1) |

## Wave 0 Test File

- **Path:** `hooks/__tests__/use-quest-state.test.ts`
- **Created by:** Plan 01-01, Task 1 (RED phase)
- **Covers:** FLOW-01 (engagement checkpoint atomicity), FLOW-02 (all reducer action types), FLOW-03 (SET_AVATAR_CLASS action)
- **Runner:** `npx vitest run hooks/__tests__/use-quest-state.test.ts`

## Validation Commands

```bash
# Per-requirement validation
npx vitest run hooks/__tests__/use-quest-state.test.ts -t "engagement"     # FLOW-01
npx vitest run hooks/__tests__/use-quest-state.test.ts                      # FLOW-02
npx vitest run hooks/__tests__/use-quest-state.test.ts -t "SET_AVATAR_CLASS" # FLOW-03

# Full phase validation
npm test

# Type checking
npx tsc --noEmit
```
