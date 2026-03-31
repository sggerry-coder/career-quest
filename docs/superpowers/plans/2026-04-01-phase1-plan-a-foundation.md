# Phase 1 Plan A: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete data layer, scoring engine, state management, and database migration that all Phase 1 UI depends on — testable in isolation before any UI work begins.
**Architecture:** Pure scoring functions in `lib/scoring/` operate on raw arrays and return normalized scores. React hooks (`use-quest-state`, `use-scores`) compose these functions into stateful managers. A React context provider (`quest-provider`) combines both hooks and handles Supabase persistence at checkpoints. Static data files in `data/` provide question content, class definitions, and reference data.
**Tech Stack:** TypeScript, Vitest (unit testing), React 19, Supabase (persistence), CSS custom properties (theming)

---

## File Map

**Created:**
- `supabase/migrations/00002_phase1_additions.sql`
- `lib/scoring/riasec.ts`
- `lib/scoring/mi.ts`
- `lib/scoring/mbti.ts`
- `lib/scoring/values.ts`
- `lib/scoring/strengths.ts`
- `lib/scoring/adaptive.ts`
- `lib/scoring/__tests__/riasec.test.ts`
- `lib/scoring/__tests__/mi.test.ts`
- `lib/scoring/__tests__/mbti.test.ts`
- `lib/scoring/__tests__/values.test.ts`
- `lib/scoring/__tests__/strengths.test.ts`
- `lib/scoring/__tests__/adaptive.test.ts`
- `lib/theme.ts`
- `components/ui/theme-provider.tsx`
- `data/classes.ts`
- `data/education-systems.ts`
- `data/destinations.ts`
- `data/mbti-descriptors.ts`
- `data/strength-categories.ts`
- `data/questions/session-1-core.ts`
- `data/questions/session-1-adaptive.ts`
- `hooks/use-quest-state.ts`
- `hooks/use-scores.ts`
- `providers/quest-provider.tsx`

**Modified:**
- `package.json` (add vitest dev dependency + test script)
- `lib/types/student.ts` (add avatar_class, tone, self_map, preferred_destinations; remove preferred_country, preferred_universities)
- `lib/types/quest.ts` (add ClientResponse, update Question with new fields)

---

### Task 1: Install Test Framework

**Files:**
- Modify: `package.json`

- [ ] **Step 1:** Install vitest as dev dependency and add test script.

```bash
cd "/Users/gerrygan/Career Quest"
npm install --save-dev vitest
```

Then verify `package.json` has vitest in devDependencies and add the test script. Edit `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2:** Verify vitest runs (should report no tests found, exit 0).

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run
```

Expected: `No test files found` (exit 0, no crash).

- [ ] **Step 3:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add package.json package-lock.json
git commit -m "chore: add vitest test framework"
```

---

### Task 2: Database Migration

**Files:**
- Create: `supabase/migrations/00002_phase1_additions.sql`

- [ ] **Step 1:** Create the migration file at `supabase/migrations/00002_phase1_additions.sql`:

```sql
-- Phase 1: Add avatar_class, tone, self_map, preferred_destinations
-- Drop preferred_country and preferred_universities (replaced by preferred_destinations)

ALTER TABLE public.students ADD COLUMN avatar_class text;
ALTER TABLE public.students ADD COLUMN tone text NOT NULL DEFAULT 'quest';
ALTER TABLE public.students ADD COLUMN self_map jsonb;
ALTER TABLE public.students ADD COLUMN preferred_destinations jsonb DEFAULT '[]';

ALTER TABLE public.students DROP COLUMN IF EXISTS preferred_country;
ALTER TABLE public.students DROP COLUMN IF EXISTS preferred_universities;

-- Add check constraint for tone values
ALTER TABLE public.students ADD CONSTRAINT students_tone_check
  CHECK (tone IN ('quest', 'explorer'));

COMMENT ON COLUMN public.students.avatar_class IS 'RPG class identity (warrior, mage, ranger, sorceress, valkyrie, huntress, wanderer)';
COMMENT ON COLUMN public.students.tone IS 'UI tone: quest (RPG) or explorer (professional)';
COMMENT ON COLUMN public.students.self_map IS 'Self-reflection data: clarity, sources, perceived_strengths, curiosities';
COMMENT ON COLUMN public.students.preferred_destinations IS 'Array of country names for study destination preferences';
```

- [ ] **Step 2:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add supabase/migrations/00002_phase1_additions.sql
git commit -m "db: add phase 1 schema migration (avatar_class, tone, self_map, preferred_destinations)"
```

---

### Task 3: Update TypeScript Types

**Files:**
- Modify: `lib/types/student.ts`
- Modify: `lib/types/quest.ts`

- [ ] **Step 1:** Update `lib/types/student.ts` — add new fields, remove old ones, add SelfMap interface:

Replace the entire file content with:

```typescript
export interface Student {
  id: string;
  name: string;
  age: number;
  education_system: string;
  avatar_class: string;
  tone: "quest" | "explorer";
  self_map: SelfMap | null;
  preferred_destinations: string[];
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

export interface SelfMap {
  clarity: number;               // 1-5 (direction clarity slider)
  sources: string[];             // where career ideas come from
  perceived_strengths: string[]; // 0-3 self-identified strengths
  curiosities: string[];         // 0-3 career curiosity categories
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

- [ ] **Step 2:** Update `lib/types/quest.ts` — add ClientResponse, update Question with block/reverse_scored/framework/framework_target/is_adaptive/strength_signal fields:

Replace the entire file content with:

```typescript
export type QuestionType =
  | "multiple_choice"
  | "likert"
  | "forced_choice"
  | "ipsative"
  | "spectrum"
  | "free_text"
  | "scenario";

export type QuestionBlock =
  | "warmup"
  | "riasec"
  | "riasec_mi"
  | "mbti_values"
  | "selfmap"
  | "reveal"
  | "confirmatory";

export type Framework = "none" | "riasec" | "mi" | "mbti" | "values" | "multi";

export interface QuestionOption {
  label: string;
  value: string | number;
  emoji?: string;
  framework_signals?: Record<string, number>;
  strength_signal?: string;
}

export interface Question {
  id: string;
  session_number: number;
  block: QuestionBlock;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[];
  reverse_scored: boolean;
  framework: Framework;
  framework_target: string;
  is_adaptive: boolean;
  age_range?: "13-14" | "15-16" | "17-18" | "all";
}

