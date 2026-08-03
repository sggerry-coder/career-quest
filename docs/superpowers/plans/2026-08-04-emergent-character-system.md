# Emergent Character System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop asking students to pick a class before the app knows anything about them; let the class crystallise from their answers, with the theme, relics and a written description following from it.

**Architecture:** A new `lib/character/` module owns three pure layers — class (from interests), relics (from demonstrated strengths), description (from personality and values). Nothing new is stored: `students.avatar_class` already exists and now holds what the student *became*. `deriveClassLabel` in `lib/scoring/riasec.ts` is reused unchanged; the new code is a naming and presentation layer over it.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, Framer Motion, Vitest + @testing-library/react.

## Global Constraints

- **No database migrations.** `students.avatar_class` already exists and is already written. Relics and descriptions are derived at render time from `strengths`, `riasec_scores`, `mbti_indicators` and `values_compass`, which are already stored.
- **Zero API cost.** Chapters 1–2 make no Claude API calls. Descriptions are template-generated client-side.
- **Relics never modify a score.** They display traits already measured. A relic that changed a number would make the profile a measure of loot rather than the student.
- **The app never names a student before it has earned the right to.** The existing thresholds in `deriveClassLabel` decide this. No new scoring maths is introduced anywhere in this plan.
- **Class names, exactly:** Warsmith (Maker/R), Mage (Investigator/I), Bard (Creator/A), Guardian (Helper/S), Vanguard (Leader/E), Paladin (Organizer/C), Rogue (open, from `EXPLORER`), Wanderer (not yet formed, from `SEEKER`; also the starting state). Duals join with a hyphen: `Guardian-Mage`.
- **Two tones everywhere.** `quest` and `explorer`. Every user-visible string needs both.
- **Display text only for the rename.** "Session" becomes "Chapter" (quest) / "Part" (explorer) in UI copy. Route paths, database columns (`has_completed_session1`, `current_session`), type names and variable names keep the word `session`.
- **Test convention:** component and hook tests carry a `/** @vitest-environment jsdom */` docblock. Run with `npx vitest run <path>`.
- **Verification gates before every commit:** `npx tsc --noEmit`, `npm run lint`, `npm test`.

---

### Task 1: Character class registry and derivation

**Files:**
- Create: `lib/character/classes.ts`
- Test: `lib/character/__tests__/classes.test.ts`

**Interfaces:**
- Consumes: `deriveClassLabel(scores: Record<string, number>): string` from `@/lib/scoring/riasec`. Returns one of `"MAKER"`, `"INVESTIGATOR"`, `"CREATOR"`, `"HELPER"`, `"LEADER"`, `"ORGANIZER"`, a hyphenated pair like `"MAKER-INVESTIGATOR"`, `"EXPLORER"`, or `"SEEKER"`.
- Produces:
  - `type CharacterClassId = "warsmith" | "mage" | "bard" | "guardian" | "vanguard" | "paladin" | "rogue" | "wanderer"`
  - `interface CharacterClass { id: CharacterClassId; name: { quest: string; explorer: string }; icon: string }`
  - `CHARACTER_CLASSES: Record<CharacterClassId, CharacterClass>`
  - `deriveCharacterClass(riasec: Record<string, number>): DerivedClass` where `interface DerivedClass { primary: CharacterClassId; secondary: CharacterClassId | null; isNamed: boolean }`
  - `characterClassDisplayName(derived: DerivedClass, tone: "quest" | "explorer"): string`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  deriveCharacterClass,
  characterClassDisplayName,
  CHARACTER_CLASSES,
} from "@/lib/character/classes";

/** Scores that make deriveClassLabel return a single strong type. */
const strongHelper = { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 };
/** Two strong types, third well behind → dual class. */
const helperAndInvestigator = { R: 10, I: 80, A: 20, S: 90, E: 20, C: 10 };
/** Nothing above 40 → not enough signal. */
const noSignal = { R: 10, I: 20, A: 20, S: 30, E: 20, C: 10 };
/** Middling with no clear lead → genuinely open. */
const open = { R: 45, I: 55, A: 52, S: 50, E: 48, C: 45 };

describe("deriveCharacterClass", () => {
  it("names a single strong interest", () => {
    const d = deriveCharacterClass(strongHelper);
    expect(d.primary).toBe("guardian");
    expect(d.secondary).toBeNull();
    expect(d.isNamed).toBe(true);
  });

  it("names two strong interests as a dual class", () => {
    const d = deriveCharacterClass(helperAndInvestigator);
    expect(d.primary).toBe("guardian");
    expect(d.secondary).toBe("mage");
    expect(d.isNamed).toBe(true);
  });

  it("returns Wanderer, not a guess, when there is not enough signal", () => {
    const d = deriveCharacterClass(noSignal);
    expect(d.primary).toBe("wanderer");
    expect(d.isNamed).toBe(false);
  });

  it("returns Rogue for a genuinely open profile", () => {
    const d = deriveCharacterClass(open);
    expect(d.primary).toBe("rogue");
    // Open is a real answer, so the student IS named.
    expect(d.isNamed).toBe(true);
  });

  it("returns Wanderer for empty scores", () => {
    expect(deriveCharacterClass({}).primary).toBe("wanderer");
    expect(deriveCharacterClass({}).isNamed).toBe(false);
  });
});

describe("characterClassDisplayName", () => {
  it("joins a dual class with a hyphen in quest tone", () => {
    const d = deriveCharacterClass(helperAndInvestigator);
    expect(characterClassDisplayName(d, "quest")).toBe("Guardian-Mage");
  });

  it("uses plain names in explorer tone", () => {
    const d = deriveCharacterClass(strongHelper);
    expect(characterClassDisplayName(d, "explorer")).toBe("Helper");
  });
});

