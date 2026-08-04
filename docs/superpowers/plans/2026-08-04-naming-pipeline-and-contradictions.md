# Naming Pipeline and Contradictions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the character class actually emerge from the student's interest answers, and close every place the app contradicts itself about who they are.

**Architecture:** Three changes do most of the work. Warm-up options stop carrying interest signals, so interests come only from the instrument built to measure them. `useEmergentClass` waits for real evidence before naming anyone. Every surface reads the class through the same parser. The rest are contained fixes to screens that promise things the data cannot fund, and safety valves wired to conditions that can never fire.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, Framer Motion, Vitest + @testing-library/react.

## Global Constraints

- **No database migrations.** Everything here works within existing columns.
- **Zero API cost.** No network calls to any AI service.
- **The app never claims more than it has earned.** A class, a personality letter, a learning style or a values lean must not be asserted on evidence that cannot support it.
- **A class may deepen but must not flip**, including across a resume. Once named, the primary is locked for the rest of the quest.
- **Relics never modify a score.**
- **Two tones everywhere:** `quest` and `explorer`. Every user-visible string needs both.
- **Display text only for the Chapter rename.** Route paths, database columns, type names and variable names keep the word `session`.
- **Test convention:** component and hook tests carry `/** @vitest-environment jsdom */`. Run with `npx vitest run <path>`.
- **Verification gates before every commit:** `npx tsc --noEmit`, `npm run lint`, `npm test`.

**Measured baseline, for reference.** Probed against the current code: one warm-up pick scores an interest **100**; four picks of the same type also **100**; one pick plus two "I dislike this" answers still **56**. Task 1 is what makes those numbers stop mattering.

---

### Task 1: Warm-ups stop deciding interests