export interface ClientResponse {
  question_id: string;
  response_value: number;
  response_label: string;
  framework: string;
  framework_target: string;
  answered_at: number;
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

- [ ] **Step 3:** Verify TypeScript compilation passes.

```bash
cd "/Users/gerrygan/Career Quest"
npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `student.ts` or `quest.ts`. (Existing UI files may have errors from missing imports — that is expected and not our concern.)

- [ ] **Step 4:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/types/student.ts lib/types/quest.ts
git commit -m "types: update student and quest types for phase 1 (avatar_class, tone, self_map, ClientResponse)"
```

---

### Task 4: Theme System

**Files:**
- Create: `lib/theme.ts`
- Create: `components/ui/theme-provider.tsx`

- [ ] **Step 1:** Create `lib/theme.ts`:

```typescript
export type ThemeName = "purple-teal" | "magenta-violet" | "blue-indigo";

export interface ThemeConfig {
  name: ThemeName;
  primary: string;
  accent: string;
  glow: string;
  borderRadius: string;
}

export interface ClassDefinition {
  id: string;
  name: { quest: string; explorer: string };
  icon: string;
  theme: ThemeName;
  group: string;
  tagline: { quest: string; explorer: string };
  narration: {
    warmup_intro: { quest: string; explorer: string };
    riasec_intro: { quest: string; explorer: string };
    mbti_intro: { quest: string; explorer: string };
    reveal_intro: { quest: string; explorer: string };
    badge_unlock: { quest: string; explorer: string };
  };
}

export const themes: Record<ThemeName, ThemeConfig> = {
  "purple-teal": {
    name: "purple-teal",
    primary: "#8b5cf6",
    accent: "#2dd4bf",
    glow: "rgba(139,92,246,0.5)",
    borderRadius: "6px",
  },
  "magenta-violet": {
    name: "magenta-violet",
    primary: "#ec4899",
    accent: "#f0abfc",
    glow: "rgba(236,72,153,0.4)",
    borderRadius: "16px",
  },
  "blue-indigo": {
    name: "blue-indigo",
    primary: "#3b82f6",
    accent: "#38bdf8",
    glow: "rgba(59,130,246,0.4)",
    borderRadius: "12px",
  },
};

export function getThemeForClass(classId: string): ThemeConfig {
  const classDef = classDefinitions.find((c) => c.id === classId);
  if (!classDef) return themes["blue-indigo"];
  return themes[classDef.theme];
}

export function getClassName(
  classId: string,
  tone: "quest" | "explorer"
): string {
  const classDef = classDefinitions.find((c) => c.id === classId);
  if (!classDef) return classId;
  return classDef.name[tone];
}

export const classDefinitions: ClassDefinition[] = [
  {
    id: "warrior",
    name: { quest: "Warrior", explorer: "Strategist" },
    icon: "⚔️",
    theme: "purple-teal",
    group: "Shadow Court",
    tagline: {
      quest: "Strength through strategy, victory through will.",
      explorer: "Strategic thinking meets decisive action.",
    },
    narration: {
      warmup_intro: {
        quest: "The Warrior steps into the arena. Let's see what drives you...",
        explorer:
          "Welcome, Strategist. Let's start with a few quick questions...",
      },
      riasec_intro: {
        quest: "The Warrior enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Warrior...",
        explorer:
          "Interests mapped. Let's explore your working style, Strategist...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Warrior...",
        explorer: "Your profile is taking shape, Strategist...",
      },
      badge_unlock: {
        quest: "The Warrior has earned a new emblem!",
        explorer: "Achievement unlocked, Strategist!",
      },
    },
  },
  {
    id: "mage",
    name: { quest: "Mage", explorer: "Analyst" },
    icon: "🧙‍♂️",
    theme: "purple-teal",
    group: "Shadow Court",
    tagline: {
      quest: "Knowledge is the greatest magic of all.",
      explorer: "Deep analysis reveals hidden patterns.",
    },
    narration: {
      warmup_intro: {
        quest: "The Mage opens the tome of self-discovery...",
        explorer: "Welcome, Analyst. Let's begin exploring...",
      },
      riasec_intro: {
        quest: "The Mage enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Mage...",
        explorer:
          "Interests mapped. Let's explore your working style, Analyst...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Mage...",
        explorer: "Your profile is taking shape, Analyst...",
      },
      badge_unlock: {
        quest: "The Mage has earned a new emblem!",
        explorer: "Achievement unlocked, Analyst!",
      },
    },
  },
  {
    id: "ranger",
    name: { quest: "Ranger", explorer: "Pathfinder" },
    icon: "🏹",
    theme: "purple-teal",
    group: "Shadow Court",
    tagline: {
      quest: "Every trail leads to a new discovery.",
      explorer: "Finding the right path through careful exploration.",
    },
    narration: {
      warmup_intro: {
        quest: "The Ranger sets out on the path of discovery...",
        explorer: "Welcome, Pathfinder. Let's chart your course...",
      },
      riasec_intro: {
        quest: "The Ranger enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Ranger...",
        explorer:
          "Interests mapped. Let's explore your working style, Pathfinder...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Ranger...",
        explorer: "Your profile is taking shape, Pathfinder...",
      },
      badge_unlock: {
        quest: "The Ranger has earned a new emblem!",
        explorer: "Achievement unlocked, Pathfinder!",
      },
    },
  },
  {
    id: "sorceress",
    name: { quest: "Sorceress", explorer: "Visionary" },
    icon: "🔮",
    theme: "magenta-violet",
    group: "Crimson Order",
    tagline: {
      quest: "See beyond what others see, shape what others cannot.",
      explorer: "Turning creative vision into reality.",
    },
    narration: {
      warmup_intro: {
        quest: "The Sorceress gazes into the crystal of possibility...",
        explorer: "Welcome, Visionary. Let's discover your potential...",
      },
      riasec_intro: {
        quest: "The Sorceress enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Sorceress...",
        explorer:
          "Interests mapped. Let's explore your working style, Visionary...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Sorceress...",
        explorer: "Your profile is taking shape, Visionary...",
      },
      badge_unlock: {
        quest: "The Sorceress has earned a new emblem!",
        explorer: "Achievement unlocked, Visionary!",
      },
    },
  },
  {
    id: "valkyrie",
    name: { quest: "Valkyrie", explorer: "Defender" },
    icon: "🛡️",
    theme: "magenta-violet",
    group: "Crimson Order",
    tagline: {
      quest: "Guardian of purpose, champion of the worthy.",
      explorer: "Standing firm for what matters most.",
    },
    narration: {
      warmup_intro: {
        quest: "The Valkyrie raises her shield and begins the quest...",
        explorer: "Welcome, Defender. Let's explore what drives you...",
      },
      riasec_intro: {
        quest: "The Valkyrie enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Valkyrie...",
        explorer:
          "Interests mapped. Let's explore your working style, Defender...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Valkyrie...",
        explorer: "Your profile is taking shape, Defender...",
      },
      badge_unlock: {
        quest: "The Valkyrie has earned a new emblem!",
        explorer: "Achievement unlocked, Defender!",
      },
    },
  },
  {
    id: "huntress",
    name: { quest: "Huntress", explorer: "Scout" },
    icon: "🌙",
    theme: "magenta-violet",
    group: "Crimson Order",
    tagline: {
      quest: "Silent steps, sharp instincts, unerring aim.",
      explorer: "Keen observation reveals the best opportunities.",
    },
    narration: {
      warmup_intro: {
        quest: "The Huntress tracks the trail of self-knowledge...",
        explorer: "Welcome, Scout. Let's map your strengths...",
      },
      riasec_intro: {
        quest: "The Huntress enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Huntress...",
        explorer:
          "Interests mapped. Let's explore your working style, Scout...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Huntress...",
        explorer: "Your profile is taking shape, Scout...",
      },
      badge_unlock: {
        quest: "The Huntress has earned a new emblem!",
        explorer: "Achievement unlocked, Scout!",
      },
    },
  },
  {
    id: "wanderer",
    name: { quest: "Wanderer", explorer: "Explorer" },
    icon: "✨",
    theme: "blue-indigo",
    group: "Azure Path",
    tagline: {
      quest: "Not all who wander are lost — some are just getting started.",
      explorer: "Every direction holds possibility.",
    },
    narration: {
      warmup_intro: {
        quest: "The Wanderer begins a journey into the unknown...",
        explorer: "Welcome, Explorer. Let's see what we discover...",
      },
      riasec_intro: {
        quest: "The Wanderer enters the Arena of Interests...",
        explorer: "Now let's explore your professional interests...",
      },
      mbti_intro: {
        quest: "Abilities mapped. Let's discover your nature, Wanderer...",
        explorer:
          "Interests mapped. Let's explore your working style, Explorer...",
      },
      reveal_intro: {
        quest: "The prophecy takes shape for the Wanderer...",
        explorer: "Your profile is taking shape, Explorer...",
      },
      badge_unlock: {
        quest: "The Wanderer has earned a new emblem!",
        explorer: "Achievement unlocked, Explorer!",
      },
    },
  },
];
```

- [ ] **Step 2:** Create `components/ui/theme-provider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { themes, type ThemeName, type ThemeConfig } from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (themeName: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themes["blue-indigo"],
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeProperties(theme: ThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.name);
  root.style.setProperty("--theme-primary", theme.primary);
  root.style.setProperty("--theme-accent", theme.accent);
  root.style.setProperty("--theme-glow", theme.glow);
  root.style.setProperty("--theme-border-radius", theme.borderRadius);
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeName;
}

export function ThemeProvider({
  children,
  initialTheme = "blue-indigo",
}: ThemeProviderProps) {
  const currentTheme = themes[initialTheme];

  useEffect(() => {
    applyThemeProperties(currentTheme);
  }, [currentTheme]);

  const setTheme = (themeName: ThemeName) => {
    const newTheme = themes[themeName];
    applyThemeProperties(newTheme);
  };

  return (
    <ThemeContext value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext>
  );
}
```

- [ ] **Step 3:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/theme.ts components/ui/theme-provider.tsx
git commit -m "feat: add theme system with 3 themes, 7 class definitions, and ThemeProvider component"
```

---

### Task 5: Static Data Files

**Files:**
- Create: `data/classes.ts`
- Create: `data/education-systems.ts`
- Create: `data/destinations.ts`
- Create: `data/mbti-descriptors.ts`
- Create: `data/strength-categories.ts`

- [ ] **Step 1:** Create `data/classes.ts`:

```typescript
// Re-export class definitions from theme for convenience.
// All class data lives in lib/theme.ts as the single source of truth.
// This file provides a data-layer import path for components that
// don't need the full theme system.

export { classDefinitions } from "@/lib/theme";
export type { ClassDefinition } from "@/lib/theme";
```

- [ ] **Step 2:** Create `data/education-systems.ts`:

```typescript
export interface EducationSystem {
  id: string;
  label: string;
  country: string;
  flag: string;
}

export const educationSystems: EducationSystem[] = [
  {
    id: "gcse_alevels",
    label: "GCSEs & A-Levels",
    country: "United Kingdom",
    flag: "🇬🇧",
  },
  {
    id: "us_highschool",
    label: "High School + AP/SAT",
    country: "United States",
    flag: "🇺🇸",
  },
  {
    id: "ib",
    label: "International Baccalaureate",
    country: "Global",
    flag: "🌍",
  },
  {
    id: "hsc_atar",
    label: "HSC / ATAR",
    country: "Australia",
    flag: "🇦🇺",
  },
  {
    id: "spm_stpm",
    label: "SPM / STPM",
    country: "Malaysia",
    flag: "🇲🇾",
  },
  {
    id: "sg_levels",
    label: "O-Levels / A-Levels",
    country: "Singapore",
    flag: "🇸🇬",
  },
  {
    id: "hkdse",
    label: "HKDSE",
    country: "Hong Kong",
    flag: "🇭🇰",
  },
  {
    id: "other",
    label: "Other",
    country: "",
    flag: "📝",
  },
  {
    id: "not_sure",
    label: "Not sure",
    country: "",
    flag: "🤷",
  },
];
```

- [ ] **Step 3:** Create `data/destinations.ts`:

```typescript
export interface Destination {
  id: string;
  name: string;
  flag: string;
  region: string;
  featured: boolean;
}

export const destinations: Destination[] = [
  // Featured (shown as top 6 tappable cards)
  {
    id: "uk",
    name: "United Kingdom",
    flag: "🇬🇧",
    region: "Europe",
    featured: true,
  },
  {
    id: "us",
    name: "United States",
    flag: "🇺🇸",
    region: "North America",
    featured: true,
  },
  {
    id: "au",
    name: "Australia",
    flag: "🇦🇺",
    region: "Oceania",
    featured: true,
  },
  {
    id: "sg",
    name: "Singapore",
    flag: "🇸🇬",
    region: "Asia",
    featured: true,
  },
  {
    id: "ca",
    name: "Canada",
    flag: "🇨🇦",
    region: "North America",
    featured: true,
  },
  {
    id: "hk",
    name: "Hong Kong",
    flag: "🇭🇰",
    region: "Asia",
    featured: true,
  },
  // Additional (shown under "Other" expansion)
  {
    id: "nl",
    name: "Netherlands",
    flag: "🇳🇱",
    region: "Europe",
    featured: false,
  },
  {
    id: "de",
    name: "Germany",
    flag: "🇩🇪",
    region: "Europe",
    featured: false,
  },
  {
    id: "jp",
    name: "Japan",
    flag: "🇯🇵",
    region: "Asia",
    featured: false,
  },
  {
    id: "nz",
    name: "New Zealand",
    flag: "🇳🇿",
    region: "Oceania",
    featured: false,
  },
  {
    id: "ie",
    name: "Ireland",
    flag: "🇮🇪",
    region: "Europe",
    featured: false,
  },
  {
    id: "kr",
    name: "South Korea",
    flag: "🇰🇷",
    region: "Asia",
    featured: false,
  },
];

export const NOT_SURE_DESTINATION = "not_sure";
```

- [ ] **Step 4:** Create `data/mbti-descriptors.ts`:

```typescript
export interface MbtiDescriptor {
  type: string;
  title: string;
  description: string;
}

export const mbtiDescriptors: Record<string, MbtiDescriptor> = {
  ISTJ: {
    type: "ISTJ",
    title: "The Responsible Realist",
    description:
      "Dependable, thorough, and systematic. You value tradition and work hard to fulfil your duties.",
  },
  ISFJ: {
    type: "ISFJ",
    title: "The Nurturing Protector",
    description:
      "Caring, loyal, and detail-oriented. You quietly support the people and causes you believe in.",
  },
  INFJ: {
    type: "INFJ",
    title: "The Insightful Visionary",
    description:
      "Idealistic, perceptive, and determined. You seek meaning and want to make a positive difference.",
  },
  INTJ: {
    type: "INTJ",
    title: "The Strategic Mastermind",
    description:
      "Independent, analytical, and driven. You see the big picture and create plans to achieve ambitious goals.",
  },
  ISTP: {
    type: "ISTP",
    title: "The Practical Analyser",
    description:
      "Logical, adaptable, and hands-on. You enjoy understanding how things work and solving real problems.",
  },
  ISFP: {
    type: "ISFP",
    title: "The Gentle Creator",
    description:
      "Quiet, sensitive, and expressive. You live by your values and find beauty in the world around you.",
  },
  INFP: {
    type: "INFP",
    title: "The Thoughtful Idealist",
    description:
      "Empathetic, creative, and passionate. You care deeply about authenticity and making the world better.",
  },
  INTP: {
    type: "INTP",
    title: "The Curious Thinker",
    description:
      "Inventive, analytical, and independent. You love exploring ideas and finding logical solutions to complex problems.",
  },
  ESTP: {
    type: "ESTP",
    title: "The Energetic Problem-Solver",
    description:
      "Bold, practical, and spontaneous. You dive into action and think on your feet.",
  },
  ESFP: {
    type: "ESFP",
    title: "The Enthusiastic Performer",
    description:
      "Playful, energetic, and people-loving. You bring fun to everything and live fully in the moment.",
  },
  ENFP: {
    type: "ENFP",
    title: "The Inspired Champion",
    description:
      "Imaginative, enthusiastic, and warm. You see possibilities everywhere and inspire others to act.",
  },
  ENTP: {
    type: "ENTP",
    title: "The Inventive Debater",
    description:
      "Quick-witted, curious, and challenge-loving. You enjoy exploring new ideas and questioning assumptions.",
  },
  ESTJ: {
    type: "ESTJ",
    title: "The Organised Leader",
    description:
      "Decisive, organised, and results-driven. You take charge and create order from chaos.",
  },
  ESFJ: {
    type: "ESFJ",
    title: "The Supportive Connector",
    description:
      "Warm, loyal, and community-minded. You bring people together and make sure everyone is looked after.",
  },
  ENFJ: {
    type: "ENFJ",
    title: "The Inspiring Mentor",
    description:
      "Charismatic, empathetic, and driven to help. You see potential in people and help them grow.",
  },
  ENTJ: {
    type: "ENTJ",
    title: "The Bold Commander",
    description:
      "Strategic, confident, and ambitious. You lead with vision and make things happen at scale.",
  },
};

/**
 * Get descriptor for a potentially partial MBTI type.
 * Partial types use "_" for emerging dichotomies (e.g., "I_FJ").
 * Returns the descriptor for full types, or a generated partial descriptor.
 */
export function getMbtiDescriptor(type: string): MbtiDescriptor {
  // Full type lookup
  if (mbtiDescriptors[type]) {
    return mbtiDescriptors[type];
  }

  // Partial type — generate a label
  return {
    type,
    title: "Emerging Type",
    description:
      "Your personality profile is still taking shape. More questions will sharpen the picture.",
  };
}
```

- [ ] **Step 5:** Create `data/strength-categories.ts`:

```typescript
export interface StrengthCategory {
  id: string;
  name: string;
  description: string;
  riasec_mapping: string[];
}

export const strengthCategories: StrengthCategory[] = [
  {
    id: "achiever",
    name: "Achiever",
    description: "You get things done and take pride in productivity.",
    riasec_mapping: ["R", "C"],
  },
  {
    id: "ideation",
    name: "Ideation",
    description: "You love generating new ideas and creative connections.",
    riasec_mapping: ["I", "A"],
  },
  {
    id: "empathy",
    name: "Empathy",
    description: "You naturally sense how others are feeling.",
    riasec_mapping: ["S"],
  },
  {
    id: "command",
    name: "Command",
    description: "You take charge and lead with confidence.",
    riasec_mapping: ["E"],
  },
  {
    id: "creativity",
    name: "Creativity",
    description: "You express yourself through original work and imagination.",
    riasec_mapping: ["A"],
  },
  {
    id: "analytical",
    name: "Analytical",
    description: "You search for reasons, evidence, and data before deciding.",
    riasec_mapping: ["I", "C"],
  },
  {
    id: "communication",
    name: "Communication",
    description: "You find it easy to put thoughts into words and connect with people.",
    riasec_mapping: ["E", "S"],
  },
  {
    id: "adaptability",
    name: "Adaptability",
    description: "You go with the flow and stay calm when plans change.",
    riasec_mapping: ["A", "S"],
  },
];
```

- [ ] **Step 6:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add data/classes.ts data/education-systems.ts data/destinations.ts data/mbti-descriptors.ts data/strength-categories.ts
git commit -m "data: add static data files (classes, education systems, destinations, MBTI descriptors, strength categories)"
```

---

### Task 6: RIASEC Scoring (TDD)

**Files:**
- Create: `lib/scoring/__tests__/riasec.test.ts`
- Create: `lib/scoring/riasec.ts`

- [ ] **Step 1:** Write failing tests. Create `lib/scoring/__tests__/riasec.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateRiasecType,
  calculateAllRiasec,
  mergeIpsativeScores,
  detectAcquiescenceBias,
  deriveClassLabel,
} from "../riasec";

describe("calculateRiasecType", () => {
  it("normalizes 3 responses of [5,5,5] to 100", () => {
    expect(calculateRiasecType([5, 5, 5])).toBe(100);
  });

  it("normalizes 3 responses of [1,1,1] to 0", () => {
    expect(calculateRiasecType([1, 1, 1])).toBe(0);
  });

  it("normalizes [3,4,2] to approximately 41.7", () => {
    // (9 - 3) / (3 * 4) * 100 = 6/12 * 100 = 50
    expect(calculateRiasecType([3, 4, 2])).toBeCloseTo(50, 1);
  });

  it("handles a single response of [3]", () => {
    // (3 - 1) / (1 * 4) * 100 = 2/4 * 100 = 50
    expect(calculateRiasecType([3])).toBe(50);
  });

  it("handles two responses of [4, 2]", () => {
    // (6 - 2) / (2 * 4) * 100 = 4/8 * 100 = 50
    expect(calculateRiasecType([4, 2])).toBe(50);
  });

  it("handles four responses of [5, 4, 3, 2]", () => {
    // (14 - 4) / (4 * 4) * 100 = 10/16 * 100 = 62.5
    expect(calculateRiasecType([5, 4, 3, 2])).toBe(62.5);
  });

  it("handles five responses of [1, 2, 3, 4, 5]", () => {
    // (15 - 5) / (5 * 4) * 100 = 10/20 * 100 = 50
    expect(calculateRiasecType([1, 2, 3, 4, 5])).toBe(50);
  });

  it("returns 0 for empty array", () => {
    expect(calculateRiasecType([])).toBe(0);
  });

  it("clamps values to 1-5 range", () => {
    // [0, 7] → clamped to [1, 5] → (6 - 2) / (2*4) * 100 = 50
    expect(calculateRiasecType([0, 7])).toBe(50);
  });

  it("rounds non-integer values to nearest integer", () => {
    // [2.7] → rounds to 3 → (3 - 1) / (1*4) * 100 = 50
    expect(calculateRiasecType([2.7])).toBe(50);
  });
});

describe("calculateAllRiasec", () => {
  it("normalizes all 6 types from raw scores", () => {
    const raw = {
      R: [5, 5],
      I: [1, 1],
      A: [3, 3],
      S: [4, 4],
      E: [2, 2],
      C: [5, 1],
    };
    const result = calculateAllRiasec(raw);
    expect(result.R).toBe(100);
    expect(result.I).toBe(0);
    expect(result.A).toBe(50);
    expect(result.S).toBe(75);
    expect(result.E).toBe(25);
    expect(result.C).toBe(50);
  });

  it("handles missing types (empty arrays) as 0", () => {
    const raw = {
      R: [5],
      I: [],
      A: [],
      S: [],
      E: [],
      C: [],
    };
    const result = calculateAllRiasec(raw);
    expect(result.R).toBe(100);
    expect(result.I).toBe(0);
    expect(result.A).toBe(0);
  });
});

describe("mergeIpsativeScores", () => {
  it("merges likert and ipsative with 70/30 weighting", () => {
    const likert = { R: 80, I: 60, A: 40, S: 20, E: 50, C: 70 };
    const ipsative = { R: 100, I: 50, A: 0, S: 50, E: 0, C: 100 };
    const result = mergeIpsativeScores(likert, ipsative);
    // R: 80*0.7 + 100*0.3 = 56 + 30 = 86
    expect(result.R).toBeCloseTo(86, 1);
    // I: 60*0.7 + 50*0.3 = 42 + 15 = 57
    expect(result.I).toBeCloseTo(57, 1);
    // A: 40*0.7 + 0*0.3 = 28 + 0 = 28
    expect(result.A).toBeCloseTo(28, 1);
  });

  it("uses likert-only when ipsative type has no data (null)", () => {
    const likert = { R: 80, I: 60, A: 40, S: 20, E: 50, C: 70 };
    const ipsative = { R: 100, I: null, A: null, S: null, E: null, C: null };
    const result = mergeIpsativeScores(
      likert,
      ipsative as unknown as Record<string, number | null>
    );
    expect(result.R).toBeCloseTo(86, 1);
    expect(result.I).toBe(60); // likert only
    expect(result.A).toBe(40); // likert only
  });
});

describe("detectAcquiescenceBias", () => {
  it("returns true when all 6 types are above 80", () => {
    const scores = { R: 85, I: 90, A: 81, S: 95, E: 82, C: 88 };
    expect(detectAcquiescenceBias(scores)).toBe(true);
  });

  it("returns false when any type is 80 or below", () => {
    const scores = { R: 85, I: 90, A: 80, S: 95, E: 82, C: 88 };
    expect(detectAcquiescenceBias(scores)).toBe(false);
  });

  it("returns false for low scores", () => {
    const scores = { R: 20, I: 30, A: 40, S: 50, E: 60, C: 70 };
    expect(detectAcquiescenceBias(scores)).toBe(false);
  });
});

describe("deriveClassLabel", () => {
  it("returns dominant pair when top 2 > 50 and gap to 3rd > 10", () => {
    const scores = { R: 10, I: 80, A: 70, S: 30, E: 20, C: 40 };
    // Top 2: I=80, A=70. 3rd: C=40. Gap = 70-40 = 30 > 10
    expect(deriveClassLabel(scores)).toBe("INVESTIGATOR-CREATOR");
  });

  it("returns single dominant when top 1 > 50 and leads by > 15", () => {
    const scores = { R: 10, I: 80, A: 50, S: 30, E: 20, C: 40 };
    // Top: I=80. 2nd: A=50. Gap = 80-50 = 30 > 15. But A is 50, not > 50 for pair.
    // score[0]=80 > 50, score[1]=50 not > 50, so goes to elif.
    // score[0]=80 > 50, 80-50 = 30 > 15 → single dominant
    expect(deriveClassLabel(scores)).toBe("INVESTIGATOR");
  });

  it("returns EXPLORER when top 1 > 50 but close to second", () => {
    const scores = { R: 10, I: 60, A: 55, S: 50, E: 20, C: 40 };
    // Top 2: I=60, A=55. 3rd: S=50. Gap = 55-50 = 5 < 10 → not pair
    // score[0]=60 > 50, but 60-55 = 5, not > 15 → not single
    // else → EXPLORER
    expect(deriveClassLabel(scores)).toBe("EXPLORER");
  });

  it("returns SEEKER when all scores below 40", () => {
    const scores = { R: 10, I: 20, A: 30, S: 15, E: 25, C: 35 };
    expect(deriveClassLabel(scores)).toBe("SEEKER");
  });

  it("returns EXPLORER when scores are moderate but no clear dominant", () => {
    const scores = { R: 45, I: 50, A: 48, S: 42, E: 47, C: 46 };
    // score[0]=50 > 50 is false (not strictly >50) — wait, 50 is not > 50.
    // All < 40? No (50 > 40). So else → EXPLORER.
    expect(deriveClassLabel(scores)).toBe("EXPLORER");
  });
});
```

- [ ] **Step 2:** Run the test to confirm it fails.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/riasec.test.ts
```

Expected: All tests fail (module not found).

- [ ] **Step 3:** Implement. Create `lib/scoring/riasec.ts`:

```typescript
const RIASEC_TYPES = ["R", "I", "A", "S", "E", "C"] as const;
export type RiasecType = (typeof RIASEC_TYPES)[number];

const RIASEC_DISPLAY_NAMES: Record<RiasecType, string> = {
  R: "MAKER",
  I: "INVESTIGATOR",
  A: "CREATOR",
  S: "HELPER",
  E: "LEADER",
  C: "ORGANIZER",
};

/**
 * Clamp and round a raw Likert/ipsative response value to integer 1-5.
 */
function sanitizeValue(v: number): number {
  const rounded = Math.round(v);
  return Math.max(1, Math.min(5, rounded));
}

/**
 * Normalize raw Likert responses for a single RIASEC type.
 * Formula: ((sum - count) / (count * 4)) * 100
 * Returns 0-100. Returns 0 for empty input.
 */
export function calculateRiasecType(rawScores: number[]): number {
  if (rawScores.length === 0) return 0;
  const sanitized = rawScores.map(sanitizeValue);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return ((sum - count) / (count * 4)) * 100;
}

/**
 * Calculate normalized scores for all 6 RIASEC types from raw Likert data.
 */
export function calculateAllRiasec(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    result[type] = calculateRiasecType(raw[type] || []);
  }
  return result;
}