describe("CHARACTER_CLASSES", () => {
  it("has a quest and explorer name plus an icon for all eight", () => {
    const ids = Object.keys(CHARACTER_CLASSES);
    expect(ids).toHaveLength(8);
    for (const id of ids) {
      const c = CHARACTER_CLASSES[id as keyof typeof CHARACTER_CLASSES];
      expect(c.name.quest.length).toBeGreaterThan(0);
      expect(c.name.explorer.length).toBeGreaterThan(0);
      expect(c.icon.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/character/__tests__/classes.test.ts`
Expected: FAIL — cannot resolve `@/lib/character/classes`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { deriveClassLabel } from "@/lib/scoring/riasec";

/**
 * The class a student becomes, derived from what they are drawn to.
 *
 * Not chosen. Character creation used to ask for an avatar class before the
 * app knew anything about the student, and the answer drove the theme for the
 * whole quest. This layer renames what deriveClassLabel already computes from
 * their actual answers — no new scoring maths.
 */

export type CharacterClassId =
  | "warsmith"
  | "mage"
  | "bard"
  | "guardian"
  | "vanguard"
  | "paladin"
  | "rogue"
  | "wanderer";

export interface CharacterClass {
  id: CharacterClassId;
  name: { quest: string; explorer: string };
  icon: string;
}

export const CHARACTER_CLASSES: Record<CharacterClassId, CharacterClass> = {
  warsmith: { id: "warsmith", name: { quest: "Warsmith", explorer: "Maker" }, icon: "\u{1F528}" },
  mage: { id: "mage", name: { quest: "Mage", explorer: "Investigator" }, icon: "\u{1F52E}" },
  bard: { id: "bard", name: { quest: "Bard", explorer: "Creator" }, icon: "\u{1F3AD}" },
  guardian: { id: "guardian", name: { quest: "Guardian", explorer: "Helper" }, icon: "\u{1F6E1}\u{FE0F}" },
  vanguard: { id: "vanguard", name: { quest: "Vanguard", explorer: "Leader" }, icon: "\u{1F6A9}" },
  paladin: { id: "paladin", name: { quest: "Paladin", explorer: "Organizer" }, icon: "\u{2696}\u{FE0F}" },
  rogue: { id: "rogue", name: { quest: "Rogue", explorer: "Explorer" }, icon: "\u{1F5DD}\u{FE0F}" },
  wanderer: { id: "wanderer", name: { quest: "Wanderer", explorer: "Still forming" }, icon: "\u{1F9ED}" },
};

/** deriveClassLabel's vocabulary → ours. */
const LABEL_TO_CLASS: Record<string, CharacterClassId> = {
  MAKER: "warsmith",
  INVESTIGATOR: "mage",
  CREATOR: "bard",
  HELPER: "guardian",
  LEADER: "vanguard",
  ORGANIZER: "paladin",
  EXPLORER: "rogue",
  SEEKER: "wanderer",
};

export interface DerivedClass {
  primary: CharacterClassId;
  secondary: CharacterClassId | null;
  /**
   * False only for Wanderer. Rogue counts as named: "open to anything" is a
   * real answer, whereas Wanderer means we do not know yet.
   */
  isNamed: boolean;
}

export function deriveCharacterClass(
  riasec: Record<string, number>
): DerivedClass {
  const label = deriveClassLabel(riasec);
  const [firstLabel, secondLabel] = label.split("-");

  const primary = LABEL_TO_CLASS[firstLabel] ?? "wanderer";
  const secondary = secondLabel ? LABEL_TO_CLASS[secondLabel] ?? null : null;

  return { primary, secondary, isNamed: primary !== "wanderer" };
}

export function characterClassDisplayName(
  derived: DerivedClass,
  tone: "quest" | "explorer"
): string {
  const first = CHARACTER_CLASSES[derived.primary].name[tone];
  if (!derived.secondary) return first;
  return `${first}-${CHARACTER_CLASSES[derived.secondary].name[tone]}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/character/__tests__/classes.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/character/classes.ts lib/character/__tests__/classes.test.ts
git commit -m "feat(character): derive the class from interests instead of asking"
```

---

### Task 2: Eight class palettes

**Files:**
- Modify: `app/globals.css:48-73` (theme blocks)
- Modify: `lib/theme.ts:1` (`ThemeName` union), `lib/theme.ts:27-47` (`themes` record), `lib/theme.ts:117-122` (`applyClassTheme`)
- Create: `lib/character/theme-map.ts`
- Test: `lib/character/__tests__/theme-map.test.ts`

**Interfaces:**
- Consumes: `CharacterClassId`, `CHARACTER_CLASSES` from Task 1.
- Produces: `CLASS_THEME: Record<CharacterClassId, ThemeName>` and `themeForCharacterClass(id: CharacterClassId): ThemeName`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { CLASS_THEME, themeForCharacterClass } from "@/lib/character/theme-map";
import { CHARACTER_CLASSES } from "@/lib/character/classes";
import { themes } from "@/lib/theme";

describe("class palettes", () => {
  it("gives every class its own theme, with no silent fallback", () => {
    const ids = Object.keys(CHARACTER_CLASSES);
    for (const id of ids) {
      const theme = themeForCharacterClass(id as keyof typeof CHARACTER_CLASSES);
      expect(themes[theme], `${id} must map to a real palette`).toBeDefined();
    }
  });

  it("gives each class a distinct palette", () => {
    const used = Object.values(CLASS_THEME);
    expect(new Set(used).size).toBe(used.length);
  });

  it("starts the Wanderer colourless", () => {
    expect(themeForCharacterClass("wanderer")).toBe("wanderer-slate");
    expect(themes["wanderer-slate"].primary).toBe("#475569");
  });

  it("keeps corner radius as part of a class's character", () => {
    // Paladin brings order: near-square. Bard is fluid: very round.
    expect(themes[themeForCharacterClass("paladin")].borderRadius).toBe("4px");
    expect(themes[themeForCharacterClass("bard")].borderRadius).toBe("20px");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/character/__tests__/theme-map.test.ts`
Expected: FAIL — cannot resolve `@/lib/character/theme-map`.

- [ ] **Step 3: Add the palettes to `app/globals.css`**

Insert after the existing `[data-theme="blue-indigo"]` block (currently ending at line 73):

```css
/* --- Class palettes (2026-08-04). Colour AND corner radius express the
       class. Primaries are chosen to clear ~4.5:1 against white text; verify
       in-browser against the real dark background. --- */

[data-theme="wanderer-slate"] {
  --cq-primary: #475569;
  --cq-accent: #94a3b8;
  --cq-glow: rgba(71, 85, 105, 0.4);
  --cq-glow-accent: rgba(148, 163, 184, 0.3);
  --cq-radius: 10px;
}

[data-theme="guardian-jade"] {
  --cq-primary: #059669;
  --cq-accent: #6ee7b7;
  --cq-glow: rgba(5, 150, 105, 0.45);
  --cq-glow-accent: rgba(110, 231, 183, 0.3);
  --cq-radius: 16px;
}

[data-theme="paladin-steel"] {
  --cq-primary: #3b82f6;
  --cq-accent: #38bdf8;
  --cq-glow: rgba(59, 130, 246, 0.4);
  --cq-glow-accent: rgba(56, 189, 248, 0.3);
  --cq-radius: 4px;
}

[data-theme="vanguard-gold"] {
  --cq-primary: #b45309;
  --cq-accent: #fbbf24;
  --cq-glow: rgba(180, 83, 9, 0.45);
  --cq-glow-accent: rgba(251, 191, 36, 0.3);
  --cq-radius: 12px;
}

[data-theme="bard-magenta"] {
  --cq-primary: #db2777;
  --cq-accent: #f0abfc;
  --cq-glow: rgba(219, 39, 119, 0.45);
  --cq-glow-accent: rgba(240, 171, 252, 0.3);
  --cq-radius: 20px;
}

[data-theme="warsmith-copper"] {
  --cq-primary: #c2410c;
  --cq-accent: #fb923c;
  --cq-glow: rgba(194, 65, 12, 0.45);
  --cq-glow-accent: rgba(251, 146, 60, 0.3);
  --cq-radius: 8px;
}

[data-theme="rogue-teal"] {
  --cq-primary: #0d9488;
  --cq-accent: #5eead4;
  --cq-glow: rgba(13, 148, 136, 0.45);
  --cq-glow-accent: rgba(94, 234, 212, 0.3);
  --cq-radius: 14px;
}
```

- [ ] **Step 4: Extend the theme module**

In `lib/theme.ts`, replace the `ThemeName` union on line 1:

```ts
export type ThemeName =
  | "purple-teal"
  | "magenta-violet"
  | "blue-indigo"
  | "wanderer-slate"
  | "guardian-jade"
  | "paladin-steel"
  | "vanguard-gold"
  | "bard-magenta"
  | "warsmith-copper"
  | "rogue-teal";
```

Add these entries to the `themes` record (after `"blue-indigo"`), mirroring the CSS exactly:

```ts
  "wanderer-slate": { name: "wanderer-slate", primary: "#475569", accent: "#94a3b8", glow: "rgba(71,85,105,0.4)", borderRadius: "10px" },
  "guardian-jade": { name: "guardian-jade", primary: "#059669", accent: "#6ee7b7", glow: "rgba(5,150,105,0.45)", borderRadius: "16px" },
  "paladin-steel": { name: "paladin-steel", primary: "#3b82f6", accent: "#38bdf8", glow: "rgba(59,130,246,0.4)", borderRadius: "4px" },
  "vanguard-gold": { name: "vanguard-gold", primary: "#b45309", accent: "#fbbf24", glow: "rgba(180,83,9,0.45)", borderRadius: "12px" },
  "bard-magenta": { name: "bard-magenta", primary: "#db2777", accent: "#f0abfc", glow: "rgba(219,39,119,0.45)", borderRadius: "20px" },
  "warsmith-copper": { name: "warsmith-copper", primary: "#c2410c", accent: "#fb923c", glow: "rgba(194,65,12,0.45)", borderRadius: "8px" },
  "rogue-teal": { name: "rogue-teal", primary: "#0d9488", accent: "#5eead4", glow: "rgba(13,148,136,0.45)", borderRadius: "14px" },
```

- [ ] **Step 5: Write `lib/character/theme-map.ts`**

```ts
import type { ThemeName } from "@/lib/theme";
import type { CharacterClassId } from "@/lib/character/classes";

/**
 * One palette per class. Mage keeps the original purple-teal values and
 * Paladin keeps blue-indigo's, so two of the eight are the themes the app
 * already shipped.
 */
export const CLASS_THEME: Record<CharacterClassId, ThemeName> = {
  wanderer: "wanderer-slate",
  mage: "purple-teal",
  guardian: "guardian-jade",
  paladin: "paladin-steel",
  vanguard: "vanguard-gold",
  bard: "bard-magenta",
  warsmith: "warsmith-copper",
  rogue: "rogue-teal",
};

export function themeForCharacterClass(id: CharacterClassId): ThemeName {
  return CLASS_THEME[id];
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run lib/character/__tests__/theme-map.test.ts`
Expected: PASS, 4 tests.

Note: the "distinct palette" test will fail if `paladin` and any other class both map to `blue-indigo`. Paladin maps to `paladin-steel`, which duplicates blue-indigo's *values* but is a separate name — that is intentional so the two can diverge later.

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add app/globals.css lib/theme.ts lib/character/theme-map.ts lib/character/__tests__/theme-map.test.ts
git commit -m "feat(theme): a palette and a corner radius per character class"
```

---

### Task 3: Relics

**Files:**
- Create: `lib/character/relics.ts`
- Test: `lib/character/__tests__/relics.test.ts`

**Interfaces:**
- Consumes: `accumulateStrengths(signals: string[]): Record<string, number>` from `@/lib/scoring/strengths`. Strength names are exactly: `Achiever`, `Ideation`, `Empathy`, `Command`, `Creativity`, `Analytical`, `Communication`, `Adaptability`.
- Produces: `interface Relic { id: string; name: string; icon: string; strength: string; timesShown: number }` and `earnedRelics(strengthSignals: string[]): Relic[]`, plus `RELIC_THRESHOLD = 2`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { earnedRelics, RELIC_THRESHOLD } from "@/lib/character/relics";
import { calculateRiasecType } from "@/lib/scoring/riasec";

describe("earnedRelics", () => {
  it("awards nothing for a single demonstration", () => {
    expect(earnedRelics(["Empathy"])).toEqual([]);
  });

  it("awards a relic at exactly the threshold", () => {
    const relics = earnedRelics(["Empathy", "Empathy"]);
    expect(relics).toHaveLength(1);
    expect(relics[0].name).toBe("Healer's Kit");
    expect(relics[0].timesShown).toBe(RELIC_THRESHOLD);
  });

  it("records how many times the trait was shown, for the 'why'", () => {
    const relics = earnedRelics(["Empathy", "Empathy", "Empathy"]);
    expect(relics[0].timesShown).toBe(3);
  });

  it("awards several relics, most demonstrated first", () => {
    const relics = earnedRelics([
      "Command", "Command",
      "Analytical", "Analytical", "Analytical",
    ]);
    expect(relics.map((r) => r.name)).toEqual([
      "Truthseeker's Lens",
      "Rallying Banner",
    ]);
  });

  it("ignores a strength it has no relic for rather than crashing", () => {
    expect(earnedRelics(["Nonsense", "Nonsense"])).toEqual([]);
  });

  it("returns nothing for no signals", () => {
    expect(earnedRelics([])).toEqual([]);
  });
});

describe("relics never touch a score", () => {
  it("leaves interest scores identical whether or not relics were earned", () => {
    const answers = [4, 4, 3];
    const before = calculateRiasecType(answers);
    // Earning relics is a read of the same data, never a write.
    earnedRelics(["Empathy", "Empathy", "Command", "Command"]);
    expect(calculateRiasecType(answers)).toBe(before);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/character/__tests__/relics.test.ts`
Expected: FAIL — cannot resolve `@/lib/character/relics`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { accumulateStrengths } from "@/lib/scoring/strengths";

/**
 * Relics are earned representations of traits the student demonstrated.
 *
 * They are displayed, never applied. A relic that raised a score would make
 * the profile a measure of the student's loot instead of the student, and two
 * identical sets of answers would produce different results.
 */

export const RELIC_THRESHOLD = 2;

export interface Relic {
  id: string;
  name: string;
  icon: string;
  strength: string;
  /** How many times the student showed this trait. Used for the "why". */
  timesShown: number;
}

const RELIC_BY_STRENGTH: Record<string, { id: string; name: string; icon: string }> = {
  Achiever: { id: "finishers_seal", name: "Finisher's Seal", icon: "\u{1F3C5}" },
  Ideation: { id: "spark_stone", name: "Spark Stone", icon: "\u{1F4A0}" },
  Empathy: { id: "healers_kit", name: "Healer's Kit", icon: "\u{1F9EA}" },
  Command: { id: "rallying_banner", name: "Rallying Banner", icon: "\u{1F6A9}" },
  Creativity: { id: "dreamers_brush", name: "Dreamer's Brush", icon: "\u{1F58C}\u{FE0F}" },
  Analytical: { id: "truthseekers_lens", name: "Truthseeker's Lens", icon: "\u{1F50D}" },
  Communication: { id: "orators_ring", name: "Orator's Ring", icon: "\u{1F48D}" },
  Adaptability: { id: "travellers_boots", name: "Traveller's Boots", icon: "\u{1F97E}" },
};

export function earnedRelics(strengthSignals: string[]): Relic[] {
  const counts = accumulateStrengths(strengthSignals);

  return Object.entries(counts)
    .filter(([strength, count]) => count >= RELIC_THRESHOLD && RELIC_BY_STRENGTH[strength])
    .map(([strength, count]) => ({
      ...RELIC_BY_STRENGTH[strength],
      strength,
      timesShown: count,
    }))
    .sort((a, b) => b.timesShown - a.timesShown);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/character/__tests__/relics.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/character/relics.ts lib/character/__tests__/relics.test.ts
git commit -m "feat(character): relics that show what a student demonstrated"
```

---

### Task 4: Character description

**Files:**
- Create: `lib/character/description.ts`
- Test: `lib/character/__tests__/description.test.ts`

**Interfaces:**
- Consumes: `DerivedClass` and `characterClassDisplayName` (Task 1); `isStillEmerging(score: number): boolean` from `@/lib/scoring/mbti`.
- Produces: `describeCharacter(input: DescribeInput): string` where
  `interface DescribeInput { derived: DerivedClass; tone: "quest" | "explorer"; mbti: Record<string, number>; values: Record<string, number> }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { describeCharacter } from "@/lib/character/description";
import { deriveCharacterClass } from "@/lib/character/classes";

const guardian = deriveCharacterClass({ R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 });
const unformed = deriveCharacterClass({ R: 10, I: 20, A: 20, S: 30, E: 20, C: 10 });

/** Well past the still-emerging threshold of 35. */
const clearMbti = { EI: -80, SN: -60, TF: -70, JP: -50 };
/** All inside the threshold — nothing may be asserted. */
const unclearMbti = { EI: 10, SN: -5, TF: 0, JP: 20 };

const clearValues = { security_adventure: -80, income_impact: 0, solo_team: -70 };
const flatValues = { security_adventure: 0, income_impact: 0, solo_team: 0 };

describe("describeCharacter", () => {
  it("leads with the class", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: clearMbti, values: clearValues,
    });
    expect(text.startsWith("A Guardian")).toBe(true);
  });

  it("describes how they go about it when the signal is clear", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: clearMbti, values: clearValues,
    });
    expect(text).toContain("alone");
    expect(text).toContain("steady ground");
  });

  it("omits a personality trait that is still emerging rather than asserting it", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: unclearMbti, values: clearValues,
    });
    expect(text).not.toContain("alone");
    expect(text).not.toContain("out loud");
  });

  it("says so plainly when nothing is certain yet", () => {
    const text = describeCharacter({
      derived: unformed, tone: "quest", mbti: unclearMbti, values: flatValues,
    });
    expect(text).toContain("still taking shape");
    // It must not invent a character.
    expect(text).not.toContain("A Guardian");
  });

  it("uses plain names in explorer tone", () => {
    const text = describeCharacter({
      derived: guardian, tone: "explorer", mbti: clearMbti, values: clearValues,
    });
    expect(text.startsWith("A Helper")).toBe(true);
  });

  it("never leaves a dangling connector when only one trait is known", () => {
    const text = describeCharacter({
      derived: guardian, tone: "quest", mbti: clearMbti, values: flatValues,
    });
    expect(text.trim().endsWith(".")).toBe(true);
    expect(text).not.toContain(" and .");
    expect(text).not.toContain(", .");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/character/__tests__/description.test.ts`
Expected: FAIL — cannot resolve `@/lib/character/description`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { isStillEmerging } from "@/lib/scoring/mbti";
import {
  characterClassDisplayName,
  type DerivedClass,
} from "@/lib/character/classes";

/**
 * A sentence about the student, built from their own answers.
 *
 * Template-generated on the client: Chapters 1-2 make no API calls. It
 * degrades honestly — a personality trait below the still-emerging threshold
 * is left out of the sentence rather than asserted, because a description
 * that invents a character is worse than a short one.
 */

export interface DescribeInput {
  derived: DerivedClass;
  tone: "quest" | "explorer";
  mbti: Record<string, number>;
  values: Record<string, number>;
}

/** Below this a values lean is too close to centre to state. */
const VALUES_THRESHOLD = 20;

function personalityClause(mbti: Record<string, number>): string | null {
  const ei = mbti.EI ?? 0;
  if (isStillEmerging(ei)) return null;
  return ei < 0
    ? "thinks things through alone before speaking"
    : "thinks out loud and works things out with other people";
}

function valuesClause(values: Record<string, number>): string | null {
  const sa = values.security_adventure ?? 0;
  if (Math.abs(sa) < VALUES_THRESHOLD) return null;
  return sa < 0
    ? "would rather have steady ground than a big gamble"
    : "would rather take the gamble than play it safe";
}

export function describeCharacter(input: DescribeInput): string {
  const { derived, tone, mbti, values } = input;

  if (!derived.isNamed) {
    return tone === "quest"
      ? "Still taking shape. Keep going and your path will show itself."
      : "Your profile is still taking shape. A few more answers will sharpen it.";
  }

  const className = characterClassDisplayName(derived, tone);
  const clauses = [personalityClause(mbti), valuesClause(values)].filter(
    (c): c is string => c !== null
  );

  if (clauses.length === 0) {
    return `A ${className}.`;
  }
  return `A ${className} who ${clauses.join(", and ")}.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/character/__tests__/description.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/character/description.ts lib/character/__tests__/description.test.ts
git commit -m "feat(character): describe a student from their own answers"
```

---

### Task 5: Narration for the eight classes

**Files:**
- Modify: `lib/theme.ts:133-373` (replace `classDefinitions`)
- Test: `lib/character/__tests__/narration.test.ts`

**Why this task exists:** narration is keyed on class id, and the ids are changing. It also cannot be class-flavoured before the class is named — a Wanderer has no class to reference — so the early beats (`warmup_intro`, `riasec_intro`) always use Wanderer narration and only the later beats vary.

**Interfaces:**
- Consumes: `CharacterClassId` (Task 1).
- Produces: `classDefinitions` re-keyed to the eight `CharacterClassId` values, same `ClassDefinition` shape as today.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { classDefinitions } from "@/lib/theme";
import { CHARACTER_CLASSES } from "@/lib/character/classes";

describe("narration", () => {
  it("covers every character class", () => {
    const defined = classDefinitions.map((c) => c.id).sort();
    const expected = Object.keys(CHARACTER_CLASSES).sort();
    expect(defined).toEqual(expected);
  });

  it("has both tones for every narration beat", () => {
    for (const def of classDefinitions) {
      for (const [beat, text] of Object.entries(def.narration)) {
        expect(text.quest.length, `${def.id}.${beat}.quest`).toBeGreaterThan(0);
        expect(text.explorer.length, `${def.id}.${beat}.explorer`).toBeGreaterThan(0);
      }
    }
  });

  it("never names a class in the beats that play before naming", () => {
    // warmup_intro and riasec_intro run while the student is still a
    // Wanderer, so they must not reference the class they will become.
    for (const def of classDefinitions) {
      if (def.id === "wanderer") continue;
      const early = `${def.narration.warmup_intro.quest} ${def.narration.riasec_intro.quest}`;
      expect(early, `${def.id} leaks its name early`).not.toContain(
        def.name.quest
      );
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/character/__tests__/narration.test.ts`
Expected: FAIL — `classDefinitions` still holds `warrior`, `sorceress`, `valkyrie`, `huntress`, `ranger`.

- [ ] **Step 3: Replace `classDefinitions` in `lib/theme.ts`**

Replace the whole array (currently lines 133–373). Early beats are identical across classes — they play before the student is named. `group` becomes the palette family.

```ts
/** Beats that play before the class is named. Identical for every class. */
const PRE_NAMING = {
  warmup_intro: {
    quest: "Your story starts here. Let's see who you are...",
    explorer: "Let's begin with a few quick questions...",
  },
  riasec_intro: {
    quest: "Something is taking shape. What pulls you forward?",
    explorer: "Now let's explore what interests you...",
  },
};

export const classDefinitions: ClassDefinition[] = [
  {
    id: "wanderer",
    name: { quest: "Wanderer", explorer: "Still forming" },
    icon: "\u{1F9ED}",
    theme: "wanderer-slate",
    group: "Unclaimed",
    tagline: {
      quest: "No path chosen yet. Every road is still open.",
      explorer: "Your profile is still forming.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "Interests mapped, though the picture is faint. Let's look closer...",
        explorer: "Interests mapped. Let's explore how you work...",
      },
      reveal_intro: {
        quest: "The road is still unfolding...",
        explorer: "Here's what we have so far...",
      },
      badge_unlock: {
        quest: "A first mark on an unwritten story!",
        explorer: "Achievement unlocked!",
      },
    },
  },
  {
    id: "warsmith",
    name: { quest: "Warsmith", explorer: "Maker" },
    icon: "\u{1F528}",
    theme: "warsmith-copper",
    group: "Forge",
    tagline: {
      quest: "What is broken can be made stronger than before.",
      explorer: "You learn by building and fixing.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The forge knows your hands, Warsmith. Now let's learn your temper...",
        explorer: "Interests mapped. Let's explore how you work, Maker...",
      },
      reveal_intro: {
        quest: "The Warsmith's work is revealed...",
        explorer: "Your profile is taking shape, Maker...",
      },
      badge_unlock: {
        quest: "The Warsmith has forged a new mark!",
        explorer: "Achievement unlocked, Maker!",
      },
    },
  },
  {
    id: "mage",
    name: { quest: "Mage", explorer: "Investigator" },
    icon: "\u{1F52E}",
    theme: "purple-teal",
    group: "Arcanum",
    tagline: {
      quest: "Every question is a door. You keep opening them.",
      explorer: "You want to know how things actually work.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The tomes are open, Mage. Now let's read you...",
        explorer: "Interests mapped. Let's explore how you work, Investigator...",
      },
      reveal_intro: {
        quest: "The Mage's reading takes form...",
        explorer: "Your profile is taking shape, Investigator...",
      },
      badge_unlock: {
        quest: "The Mage has inscribed a new sigil!",
        explorer: "Achievement unlocked, Investigator!",
      },
    },
  },
  {
    id: "bard",
    name: { quest: "Bard", explorer: "Creator" },
    icon: "\u{1F3AD}",
    theme: "bard-magenta",
    group: "Chorus",
    tagline: {
      quest: "You make the thing that makes people feel something.",
      explorer: "You think by making.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The song is yours, Bard. Now let's find its key...",
        explorer: "Interests mapped. Let's explore how you work, Creator...",
      },
      reveal_intro: {
        quest: "The Bard's verse comes together...",
        explorer: "Your profile is taking shape, Creator...",
      },
      badge_unlock: {
        quest: "The Bard has struck a new chord!",
        explorer: "Achievement unlocked, Creator!",
      },
    },
  },
  {
    id: "guardian",
    name: { quest: "Guardian", explorer: "Helper" },
    icon: "\u{1F6E1}\u{FE0F}",
    theme: "guardian-jade",
    group: "Covenant",
    tagline: {
      quest: "You stand where someone else would have fallen.",
      explorer: "You're drawn to work that helps people directly.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "You keep watch over others, Guardian. Now let's look at you...",
        explorer: "Interests mapped. Let's explore how you work, Helper...",
      },
      reveal_intro: {
        quest: "The Guardian's shield bears its markings...",
        explorer: "Your profile is taking shape, Helper...",
      },
      badge_unlock: {
        quest: "The Guardian has earned a new emblem!",
        explorer: "Achievement unlocked, Helper!",
      },
    },
  },
  {
    id: "vanguard",
    name: { quest: "Vanguard", explorer: "Leader" },
    icon: "\u{1F6A9}",
    theme: "vanguard-gold",
    group: "Charge",
    tagline: {
      quest: "Someone has to go first. You already have.",
      explorer: "You move things forward and bring people with you.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "The line follows you, Vanguard. Now let's learn your nature...",
        explorer: "Interests mapped. Let's explore how you work, Leader...",
      },
      reveal_intro: {
        quest: "The Vanguard's banner unfurls...",
        explorer: "Your profile is taking shape, Leader...",
      },
      badge_unlock: {
        quest: "The Vanguard has claimed a new honour!",
        explorer: "Achievement unlocked, Leader!",
      },
    },
  },
  {
    id: "paladin",
    name: { quest: "Paladin", explorer: "Organizer" },
    icon: "\u{2696}\u{FE0F}",
    theme: "paladin-steel",
    group: "Order",
    tagline: {
      quest: "Order is not dull. Order is what holds when things break.",
      explorer: "You bring structure to things that lack it.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "Your oath is kept, Paladin. Now let's learn your nature...",
        explorer: "Interests mapped. Let's explore how you work, Organizer...",
      },
      reveal_intro: {
        quest: "The Paladin's oath is set down...",
        explorer: "Your profile is taking shape, Organizer...",
      },
      badge_unlock: {
        quest: "The Paladin has earned a new seal!",
        explorer: "Achievement unlocked, Organizer!",
      },
    },
  },
  {
    id: "rogue",
    name: { quest: "Rogue", explorer: "Explorer" },
    icon: "\u{1F5DD}\u{FE0F}",
    theme: "rogue-teal",
    group: "Free Company",
    tagline: {
      quest: "You keep every door unlocked, including the ones nobody uses.",
      explorer: "You're interested in a lot of things, and that's real.",
    },
    narration: {
      ...PRE_NAMING,
      mbti_intro: {
        quest: "You keep your options open, Rogue. Now let's learn your nature...",
        explorer: "Interests mapped. Let's explore how you work, Explorer...",
      },
      reveal_intro: {
        quest: "The Rogue's many paths lay out...",
        explorer: "Your profile is taking shape, Explorer...",
      },
      badge_unlock: {
        quest: "The Rogue has pocketed a new token!",
        explorer: "Achievement unlocked, Explorer!",
      },
    },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/character/__tests__/narration.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Fix fallout from the id change**

`getThemeForClass` and `getClassName` in `lib/theme.ts` look up `classDefinitions` by id and already fall back safely. Run the full suite and fix any test that hardcodes an old id (`warrior`, `ranger`, `sorceress`, `valkyrie`, `huntress`):

```bash
npm test 2>&1 | grep -E "FAIL|×"
grep -rn "warrior\|sorceress\|valkyrie\|huntress\|\"ranger\"" --include="*.ts" --include="*.tsx" app/ components/ lib/ hooks/ data/
```

Replace each with a current id (`wanderer` for a default, `mage` for a named example).

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add lib/theme.ts lib/character/__tests__/narration.test.ts
git commit -m "feat(narration): rewrite for the eight emergent classes"
```

---

### Task 6: Character creation stops asking

**Files:**
- Modify: `app/quest/character/page.tsx:55-60` (theme-on-select), `:99` (`avatarClass: selectedClass`), and the class-picker markup
- Modify: `lib/persistence/provision-student.ts:85-96`
- Test: `app/quest/character/__tests__/no-class-picker.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime; the student is provisioned as `"wanderer"`.
- Produces: students created with `avatar_class: "wanderer"`, no class chosen, and a chosen
  figure stored at `self_map.figure`.

**On the figure picker:** the spec replaces the gender question with a choice of character
figure — personalisation without asking a 13-year-old to declare their gender to a school
app. It is stored inside the existing `self_map` jsonb column, so no migration.

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  }),
}));

import CharacterPage from "@/app/quest/character/page";

afterEach(() => cleanup());

describe("character creation", () => {
  it("no longer asks the student to pick a class", async () => {
    render(<CharacterPage />);
    // The old picker offered class names as selectable controls.
    for (const name of ["Warsmith", "Mage", "Bard", "Guardian", "Vanguard", "Paladin", "Rogue"]) {
      expect(
        screen.queryByRole("button", { name: new RegExp(name, "i") }),
        `${name} must not be selectable up front`
      ).toBeNull();
    }
  });

  it("still asks for the things it actually needs", async () => {
    render(<CharacterPage />);
    expect(screen.getByLabelText(/name/i)).toBeDefined();
  });

  it("offers a character figure instead of asking for gender", async () => {
    render(<CharacterPage />);
    expect(screen.getAllByRole("radio", { name: /figure/i }).length).toBeGreaterThan(1);
    // Gender is deliberately not asked.
    expect(screen.queryByLabelText(/gender/i)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/quest/character/__tests__/no-class-picker.test.tsx`
Expected: FAIL — class buttons are still rendered.

- [ ] **Step 3: Remove the picker**

In `app/quest/character/page.tsx`:
1. Delete the class-selection step markup and the `selectedClass` state.
2. Delete the `handleClassSelect` callback at lines 55–60 (it calls `applyClassTheme` on selection).
3. At line 99, replace `avatarClass: selectedClass` with `avatarClass: "wanderer"`.
4. Remove `applyClassTheme` from the imports if now unused.
5. Remove `selectedClass` from any `canSubmit` / validation expression, so a student is no longer blocked on choosing one.

Add the figure picker in place of the class step. Figures are deliberately neutral
silhouettes, not gendered:

```tsx
const FIGURES = [
  { id: "figure_a", emoji: "\u{1F9CD}", label: "Figure A" },
  { id: "figure_b", emoji: "\u{1F9CE}", label: "Figure B" },
  { id: "figure_c", emoji: "\u{1F9D1}", label: "Figure C" },
  { id: "figure_d", emoji: "\u{1F464}", label: "Figure D" },
];

<div role="radiogroup" aria-label="Choose your figure" className="flex gap-3">
  {FIGURES.map((f) => (
    <button
      key={f.id}
      role="radio"
      aria-checked={figure === f.id}
      aria-label={f.label}
      onClick={() => setFigure(f.id)}
      className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-3xl transition-colors ${
        figure === f.id
          ? "border-[var(--cq-primary)] bg-[var(--cq-primary)]/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <span aria-hidden="true">{f.emoji}</span>
    </button>
  ))}
</div>
```

Pass it through to provisioning alongside the curiosities, which already write to
`self_map`. In `lib/persistence/provision-student.ts` extend the profile input with
`figure: string` and change the `self_map` write at line 93 to:

```ts
      self_map: { curiosities: profile.curiosities, figure: profile.figure },
```

The `avatar_class` written at line 90 now comes through as `"wanderer"` — no code change
needed there, but add a comment above the upsert:

```ts
    // avatar_class starts as "wanderer" and is overwritten as the class
    // crystallises during the quest. It records what the student became,
    // not what they picked.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/quest/character/__tests__/no-class-picker.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add app/quest/character/page.tsx lib/persistence/provision-student.ts app/quest/character/__tests__/no-class-picker.test.tsx
git commit -m "feat(character): stop asking students to pick a class"
```

---

### Task 7: The class crystallises during the quest

**Files:**
- Modify: `app/quest/session/[id]/page.tsx` — add a class-derivation effect near the existing theme handling
- Create: `hooks/use-emergent-class.ts`
- Test: `hooks/__tests__/use-emergent-class.test.ts`

**Interfaces:**
- Consumes: `deriveCharacterClass` (Task 1), `themeForCharacterClass` (Task 2), `applyClassTheme` from `@/lib/theme`.
- Produces: `useEmergentClass({ riasec, blockKey }): { derived: DerivedClass; justNamed: boolean }`.

**Behaviour:** re-derive only when `blockKey` changes, never per answer, so the class cannot flip question by question. `justNamed` is true for the render in which the student first stops being a Wanderer, so the page can play the moment.

- [ ] **Step 1: Write the failing test**

```ts
/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useEmergentClass } from "@/hooks/use-emergent-class";

afterEach(() => cleanup());

const none = { R: 10, I: 10, A: 10, S: 10, E: 10, C: 10 };
const helper = { R: 10, I: 20, A: 20, S: 90, E: 20, C: 10 };
const helperMage = { R: 10, I: 80, A: 20, S: 90, E: 20, C: 10 };

describe("useEmergentClass", () => {
  it("starts unnamed", () => {
    const { result } = renderHook(() =>
      useEmergentClass({ riasec: none, blockKey: "warmup" })
    );
    expect(result.current.derived.primary).toBe("wanderer");
    expect(result.current.justNamed).toBe(false);
  });

  it("does not re-derive while the block stays the same", () => {
    const { result, rerender } = renderHook(
      ({ riasec }) => useEmergentClass({ riasec, blockKey: "riasec" }),
      { initialProps: { riasec: none } }
    );
    rerender({ riasec: helper });
    // Scores moved mid-block; the student must not be renamed yet.
    expect(result.current.derived.primary).toBe("wanderer");
  });

  it("names the student at a block boundary and flags the moment once", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: none, blockKey: "warmup" } }
    );
    rerender({ riasec: helper, blockKey: "riasec" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.justNamed).toBe(true);

    // The moment happens once, not on every later render.
    rerender({ riasec: helper, blockKey: "riasec" });
    expect(result.current.justNamed).toBe(false);
  });

  it("deepens a class without flipping it", () => {
    const { result, rerender } = renderHook(
      ({ riasec, blockKey }) => useEmergentClass({ riasec, blockKey }),
      { initialProps: { riasec: helper, blockKey: "riasec" } }
    );
    rerender({ riasec: helperMage, blockKey: "mbti_values" });
    expect(result.current.derived.primary).toBe("guardian");
    expect(result.current.derived.secondary).toBe("mage");
    // Already named, so this is not a fresh moment.
    expect(result.current.justNamed).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run hooks/__tests__/use-emergent-class.test.ts`
Expected: FAIL — cannot resolve `@/hooks/use-emergent-class`.

- [ ] **Step 3: Write minimal implementation**

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import {
  deriveCharacterClass,
  type DerivedClass,
} from "@/lib/character/classes";
import { applyClassTheme } from "@/lib/theme";

/**
 * Lets the class crystallise from the student's answers.
 *
 * Re-derives only when the block changes, never per answer. A class that
 * flipped question by question would feel like a slot machine rather than
 * something becoming true.
 */

interface UseEmergentClassInput {
  riasec: Record<string, number>;
  /** Current question block. Deriving is gated on this changing. */
  blockKey: string;
}

const UNNAMED: DerivedClass = {
  primary: "wanderer",
  secondary: null,
  isNamed: false,
};

export function useEmergentClass({
  riasec,
  blockKey,
}: UseEmergentClassInput): { derived: DerivedClass; justNamed: boolean } {
  const [derived, setDerived] = useState<DerivedClass>(UNNAMED);
  const [justNamed, setJustNamed] = useState(false);
  const lastBlock = useRef<string | null>(null);
  const wasNamed = useRef(false);
  // Latest scores without making them a dependency — reading them here is
  // what keeps mid-block answers from renaming the student.
  const latestRiasec = useRef(riasec);
  latestRiasec.current = riasec;

  useEffect(() => {
    if (lastBlock.current === blockKey) return;
    lastBlock.current = blockKey;

    const next = deriveCharacterClass(latestRiasec.current);
    setDerived(next);

    const becameNamed = next.isNamed && !wasNamed.current;
    setJustNamed(becameNamed);
    if (becameNamed) {
      wasNamed.current = true;
      applyClassTheme(next.primary);
    }
  }, [blockKey]);

  return { derived, justNamed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run hooks/__tests__/use-emergent-class.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the session page**

In `app/quest/session/[id]/page.tsx`, after the existing `scoreState` destructuring:

```tsx
  const { derived: emergentClass, justNamed } = useEmergentClass({
    riasec: scoreState.riasec,
    blockKey: questState.current_block,
  });
```

Add the import:

```tsx
import { useEmergentClass } from "@/hooks/use-emergent-class";
```

Then replace the `SET_AVATAR_CLASS` dispatch that currently comes from the Supabase profile fetch with one driven by `emergentClass.primary`, so narration follows the emergent class:

```tsx
  useEffect(() => {
    dispatch({ type: "SET_AVATAR_CLASS", avatarClass: emergentClass.primary });
  }, [emergentClass.primary, dispatch]);
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add hooks/use-emergent-class.ts hooks/__tests__/use-emergent-class.test.ts "app/quest/session/[id]/page.tsx"
git commit -m "feat(quest): let the class crystallise at block boundaries"
```

---

### Task 8: Show the class, relics and description

**Files:**
- Create: `components/character/relic-shelf.tsx`
- Modify: `components/quest/reveal-sequence.tsx` (class label + description), `app/quest/dashboard/page.tsx` (relics + description)
- Test: `components/character/__tests__/relic-shelf.test.tsx`

**Interfaces:**
- Consumes: `earnedRelics` (Task 3), `describeCharacter` (Task 4), `deriveCharacterClass` and `characterClassDisplayName` (Task 1).
- Produces: `<RelicShelf relics={Relic[]} tone="quest" | "explorer" />`.

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import RelicShelf from "@/components/character/relic-shelf";
import { earnedRelics } from "@/lib/character/relics";

afterEach(() => cleanup());

describe("RelicShelf", () => {
  it("says why each relic was earned", () => {
    const relics = earnedRelics(["Empathy", "Empathy", "Empathy"]);
    render(<RelicShelf relics={relics} tone="quest" />);
    expect(screen.getByText("Healer's Kit")).toBeDefined();
    expect(screen.getByText(/3 times/)).toBeDefined();
  });

  it("shows nothing at all when no relic has been earned", () => {
    const { container } = render(<RelicShelf relics={[]} tone="quest" />);
    expect(container.textContent?.trim()).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/character/__tests__/relic-shelf.test.tsx`
Expected: FAIL — cannot resolve `@/components/character/relic-shelf`.

- [ ] **Step 3: Write the component**

```tsx
"use client";

import { motion } from "framer-motion";
import type { Relic } from "@/lib/character/relics";

interface RelicShelfProps {
  relics: Relic[];
  tone: "quest" | "explorer";
}

/**
 * Relics with the reason attached. The reason is the point — a badge with no
 * explanation is decoration, one that says what you did is evidence.
 */
export default function RelicShelf({
  relics,
  tone,
}: RelicShelfProps): React.JSX.Element | null {
  if (relics.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">
        {tone === "quest" ? "Relics" : "What you showed"}
      </h3>
      <ul className="flex flex-col gap-2">
        {relics.map((relic, index) => (
          <motion.li
            key={relic.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
          >
            <span className="text-xl" aria-hidden="true">
              {relic.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {relic.name}
              </p>
              <p className="text-[11px] text-white/45">
                You showed this {relic.timesShown} times
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/character/__tests__/relic-shelf.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Use it on the reveal and the dashboard**

In `components/quest/reveal-sequence.tsx`, replace the `classLabel` passed to `<ClassLabel />` with the emergent name, and add the description under it:

```tsx
import { deriveCharacterClass, characterClassDisplayName } from "@/lib/character/classes";
import { describeCharacter } from "@/lib/character/description";

const derived = deriveCharacterClass(scoreState.riasec);
const className = characterClassDisplayName(derived, tone);
const description = describeCharacter({
  derived,
  tone,
  mbti: scoreState.mbti,
  values: scoreState.values,
});
```

Render them together, replacing the existing standalone `<ClassLabel />` block:

```tsx
<motion.div
  key="class"
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  className="flex flex-col items-center gap-3"
>
  <ClassLabel label={className} />
  <p className="text-sm text-white/60 text-center max-w-xs">{description}</p>
</motion.div>
```

`RevealSequence` must have `tone` available. If it does not already receive it as a prop,
add `tone: "quest" | "explorer"` to its props interface and pass `studentTone` from
`app/quest/session/[id]/page.tsx`, matching how `CompletionScreen` is already given its
tone.

In `app/quest/dashboard/page.tsx`, add below the Self-vs-Measured card:

```tsx
<RelicShelf
  relics={earnedRelics(scores.strengths ?? [])}
  tone={student.tone}
/>
```

- [ ] **Step 6: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add components/character/ components/quest/reveal-sequence.tsx app/quest/dashboard/page.tsx
git commit -m "feat(character): show the class, its description and earned relics"
```

---

### Task 9: "Session" becomes "Chapter"

**Files:**
- Create: `lib/copy/chapter.ts`
- Test: `lib/copy/__tests__/chapter.test.ts`
- Modify: `app/page.tsx:215,266`, `app/quest/dashboard/page.tsx:194,305,316,367,403`, `app/quest/session/[id]/page.tsx:761`, `components/charts/mi-preview-bars.tsx:78`, `components/charts/values-sliders.tsx:99`, `components/quest/reveal-sequence.tsx:262`

**Interfaces:**
- Produces: `chapterWord(tone: "quest" | "explorer"): string` and `chapterLabel(n: number, tone: "quest" | "explorer"): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { chapterWord, chapterLabel } from "@/lib/copy/chapter";

describe("chapter wording", () => {
  it("uses Chapter in quest tone and Part in explorer tone", () => {
    expect(chapterWord("quest")).toBe("Chapter");
    expect(chapterWord("explorer")).toBe("Part");
  });

  it("numbers them", () => {
    expect(chapterLabel(1, "quest")).toBe("Chapter 1");
    expect(chapterLabel(2, "explorer")).toBe("Part 2");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/copy/__tests__/chapter.test.ts`
Expected: FAIL — cannot resolve `@/lib/copy/chapter`.

- [ ] **Step 3: Write the helper**

```ts
/**
 * "Session" reads like counselling; this is meant to read like an adventure.
 *
 * Display text only. Route paths (/quest/session/1), database columns
 * (has_completed_session1, current_session), type names and variable names
 * keep the word "session" — renaming those would mean a migration for no
 * user-visible gain.
 */
export function chapterWord(tone: "quest" | "explorer"): string {
  return tone === "quest" ? "Chapter" : "Part";
}

export function chapterLabel(n: number, tone: "quest" | "explorer"): string {
  return `${chapterWord(tone)} ${n}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/copy/__tests__/chapter.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Replace the user-facing strings**

Work through each site, using the tone already available in that component:

| File:line | Was | Becomes |
|---|---|---|
| `app/page.tsx:215` | `"Session 1 Complete"` / `` `Session ${n}` `` | `` `${chapterLabel(1, tone)} Complete` `` / `chapterLabel(n, tone)` |
| `app/page.tsx:266` | `"your Session 1 results will be lost"` | `` `your ${chapterLabel(1, tone)} results will be lost` `` |
| `app/quest/dashboard/page.tsx:194` | `"Complete Session 1 to see your profile."` | `` `Complete ${chapterLabel(1, tone)} to see your profile.` `` |
| `:305`, `:316` | `"Deepens in Session 2"` | `` `Deepens in ${chapterLabel(2, tone)}` `` |
| `:367` | `"Session 1: Discovery Quest"` | `` `${chapterLabel(1, tone)}: Discovery Quest` `` |
| `:403` | `"Begin Session 2 — Coming soon"` | `` `Begin ${chapterLabel(2, tone)} — Coming soon` `` |
| `app/quest/session/[id]/page.tsx:761` | `"Your quest continues in Session 1 for now"` | `` `Your quest continues in ${chapterLabel(1, studentTone)} for now` `` |
| `components/charts/mi-preview-bars.tsx:78` | `"More detail in Session 2"` | `` `More detail in ${chapterLabel(2, tone)}` `` |
| `components/charts/values-sliders.tsx:99` | `"More dimensions in Session 2"` | `` `More dimensions in ${chapterLabel(2, tone)}` `` |
| `components/quest/reveal-sequence.tsx:262` | `"Session 2 will deepen these results."` | `` `${chapterLabel(2, tone)} will deepen these results.` `` |

`mi-preview-bars.tsx` and `values-sliders.tsx` do not currently take a `tone` prop. Add `tone: "quest" | "explorer"` to both prop interfaces and pass it from their two call sites (`components/quest/reveal-sequence.tsx` and `app/quest/dashboard/page.tsx`).

- [ ] **Step 6: Confirm nothing user-facing still says "Session"**

```bash
grep -rn "Session [0-9]\|Session Complete\|Begin Session" --include="*.tsx" app/ components/ | grep -v test
```

Expected: no matches.

- [ ] **Step 7: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
git add lib/copy/ app/ components/
git commit -m "feat(copy): sessions become Chapters, and Parts in explorer tone"
```

---

## Deployment

This project has **no GitHub integration** — pushing does not deploy. After the final task:

```bash
git push origin HEAD:main
npx vercel --prod --yes
```

Then verify against the live bundle rather than trusting the deploy message:

```bash
HTML=$(curl -s https://career-quest-coral.vercel.app/quest/session/1)
for f in $(echo "$HTML" | grep -o '/_next/static/chunks/[^"]*\.js' | sort -u); do
  curl -s "https://career-quest-coral.vercel.app$f" | grep -q "Warsmith" && echo "live in $f"
done
```

## Known risks

1. **Existing profiles change.** Any student who picked a class has it recalculated from their real answers on next load. Acceptable with one test user; would not be after launch.
2. **The theme swap mid-quest is a deliberate interruption.** If it lands badly inside the interest block, move the trigger to a block transition screen.
3. **Contrast figures are calculated, not measured.** Check all eight palettes in a browser against the real dark background before calling this done.