**Files:**
- Modify: `data/questions/session-1-core.ts` (the `warmupQuestions` array — every option's `framework_signals`)
- Test: `data/__tests__/warmup-signals.test.ts` (new)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: warm-up options whose `framework_signals` contain only `mi_*` keys. `strength_signal` is untouched.

**Why:** interest scores normalise per response, so any type touched once sits at the top of the scale and pick frequency is invisible. Mixing a five-question ice-breaker into the same average as fourteen calibrated interest items is the root fault. Warm-ups keep the two jobs they were designed for — strengths (and therefore relics) and learning styles.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { warmupQuestions } from "@/data/questions/session-1-core";

describe("warm-up signals", () => {
  it("carries no interest signals at all", () => {
    for (const q of warmupQuestions) {
      for (const option of q.options) {
        const keys = Object.keys(option.framework_signals ?? {});
        expect(
          keys.filter((k) => k.startsWith("riasec_")),
          `${q.id} / "${option.label}" still feeds interests`
        ).toEqual([]);
      }
    }
  });

  it("still carries a learning-style signal on every option", () => {
    for (const q of warmupQuestions) {
      for (const option of q.options) {
        const keys = Object.keys(option.framework_signals ?? {});
        expect(
          keys.some((k) => k.startsWith("mi_")),
          `${q.id} / "${option.label}" lost its learning-style signal`
        ).toBe(true);
      }
    }
  });

  it("still carries a strength signal on every option", () => {
    for (const q of warmupQuestions) {
      for (const option of q.options) {
        expect(option.strength_signal, `${q.id} / "${option.label}"`).toBeTruthy();
      }
    }
  });

  it("still offers six distinct strengths per question", () => {
    for (const q of warmupQuestions) {
      const strengths = q.options.map((o) => o.strength_signal);
      expect(new Set(strengths).size, `${q.id} repeats a strength`).toBe(
        strengths.length
      );
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run data/__tests__/warmup-signals.test.ts`
Expected: FAIL — the first test reports `riasec_R` (and the other five) still present.

- [ ] **Step 3: Strip the interest keys**

In `data/questions/session-1-core.ts`, in the `warmupQuestions` array only, remove the `riasec_*` entry from every option's `framework_signals`, leaving the `mi_*` entry. For example:

```ts
        framework_signals: { riasec_R: 2, mi_bodily: 1 },
```

becomes:

```ts
        framework_signals: { mi_bodily: 1 },
```

Do this for all options of all five warm-up questions. **Do not touch** `strength_signal`, and **do not touch** any question outside `warmupQuestions` — the `riasec_mi` block's multiple-choice questions legitimately measure interests.

Update the block's header comment: rule 2 ("Six options, one per RIASEC type") and rule 3 ("every option gives riasec_X: 2 plus one mi_*: 1") no longer describe the interest signals. Replace them with a note that warm-up options carry learning-style and strength signals only, that the six-per-question spread is now about strengths, and why interests were removed — one ice-breaker click used to score an interest 100.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run data/__tests__/warmup-signals.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Fix the fallout**

Other tests assert warm-up answers move interest scores. Find and update them:

```bash
npm test 2>&1 | grep -E "FAIL|×"
```

Any test asserting an interest score changed by a warm-up answer is now asserting the old defect — rewrite it to assert the interest score is **unchanged** by a warm-up answer, and that the strength and learning-style signals still land.

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add data/questions/session-1-core.ts data/__tests__/warmup-signals.test.ts
git commit -m "fix(scoring): warm-ups stop deciding a student's interests"
```

---

### Task 2: Name on evidence, not on position

**Files:**
- Create: `lib/character/evidence.ts`
- Modify: `hooks/use-emergent-class.ts`, `app/quest/session/[id]/page.tsx`
- Test: `lib/character/__tests__/evidence.test.ts` (new), `hooks/__tests__/use-emergent-class.test.ts` (extend)

**Interfaces:**
- Consumes: `deriveCharacterClass(riasec)`, `type DerivedClass`, `isCharacterClassId` from `@/lib/character/classes`; `useEmergentClass({ riasec, blockKey, restoredClass })` as it currently stands.
- Produces:
  - `MIN_INTEREST_RESPONSES = 10` and `countInterestResponses(riasecRaw: Record<string, number[]>): number` from `@/lib/character/evidence`
  - `useEmergentClass` gains a required `interestResponses: number` input.

**Why:** the hook derives at every block boundary, so the first naming happens leaving the warm-up — question 6. With Task 1 done, warm-ups contribute nothing, so at that point every interest is 0 and the student would be named Wanderer and then named for real later. That works, but it is fragile and position-dependent. Gate on evidence instead.

- [ ] **Step 1: Write the failing test for the counter**

```ts
import { describe, it, expect } from "vitest";
import {
  countInterestResponses,
  MIN_INTEREST_RESPONSES,
} from "@/lib/character/evidence";

describe("countInterestResponses", () => {
  it("counts every answer across all six types", () => {
    expect(
      countInterestResponses({ R: [4, 3], I: [2], A: [], S: [1, 1, 1], E: [], C: [] })
    ).toBe(6);
  });

  it("is zero for an empty record", () => {
    expect(countInterestResponses({})).toBe(0);
  });

  it("ignores a malformed entry rather than throwing", () => {
    expect(
      countInterestResponses({ R: [4], I: undefined as unknown as number[] })
    ).toBe(1);
  });
});

describe("MIN_INTEREST_RESPONSES", () => {
  it("is high enough that the interest block, not the warm-up, decides", () => {
    // The warm-up is 5 questions and now contributes no interest answers at
    // all; the interest block contributes 14 Likert items. A threshold in
    // between means naming cannot happen until real evidence exists.
    expect(MIN_INTEREST_RESPONSES).toBeGreaterThan(5);
    expect(MIN_INTEREST_RESPONSES).toBeLessThanOrEqual(14);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/character/__tests__/evidence.test.ts`
Expected: FAIL — cannot resolve `@/lib/character/evidence`.

- [ ] **Step 3: Write the evidence module**

```ts
/**
 * How much evidence the app needs before it will name a student.
 *
 * The class used to be derived at the first block boundary — question 6 —
 * from five ice-breaker answers, and then locked, so the ~20 interest
 * questions that followed could never displace it. A student who picked
 * "help someone out" four times and "build something" once was named
 * Warsmith, permanently, because a single pick saturated the scale and the
 * tie broke on internal ordering.
 */

/**
 * Interest answers required before a class may be named. The interest block
 * contributes 14 Likert items; this threshold sits inside it, so a student is
 * named partway through the questions that actually measure interests.
 */
export const MIN_INTEREST_RESPONSES = 10;

/** Total interest answers recorded so far, across all six types. */
export function countInterestResponses(
  riasecRaw: Record<string, number[]>
): number {
  return Object.values(riasecRaw).reduce(
    (total, answers) => total + (Array.isArray(answers) ? answers.length : 0),
    0
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/character/__tests__/evidence.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing hook test**

Add to `hooks/__tests__/use-emergent-class.test.ts`:

```ts
  it("refuses to name a student before there is enough evidence", () => {
    // Scores that would clearly name a Guardian, but only 3 answers behind them.
    const { result } = renderHook(() =>
      useEmergentClass({
        riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
        blockKey: "riasec",
        interestResponses: 3,
      })
    );
    expect(result.current.derived.primary).toBe("wanderer");
    expect(result.current.derived.isNamed).toBe(false);
  });

  it("names the student once the evidence threshold is met", () => {
    const { result, rerender } = renderHook(
      ({ blockKey, interestResponses }) =>
        useEmergentClass({
          riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
          blockKey,
          interestResponses,
        }),
      { initialProps: { blockKey: "riasec", interestResponses: 3 } }
    );
    expect(result.current.derived.isNamed).toBe(false);

    rerender({ blockKey: "riasec_mi", interestResponses: 14 });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.isNamed).toBe(true);
  });

  it("still honours a restored class even before the threshold", () => {
    // A resumed student was already named; the threshold is about first
    // naming, not about holding a name they already earned.
    const { result } = renderHook(() =>
      useEmergentClass({
        riasec: {},
        blockKey: "riasec",
        interestResponses: 0,
        restoredClass: "guardian",
      })
    );
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.isNamed).toBe(true);
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run hooks/__tests__/use-emergent-class.test.ts`
Expected: FAIL — `interestResponses` is not a recognised input and the first test names a Guardian on 3 answers.

- [ ] **Step 7: Gate the derivation**

In `hooks/use-emergent-class.ts`, add `interestResponses: number` to `UseEmergentClassInput` with a doc comment explaining it is the evidence gate. In the block-boundary effect, before deriving, return early when `interestResponses < MIN_INTEREST_RESPONSES` **and** the student is not already named — a restored or previously-named student keeps their class regardless. Import `MIN_INTEREST_RESPONSES` from `@/lib/character/evidence`; do not redefine the number.

Then in `app/quest/session/[id]/page.tsx`, pass it:

```tsx
  const { derived: emergentClass } = useEmergentClass({
    riasec: scoreState.riasec,
    blockKey: questState.current_block,
    restoredClass: restoredClassRef.current,
    interestResponses: countInterestResponses(scoreState.riasec_raw),
  });
```

Add the import: `import { countInterestResponses } from "@/lib/character/evidence";`

- [ ] **Step 8: Do not lock Rogue on a marginal lead**

`deriveClassLabel` returns `EXPLORER` — which maps to **Rogue** — whenever a student has a
lead that is not decisive. Rogue counts as named, so the lock closes on it. That is right at
the end of the quest (genuinely open is a real answer) and wrong in the middle (the evidence
is still arriving).

Treat a Rogue derivation as provisional until the interest block is finished: keep it as the
displayed class, but do not set `isNamed`, so later boundaries can still resolve it into a
real class. Add `interestBlockComplete: boolean` to the hook's input, passed from the session
page as `questState.current_block !== "warmup" && questState.current_block !== "riasec"`.

```ts
  it("does not lock Rogue while interest questions are still coming", () => {
    const flat = { R: 52, I: 55, A: 53, S: 50, E: 51, C: 49 };
    const { result, rerender } = renderHook(
      ({ riasec, blockKey, interestBlockComplete }) =>
        useEmergentClass({ riasec, blockKey, interestResponses: 12, interestBlockComplete }),
      { initialProps: { riasec: flat, blockKey: "riasec", interestBlockComplete: false } }
    );
    expect(result.current.derived.primary).toBe("rogue");
    expect(result.current.derived.isNamed).toBe(false);

    // A real lead emerging later must still be able to claim them.
    rerender({
      riasec: { R: 20, I: 30, A: 25, S: 88, E: 15, C: 10 },
      blockKey: "riasec_mi",
      interestBlockComplete: true,
    });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.isNamed).toBe(true);
  });

  it("locks Rogue once the interest questions are done", () => {
    const flat = { R: 52, I: 55, A: 53, S: 50, E: 51, C: 49 };
    const { result } = renderHook(() =>
      useEmergentClass({
        riasec: flat, blockKey: "riasec_mi", interestResponses: 14, interestBlockComplete: true,
      })
    );
    expect(result.current.derived.primary).toBe("rogue");
    expect(result.current.derived.isNamed).toBe(true);
  });
```

- [ ] **Step 9: Add the anti-contradiction test**

This is the test the earlier work lacked — it asserts the app cannot display a class that disagrees with the chart beside it at the moment of naming.

```ts
  it("names a class the interest bars actually support", () => {
    // At the moment of naming, the class must be the one a student would
    // read off the chart. "CLASS: WARSMITH" above a chart where Helper is
    // the tallest bar is the defect this guards.
    const riasec = { R: 20, I: 30, A: 25, S: 85, E: 15, C: 10 };
    const { result } = renderHook(() =>
      useEmergentClass({ riasec, blockKey: "riasec_mi", interestResponses: 14 })
    );

    const topType = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0];
    const expectedByChart = { R: "warsmith", I: "mage", A: "bard", S: "guardian", E: "vanguard", C: "paladin" }[topType];
    expect(result.current.derived.primary).toBe(expectedByChart);
  });
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npx vitest run hooks/__tests__/use-emergent-class.test.ts`
Expected: PASS.

- [ ] **Step 11: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/character/evidence.ts lib/character/__tests__/evidence.test.ts hooks/use-emergent-class.ts hooks/__tests__/use-emergent-class.test.ts "app/quest/session/[id]/page.tsx"
git commit -m "fix(character): name a class only once the evidence supports it"
```

---

### Task 3: One class truth on the landing page

**Files:**
- Modify: `app/page.tsx:52-53` (theme application), `:136` (class lookup), `:215` (the "Adventurer" fallback)
- Test: `app/__tests__/landing-class.test.tsx` (new)

**Interfaces:**
- Consumes: `parseCharacterClass(stored: string | null | undefined): DerivedClass` and `characterClassDisplayName(derived, tone)` from `@/lib/character/classes`; `loadSessionSnapshot(studentId)` from `@/lib/persistence/session-snapshot`.
- Produces: nothing new.

**Why, precisely:** the landing page looks the class up by exact id against `classDefinitions`, which holds only the eight single ids. A dual-class graduate stored as `"guardian-mage"` fails the lookup and is shown **"Adventurer"** with no icon — and `applyClassTheme("guardian-mage")` fails too, resolving to slate and **overwriting the cached theme**. Meanwhile the dashboard parses the same value correctly. Every home visit is grey Adventurer, every dashboard visit is jade Guardian-Mage, for as long as the account exists.

Separately: the class is only written to the database at final save, so a student named mid-quest is greeted as **"Wanderer"** — or, in plain tone, the non-sentence **"Still forming"** — until they finish. The mid-quest class is sitting in the localStorage checkpoint under the same user id.

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  student: { avatar_class: "guardian-mage", tone: "quest", name: "Sam", current_session: 0, has_completed_session1: true },
  themeCalls: [] as string[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: h.student, error: null }) }) }),
    }),
  }),
}));
vi.mock("@/lib/theme", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/theme")>();
  return { ...actual, applyClassTheme: (id: string) => { h.themeCalls.push(id); } };
});