/**
 * Merge Likert (70%) and ipsative (30%) normalized scores.
 * If ipsative score is null/undefined for a type, use Likert alone.
 */
export function mergeIpsativeScores(
  likert: Record<string, number>,
  ipsative: Record<string, number | null>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const type of RIASEC_TYPES) {
    const likertScore = likert[type] ?? 0;
    const ipsativeScore = ipsative[type];
    if (ipsativeScore != null) {
      result[type] = likertScore * 0.7 + ipsativeScore * 0.3;
    } else {
      result[type] = likertScore;
    }
  }
  return result;
}

/**
 * Detect acquiescence bias: returns true if all 6 types score above 80.
 */
export function detectAcquiescenceBias(
  scores: Record<string, number>
): boolean {
  return RIASEC_TYPES.every((type) => (scores[type] ?? 0) > 80);
}

/**
 * Derive a CLASS label from RIASEC scores.
 *
 * Rules:
 * 1. Top 2 both > 50 and gap from 2nd to 3rd > 10 → "TYPE1-TYPE2"
 * 2. Top 1 > 50 and leads 2nd by > 15 → single "TYPE1"
 * 3. All < 40 → "SEEKER"
 * 4. Otherwise → "EXPLORER"
 */
export function deriveClassLabel(scores: Record<string, number>): string {
  const sorted = RIASEC_TYPES.map((type) => ({
    type,
    score: scores[type] ?? 0,
  })).sort((a, b) => b.score - a.score);

  const [first, second, third] = sorted;

  if (
    first.score > 50 &&
    second.score > 50 &&
    second.score - third.score > 10
  ) {
    return `${RIASEC_DISPLAY_NAMES[first.type]}-${RIASEC_DISPLAY_NAMES[second.type]}`;
  }

  if (first.score > 50) {
    if (first.score - second.score > 15) {
      return RIASEC_DISPLAY_NAMES[first.type];
    }
    return "EXPLORER";
  }

  if (sorted.every((s) => s.score < 40)) {
    return "SEEKER";
  }

  return "EXPLORER";
}
```

- [ ] **Step 4:** Run the tests to confirm they pass.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/riasec.test.ts
```

Expected: All tests pass.

- [ ] **Step 5:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/scoring/riasec.ts lib/scoring/__tests__/riasec.test.ts
git commit -m "feat: add RIASEC scoring engine with full test coverage"
```

---

### Task 7: MI Scoring (TDD)

**Files:**
- Create: `lib/scoring/__tests__/mi.test.ts`
- Create: `lib/scoring/mi.ts`

- [ ] **Step 1:** Write failing tests. Create `lib/scoring/__tests__/mi.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateMiDimension, calculateAllMi, getTopMi } from "../mi";

describe("calculateMiDimension", () => {
  it("normalizes [2, 2] with max_weight 2 to 100", () => {
    expect(calculateMiDimension([2, 2], 2)).toBe(100);
  });

  it("normalizes [1, 1] with max_weight 2 to 50", () => {
    expect(calculateMiDimension([1, 1], 2)).toBe(50);
  });

  it("normalizes [0] with max_weight 2 to 0", () => {
    expect(calculateMiDimension([0], 2)).toBe(0);
  });

  it("normalizes [2] with max_weight 2 to 100", () => {
    expect(calculateMiDimension([2], 2)).toBe(100);
  });

  it("normalizes [1, 2, 1] with max_weight 2 to approximately 66.7", () => {
    // sum=4, count=3, max=2 → 4/(3*2)*100 = 66.67
    expect(calculateMiDimension([1, 2, 1], 2)).toBeCloseTo(66.7, 0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateMiDimension([], 2)).toBe(0);
  });
});

describe("calculateAllMi", () => {
  it("normalizes all 8 dimensions from raw data", () => {
    const raw = {
      linguistic: [2],
      logical: [1],
      spatial: [2, 1],
      musical: [],
      bodily: [1],
      interpersonal: [2],
      intrapersonal: [0],
      naturalistic: [1],
    };
    const result = calculateAllMi(raw, 2);
    expect(result.linguistic).toBe(100);
    expect(result.logical).toBe(50);
    expect(result.spatial).toBe(75);
    expect(result.musical).toBe(0);
    expect(result.bodily).toBe(50);
    expect(result.interpersonal).toBe(100);
    expect(result.intrapersonal).toBe(0);
    expect(result.naturalistic).toBe(50);
  });

  it("handles completely empty raw data", () => {
    const raw = {
      linguistic: [],
      logical: [],
      spatial: [],
      musical: [],
      bodily: [],
      interpersonal: [],
      intrapersonal: [],
      naturalistic: [],
    };
    const result = calculateAllMi(raw, 2);
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });
});

describe("getTopMi", () => {
  it("returns top 3 dimensions sorted by score descending", () => {
    const scores = {
      linguistic: 80,
      logical: 50,
      spatial: 90,
      musical: 10,
      bodily: 60,
      interpersonal: 70,
      intrapersonal: 30,
      naturalistic: 40,
    };
    const top3 = getTopMi(scores, 3);
    expect(top3).toEqual([
      { dimension: "spatial", score: 90 },
      { dimension: "linguistic", score: 80 },
      { dimension: "interpersonal", score: 70 },
    ]);
  });

  it("returns all dimensions if n exceeds total", () => {
    const scores = {
      linguistic: 80,
      logical: 50,
      spatial: 90,
      musical: 10,
      bodily: 60,
      interpersonal: 70,
      intrapersonal: 30,
      naturalistic: 40,
    };
    const top10 = getTopMi(scores, 10);
    expect(top10.length).toBe(8);
    expect(top10[0].dimension).toBe("spatial");
  });

  it("handles all zeros", () => {
    const scores = {
      linguistic: 0,
      logical: 0,
      spatial: 0,
      musical: 0,
      bodily: 0,
      interpersonal: 0,
      intrapersonal: 0,
      naturalistic: 0,
    };
    const top3 = getTopMi(scores, 3);
    expect(top3.length).toBe(3);
    expect(top3.every((t) => t.score === 0)).toBe(true);
  });
});
```

- [ ] **Step 2:** Run the test to confirm it fails.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/mi.test.ts
```

Expected: All tests fail (module not found).

- [ ] **Step 3:** Implement. Create `lib/scoring/mi.ts`:

```typescript
export const MI_DIMENSIONS = [
  "linguistic",
  "logical",
  "spatial",
  "musical",
  "bodily",
  "interpersonal",
  "intrapersonal",
  "naturalistic",
] as const;

export type MiDimension = (typeof MI_DIMENSIONS)[number];

/**
 * Normalize raw signal weights for a single MI dimension.
 * Formula: (sum / (count * max_weight)) * 100
 * Returns 0-100. Returns 0 for empty input.
 */
export function calculateMiDimension(
  rawSignals: number[],
  maxWeight: number
): number {
  if (rawSignals.length === 0 || maxWeight === 0) return 0;
  const count = rawSignals.length;
  const sum = rawSignals.reduce((a, b) => a + b, 0);
  return (sum / (count * maxWeight)) * 100;
}

/**
 * Calculate normalized scores for all 8 MI dimensions.
 */
export function calculateAllMi(
  raw: Record<string, number[]>,
  maxWeight: number = 2
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dim of MI_DIMENSIONS) {
    result[dim] = calculateMiDimension(raw[dim] || [], maxWeight);
  }
  return result;
}

/**
 * Get top N MI dimensions sorted by score descending.
 */
export function getTopMi(
  scores: Record<string, number>,
  n: number
): Array<{ dimension: string; score: number }> {
  return Object.entries(scores)
    .map(([dimension, score]) => ({ dimension, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
```

- [ ] **Step 4:** Run the tests to confirm they pass.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/mi.test.ts
```

Expected: All tests pass.

- [ ] **Step 5:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/scoring/mi.ts lib/scoring/__tests__/mi.test.ts
git commit -m "feat: add MI scoring engine with full test coverage"
```

---

### Task 8: MBTI Scoring (TDD)

**Files:**
- Create: `lib/scoring/__tests__/mbti.test.ts`
- Create: `lib/scoring/mbti.ts`

- [ ] **Step 1:** Write failing tests. Create `lib/scoring/__tests__/mbti.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateMbtiDichotomy,
  calculateAllMbti,
  isStillEmerging,
  deriveEmergingType,
} from "../mbti";

describe("calculateMbtiDichotomy", () => {
  it("normalizes [-3, -3] to -100", () => {
    expect(calculateMbtiDichotomy([-3, -3])).toBe(-100);
  });

  it("normalizes [3, 3] to 100", () => {
    expect(calculateMbtiDichotomy([3, 3])).toBe(100);
  });

  it("normalizes [0, 0] to 0", () => {
    expect(calculateMbtiDichotomy([0, 0])).toBe(0);
  });

  it("normalizes [-2, -2] to approximately -67", () => {
    // sum=-4, count=2, norm = (-4 / (2*3)) * 100 = -66.67
    expect(calculateMbtiDichotomy([-2, -2])).toBeCloseTo(-66.7, 0);
  });

  it("normalizes [1, -1] to 0", () => {
    expect(calculateMbtiDichotomy([1, -1])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateMbtiDichotomy([])).toBe(0);
  });

  it("clamps values to -3 to +3 range", () => {
    // [-5, 7] → clamped to [-3, 3] → sum=0 → 0
    expect(calculateMbtiDichotomy([-5, 7])).toBe(0);
  });

  it("rounds non-integer values", () => {
    // [2.7] → rounds to 3 → (3 / (1*3)) * 100 = 100
    expect(calculateMbtiDichotomy([2.7])).toBe(100);
  });
});

describe("calculateAllMbti", () => {
  it("normalizes all 4 dichotomies", () => {
    const raw = {
      EI: [-3, -1],
      SN: [2, 2],
      TF: [0, 0],
      JP: [-2, -2],
    };
    const result = calculateAllMbti(raw);
    // EI: (-4 / 6) * 100 = -66.67
    expect(result.EI).toBeCloseTo(-66.7, 0);
    // SN: (4 / 6) * 100 = 66.67
    expect(result.SN).toBeCloseTo(66.7, 0);
    // TF: 0
    expect(result.TF).toBe(0);
    // JP: (-4 / 6) * 100 = -66.67
    expect(result.JP).toBeCloseTo(-66.7, 0);
  });

  it("handles empty raw data as 0 for all dichotomies", () => {
    const raw = { EI: [], SN: [], TF: [], JP: [] };
    const result = calculateAllMbti(raw);
    expect(result.EI).toBe(0);
    expect(result.SN).toBe(0);
    expect(result.TF).toBe(0);
    expect(result.JP).toBe(0);
  });
});

describe("isStillEmerging", () => {
  it("returns true when abs(score) < 35", () => {
    expect(isStillEmerging(0)).toBe(true);
    expect(isStillEmerging(33)).toBe(true);
    expect(isStillEmerging(-33)).toBe(true);
    expect(isStillEmerging(34)).toBe(true);
  });

  it("returns false when abs(score) >= 35", () => {
    expect(isStillEmerging(35)).toBe(false);
    expect(isStillEmerging(-35)).toBe(false);
    expect(isStillEmerging(67)).toBe(false);
    expect(isStillEmerging(-100)).toBe(false);
  });
});

describe("deriveEmergingType", () => {
  it("produces full type for strong signals: I N T J", () => {
    const scores = { EI: -67, SN: 67, TF: -67, JP: -67 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("INTJ");
    expect(result.display).toBe("I N T J");
  });

  it("shows underscore for emerging dichotomies", () => {
    const scores = { EI: -67, SN: 67, TF: 0, JP: -67 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("IN_J");
    expect(result.display).toBe("I N _ J");
  });

  it("shows all underscores when everything is emerging", () => {
    const scores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("____");
    expect(result.display).toBe("_ _ _ _");
  });

  it("handles positive scores correctly (E, N, F, P)", () => {
    const scores = { EI: 67, SN: 67, TF: 67, JP: 67 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("ENFP");
    expect(result.display).toBe("E N F P");
  });

  it("handles negative scores correctly (I, S, T, J)", () => {
    const scores = { EI: -100, SN: -100, TF: -100, JP: -100 };
    const result = deriveEmergingType(scores);
    expect(result.type).toBe("ISTJ");
    expect(result.display).toBe("I S T J");
  });
});
```

- [ ] **Step 2:** Run the test to confirm it fails.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/mbti.test.ts
```

Expected: All tests fail (module not found).

- [ ] **Step 3:** Implement. Create `lib/scoring/mbti.ts`:

```typescript
export const MBTI_DICHOTOMIES = ["EI", "SN", "TF", "JP"] as const;
export type MbtiDichotomy = (typeof MBTI_DICHOTOMIES)[number];

/**
 * Maps dichotomy to [negative_letter, positive_letter].
 * Negative score (-100) = first letter, positive score (+100) = second letter.
 */
const DICHOTOMY_POLES: Record<MbtiDichotomy, [string, string]> = {
  EI: ["I", "E"],
  SN: ["S", "N"],
  TF: ["T", "F"],
  JP: ["J", "P"],
};

const STILL_EMERGING_THRESHOLD = 35;

/**
 * Clamp and round a raw spectrum value to integer -3 to +3.
 */
function sanitizeValue(v: number): number {
  const rounded = Math.round(v);
  return Math.max(-3, Math.min(3, rounded));
}

/**
 * Normalize raw responses for a single MBTI dichotomy.
 * Formula: (sum / (count * 3)) * 100
 * Returns -100 to +100. Returns 0 for empty input.
 */
export function calculateMbtiDichotomy(rawValues: number[]): number {
  if (rawValues.length === 0) return 0;
  const sanitized = rawValues.map(sanitizeValue);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return (sum / (count * 3)) * 100;
}

/**
 * Calculate normalized scores for all 4 MBTI dichotomies.
 */
export function calculateAllMbti(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dichotomy of MBTI_DICHOTOMIES) {
    result[dichotomy] = calculateMbtiDichotomy(raw[dichotomy] || []);
  }
  return result;
}

/**
 * Determine if a dichotomy score is too close to center to be definitive.
 * With 2 questions per dichotomy, scores of -33, 0, +33 are "still emerging".
 */
export function isStillEmerging(score: number): boolean {
  return Math.abs(score) < STILL_EMERGING_THRESHOLD;
}

/**
 * Derive the emerging MBTI type string from all dichotomy scores.
 * Returns type (e.g. "IN_J") and display (e.g. "I N _ J").
 */
export function deriveEmergingType(scores: Record<string, number>): {
  type: string;
  display: string;
} {
  const letters: string[] = [];

  for (const dichotomy of MBTI_DICHOTOMIES) {
    const score = scores[dichotomy] ?? 0;
    if (isStillEmerging(score)) {
      letters.push("_");
    } else {
      const [negativeLetter, positiveLetter] = DICHOTOMY_POLES[dichotomy];
      letters.push(score < 0 ? negativeLetter : positiveLetter);
    }
  }

  return {
    type: letters.join(""),
    display: letters.join(" "),
  };
}
```

- [ ] **Step 4:** Run the tests to confirm they pass.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/mbti.test.ts
```

Expected: All tests pass.

- [ ] **Step 5:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/scoring/mbti.ts lib/scoring/__tests__/mbti.test.ts
git commit -m "feat: add MBTI scoring engine with emerging type derivation and full test coverage"
```

---

### Task 9: Values Scoring (TDD)

**Files:**
- Create: `lib/scoring/__tests__/values.test.ts`
- Create: `lib/scoring/values.ts`

- [ ] **Step 1:** Write failing tests. Create `lib/scoring/__tests__/values.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateValuesDimension, calculateAllValues } from "../values";

describe("calculateValuesDimension", () => {
  it("normalizes [-3, -3] to -100", () => {
    expect(calculateValuesDimension([-3, -3])).toBe(-100);
  });

  it("normalizes [3, 3] to 100", () => {
    expect(calculateValuesDimension([3, 3])).toBe(100);
  });

  it("normalizes [0, 0] to 0", () => {
    expect(calculateValuesDimension([0, 0])).toBe(0);
  });

  it("normalizes [-2] to approximately -67", () => {
    // (-2 / (1*3)) * 100 = -66.67
    expect(calculateValuesDimension([-2])).toBeCloseTo(-66.7, 0);
  });

  it("normalizes [1, -1] to 0", () => {
    expect(calculateValuesDimension([1, -1])).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateValuesDimension([])).toBe(0);
  });

  it("clamps to -3 to +3 range", () => {
    // [-5, 7] → clamped to [-3, 3] → sum=0 → 0
    expect(calculateValuesDimension([-5, 7])).toBe(0);
  });

  it("rounds non-integer values", () => {
    // [2.6] → rounds to 3 → (3 / (1*3)) * 100 = 100
    expect(calculateValuesDimension([2.6])).toBe(100);
  });
});

describe("calculateAllValues", () => {
  it("normalizes all 5 value dimensions", () => {
    const raw = {
      security_adventure: [-3],
      income_impact: [3],
      prestige_fulfilment: [],
      structure_flexibility: [0],
      solo_team: [-1],
    };
    const result = calculateAllValues(raw);
    expect(result.security_adventure).toBeCloseTo(-100, 1);
    expect(result.income_impact).toBeCloseTo(100, 1);
    expect(result.prestige_fulfilment).toBe(0);
    expect(result.structure_flexibility).toBe(0);
    expect(result.solo_team).toBeCloseTo(-33.3, 0);
  });

  it("handles all empty arrays as 0", () => {
    const raw = {
      security_adventure: [],
      income_impact: [],
      prestige_fulfilment: [],
      structure_flexibility: [],
      solo_team: [],
    };
    const result = calculateAllValues(raw);
    expect(Object.values(result).every((v) => v === 0)).toBe(true);
  });
});
```

- [ ] **Step 2:** Run the test to confirm it fails.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/values.test.ts
```

Expected: All tests fail (module not found).

- [ ] **Step 3:** Implement. Create `lib/scoring/values.ts`:

```typescript
export const VALUES_DIMENSIONS = [
  "security_adventure",
  "income_impact",
  "prestige_fulfilment",
  "structure_flexibility",
  "solo_team",
] as const;

export type ValuesDimension = (typeof VALUES_DIMENSIONS)[number];

/**
 * Clamp and round a raw spectrum value to integer -3 to +3.
 */
function sanitizeValue(v: number): number {
  const rounded = Math.round(v);
  return Math.max(-3, Math.min(3, rounded));
}

/**
 * Normalize raw responses for a single values dimension.
 * Same formula as MBTI: (sum / (count * 3)) * 100
 * Returns -100 to +100. Returns 0 for empty input.
 */
export function calculateValuesDimension(rawValues: number[]): number {
  if (rawValues.length === 0) return 0;
  const sanitized = rawValues.map(sanitizeValue);
  const count = sanitized.length;
  const sum = sanitized.reduce((a, b) => a + b, 0);
  return (sum / (count * 3)) * 100;
}

/**
 * Calculate normalized scores for all values dimensions.
 */
export function calculateAllValues(
  raw: Record<string, number[]>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const dim of VALUES_DIMENSIONS) {
    result[dim] = calculateValuesDimension(raw[dim] || []);
  }
  return result;
}
```

- [ ] **Step 4:** Run the tests to confirm they pass.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/values.test.ts
```

Expected: All tests pass.

- [ ] **Step 5:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/scoring/values.ts lib/scoring/__tests__/values.test.ts
git commit -m "feat: add Values scoring engine with full test coverage"
```

---

### Task 10: Strengths Scoring (TDD)

**Files:**
- Create: `lib/scoring/__tests__/strengths.test.ts`
- Create: `lib/scoring/strengths.ts`

- [ ] **Step 1:** Write failing tests. Create `lib/scoring/__tests__/strengths.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { accumulateStrengths, getTopStrengths } from "../strengths";

describe("accumulateStrengths", () => {
  it("counts frequency of each strength signal", () => {
    const signals = ["Achiever", "Ideation", "Achiever", "Empathy", "Achiever"];
    const result = accumulateStrengths(signals);
    expect(result).toEqual({
      Achiever: 3,
      Ideation: 1,
      Empathy: 1,
    });
  });

  it("returns empty object for empty input", () => {
    expect(accumulateStrengths([])).toEqual({});
  });

  it("handles single signal", () => {
    expect(accumulateStrengths(["Command"])).toEqual({ Command: 1 });
  });
});

describe("getTopStrengths", () => {
  it("returns top N strength categories sorted by count descending", () => {
    const signals = [
      "Achiever",
      "Ideation",
      "Achiever",
      "Empathy",
      "Achiever",
      "Ideation",
    ];
    const top2 = getTopStrengths(signals, 2);
    expect(top2).toEqual(["Achiever", "Ideation"]);
  });

  it("returns all if n exceeds unique count", () => {
    const signals = ["Achiever", "Empathy"];
    const top5 = getTopStrengths(signals, 5);
    expect(top5).toEqual(["Achiever", "Empathy"]);
  });

  it("returns empty array for empty input", () => {
    expect(getTopStrengths([], 3)).toEqual([]);
  });

  it("breaks ties by preserving first-seen order", () => {
    const signals = ["Ideation", "Empathy", "Command"];
    // All have count 1 — should preserve order
    const top3 = getTopStrengths(signals, 3);
    expect(top3).toEqual(["Ideation", "Empathy", "Command"]);
  });
});
```

- [ ] **Step 2:** Run the test to confirm it fails.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/strengths.test.ts
```

Expected: All tests fail (module not found).

- [ ] **Step 3:** Implement. Create `lib/scoring/strengths.ts`:

```typescript
/**
 * Count frequency of each strength signal from warm-up responses.
 * Returns a map of strength category → count.
 */
export function accumulateStrengths(
  signals: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const signal of signals) {
    counts[signal] = (counts[signal] || 0) + 1;
  }
  return counts;
}

/**
 * Get top N strength categories sorted by frequency descending.
 * Ties are broken by first-seen order (stable sort).
 */
export function getTopStrengths(signals: string[], n: number): string[] {
  const counts = accumulateStrengths(signals);

  // Preserve first-seen order for tie-breaking
  const seen: string[] = [];
  for (const signal of signals) {
    if (!seen.includes(signal)) {
      seen.push(signal);
    }
  }

  return seen
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
    .slice(0, n);
}
```

- [ ] **Step 4:** Run the tests to confirm they pass.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/strengths.test.ts
```

Expected: All tests pass.

- [ ] **Step 5:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/scoring/strengths.ts lib/scoring/__tests__/strengths.test.ts
git commit -m "feat: add Strengths scoring engine with full test coverage"
```

---

### Task 11: Adaptive Question Selection (TDD)

**Files:**
- Create: `lib/scoring/__tests__/adaptive.test.ts`
- Create: `lib/scoring/adaptive.ts`

- [ ] **Step 1:** Write failing tests. Create `lib/scoring/__tests__/adaptive.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { selectAdaptiveQuestions } from "../adaptive";
import type { Question } from "@/lib/types/quest";

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