import Landing from "@/app/page";

beforeEach(() => { h.themeCalls.length = 0; window.localStorage.clear(); });
afterEach(() => cleanup());

describe("landing page class", () => {
  it("shows a dual class by name, not 'Adventurer'", async () => {
    render(<Landing />);
    expect(await screen.findByText(/Guardian-Mage/)).toBeDefined();
    expect(screen.queryByText(/Adventurer/)).toBeNull();
  });

  it("themes from the resolved primary, never the raw stored value", async () => {
    render(<Landing />);
    await waitFor(() => expect(h.themeCalls.length).toBeGreaterThan(0));
    // "guardian-mage" is not a class id; passing it resolves to slate and
    // poisons the cached theme.
    expect(h.themeCalls).not.toContain("guardian-mage");
    expect(h.themeCalls).toContain("guardian");
  });

  it("greets a mid-quest student by the class in their checkpoint, not Wanderer", async () => {
    h.student = { ...h.student, avatar_class: "wanderer", has_completed_session1: false };
    window.localStorage.setItem(
      "cq-session1-snapshot-student-1",
      JSON.stringify({
        version: 2,
        savedAt: 1,
        questState: {
          flowPhase: "questions", currentIndex: 12, confirmIndex: 0, responses: [],
          adaptiveQuestions: [], engagementShown: true, questions_answered: 12,
          avatarClass: "guardian",
        },
        scoreState: { riasec: {}, riasec_raw: {}, signal_history: [] },
        selfMap: null,
      })
    );

    render(<Landing />);
    expect(await screen.findByText(/Guardian/)).toBeDefined();
    expect(screen.queryByText(/Wanderer/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/__tests__/landing-class.test.tsx`
Expected: FAIL — "Adventurer" is rendered, `applyClassTheme` receives `"guardian-mage"`, and the mid-quest student shows "Wanderer".

- [ ] **Step 3: Resolve the class once, use it everywhere**

In `app/page.tsx`, replace the `classes.find((c) => c.id === student.avatar_class)` lookup and the `"Adventurer"` fallback with a single resolution, and use it for the name, the icon and the theme:

```tsx
import { parseCharacterClass, characterClassDisplayName, CHARACTER_CLASSES } from "@/lib/character/classes";
import { loadSessionSnapshot } from "@/lib/persistence/session-snapshot";

/**
 * The class to greet a returning student by.
 *
 * A mid-quest class lives only in the checkpoint until the final save, so
 * reading the database alone greets a named student as "Wanderer" — or, in
 * plain tone, the non-sentence "Still forming" — and then turns them back
 * into their class the moment they resume.
 */
function resolveGreetingClass(storedClass: string | null, studentId: string) {
  const stored = parseCharacterClass(storedClass);
  if (stored.isNamed) return stored;
  const snapshot = loadSessionSnapshot(studentId);
  const inProgress = snapshot?.questState?.avatarClass ?? null;
  return parseCharacterClass(inProgress);
}
```

Theme from `resolved.primary`, never from the raw stored string. Display with `characterClassDisplayName(resolved, student.tone)` and take the icon from `CHARACTER_CLASSES[resolved.primary].icon`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/__tests__/landing-class.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add app/page.tsx app/__tests__/landing-class.test.tsx
git commit -m "fix(landing): stop calling students Adventurer and Wanderer"
```

---

### Task 4: The naming moment gets a screen

**Files:**
- Create: `components/quest/class-named-screen.tsx`
- Modify: `hooks/use-emergent-class.ts`, `app/quest/session/[id]/page.tsx`, `hooks/use-quest-state.ts` (new flow phase)
- Test: `components/quest/__tests__/class-named-screen.test.tsx` (new), `hooks/__tests__/use-emergent-class.test.ts` (extend)

**Interfaces:**
- Consumes: `CHARACTER_CLASSES`, `characterClassDisplayName`, `type DerivedClass`; `classDefinitions` from `@/lib/theme` for taglines.
- Produces: `useEmergentClass` also returns `namingEventId: number`, starting at 0 and incrementing once when a student is first named. `<ClassNamedScreen derived tone onContinue />`.

**Why:** today the colours change silently behind a generic interstitial, and the first sight of the class name is a passing *"Nice progress, Warsmith!"* — a name the student was never given. Every per-class tagline in `lib/theme.ts` is written and rendered nowhere.

**Why a counter, not a boolean:** the previous attempt used a transient boolean set during render. React double-renders in development, and the second pass swallowed it before anything could see it. A number that only ever increases can be compared against what a consumer last saw, which survives double-rendering and discarded renders.

- [ ] **Step 1: Write the failing hook test**

```ts
  it("raises a naming event exactly once, when the student is first named", () => {
    const { result, rerender } = renderHook(
      ({ blockKey, interestResponses }) =>
        useEmergentClass({
          riasec: { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 },
          blockKey,
          interestResponses,
        }),
      { initialProps: { blockKey: "riasec", interestResponses: 3 } }
    );
    expect(result.current.namingEventId).toBe(0);

    rerender({ blockKey: "riasec_mi", interestResponses: 14 });
    expect(result.current.namingEventId).toBe(1);

    // Deepening is not a new naming.
    rerender({ blockKey: "mbti_values", interestResponses: 20 });
    expect(result.current.namingEventId).toBe(1);
  });

  it("raises no naming event for a student who was already named on resume", () => {
    const { result } = renderHook(() =>
      useEmergentClass({
        riasec: {}, blockKey: "riasec", interestResponses: 0, restoredClass: "guardian",
      })
    );
    // They were named in an earlier sitting; replaying the moment would be wrong.
    expect(result.current.namingEventId).toBe(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run hooks/__tests__/use-emergent-class.test.ts`
Expected: FAIL — `namingEventId` is undefined.

- [ ] **Step 3: Add the counter**

In `hooks/use-emergent-class.ts`, add `const [namingEventId, setNamingEventId] = useState(0);`. Inside the block-boundary effect, when the resolved class becomes named and the previous resolved class was not named **and** the student was not seeded from a restored class, call `setNamingEventId((n) => n + 1)`. Return it alongside `derived`. All state updates stay inside the effect — no ref reads or writes during render.

- [ ] **Step 4: Write the failing screen test**

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ClassNamedScreen from "@/components/quest/class-named-screen";

afterEach(() => cleanup());

const guardian = { primary: "guardian" as const, secondary: null, isNamed: true };

describe("ClassNamedScreen", () => {
  it("names the class and gives it its meaning", () => {
    render(<ClassNamedScreen derived={guardian} tone="quest" onContinue={() => {}} />);
    expect(screen.getByText(/You are a Guardian/)).toBeDefined();
    // The tagline written in lib/theme.ts, which nothing rendered before.
    expect(screen.getByText(/You stand where someone else would have fallen/)).toBeDefined();
  });

  it("uses the plain name in explorer tone", () => {
    render(<ClassNamedScreen derived={guardian} tone="explorer" onContinue={() => {}} />);
    expect(screen.getByText(/Helper/)).toBeDefined();
    expect(screen.queryByText(/Guardian/)).toBeNull();
  });

  it("continues the quest", () => {
    const onContinue = vi.fn();
    render(<ClassNamedScreen derived={guardian} tone="quest" onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run components/quest/__tests__/class-named-screen.test.tsx`
Expected: FAIL — cannot resolve `@/components/quest/class-named-screen`.

- [ ] **Step 6: Build the screen**

```tsx
"use client";

import { motion } from "framer-motion";
import {
  CHARACTER_CLASSES,
  characterClassDisplayName,
  type DerivedClass,
} from "@/lib/character/classes";
import { classDefinitions } from "@/lib/theme";

interface ClassNamedScreenProps {
  derived: DerivedClass;
  tone: "quest" | "explorer";
  onContinue: () => void;
}

/**
 * The moment the student becomes someone.
 *
 * Before this existed, the app's colours simply changed behind a generic
 * interstitial and the student's first sight of their class name was a
 * passing "Nice progress, Warsmith!" — a name they had never been given.
 * The per-class taglines were written and rendered nowhere.
 */
export default function ClassNamedScreen({
  derived,
  tone,
  onContinue,
}: ClassNamedScreenProps): React.JSX.Element {
  const name = characterClassDisplayName(derived, tone);
  const def = classDefinitions.find((c) => c.id === derived.primary);
  const tagline = def?.tagline[tone] ?? "";
  const icon = CHARACTER_CLASSES[derived.primary].icon;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.span
        className="text-6xl"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        aria-hidden="true"
      >
        {icon}
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-2xl font-semibold text-white"
      >
        {tone === "quest" ? `You are a ${name}.` : `Your profile: ${name}`}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="text-sm text-white/70 max-w-xs italic"
      >
        {tagline}
      </motion.p>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 1.1 }}
        onClick={onContinue}
        className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 min-h-[44px]"
      >
        {tone === "quest" ? "Continue the quest" : "Continue"}
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 7: Show it once, when the naming event fires**

In `hooks/use-quest-state.ts`, add `"class_named"` to the `FlowPhase` union and a `SHOW_CLASS_NAMED` / `DISMISS_CLASS_NAMED` action pair that sets and clears that phase, following the existing `block_transition` pattern exactly. Add `"class_named"` to `VALID_FLOW_PHASES` in `lib/persistence/session-snapshot.ts` so a checkpoint taken on this screen restores.

In `app/quest/session/[id]/page.tsx`, track the last naming event seen and dispatch when it changes:

```tsx
  const lastNamingSeen = useRef(0);
  useEffect(() => {
    if (namingEventId > lastNamingSeen.current) {
      lastNamingSeen.current = namingEventId;
      dispatch({ type: "SHOW_CLASS_NAMED" });
    }
  }, [namingEventId, dispatch]);
```

Render the phase alongside the other interstitials:

```tsx
  if (flowPhase === "class_named") {
    return (
      <ClassNamedScreen
        derived={emergentClass}
        tone={studentTone}
        onContinue={() => dispatch({ type: "DISMISS_CLASS_NAMED" })}
      />
    );
  }
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run components/quest/__tests__/class-named-screen.test.tsx hooks/__tests__/use-emergent-class.test.ts`
Expected: PASS.

- [ ] **Step 9: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add components/quest/class-named-screen.tsx components/quest/__tests__/class-named-screen.test.tsx hooks/use-emergent-class.ts hooks/use-quest-state.ts lib/persistence/session-snapshot.ts hooks/__tests__/use-emergent-class.test.ts "app/quest/session/[id]/page.tsx"
git commit -m "feat(quest): give the naming moment a screen"
```

---

### Task 5: Replace the blank personality card, and stop one click scoring 100

**Files:**
- Modify: `components/quest/reveal-sequence.tsx` (the `emerging_type` beat), `lib/scoring/mi.ts`, `components/charts/mi-preview-bars.tsx`
- Test: `components/quest/__tests__/reveal-sequence.test.tsx` (extend), `lib/scoring/__tests__/mi.test.ts` (extend)

**Interfaces:**
- Consumes: `describeCharacter` from `@/lib/character/description`; `deriveEmergingType` from `@/lib/scoring/mbti`.
- Produces: `MIN_MI_SIGNALS = 2` exported from `@/lib/scoring/mi`.

**Why:** the reveal has an animated beat for the four-letter type card. `deriveEmergingType` requires ≥3 answers per dichotomy and Session 1 ships exactly **2**, and the reveal runs before the confirmatory round. **Every student, every time, sees `_ _ _ _`** with "Still Emerging" as a climax. Separately, `calculateMiDimension` divides by signals received, so one click on a musical option scores **Musical 100** and puts it top of "your strongest learning styles".

- [ ] **Step 1: Write the failing reveal test**

```tsx
  it("never shows an unfillable four-letter card", async () => {
    // Session 1 gives 2 answers per dichotomy; deriveEmergingType needs 3.
    // The card could only ever render underscores.
    await advanceToPhase("emerging_type");
    expect(screen.queryByText(/Still Emerging/)).toBeNull();
    expect(screen.queryByText(/_\s+_\s+_\s+_/)).toBeNull();
  });

  it("shows a personality reading it can actually evidence", async () => {
    await advanceToPhase("emerging_type");
    expect(screen.getByText(/thinks things through alone before speaking/)).toBeDefined();
  });
```

With this helper, which walks the reveal's phase sequence:

```tsx
const PHASES = ["transition", "riasec", "class_label", "mi_preview", "mbti", "emerging_type"];

async function advanceToPhase(target: string): Promise<void> {
  vi.useFakeTimers();
  render(
    <RevealSequence
      scoreState={scoreState}
      className="Guardian"
      tone="quest"
      resolvedClass={{ primary: "guardian", secondary: null, isNamed: true }}
      onRevealComplete={() => {}}
    />
  );
  // The transition card auto-advances after 2s.
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  vi.useRealTimers();
  for (let i = PHASES.indexOf("riasec"); i < PHASES.indexOf(target); i += 1) {
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
  }
}
```

`scoreState` is the fixture already defined at the top of this test file; add
`mbti: { EI: -80, SN: -60, TF: -70, JP: -50 }` to it if it does not already carry clear
personality scores, so the description has something to state.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/quest/__tests__/reveal-sequence.test.tsx`
Expected: FAIL — "Still Emerging" is present.

- [ ] **Step 3: Replace the beat**

In `components/quest/reveal-sequence.tsx`, remove `<EmergingType />` and the `deriveEmergingType` call from the reveal. In the `emerging_type` phase, render the sentence from `describeCharacter` (already computed for the class card) plus an honest note, tone-aware:

- quest: *"A full four-letter type needs more questions than this chapter asks — Chapter 2 goes deeper."*
- explorer: *"A full personality type needs more questions than this part asks."*

Leave `deriveEmergingType` and its count rule untouched — the dashboard still uses them, and later chapters may legitimately fill letters in.

- [ ] **Step 4: Write the failing learning-styles test**

```ts
import { MIN_MI_SIGNALS, calculateMiDimension } from "@/lib/scoring/mi";

describe("learning styles need more than one click", () => {
  it("does not score a dimension from a single signal", () => {
    expect(calculateMiDimension([1], 1)).toBe(0);
  });

  it("scores once the minimum evidence exists", () => {
    expect(calculateMiDimension([1, 1], 1)).toBe(100);
  });

  it("requires at least two signals", () => {
    expect(MIN_MI_SIGNALS).toBe(2);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run lib/scoring/__tests__/mi.test.ts`
Expected: FAIL — `calculateMiDimension([1], 1)` returns 100.

- [ ] **Step 6: Add the minimum-evidence rule**

In `lib/scoring/mi.ts`, export `MIN_MI_SIGNALS = 2` and return `0` from `calculateMiDimension` when `rawSignals.length < MIN_MI_SIGNALS`, with a comment recording that one click used to produce a full bar at the top of "your strongest learning styles". Update any existing test that asserted a single-signal score.

In `components/charts/mi-preview-bars.tsx`, when every dimension is 0, show the existing "Answer more questions to refine" style note rather than an empty top-three.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run lib/scoring/__tests__/mi.test.ts components/quest/__tests__/reveal-sequence.test.tsx`
Expected: PASS.

- [ ] **Step 8: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add components/quest/reveal-sequence.tsx lib/scoring/mi.ts components/charts/mi-preview-bars.tsx components/quest/__tests__/reveal-sequence.test.tsx lib/scoring/__tests__/mi.test.ts
git commit -m "fix(reveal): stop promising a type and a learning style the data can't fund"
```

---

### Task 6: Close the dead safety valves

**Files:**
- Modify: `app/quest/dashboard/page.tsx:158` (the no-results branch)
- Delete: `components/quest/discovery-mode-prompt.tsx`
- Modify: `hooks/use-quest-state.ts` (remove `discovery_mode_active`, `SHOW_DISCOVERY`, the mild-run detection), `app/quest/session/[id]/page.tsx` (remove the render branch), `lib/persistence/session-snapshot.ts` (remove `"discovery_prompt"` from `VALID_FLOW_PHASES`)
- Test: `app/quest/dashboard/__tests__/no-results.test.tsx` (new)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new.

**Why (rescue path):** `SaveFailedScreen` tells the student *"Your answers are safe on this device"*, and the dashboard has a matching recovery branch. But that branch only runs when **no** `assessment_scores` row exists — and `provisionStudent` creates a zeroed row at character creation. So a student whose save failed sees a fully rendered profile of zeros: every bar at 0, "CLASS: Wanderer", contradicting both the completion they just experienced and the promise they were given.

**Why (discovery mode):** three consecutive mild answers set `discovery_mode_active`, which nothing reads. `SHOW_DISCOVERY` is dispatched nowhere, so the screen promising *"you'll choose between two options — no middle ground"* can never render, and no code changes the question format anyway. A promise with no implementation is worse than no promise. Record it for Chapter 2 in the spec's out-of-scope list; delete the code.

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const h = vi.hoisted(() => ({
  student: { name: "Sam", age: 15, avatar_class: "wanderer", tone: "quest", current_session: 0, has_completed_session1: false, self_map: null },
  scores: {
    riasec_scores: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
    mi_scores: {}, mbti_indicators: { EI: 0, SN: 0, TF: 0, JP: 0 },
    mbti_raw_counts: null, values_compass: {}, strengths: [],
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: "student-1" } } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: table === "students" ? h.student : h.scores, error: null,
          }),
        }),
      }),
    }),
  }),
}));

import Dashboard from "@/app/quest/dashboard/page";

afterEach(() => cleanup());

describe("dashboard with an unfinished quest", () => {
  it("does not render a profile of zeros for a student who has not finished", async () => {
    render(<Dashboard />);
    // provisionStudent creates a zeroed scores row at character creation, so
    // the row existing does not mean there are results.
    expect(await screen.findByText(/haven't saved yet|No results yet/)).toBeDefined();
    expect(screen.queryByText(/CLASS:/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/quest/dashboard/__tests__/no-results.test.tsx`
Expected: FAIL — a full profile of zeros renders.

- [ ] **Step 3: Gate on completion, not on the row existing**

In `app/quest/dashboard/page.tsx`, change the guard at line 158 from `if (!student || !scores)` to also treat an unfinished quest as no results:

```tsx
  // A zeroed assessment_scores row is created at character creation, so its
  // existence never meant the student has results. Completion does.
  if (!student || !scores || !student.has_completed_session1) {
```

The existing `hasUnsavedCheckpoint` branch inside it already offers the rescue path, so a failed-save student now reaches it.

- [ ] **Step 4: Remove discovery mode**

Delete `components/quest/discovery-mode-prompt.tsx`. Remove from `hooks/use-quest-state.ts`: the `"discovery_prompt"` flow phase, the `SHOW_DISCOVERY` and `DISMISS_DISCOVERY` actions, `discovery_mode_active` from `QuestState` and `INITIAL_STATE`, `consecutiveMild`, `isMildAnswer`, `shouldTriggerDiscoveryMode`, `CONSECUTIVE_MILD_THRESHOLD`, and the detection block inside `ANSWER_QUESTION`. Remove the import and render branch from `app/quest/session/[id]/page.tsx`. Remove `"discovery_prompt"` from `VALID_FLOW_PHASES` in `lib/persistence/session-snapshot.ts` — and **do not** bump `SNAPSHOT_VERSION`, since no shipped checkpoint can contain that phase (it was unreachable).

Update or delete tests referencing any of those names.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run app/quest/dashboard/__tests__/no-results.test.tsx && npm test`
Expected: PASS.

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add app/quest/dashboard/page.tsx app/quest/dashboard/__tests__/no-results.test.tsx hooks/use-quest-state.ts "app/quest/session/[id]/page.tsx" lib/persistence/session-snapshot.ts components/quest/discovery-mode-prompt.tsx
git commit -m "fix(quest): close two safety valves wired to conditions that never fire"
```

---

### Task 7: Stop shared devices destroying a student's work

**Files:**
- Modify: `lib/persistence/provision-student.ts:60-80`, `app/page.tsx` (the "Start a new quest instead" control), `app/quest/character/page.tsx`
- Create: `components/quest/replace-profile-confirm.tsx`
- Test: `components/quest/__tests__/replace-profile-confirm.test.tsx` (new), `lib/persistence/__tests__/provision-student.test.ts` (extend)

**Interfaces:**
- Consumes: `provisionStudent(profile: StudentProfile): Promise<ProvisionResult>`.
- Produces: `<ReplaceProfileConfirm existingName tone onConfirm onCancel />`; `StudentProfile` gains `confirmedReplace?: boolean`.

**Why:** `provisionStudent` reuses the browser's existing anonymous account. On a shared classroom device, the second student tapping **"Start a new quest instead"** overwrites the first student's profile and deletes their `session_responses` and `achievements`. That is the default classroom setup, and the loss is silent and unrecoverable.

**On a previous decision:** wave 2 deliberately chose to reuse the auth user and overwrite in place, rather than mint a new anonymous user, specifically to avoid orphaning minors' assessment data. **This task does not reverse that.** It requires informed consent before the destructive path runs.

- [ ] **Step 1: Write the failing confirmation test**

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ReplaceProfileConfirm from "@/components/quest/replace-profile-confirm";

afterEach(() => cleanup());

describe("ReplaceProfileConfirm", () => {
  it("names whose work is about to be deleted", () => {
    render(<ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={() => {}} onCancel={() => {}} />);
    // A second student on a classroom laptop must recognise this is not theirs.
    expect(screen.getByText(/Priya/)).toBeDefined();
    expect(screen.getByText(/deleted|erased|lost/i)).toBeDefined();
  });

  it("makes cancelling the easy path", () => {
    const onCancel = vi.fn();
    render(<ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /keep|cancel|back/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("only destroys on an explicit confirmation", () => {
    const onConfirm = vi.fn();
    render(<ReplaceProfileConfirm existingName="Priya" tone="quest" onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /delete|start over|replace/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/quest/__tests__/replace-profile-confirm.test.tsx`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Build the confirmation**

```tsx
"use client";

interface ReplaceProfileConfirmProps {
  existingName: string;
  tone: "quest" | "explorer";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Consent before destruction.
 *
 * provisionStudent reuses the browser's anonymous account, so on a shared
 * classroom device the second student tapping "start a new quest" used to
 * overwrite the first student's profile and delete their answers and badges,
 * silently and unrecoverably. That is the default classroom setup.
 */
export default function ReplaceProfileConfirm({
  existingName,
  tone,
  onConfirm,
  onCancel,
}: ReplaceProfileConfirmProps): React.JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="text-4xl" aria-hidden="true">{"\u{26A0}\u{FE0F}"}</span>

      <h1 className="text-xl font-semibold text-white">
        This device is signed in as {existingName}
      </h1>

      <p className="text-sm text-white/70 max-w-xs">
        Starting a new quest will <strong>delete {existingName}&apos;s answers and
        badges</strong>. They cannot be recovered.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl bg-[var(--cq-primary,#8b5cf6)] px-8 py-3 font-semibold text-white shadow-[0_0_20px_var(--cq-glow,rgba(139,92,246,0.3))] min-h-[44px]"
        >
          Keep {existingName}&apos;s quest
        </button>
        <button
          onClick={onConfirm}
          className="rounded-xl border border-white/20 px-8 py-3 font-medium text-white/60 min-h-[44px]"
        >
          {tone === "quest" ? "Delete it and start over" : "Delete and start again"}
        </button>
      </div>

      <p className="text-xs text-white/40 max-w-xs">
        Not {existingName}? This device is still signed in as them. Ask your teacher to sign
        you in on your own device.
      </p>
    </div>
  );
}
```

Cancel is deliberately the visually primary action; the destructive path is the quiet one.

- [ ] **Step 4: Refuse to destroy without consent**

In `lib/persistence/provision-student.ts`, add `confirmedReplace?: boolean` to `StudentProfile`. When an existing student row is found (`replacedExisting` is true) and `confirmedReplace` is not true, return `{ success: false }` **without deleting anything** — no `session_responses` delete, no `achievements` delete, no upsert. Add a test asserting that path performs zero destructive calls.

- [ ] **Step 5: Wire the screen in**

In `app/quest/character/page.tsx`, before provisioning, check whether an existing student row belongs to this browser's account. If so, show `ReplaceProfileConfirm` with that student's name and only call `provisionStudent({ ..., confirmedReplace: true })` after the student confirms.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run components/quest/__tests__/replace-profile-confirm.test.tsx lib/persistence/__tests__/provision-student.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add components/quest/replace-profile-confirm.tsx components/quest/__tests__/replace-profile-confirm.test.tsx lib/persistence/provision-student.ts lib/persistence/__tests__/provision-student.test.ts app/quest/character/page.tsx app/page.tsx
git commit -m "fix(character): require consent before erasing another student's quest"
```

---

### Task 8: Stop promising a Chapter 2 that does not exist

**Files:**
- Modify: `app/quest/dashboard/page.tsx` (three call sites), `components/charts/mi-preview-bars.tsx`, `components/charts/values-sliders.tsx`, `components/quest/reveal-sequence.tsx`
- Test: `app/quest/dashboard/__tests__/chapter-promises.test.tsx` (new)

**Interfaces:**
- Consumes: `chapterLabel(n, tone)` from `@/lib/copy/chapter`.
- Produces: nothing new.

**Why:** six places promise Chapter 2, the strongest being the reveal's *"Chapter 2 will deepen these results."* The XP bar sits full at 450/450 with nothing left to earn, and the Quest Log lists Chapters 2–4 by name. Nothing behind any of it exists.

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const FILES = [
  "app/quest/dashboard/page.tsx",
  "components/charts/mi-preview-bars.tsx",
  "components/charts/values-sliders.tsx",
  "components/quest/reveal-sequence.tsx",
];

describe("chapter promises", () => {
  it("never states Chapter 2 as a certainty", () => {
    for (const file of FILES) {
      const source = readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
      expect(source, `${file} promises Chapter 2 will happen`).not.toMatch(
        /will deepen|Deepens in/
      );
    }
  });
});
```

Adjust the relative path so it resolves from the test's location; verify it resolves rather than assuming.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/quest/dashboard/__tests__/chapter-promises.test.tsx`
Expected: FAIL — "will deepen" and "Deepens in" are present.

- [ ] **Step 3: Soften the copy**

Replace certainties with honest phrasing, keeping both tones:

| Was | Becomes |
|---|---|
| "Chapter 2 will deepen these results." | "More chapters are planned — they'll build on this." |
| "Deepens in Chapter 2" (×2) | "More to come" |
| "More detail in Chapter 2" | "More detail to come" |
| "More dimensions in Chapter 2" | "More dimensions to come" |

Leave the disabled "Begin Chapter 2 — Coming soon" button as it is: it is visibly disabled and does not assert a promise.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/quest/dashboard/__tests__/chapter-promises.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
git add app/quest/dashboard/ components/charts/mi-preview-bars.tsx components/charts/values-sliders.tsx components/quest/reveal-sequence.tsx
git commit -m "fix(copy): stop stating a Chapter 2 that does not exist"
```

---

## Deployment

This project has **no GitHub integration** — pushing does not deploy.

```bash
git push origin HEAD:main
npx vercel --prod --yes
```

Verify against the live bundle rather than the deploy message:

```bash
HTML=$(curl -s https://career-quest-coral.vercel.app/quest/session/1)
for f in $(echo "$HTML" | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u); do
  curl -s "https://career-quest-coral.vercel.app$f" | grep -q "You are a" && echo "naming screen live in $f"
done
```

## Known risks

1. **Task 1 undoes part of an earlier change.** The warm-up rewrite of 2026-08-03 balanced one option per interest type per question. That balancing no longer affects interests — it still governs strengths, where each question offers six distinct signals.
2. **The confirmatory round can still move the bars after the class is locked.** Naming happens partway through the interest block and the lock holds through the rest of the quest, so five confirmatory answers could in principle shift the top interest without changing the class. This is deliberate — the lock exists so the class does not flicker — but it means the anti-contradiction guarantee in Task 2 is "at the moment of naming", not "forever". Revisit if it shows up in real use.
3. **Task 6 deletes a feature rather than building it.** Discovery mode is a good idea with no implementation; it belongs in Chapter 2's design, not in dead code.