function makeMbtiQuestion(
  id: string,
  target: string
): Question {
  return {
    id,
    session_number: 1,
    block: "confirmatory",
    question_text: `MBTI ${target} adaptive question ${id}`,
    question_type: "forced_choice",
    options: [
      { label: "Option A", value: -3 },
      { label: "Option B", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: target,
    is_adaptive: true,
  };
}

function makeMiQuestion(
  id: string,
  target: string
): Question {
  return {
    id,
    session_number: 1,
    block: "confirmatory",
    question_text: `MI ${target} adaptive question ${id}`,
    question_type: "multiple_choice",
    options: [
      { label: "Option A", value: 1, framework_signals: { [target]: 2 } },
      { label: "Option B", value: 2, framework_signals: { [target]: 1 } },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: target,
    is_adaptive: true,
  };
}

// Build a pool of 30 adaptive questions: 18 RIASEC + 8 MBTI + 4 MI
function buildPool(): Question[] {
  const pool: Question[] = [];
  // 18 RIASEC: 3 per type
  for (const type of ["R", "I", "A", "S", "E", "C"]) {
    for (let i = 1; i <= 3; i++) {
      pool.push(makeRiasecQuestion(`adapt-riasec-${type}-${i}`, type));
    }
  }
  // 8 MBTI: 2 per dichotomy
  for (const dich of ["EI", "SN", "TF", "JP"]) {
    for (let i = 1; i <= 2; i++) {
      pool.push(makeMbtiQuestion(`adapt-mbti-${dich}-${i}`, dich));
    }
  }
  // 4 MI: 1 each
  for (const dim of ["linguistic", "spatial", "bodily", "interpersonal"]) {
    pool.push(makeMiQuestion(`adapt-mi-${dim}`, dim));
  }
  return pool;
}

describe("selectAdaptiveQuestions", () => {
  const pool = buildPool();

  it("returns exactly 5 questions", () => {
    const riasecScores = { R: 60, I: 58, A: 40, S: 30, E: 20, C: 10 };
    const riasecRaw = { R: [4, 5], I: [4, 4], A: [3, 2], S: [2, 2], E: [1, 2], C: [1, 1] };
    const miScores = { linguistic: 80, logical: 50, spatial: 75, musical: 10, bodily: 60, interpersonal: 70, intrapersonal: 30, naturalistic: 40 };
    const miRaw = { linguistic: [2], logical: [1], spatial: [2, 1], musical: [], bodily: [1], interpersonal: [2], intrapersonal: [0], naturalistic: [1] };
    const mbtiScores = { EI: -67, SN: 67, TF: 0, JP: -33 };
    const mbtiRaw = { EI: [-3, -1], SN: [2, 2], TF: [0, 0], JP: [-1, -1] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    expect(selected).toHaveLength(5);
  });

  it("does not exceed max 2 per RIASEC type", () => {
    // Make R and I very close so algorithm wants lots of RIASEC R questions
    const riasecScores = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
    const riasecRaw = { R: [3, 3], I: [3, 3], A: [3, 3], S: [3, 3], E: [3, 3], C: [3, 3] };
    const miScores = { linguistic: 50, logical: 50, spatial: 50, musical: 50, bodily: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 };
    const miRaw = { linguistic: [1], logical: [1], spatial: [1], musical: [1], bodily: [1], interpersonal: [1], intrapersonal: [1], naturalistic: [1] };
    const mbtiScores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    // Count per RIASEC type
    for (const type of ["R", "I", "A", "S", "E", "C"]) {
      const count = selected.filter(
        (q) => q.framework === "riasec" && q.framework_target === type
      ).length;
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("does not exceed max 2 per MBTI dichotomy", () => {
    const riasecScores = { R: 80, I: 20, A: 80, S: 20, E: 80, C: 20 };
    const riasecRaw = { R: [5, 5], I: [1, 1], A: [5, 5], S: [1, 1], E: [5, 5], C: [1, 1] };
    const miScores = { linguistic: 100, logical: 100, spatial: 100, musical: 100, bodily: 100, interpersonal: 100, intrapersonal: 100, naturalistic: 100 };
    const miRaw = { linguistic: [2], logical: [2], spatial: [2], musical: [2], bodily: [2], interpersonal: [2], intrapersonal: [2], naturalistic: [2] };
    const mbtiScores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    for (const dich of ["EI", "SN", "TF", "JP"]) {
      const count = selected.filter(
        (q) => q.framework === "mbti" && q.framework_target === dich
      ).length;
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("does not exceed max 1 MI question", () => {
    const riasecScores = { R: 80, I: 80, A: 80, S: 80, E: 80, C: 80 };
    const riasecRaw = { R: [5, 5], I: [5, 5], A: [5, 5], S: [5, 5], E: [5, 5], C: [5, 5] };
    const miScores = { linguistic: 50, logical: 50, spatial: 50, musical: 50, bodily: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 };
    const miRaw = { linguistic: [1], logical: [1], spatial: [1], musical: [1], bodily: [1], interpersonal: [1], intrapersonal: [1], naturalistic: [1] };
    const mbtiScores = { EI: -100, SN: 100, TF: -100, JP: 100 };
    const mbtiRaw = { EI: [-3, -3], SN: [3, 3], TF: [-3, -3], JP: [3, 3] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    const miCount = selected.filter((q) => q.framework === "mi").length;
    expect(miCount).toBeLessThanOrEqual(1);
  });

  it("handles edge case where all scores are equal", () => {
    const riasecScores = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
    const riasecRaw = { R: [3, 3], I: [3, 3], A: [3, 3], S: [3, 3], E: [3, 3], C: [3, 3] };
    const miScores = { linguistic: 50, logical: 50, spatial: 50, musical: 50, bodily: 50, interpersonal: 50, intrapersonal: 50, naturalistic: 50 };
    const miRaw = { linguistic: [1], logical: [1], spatial: [1], musical: [1], bodily: [1], interpersonal: [1], intrapersonal: [1], naturalistic: [1] };
    const mbtiScores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [0, 0], SN: [0, 0], TF: [0, 0], JP: [0, 0] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    expect(selected).toHaveLength(5);
    // All questions should be unique
    const ids = selected.map((q) => q.id);
    expect(new Set(ids).size).toBe(5);
  });

  it("prioritizes most ambiguous dimensions", () => {
    // MBTI TF and JP are at 0 (most ambiguous), RIASEC are all clear
    const riasecScores = { R: 100, I: 0, A: 50, S: 25, E: 75, C: 12.5 };
    const riasecRaw = { R: [5, 5], I: [1, 1], A: [3, 3], S: [2, 2], E: [4, 4], C: [1, 1] };
    const miScores = { linguistic: 100, logical: 0, spatial: 100, musical: 0, bodily: 100, interpersonal: 0, intrapersonal: 100, naturalistic: 0 };
    const miRaw = { linguistic: [2], logical: [0], spatial: [2], musical: [0], bodily: [2], interpersonal: [0], intrapersonal: [2], naturalistic: [0] };
    const mbtiScores = { EI: -100, SN: 100, TF: 0, JP: 0 };
    const mbtiRaw = { EI: [-3, -3], SN: [3, 3], TF: [1, -1], JP: [-1, 1] };

    const selected = selectAdaptiveQuestions({
      riasecScores,
      riasecRaw,
      miScores,
      miRaw,
      mbtiScores,
      mbtiRaw,
      pool,
    });

    // Should include at least one TF and one JP question since those are most ambiguous
    const tfCount = selected.filter(
      (q) => q.framework === "mbti" && q.framework_target === "TF"
    ).length;
    const jpCount = selected.filter(
      (q) => q.framework === "mbti" && q.framework_target === "JP"
    ).length;
    expect(tfCount).toBeGreaterThanOrEqual(1);
    expect(jpCount).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2:** Run the test to confirm it fails.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/adaptive.test.ts
```

Expected: All tests fail (module not found).

- [ ] **Step 3:** Implement. Create `lib/scoring/adaptive.ts`:

```typescript
import type { Question } from "@/lib/types/quest";

export interface AdaptiveInput {
  riasecScores: Record<string, number>;
  riasecRaw: Record<string, number[]>;
  miScores: Record<string, number>;
  miRaw: Record<string, number[]>;
  mbtiScores: Record<string, number>;
  mbtiRaw: Record<string, number[]>;
  pool: Question[];
}

interface AmbiguityEntry {
  framework: string;
  target: string;
  ambiguity: number;
}

const RIASEC_TYPES = ["R", "I", "A", "S", "E", "C"];
const MBTI_DICHOTOMIES = ["EI", "SN", "TF", "JP"];

const MAX_RIASEC_PER_TYPE = 2;
const MAX_MBTI_PER_DICHOTOMY = 2;
const MAX_MI_TOTAL = 1;
const TOTAL_QUESTIONS = 5;

/**
 * Calculate ambiguity for RIASEC: for adjacent pairs sorted by score,
 * ambiguity = gap / sqrt(response_count_for_lower_type).
 * Lower ambiguity = more ambiguous = higher priority.
 */
function calculateRiasecAmbiguities(
  scores: Record<string, number>,
  raw: Record<string, number[]>
): AmbiguityEntry[] {
  const sorted = RIASEC_TYPES.map((type) => ({
    type,
    score: scores[type] ?? 0,
    count: (raw[type] || []).length,
  })).sort((a, b) => b.score - a.score);

  const entries: AmbiguityEntry[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const higher = sorted[i];
    const lower = sorted[i + 1];
    const gap = higher.score - lower.score;
    const denominator = Math.sqrt(Math.max(lower.count, 1));
    const ambiguity = gap / denominator;

    // Add entry for the lower-scored type (needs more data to resolve)
    entries.push({
      framework: "riasec",
      target: lower.type,
      ambiguity,
    });
  }

  // Also add the top type with high ambiguity (it's already clear)
  entries.push({
    framework: "riasec",
    target: sorted[0].type,
    ambiguity: Infinity,
  });

  return entries;
}

/**
 * Calculate ambiguity for MBTI: ambiguity = abs(score) / sqrt(response_count).
 * Lower = more ambiguous.
 */
function calculateMbtiAmbiguities(
  scores: Record<string, number>,
  raw: Record<string, number[]>
): AmbiguityEntry[] {
  return MBTI_DICHOTOMIES.map((dich) => {
    const score = scores[dich] ?? 0;
    const count = (raw[dich] || []).length;
    const denominator = Math.sqrt(Math.max(count, 1));
    return {
      framework: "mbti",
      target: dich,
      ambiguity: Math.abs(score) / denominator,
    };
  });
}

/**
 * Calculate ambiguity for MI: for top 3 types, gap between adjacent / sqrt(count).
 * Lower = more ambiguous.
 */
function calculateMiAmbiguities(
  scores: Record<string, number>,
  raw: Record<string, number[]>
): AmbiguityEntry[] {
  const sorted = Object.entries(scores)
    .map(([dim, score]) => ({
      dim,
      score,
      count: (raw[dim] || []).length,
    }))
    .sort((a, b) => b.score - a.score);

  const entries: AmbiguityEntry[] = [];

  // Only consider top 3 MI dimensions for ambiguity
  for (let i = 0; i < Math.min(sorted.length - 1, 3); i++) {
    const higher = sorted[i];
    const lower = sorted[i + 1];
    const gap = higher.score - lower.score;
    const denominator = Math.sqrt(Math.max(lower.count, 1));
    entries.push({
      framework: "mi",
      target: lower.dim,
      ambiguity: gap / denominator,
    });
  }

  return entries;
}

/**
 * Select 5 adaptive questions from the pool, targeting the most ambiguous dimensions.
 *
 * Constraints:
 * - Max 2 per RIASEC type
 * - Max 2 per MBTI dichotomy
 * - Max 1 MI question total
 * - Exactly 5 questions returned
 */
export function selectAdaptiveQuestions(input: AdaptiveInput): Question[] {
  const {
    riasecScores,
    riasecRaw,
    miScores,
    miRaw,
    mbtiScores,
    mbtiRaw,
    pool,
  } = input;

  // Calculate ambiguity for all dimensions
  const allAmbiguities: AmbiguityEntry[] = [
    ...calculateRiasecAmbiguities(riasecScores, riasecRaw),
    ...calculateMbtiAmbiguities(mbtiScores, mbtiRaw),
    ...calculateMiAmbiguities(miScores, miRaw),
  ];

  // Sort by ambiguity ascending (most ambiguous first)
  allAmbiguities.sort((a, b) => a.ambiguity - b.ambiguity);

  const selected: Question[] = [];
  const usedIds = new Set<string>();
  const riasecCount: Record<string, number> = {};
  const mbtiCount: Record<string, number> = {};
  let miCount = 0;

  // Walk ranked list, pick 1 question per ambiguous dimension
  for (const entry of allAmbiguities) {
    if (selected.length >= TOTAL_QUESTIONS) break;

    // Check framework-specific caps
    if (entry.framework === "riasec") {
      if ((riasecCount[entry.target] || 0) >= MAX_RIASEC_PER_TYPE) continue;
    } else if (entry.framework === "mbti") {
      if ((mbtiCount[entry.target] || 0) >= MAX_MBTI_PER_DICHOTOMY) continue;
    } else if (entry.framework === "mi") {
      if (miCount >= MAX_MI_TOTAL) continue;
    }

    // Find an unused question from the pool matching this dimension
    const candidate = pool.find(
      (q) =>
        q.framework === entry.framework &&
        q.framework_target === entry.target &&
        !usedIds.has(q.id)
    );

    if (candidate) {
      selected.push(candidate);
      usedIds.add(candidate.id);

      if (entry.framework === "riasec") {
        riasecCount[entry.target] = (riasecCount[entry.target] || 0) + 1;
      } else if (entry.framework === "mbti") {
        mbtiCount[entry.target] = (mbtiCount[entry.target] || 0) + 1;
      } else if (entry.framework === "mi") {
        miCount++;
      }
    }
  }

  // If we still need more questions (unlikely but possible), fill from remaining pool
  if (selected.length < TOTAL_QUESTIONS) {
    for (const q of pool) {
      if (selected.length >= TOTAL_QUESTIONS) break;
      if (usedIds.has(q.id)) continue;

      // Respect caps
      if (q.framework === "riasec") {
        if ((riasecCount[q.framework_target] || 0) >= MAX_RIASEC_PER_TYPE)
          continue;
      } else if (q.framework === "mbti") {
        if ((mbtiCount[q.framework_target] || 0) >= MAX_MBTI_PER_DICHOTOMY)
          continue;
      } else if (q.framework === "mi") {
        if (miCount >= MAX_MI_TOTAL) continue;
      }

      selected.push(q);
      usedIds.add(q.id);

      if (q.framework === "riasec") {
        riasecCount[q.framework_target] =
          (riasecCount[q.framework_target] || 0) + 1;
      } else if (q.framework === "mbti") {
        mbtiCount[q.framework_target] =
          (mbtiCount[q.framework_target] || 0) + 1;
      } else if (q.framework === "mi") {
        miCount++;
      }
    }
  }

  return selected;
}
```

- [ ] **Step 4:** Run the tests to confirm they pass.

```bash
cd "/Users/gerrygan/Career Quest"
npx vitest run lib/scoring/__tests__/adaptive.test.ts
```

Expected: All tests pass.

- [ ] **Step 5:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add lib/scoring/adaptive.ts lib/scoring/__tests__/adaptive.test.ts
git commit -m "feat: add adaptive question selection algorithm with full test coverage"
```

---

### Task 12: Question Data — Session 1 Core

**Files:**
- Create: `data/questions/session-1-core.ts`

- [ ] **Step 1:** Create `data/questions/session-1-core.ts` with all 35 core questions + 1 engagement checkpoint:

```typescript
import type { Question } from "@/lib/types/quest";

// =============================================================================
// BLOCK 1: WARM-UP (5 questions)
// Multiple choice with hidden framework_signals + strength_signal
// =============================================================================

export const warmupQuestions: Question[] = [
  {
    id: "s1-warmup-01",
    session_number: 1,
    block: "warmup",
    question_text: "What would you do with a completely free Saturday?",
    question_type: "multiple_choice",
    options: [
      {
        label: "Build or fix something",
        value: 1,
        emoji: "🔧",
        framework_signals: { riasec_R: 2, mi_bodily: 1 },
        strength_signal: "Achiever",
      },
      {
        label: "Read, research, or learn something new",
        value: 2,
        emoji: "📚",
        framework_signals: { riasec_I: 2, mi_linguistic: 1 },
        strength_signal: "Analytical",
      },
      {
        label: "Create art, music, or write something",
        value: 3,
        emoji: "🎨",
        framework_signals: { riasec_A: 2, mi_spatial: 1 },
        strength_signal: "Creativity",
      },
      {
        label: "Hang out with friends and help someone",
        value: 4,
        emoji: "🤝",
        framework_signals: { riasec_S: 2, mi_interpersonal: 1 },
        strength_signal: "Empathy",
      },
    ],
    reverse_scored: false,
    framework: "multi",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-warmup-02",
    session_number: 1,
    block: "warmup",
    question_text: "In a group project, you naturally become...",
    question_type: "multiple_choice",
    options: [
      {
        label: "The leader who organises everything",
        value: 1,
        emoji: "👑",
        framework_signals: { riasec_E: 2, mi_interpersonal: 1 },
        strength_signal: "Command",
      },
      {
        label: "The ideas person who brainstorms",
        value: 2,
        emoji: "💡",
        framework_signals: { riasec_I: 1, riasec_A: 1, mi_intrapersonal: 1 },
        strength_signal: "Ideation",
      },
      {
        label: "The one who gets things done quietly",
        value: 3,
        emoji: "✅",
        framework_signals: { riasec_R: 1, riasec_C: 1, mi_logical: 1 },
        strength_signal: "Achiever",
      },
      {
        label: "The peacekeeper who makes sure everyone is okay",
        value: 4,
        emoji: "💚",
        framework_signals: { riasec_S: 2, mi_interpersonal: 1 },
        strength_signal: "Empathy",
      },
    ],
    reverse_scored: false,
    framework: "multi",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-warmup-03",
    session_number: 1,
    block: "warmup",
    question_text: "Which school subject secretly interests you most?",
    question_type: "multiple_choice",
    options: [
      {
        label: "Science experiments and labs",
        value: 1,
        emoji: "🔬",
        framework_signals: { riasec_I: 2, mi_logical: 1 },
        strength_signal: "Analytical",
      },
      {
        label: "Art, drama, or creative writing",
        value: 2,
        emoji: "🎭",
        framework_signals: { riasec_A: 2, mi_linguistic: 1, mi_spatial: 1 },
        strength_signal: "Creativity",
      },
      {
        label: "Business, economics, or debating",
        value: 3,
        emoji: "💼",
        framework_signals: { riasec_E: 2, mi_logical: 1 },
        strength_signal: "Command",
      },
      {
        label: "PE, sports, or design technology",
        value: 4,
        emoji: "⚽",
        framework_signals: { riasec_R: 2, mi_bodily: 2 },
        strength_signal: "Achiever",
      },
    ],
    reverse_scored: false,
    framework: "multi",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-warmup-04",
    session_number: 1,
    block: "warmup",
    question_text: "If you could have any superpower, which would it be?",
    question_type: "multiple_choice",
    options: [
      {
        label: "Mind-reading (understand everyone)",
        value: 1,
        emoji: "🧠",
        framework_signals: { riasec_S: 1, riasec_I: 1, mi_interpersonal: 1 },
        strength_signal: "Empathy",
      },
      {
        label: "Time control (organise everything perfectly)",
        value: 2,
        emoji: "⏰",
        framework_signals: { riasec_C: 2, mi_logical: 1 },
        strength_signal: "Achiever",
      },
      {
        label: "Persuasion (convince anyone of anything)",
        value: 3,
        emoji: "🗣️",
        framework_signals: { riasec_E: 2, mi_linguistic: 1 },
        strength_signal: "Communication",
      },
      {
        label: "Invention (create anything you imagine)",
        value: 4,
        emoji: "🛠️",
        framework_signals: { riasec_R: 1, riasec_A: 1, mi_spatial: 1 },
        strength_signal: "Ideation",
      },
    ],
    reverse_scored: false,
    framework: "multi",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-warmup-05",
    session_number: 1,
    block: "warmup",
    question_text: "When you face a problem, your first instinct is to...",
    question_type: "multiple_choice",
    options: [
      {
        label: "Research it and analyse the facts",
        value: 1,
        emoji: "🔍",
        framework_signals: { riasec_I: 2, mi_logical: 1 },
        strength_signal: "Analytical",
      },
      {
        label: "Talk to people and get advice",
        value: 2,
        emoji: "💬",
        framework_signals: { riasec_S: 1, riasec_E: 1, mi_interpersonal: 1 },
        strength_signal: "Communication",
      },
      {
        label: "Jump in and try things until something works",
        value: 3,
        emoji: "🚀",
        framework_signals: { riasec_R: 2, mi_bodily: 1 },
        strength_signal: "Adaptability",
      },
      {
        label: "Think creatively about unusual solutions",
        value: 4,
        emoji: "✨",
        framework_signals: { riasec_A: 1, riasec_I: 1, mi_intrapersonal: 1 },
        strength_signal: "Ideation",
      },
    ],
    reverse_scored: false,
    framework: "multi",
    framework_target: "none",
    is_adaptive: false,
  },
];

// =============================================================================
// BLOCK 2: RIASEC INTEREST MAPPING (12 Likert + 2 Ipsative)
// 2 Likert per type, 4 reverse-scored items (R, A, E, C)
// =============================================================================

export const riasecLikertQuestions: Question[] = [
  // Realistic (R)
  {
    id: "s1-riasec-R-01",
    session_number: 1,
    block: "riasec",
    question_text: "I enjoy working with my hands to build, repair, or assemble things.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "R",
    is_adaptive: false,
  },
  {
    id: "s1-riasec-R-02",
    session_number: 1,
    block: "riasec",
    question_text: "I would rather sit in a library than work outdoors with tools.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: true,
    framework: "riasec",
    framework_target: "R",
    is_adaptive: false,
  },
  // Investigative (I)
  {
    id: "s1-riasec-I-01",
    session_number: 1,
    block: "riasec",
    question_text: "I like figuring out how things work by researching and experimenting.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "I",
    is_adaptive: false,
  },
  {
    id: "s1-riasec-I-02",
    session_number: 1,
    block: "riasec",
    question_text: "I enjoy solving complex puzzles or brain teasers.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "I",
    is_adaptive: false,
  },
  // Artistic (A)
  {
    id: "s1-riasec-A-01",
    session_number: 1,
    block: "riasec",
    question_text: "I prefer following clear instructions rather than making things up as I go.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: true,
    framework: "riasec",
    framework_target: "A",
    is_adaptive: false,
  },
  {
    id: "s1-riasec-A-02",
    session_number: 1,
    block: "riasec",
    question_text: "I enjoy expressing myself through art, writing, music, or design.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "A",
    is_adaptive: false,
  },
  // Social (S)
  {
    id: "s1-riasec-S-01",
    session_number: 1,
    block: "riasec",
    question_text: "I enjoy helping others learn new skills or understand difficult topics.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "S",
    is_adaptive: false,
  },
  {
    id: "s1-riasec-S-02",
    session_number: 1,
    block: "riasec",
    question_text: "I care about making people feel included and supported.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "S",
    is_adaptive: false,
  },
  // Enterprising (E)
  {
    id: "s1-riasec-E-01",
    session_number: 1,
    block: "riasec",
    question_text: "I would rather follow someone else's plan than start my own project.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: true,
    framework: "riasec",
    framework_target: "E",
    is_adaptive: false,
  },
  {
    id: "s1-riasec-E-02",
    session_number: 1,
    block: "riasec",
    question_text: "I enjoy persuading people and presenting ideas to a group.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "E",
    is_adaptive: false,
  },
  // Conventional (C)
  {
    id: "s1-riasec-C-01",
    session_number: 1,
    block: "riasec",
    question_text: "I like organising information, keeping records, and following systems.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "C",
    is_adaptive: false,
  },
  {
    id: "s1-riasec-C-02",
    session_number: 1,
    block: "riasec",
    question_text: "I find it boring to check details and follow precise procedures.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: true,
    framework: "riasec",
    framework_target: "C",
    is_adaptive: false,
  },
];

export const riasecIpsativeQuestions: Question[] = [
  {
    id: "s1-riasec-ipsative-01",
    session_number: 1,
    block: "riasec",
    question_text: "Rank these activities from most to least enjoyable:",
    question_type: "ipsative",
    options: [
      {
        label: "Design and build a robot for a competition",
        value: 1,
        emoji: "🤖",
        framework_signals: { R: 1 },
      },
      {
        label: "Write and perform a short play for an audience",
        value: 2,
        emoji: "🎭",
        framework_signals: { A: 1 },
      },
      {
        label: "Organise a fundraiser and manage the budget",
        value: 3,
        emoji: "📊",
        framework_signals: { E: 1 },
      },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-riasec-ipsative-02",
    session_number: 1,
    block: "riasec",
    question_text: "Rank these activities from most to least enjoyable:",
    question_type: "ipsative",
    options: [
      {
        label: "Investigate a mystery using clues and logic",
        value: 1,
        emoji: "🔍",
        framework_signals: { I: 1 },
      },
      {
        label: "Mentor a younger student who is struggling",
        value: 2,
        emoji: "💛",
        framework_signals: { S: 1 },
      },
      {
        label: "Create a detailed filing system for a messy library",
        value: 3,
        emoji: "📁",
        framework_signals: { C: 1 },
      },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "none",
    is_adaptive: false,
  },
];

// Engagement checkpoint (not a question — a motivation card)
export const engagementCheckpoint = {
  id: "s1-checkpoint-01",
  type: "engagement_checkpoint" as const,
  text: "Nice progress! Halfway through this section...",
  subtext: "You're doing great. Tap to continue.",
};

// =============================================================================
// MI Section (5 questions, within Block 2 after RIASEC)
// =============================================================================

export const miQuestions: Question[] = [
  // Learning-preference format (3 questions)
  {
    id: "s1-mi-learn-01",
    session_number: 1,
    block: "riasec_mi",
    question_text: "When you need to learn something new, what works best for you?",
    question_type: "multiple_choice",
    options: [
      {
        label: "Read about it and take notes",
        value: 1,
        emoji: "📖",
        framework_signals: { linguistic: 2 },
      },
      {
        label: "Draw diagrams or mind-maps",
        value: 2,
        emoji: "🗺️",
        framework_signals: { spatial: 2 },
      },
      {
        label: "Talk it through with someone",
        value: 3,
        emoji: "🗣️",
        framework_signals: { interpersonal: 2 },
      },
      {
        label: "Figure it out by experimenting on my own",
        value: 4,
        emoji: "🧪",
        framework_signals: { logical: 1, intrapersonal: 1 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-mi-learn-02",
    session_number: 1,
    block: "riasec_mi",
    question_text: "When you want to remember something important, you usually...",
    question_type: "multiple_choice",
    options: [
      {
        label: "Write it down in words",
        value: 1,
        emoji: "✏️",
        framework_signals: { linguistic: 2 },
      },
      {
        label: "Create a visual — chart, colour-code, or picture",
        value: 2,
        emoji: "🎨",
        framework_signals: { spatial: 2 },
      },
      {
        label: "Say it out loud or teach it to someone",
        value: 3,
        emoji: "📢",
        framework_signals: { interpersonal: 1, linguistic: 1 },
      },
      {
        label: "Connect it to a pattern or formula",
        value: 4,
        emoji: "🔢",
        framework_signals: { logical: 2 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-mi-learn-03",
    session_number: 1,
    block: "riasec_mi",
    question_text: "In class, you pay most attention when the teacher...",
    question_type: "multiple_choice",
    options: [
      {
        label: "Tells a story or gives real examples",
        value: 1,
        emoji: "📚",
        framework_signals: { linguistic: 1, interpersonal: 1 },
      },
      {
        label: "Shows diagrams, videos, or demonstrations",
        value: 2,
        emoji: "📺",
        framework_signals: { spatial: 2 },
      },
      {
        label: "Lets you work in groups and discuss",
        value: 3,
        emoji: "👥",
        framework_signals: { interpersonal: 2 },
      },
      {
        label: "Sets a hands-on challenge or experiment",
        value: 4,
        emoji: "🔬",
        framework_signals: { bodily: 1, logical: 1 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "none",
    is_adaptive: false,
  },
  // Activity-based format (2 questions — catch bodily, musical, naturalistic)
  {
    id: "s1-mi-activity-01",
    session_number: 1,
    block: "riasec_mi",
    question_text: "Which of these is most true about you?",
    question_type: "multiple_choice",
    options: [
      {
        label: "I tap rhythms or hum when I'm thinking",
        value: 1,
        emoji: "🎵",
        framework_signals: { musical: 2 },
      },
      {
        label: "I learn best when I can move around or use my hands",
        value: 2,
        emoji: "🤸",
        framework_signals: { bodily: 2 },
      },
      {
        label: "I notice patterns in nature that others miss",
        value: 3,
        emoji: "🌿",
        framework_signals: { naturalistic: 2 },
      },
      {
        label: "I often think things through quietly in my head",
        value: 4,
        emoji: "🧘",
        framework_signals: { intrapersonal: 2 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "none",
    is_adaptive: false,
  },
  {
    id: "s1-mi-activity-02",
    session_number: 1,
    block: "riasec_mi",
    question_text: "Outside of school, you're most drawn to...",
    question_type: "multiple_choice",
    options: [
      {
        label: "Sports, dance, or physical activities",
        value: 1,
        emoji: "🏃",
        framework_signals: { bodily: 2 },
      },
      {
        label: "Music — listening, playing, or creating",
        value: 2,
        emoji: "🎧",
        framework_signals: { musical: 2 },
      },
      {
        label: "Being outdoors, hiking, or caring for animals",
        value: 3,
        emoji: "🌳",
        framework_signals: { naturalistic: 2 },
      },
      {
        label: "Journaling, reflecting, or setting goals",
        value: 4,
        emoji: "📓",
        framework_signals: { intrapersonal: 1, linguistic: 1 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "none",
    is_adaptive: false,
  },
];

// =============================================================================
// BLOCK 3: PERSONALITY & VALUES
// MBTI (8 forced-choice spectrum) + Values (3 spectrum)
// =============================================================================

export const mbtiQuestions: Question[] = [
  // E/I Dichotomy
  {
    id: "s1-mbti-EI-01",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I recharge by being alone or with one close friend", value: -3 },
      { label: "I recharge by being around lots of people", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "EI",
    is_adaptive: false,
  },
  {
    id: "s1-mbti-EI-02",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I think before I speak and prefer writing to talking", value: -3 },
      { label: "I think out loud and enjoy group discussions", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "EI",
    is_adaptive: false,
  },
  // S/N Dichotomy
  {
    id: "s1-mbti-SN-01",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I focus on facts, details, and what's real right now", value: -3 },
      { label: "I focus on possibilities, patterns, and the big picture", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "SN",
    is_adaptive: false,
  },
  {
    id: "s1-mbti-SN-02",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I prefer step-by-step instructions", value: -3 },
      { label: "I prefer figuring things out my own way", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "SN",
    is_adaptive: false,
  },
  // T/F Dichotomy
  {
    id: "s1-mbti-TF-01",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I make decisions based on logic, even if feelings get hurt", value: -3 },
      { label: "I consider how my decision will affect other people's feelings", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "TF",
    is_adaptive: false,
  },
  {
    id: "s1-mbti-TF-02",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I value fairness and consistent rules", value: -3 },
      { label: "I value kindness and making exceptions when needed", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "TF",
    is_adaptive: false,
  },
  // J/P Dichotomy
  {
    id: "s1-mbti-JP-01",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I like to plan ahead and stick to the plan", value: -3 },
      { label: "I prefer to keep my options open and go with the flow", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "JP",
    is_adaptive: false,
  },
  {
    id: "s1-mbti-JP-02",
    session_number: 1,
    block: "mbti_values",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I feel stressed when things are unfinished or messy", value: -3 },
      { label: "I feel stressed when there are too many rules and deadlines", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "JP",
    is_adaptive: false,
  },
];

export const valuesQuestions: Question[] = [
  {
    id: "s1-values-security-adventure",
    session_number: 1,
    block: "mbti_values",
    question_text: "Would you prefer a stable career with guaranteed income, or an exciting career with uncertain rewards?",
    question_type: "spectrum",
    options: [
      { label: "Stable & guaranteed", value: -3 },
      { label: "Exciting & uncertain", value: 3 },
    ],
    reverse_scored: false,
    framework: "values",
    framework_target: "security_adventure",
    is_adaptive: false,
  },
  {
    id: "s1-values-income-impact",
    session_number: 1,
    block: "mbti_values",
    question_text: "Would you rather earn the highest salary possible, or make the biggest positive difference?",
    question_type: "spectrum",
    options: [
      { label: "Highest salary", value: -3 },
      { label: "Biggest difference", value: 3 },
    ],
    reverse_scored: false,
    framework: "values",
    framework_target: "income_impact",
    is_adaptive: false,
  },
  {
    id: "s1-values-solo-team",
    session_number: 1,
    block: "mbti_values",
    question_text: "Would you rather work independently on your own projects, or collaborate closely with a team?",
    question_type: "spectrum",
    options: [
      { label: "Work independently", value: -3 },
      { label: "Collaborate with team", value: 3 },
    ],
    reverse_scored: false,
    framework: "values",
    framework_target: "solo_team",
    is_adaptive: false,
  },
];

// =============================================================================
// Combined ordered sequence for Session 1
// =============================================================================

export const session1CoreQuestions: Question[] = [
  ...warmupQuestions,
  ...riasecLikertQuestions,
  ...riasecIpsativeQuestions,
  ...miQuestions,
  ...mbtiQuestions,
  ...valuesQuestions,
];
```

- [ ] **Step 2:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add data/questions/session-1-core.ts
git commit -m "data: add Session 1 core questions (35 questions + engagement checkpoint)"
```

---

### Task 13: Question Data — Session 1 Adaptive Pool

**Files:**
- Create: `data/questions/session-1-adaptive.ts`

- [ ] **Step 1:** Create `data/questions/session-1-adaptive.ts` with 30 adaptive pool questions:

```typescript
import type { Question } from "@/lib/types/quest";

// =============================================================================
// ADAPTIVE POOL: 18 RIASEC (3 per type, Likert)
// =============================================================================

const riasecAdaptivePool: Question[] = [
  // Realistic (R) — 3 questions
  {
    id: "s1-adapt-R-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "I would enjoy a job where I operate machinery or equipment.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "R",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-R-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "I like setting up and installing technology or equipment.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "R",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-R-03",
    session_number: 1,
    block: "confirmatory",
    question_text: "I enjoy physical work that produces something tangible.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "R",
    is_adaptive: true,
  },
  // Investigative (I) — 3 questions
  {
    id: "s1-adapt-I-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "I enjoy reading scientific articles or watching documentaries.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "I",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-I-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "I like thinking about abstract theories and ideas.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "I",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-I-03",
    session_number: 1,
    block: "confirmatory",
    question_text: "I enjoy analysing data to find trends or patterns.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "I",
    is_adaptive: true,
  },
  // Artistic (A) — 3 questions
  {
    id: "s1-adapt-A-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "I enjoy designing things — layouts, graphics, or spaces.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "A",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-A-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "I would enjoy a role where I can use my imagination every day.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "A",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-A-03",
    session_number: 1,
    block: "confirmatory",
    question_text: "I like performing, whether it's acting, presenting, or playing music.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "A",
    is_adaptive: true,
  },
  // Social (S) — 3 questions
  {
    id: "s1-adapt-S-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "I enjoy volunteering or helping in my community.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "S",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-S-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "I would enjoy a career in counselling, teaching, or healthcare.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "S",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-S-03",
    session_number: 1,
    block: "confirmatory",
    question_text: "I find it rewarding to listen to someone's problems and offer support.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "S",
    is_adaptive: true,
  },
  // Enterprising (E) — 3 questions
  {
    id: "s1-adapt-E-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "I enjoy convincing others to see things my way.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "E",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-E-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "I would enjoy running my own business or startup.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "E",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-E-03",
    session_number: 1,
    block: "confirmatory",
    question_text: "I like taking charge in group situations.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "E",
    is_adaptive: true,
  },
  // Conventional (C) — 3 questions
  {
    id: "s1-adapt-C-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "I enjoy working with spreadsheets, numbers, or databases.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "C",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-C-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "I like tasks that have clear right and wrong answers.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "C",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-C-03",
    session_number: 1,
    block: "confirmatory",
    question_text: "I would enjoy a job that involves careful quality checking.",
    question_type: "likert",
    options: [
      { label: "Strongly Dislike", value: 1, emoji: "😒" },
      { label: "Dislike", value: 2 },
      { label: "Neutral", value: 3, emoji: "😐" },
      { label: "Like", value: 4 },
      { label: "Strongly Like", value: 5, emoji: "🤩" },
    ],
    reverse_scored: false,
    framework: "riasec",
    framework_target: "C",
    is_adaptive: true,
  },
];

// =============================================================================
// ADAPTIVE POOL: 8 MBTI (2 per dichotomy, forced_choice)
// =============================================================================

const mbtiAdaptivePool: Question[] = [
  // E/I
  {
    id: "s1-adapt-EI-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I prefer deep one-on-one conversations", value: -3 },
      { label: "I enjoy meeting new people at big events", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "EI",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-EI-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I need quiet time to process my thoughts", value: -3 },
      { label: "I process my thoughts best by talking them through", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "EI",
    is_adaptive: true,
  },
  // S/N
  {
    id: "s1-adapt-SN-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I trust what I can see, hear, and touch", value: -3 },
      { label: "I trust my gut feeling and hunches", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "SN",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-SN-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I focus on what's happening right now", value: -3 },
      { label: "I often think about future possibilities", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "SN",
    is_adaptive: true,
  },
  // T/F
  {
    id: "s1-adapt-TF-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I value truth and honesty, even when it's uncomfortable", value: -3 },
      { label: "I value harmony and try to avoid hurting people", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "TF",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-TF-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I think the best decisions come from careful analysis", value: -3 },
      { label: "I think the best decisions consider everyone's feelings", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "TF",
    is_adaptive: true,
  },
  // J/P
  {
    id: "s1-adapt-JP-01",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I like finishing tasks well before the deadline", value: -3 },
      { label: "I do my best work under last-minute pressure", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "JP",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-JP-02",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which sounds more like you?",
    question_type: "forced_choice",
    options: [
      { label: "I prefer a clear daily routine", value: -3 },
      { label: "I prefer each day to be different and spontaneous", value: 3 },
    ],
    reverse_scored: false,
    framework: "mbti",
    framework_target: "JP",
    is_adaptive: true,
  },
];

// =============================================================================
// ADAPTIVE POOL: 4 MI (multiple_choice)
// =============================================================================

const miAdaptivePool: Question[] = [
  {
    id: "s1-adapt-mi-linguistic",
    session_number: 1,
    block: "confirmatory",
    question_text: "When explaining something complicated, you tend to...",
    question_type: "multiple_choice",
    options: [
      {
        label: "Use a story or analogy to make it clear",
        value: 1,
        emoji: "📖",
        framework_signals: { linguistic: 2 },
      },
      {
        label: "Draw a diagram or sketch",
        value: 2,
        emoji: "✏️",
        framework_signals: { spatial: 2 },
      },
      {
        label: "Break it into logical steps",
        value: 3,
        emoji: "🔢",
        framework_signals: { logical: 2 },
      },
      {
        label: "Act it out or demonstrate physically",
        value: 4,
        emoji: "🎬",
        framework_signals: { bodily: 2 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "linguistic",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-mi-spatial",
    session_number: 1,
    block: "confirmatory",
    question_text: "Which skill comes most naturally to you?",
    question_type: "multiple_choice",
    options: [
      {
        label: "Navigating and reading maps",
        value: 1,
        emoji: "🗺️",
        framework_signals: { spatial: 2 },
      },
      {
        label: "Picking up song melodies by ear",
        value: 2,
        emoji: "🎵",
        framework_signals: { musical: 2 },
      },
      {
        label: "Identifying plants or animal species",
        value: 3,
        emoji: "🌿",
        framework_signals: { naturalistic: 2 },
      },
      {
        label: "Understanding what someone is feeling without them saying it",
        value: 4,
        emoji: "💭",
        framework_signals: { interpersonal: 2 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "spatial",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-mi-bodily",
    session_number: 1,
    block: "confirmatory",
    question_text: "You feel most alive when...",
    question_type: "multiple_choice",
    options: [
      {
        label: "Playing a sport or doing something physical",
        value: 1,
        emoji: "🏃",
        framework_signals: { bodily: 2 },
      },
      {
        label: "Making or listening to music",
        value: 2,
        emoji: "🎶",
        framework_signals: { musical: 2 },
      },
      {
        label: "Being in nature — hiking, exploring, observing",
        value: 3,
        emoji: "🌲",
        framework_signals: { naturalistic: 2 },
      },
      {
        label: "Writing in my journal or reflecting quietly",
        value: 4,
        emoji: "📓",
        framework_signals: { intrapersonal: 2 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "bodily",
    is_adaptive: true,
  },
  {
    id: "s1-adapt-mi-interpersonal",
    session_number: 1,
    block: "confirmatory",
    question_text: "In a team project, you naturally notice...",
    question_type: "multiple_choice",
    options: [
      {
        label: "Who is feeling left out or struggling",
        value: 1,
        emoji: "👀",
        framework_signals: { interpersonal: 2 },
      },
      {
        label: "Where the process could be more efficient",
        value: 2,
        emoji: "⚙️",
        framework_signals: { logical: 2 },
      },
      {
        label: "How to make the presentation look better",
        value: 3,
        emoji: "🎨",
        framework_signals: { spatial: 2 },
      },
      {
        label: "The right words to describe the project",
        value: 4,
        emoji: "✍️",
        framework_signals: { linguistic: 2 },
      },
    ],
    reverse_scored: false,
    framework: "mi",
    framework_target: "interpersonal",
    is_adaptive: true,
  },
];

// =============================================================================
// Combined adaptive pool (30 questions total)
// =============================================================================

export const session1AdaptivePool: Question[] = [
  ...riasecAdaptivePool,
  ...mbtiAdaptivePool,
  ...miAdaptivePool,
];
```

- [ ] **Step 2:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add data/questions/session-1-adaptive.ts
git commit -m "data: add Session 1 adaptive question pool (30 questions: 18 RIASEC + 8 MBTI + 4 MI)"
```

---

### Task 14: Quest State Hook

**Files:**
- Create: `hooks/use-quest-state.ts`

- [ ] **Step 1:** Create `hooks/use-quest-state.ts`:

```typescript
"use client";

import { useCallback, useState } from "react";
import type { ClientResponse, QuestionBlock } from "@/lib/types/quest";

export interface QuestState {
  current_block: QuestionBlock;
  current_question_index: number;
  questions_answered: number;
  responses: ClientResponse[];
  selected_adaptive_ids: string[];
  persistence_failed: boolean;
  discovery_mode_active: boolean;
  last_response_undoable: boolean;
}

const INITIAL_STATE: QuestState = {
  current_block: "warmup",
  current_question_index: 0,
  questions_answered: 0,
  responses: [],
  selected_adaptive_ids: [],
  persistence_failed: false,
  discovery_mode_active: false,
  last_response_undoable: false,
};

/**
 * Detect if discovery mode should trigger:
 * 3+ consecutive Likert responses in the RIASEC block are exactly 3 (neutral).
 */
function shouldTriggerDiscoveryMode(responses: ClientResponse[]): boolean {
  const riasecResponses = responses.filter(
    (r) => r.framework === "riasec"
  );
  if (riasecResponses.length < 3) return false;

  const lastThree = riasecResponses.slice(-3);
  return lastThree.every((r) => r.response_value === 3);
}

export function useQuestState(initialState?: Partial<QuestState>) {
  const [state, setState] = useState<QuestState>({
    ...INITIAL_STATE,
    ...initialState,
  });

  const answerQuestion = useCallback(
    (response: ClientResponse) => {
      setState((prev) => {
        const newResponses = [...prev.responses, response];
        const newQuestionsAnswered = prev.questions_answered + 1;

        // Check discovery mode trigger (only in riasec block, not already active)
        let discoveryMode = prev.discovery_mode_active;
        if (
          !discoveryMode &&
          prev.current_block === "riasec" &&
          response.framework === "riasec"
        ) {
          discoveryMode = shouldTriggerDiscoveryMode(newResponses);
        }

        return {
          ...prev,
          responses: newResponses,
          questions_answered: newQuestionsAnswered,
          current_question_index: prev.current_question_index + 1,
          discovery_mode_active: discoveryMode,
          last_response_undoable: true,
        };
      });
    },
    []
  );

  const undoLastAnswer = useCallback(() => {
    setState((prev) => {
      if (!prev.last_response_undoable || prev.responses.length === 0) {
        return prev;
      }

      return {
        ...prev,
        responses: prev.responses.slice(0, -1),
        questions_answered: prev.questions_answered - 1,
        current_question_index: Math.max(0, prev.current_question_index - 1),
        last_response_undoable: false,
      };
    });
  }, []);

  const advanceBlock = useCallback((nextBlock: QuestionBlock) => {
    setState((prev) => ({
      ...prev,
      current_block: nextBlock,
      current_question_index: 0,
      last_response_undoable: false,
    }));
  }, []);

  const triggerDiscoveryMode = useCallback(() => {
    setState((prev) => ({
      ...prev,
      discovery_mode_active: true,
    }));
  }, []);

  const setSelectedAdaptiveIds = useCallback((ids: string[]) => {
    setState((prev) => ({
      ...prev,
      selected_adaptive_ids: ids,
    }));
  }, []);

  const setPersistenceFailed = useCallback((failed: boolean) => {
    setState((prev) => ({
      ...prev,
      persistence_failed: failed,
    }));
  }, []);

  return {
    state,
    answerQuestion,
    undoLastAnswer,
    advanceBlock,
    triggerDiscoveryMode,
    setSelectedAdaptiveIds,
    setPersistenceFailed,
  };
}
```

- [ ] **Step 2:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add hooks/use-quest-state.ts
git commit -m "feat: add use-quest-state hook for quest navigation and response tracking"
```

---

### Task 15: Scores Hook

**Files:**
- Create: `hooks/use-scores.ts`

- [ ] **Step 1:** Create `hooks/use-scores.ts`:

```typescript
"use client";

import { useCallback, useState } from "react";
import type { ClientResponse } from "@/lib/types/quest";
import {
  calculateRiasecType,
  calculateAllRiasec,
  mergeIpsativeScores,
  detectAcquiescenceBias,
  deriveClassLabel,
} from "@/lib/scoring/riasec";
import { calculateAllMi, getTopMi } from "@/lib/scoring/mi";
import {
  calculateAllMbti,
  deriveEmergingType,
} from "@/lib/scoring/mbti";
import { calculateAllValues } from "@/lib/scoring/values";
import { getTopStrengths } from "@/lib/scoring/strengths";

export interface ScoreState {
  riasec: Record<string, number>;
  riasec_raw: Record<string, number[]>;
  riasec_ipsative_raw: Record<string, number[]>;
  mi: Record<string, number>;
  mi_raw: Record<string, number[]>;
  mbti: Record<string, number>;
  mbti_raw: Record<string, number[]>;
  values: Record<string, number>;
  values_raw: Record<string, number[]>;
  strengths: string[];
  strength_signals: string[];
  acquiescence_flag: boolean;
  riasec_snapshot: Record<string, number> | null;
  class_label: string;
}

const INITIAL_RIASEC_RAW: Record<string, number[]> = {
  R: [],
  I: [],
  A: [],
  S: [],
  E: [],
  C: [],
};

const INITIAL_MI_RAW: Record<string, number[]> = {
  linguistic: [],
  logical: [],
  spatial: [],
  musical: [],
  bodily: [],
  interpersonal: [],
  intrapersonal: [],
  naturalistic: [],
};

const INITIAL_MBTI_RAW: Record<string, number[]> = {
  EI: [],
  SN: [],
  TF: [],
  JP: [],
};

const INITIAL_VALUES_RAW: Record<string, number[]> = {
  security_adventure: [],
  income_impact: [],
  prestige_fulfilment: [],
  structure_flexibility: [],
  solo_team: [],
};

function cloneRaw(raw: Record<string, number[]>): Record<string, number[]> {
  const clone: Record<string, number[]> = {};
  for (const [key, arr] of Object.entries(raw)) {
    clone[key] = [...arr];
  }
  return clone;
}

const INITIAL_SCORE_STATE: ScoreState = {
  riasec: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
  riasec_raw: cloneRaw(INITIAL_RIASEC_RAW),
  riasec_ipsative_raw: cloneRaw(INITIAL_RIASEC_RAW),
  mi: {
    linguistic: 0,
    logical: 0,
    spatial: 0,
    musical: 0,
    bodily: 0,
    interpersonal: 0,
    intrapersonal: 0,
    naturalistic: 0,
  },
  mi_raw: cloneRaw(INITIAL_MI_RAW),
  mbti: { EI: 0, SN: 0, TF: 0, JP: 0 },
  mbti_raw: cloneRaw(INITIAL_MBTI_RAW),
  values: {
    security_adventure: 0,
    income_impact: 0,
    prestige_fulfilment: 0,
    structure_flexibility: 0,
    solo_team: 0,
  },
  values_raw: cloneRaw(INITIAL_VALUES_RAW),
  strengths: [],
  strength_signals: [],
  acquiescence_flag: false,
  riasec_snapshot: null,
  class_label: "SEEKER",
};

export function useScores() {
  const [scoreState, setScoreState] = useState<ScoreState>(
    structuredClone(INITIAL_SCORE_STATE)
  );

  const processResponse = useCallback((response: ClientResponse) => {
    setScoreState((prev) => {
      const next = structuredClone(prev);

      if (response.framework === "riasec") {
        if (response.framework_target !== "none") {
          // Likert response — append to riasec_raw
          next.riasec_raw[response.framework_target] = [
            ...(next.riasec_raw[response.framework_target] || []),
            response.response_value,
          ];
        }
        // Recalculate RIASEC
        const likertNorm = calculateAllRiasec(next.riasec_raw);
        const hasIpsative = Object.values(next.riasec_ipsative_raw).some(
          (arr) => arr.length > 0
        );
        if (hasIpsative) {
          const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
          next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
        } else {
          next.riasec = likertNorm;
        }
        next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
        next.class_label = deriveClassLabel(next.riasec);
      } else if (response.framework === "mi") {
        // MI signals come via framework_signals on the option, not framework_target
        // The response_value is the option value; actual MI signals are processed
        // from the question option's framework_signals.
        // Since we don't have the full question here, MI raw updates are handled
        // by processResponseWithSignals below.
      } else if (response.framework === "mbti") {
        if (response.framework_target !== "none") {
          next.mbti_raw[response.framework_target] = [
            ...(next.mbti_raw[response.framework_target] || []),
            response.response_value,
          ];
        }
        next.mbti = calculateAllMbti(next.mbti_raw);
      } else if (response.framework === "values") {
        if (response.framework_target !== "none") {
          next.values_raw[response.framework_target] = [
            ...(next.values_raw[response.framework_target] || []),
            response.response_value,
          ];
        }
        next.values = calculateAllValues(next.values_raw);
      }

      return next;
    });
  }, []);

  /**
   * Process a response along with its associated framework signals and strength signal.
   * Used for warm-up and MI questions where signals come from the selected option.
   */
  const processResponseWithSignals = useCallback(
    (
      response: ClientResponse,
      frameworkSignals: Record<string, number>,
      strengthSignal?: string
    ) => {
      setScoreState((prev) => {
        const next = structuredClone(prev);

        // Process framework signals (e.g., riasec_R: 2, mi_bodily: 1)
        for (const [key, weight] of Object.entries(frameworkSignals)) {
          if (key.startsWith("riasec_")) {
            const type = key.replace("riasec_", "");
            next.riasec_raw[type] = [
              ...(next.riasec_raw[type] || []),
              // Convert signal weight to Likert-scale equivalent for normalization
              // Signal weights of 1-2 map to moderate-high interest
              weight >= 2 ? 4 : 3,
            ];
          } else if (key.startsWith("mi_")) {
            const dim = key.replace("mi_", "");
            next.mi_raw[dim] = [...(next.mi_raw[dim] || []), weight];
          } else {
            // Direct MI dimension key (e.g., "linguistic", "spatial")
            next.mi_raw[key] = [...(next.mi_raw[key] || []), weight];
          }
        }

        // Process strength signal
        if (strengthSignal) {
          next.strength_signals = [...next.strength_signals, strengthSignal];
          next.strengths = getTopStrengths(next.strength_signals, 5);
        }

        // Recalculate all affected scores
        const likertNorm = calculateAllRiasec(next.riasec_raw);
        const hasIpsative = Object.values(next.riasec_ipsative_raw).some(
          (arr) => arr.length > 0
        );
        if (hasIpsative) {
          const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
          next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
        } else {
          next.riasec = likertNorm;
        }
        next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
        next.class_label = deriveClassLabel(next.riasec);
        next.mi = calculateAllMi(next.mi_raw);

        return next;
      });
    },
    []
  );

  /**
   * Process an ipsative response (rank-order). Called once per ipsative question
   * with the rankings for each option's RIASEC type.
   */
  const processIpsativeResponse = useCallback(
    (rankings: Array<{ type: string; rank: number }>) => {
      setScoreState((prev) => {
        const next = structuredClone(prev);

        // Convert ranks to scores: 1st=5, 2nd=3, 3rd=1
        const rankToScore: Record<number, number> = { 1: 5, 2: 3, 3: 1 };

        for (const { type, rank } of rankings) {
          const score = rankToScore[rank] ?? 1;
          next.riasec_ipsative_raw[type] = [
            ...(next.riasec_ipsative_raw[type] || []),
            score,
          ];
        }

        // Recalculate RIASEC with ipsative merge
        const likertNorm = calculateAllRiasec(next.riasec_raw);
        const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
        next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
        next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
        next.class_label = deriveClassLabel(next.riasec);

        return next;
      });
    },
    []
  );

  /**
   * Take a snapshot of current RIASEC scores (before confirmatory round).
   */
  const takeSnapshot = useCallback(() => {
    setScoreState((prev) => ({
      ...prev,
      riasec_snapshot: { ...prev.riasec },
    }));
  }, []);

  /**
   * Remove the last processed response from raw scores.
   * Used by undo. Recalculates all derived scores.
   */
  const removeLastResponse = useCallback(
    (response: ClientResponse) => {
      setScoreState((prev) => {
        const next = structuredClone(prev);

        if (response.framework === "riasec" && response.framework_target !== "none") {
          const arr = next.riasec_raw[response.framework_target];
          if (arr && arr.length > 0) {
            arr.pop();
          }
          const likertNorm = calculateAllRiasec(next.riasec_raw);
          const hasIpsative = Object.values(next.riasec_ipsative_raw).some(
            (a) => a.length > 0
          );
          if (hasIpsative) {
            const ipsativeNorm = calculateAllRiasec(next.riasec_ipsative_raw);
            next.riasec = mergeIpsativeScores(likertNorm, ipsativeNorm);
          } else {
            next.riasec = likertNorm;
          }
          next.acquiescence_flag = detectAcquiescenceBias(next.riasec);
          next.class_label = deriveClassLabel(next.riasec);
        } else if (response.framework === "mbti" && response.framework_target !== "none") {
          const arr = next.mbti_raw[response.framework_target];
          if (arr && arr.length > 0) {
            arr.pop();
          }
          next.mbti = calculateAllMbti(next.mbti_raw);
        } else if (response.framework === "values" && response.framework_target !== "none") {
          const arr = next.values_raw[response.framework_target];
          if (arr && arr.length > 0) {
            arr.pop();
          }
          next.values = calculateAllValues(next.values_raw);
        }

        return next;
      });
    },
    []
  );

  return {
    scoreState,
    processResponse,
    processResponseWithSignals,
    processIpsativeResponse,
    takeSnapshot,
    removeLastResponse,
  };
}
```

- [ ] **Step 2:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add hooks/use-scores.ts
git commit -m "feat: add use-scores hook wrapping all scoring functions with real-time state management"
```

---

### Task 16: Quest Provider

**Files:**
- Create: `providers/quest-provider.tsx`

- [ ] **Step 1:** Create `providers/quest-provider.tsx`:

```tsx
"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useQuestState, type QuestState } from "@/hooks/use-quest-state";
import { useScores, type ScoreState } from "@/hooks/use-scores";
import type { ClientResponse, QuestionBlock } from "@/lib/types/quest";
import { createClient } from "@/lib/supabase/client";

interface QuestContextValue {
  questState: QuestState;
  scoreState: ScoreState;
  actions: {
    answerQuestion: (
      response: ClientResponse,
      frameworkSignals?: Record<string, number>,
      strengthSignal?: string
    ) => void;
    answerIpsative: (
      response: ClientResponse,
      rankings: Array<{ type: string; rank: number }>
    ) => void;
    undoLastAnswer: () => void;
    advanceBlock: (nextBlock: QuestionBlock) => void;
    triggerDiscoveryMode: () => void;
    setSelectedAdaptiveIds: (ids: string[]) => void;
    takeSnapshot: () => void;
    persistCheckpoint: (type: "riasec" | "full" | "final") => Promise<boolean>;
  };
}

const QuestContext = createContext<QuestContextValue | null>(null);

export function useQuest() {
  const context = useContext(QuestContext);
  if (!context) {
    throw new Error("useQuest must be used within a QuestProvider");
  }
  return context;
}

interface QuestProviderProps {
  children: ReactNode;
  studentId: string;
}

/**
 * Retry a Supabase operation with exponential backoff.
 * 3 attempts: 1s, 2s, 4s delays.
 */
async function retryWithBackoff<T>(
  operation: () => Promise<{ data: T | null; error: unknown }>,
  maxAttempts: number = 3
): Promise<{ data: T | null; error: unknown }> {
  let lastResult: { data: T | null; error: unknown } = {
    data: null,
    error: null,
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResult = await operation();
    if (!lastResult.error) return lastResult;

    if (attempt < maxAttempts - 1) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult;
}

export function QuestProvider({ children, studentId }: QuestProviderProps) {
  const {
    state: questState,
    answerQuestion: questAnswerQuestion,
    undoLastAnswer: questUndoLastAnswer,
    advanceBlock,
    triggerDiscoveryMode,
    setSelectedAdaptiveIds,
    setPersistenceFailed,
  } = useQuestState();

  const {
    scoreState,
    processResponse,
    processResponseWithSignals,
    processIpsativeResponse,
    takeSnapshot,
    removeLastResponse,
  } = useScores();

  const answerQuestion = useCallback(
    (
      response: ClientResponse,
      frameworkSignals?: Record<string, number>,
      strengthSignal?: string
    ) => {
      // Update quest state
      questAnswerQuestion(response);

      // Update scores
      if (frameworkSignals) {
        processResponseWithSignals(response, frameworkSignals, strengthSignal);
      } else {
        processResponse(response);
      }
    },
    [questAnswerQuestion, processResponse, processResponseWithSignals]
  );

  const answerIpsative = useCallback(
    (
      response: ClientResponse,
      rankings: Array<{ type: string; rank: number }>
    ) => {
      questAnswerQuestion(response);
      processIpsativeResponse(rankings);
    },
    [questAnswerQuestion, processIpsativeResponse]
  );

  const undoLastAnswer = useCallback(() => {
    const lastResponse =
      questState.responses[questState.responses.length - 1];
    if (lastResponse) {
      removeLastResponse(lastResponse);
    }
    questUndoLastAnswer();
  }, [questState.responses, questUndoLastAnswer, removeLastResponse]);

  const persistCheckpoint = useCallback(
    async (type: "riasec" | "full" | "final"): Promise<boolean> => {
      const supabase = createClient();

      try {
        if (type === "riasec") {
          // Lightweight — just RIASEC + MI scores
          const result = await retryWithBackoff(() =>
            supabase
              .from("assessment_scores")
              .upsert({
                student_id: studentId,
                riasec_scores: scoreState.riasec,
                mi_scores: scoreState.mi,
                updated_at: new Date().toISOString(),
              })
          );
          if (result.error) {
            setPersistenceFailed(true);
            return false;
          }
        } else if (type === "full" || type === "final") {
          // Write session responses
          const sessionResponses = questState.responses.map((r) => ({
            student_id: studentId,
            session_number: 1,
            question_id: r.question_id,
            question_text: r.response_label,
            response_text: String(r.response_value),
            framework_signals: {
              framework: r.framework,
              target: r.framework_target,
              value: r.response_value,
            },
          }));

          if (sessionResponses.length > 0) {
            const responsesResult = await retryWithBackoff(() =>
              supabase.from("session_responses").insert(sessionResponses)
            );
            if (responsesResult.error) {
              setPersistenceFailed(true);
              return false;
            }
          }

          // Write computed scores
          const scoresResult = await retryWithBackoff(() =>
            supabase.from("assessment_scores").upsert({
              student_id: studentId,
              riasec_scores: scoreState.riasec,
              mi_scores: scoreState.mi,
              mbti_indicators: scoreState.mbti,
              values_compass: scoreState.values,
              strengths: scoreState.strengths,
              updated_at: new Date().toISOString(),
            })
          );
          if (scoresResult.error) {
            setPersistenceFailed(true);
            return false;
          }

          // Update student session
          const studentResult = await retryWithBackoff(() =>
            supabase
              .from("students")
              .update({ current_session: 1 })
              .eq("id", studentId)
          );
          if (studentResult.error) {
            setPersistenceFailed(true);
            return false;
          }

          if (type === "final") {
            // Insert Self-Discoverer achievement
            await supabase.from("achievements").upsert(
              {
                student_id: studentId,
                badge_id: "self_discoverer",
                unlocked_at: new Date().toISOString(),
              },
              { onConflict: "student_id,badge_id" }
            );
          }
        }

        setPersistenceFailed(false);
        return true;
      } catch {
        setPersistenceFailed(true);
        return false;
      }
    },
    [studentId, scoreState, questState.responses, setPersistenceFailed]
  );

  const value: QuestContextValue = {
    questState,
    scoreState,
    actions: {
      answerQuestion,
      answerIpsative,
      undoLastAnswer,
      advanceBlock,
      triggerDiscoveryMode,
      setSelectedAdaptiveIds,
      takeSnapshot,
      persistCheckpoint,
    },
  };

  return <QuestContext value={value}>{children}</QuestContext>;
}
```

- [ ] **Step 2:** Commit.

```bash
cd "/Users/gerrygan/Career Quest"
git add providers/quest-provider.tsx
git commit -m "feat: add QuestProvider combining quest state, scores, and Supabase persistence"
```
