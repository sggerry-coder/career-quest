# Phase 1: Core Quest MVP — Design Spec (v2)

## Overview

Phase 1 builds the core quest experience: landing page, RPG-styled character creation, Session 1 assessment flow (RIASEC + MI + MBTI + Values + Strengths), real-time scoring, and an RPG stats dashboard. All client-side except three Supabase persistence checkpoints. No Claude API calls.

**Assessment coverage:** All 5 frameworks receive signal in Session 1 — RIASEC (primary), MI (preliminary), MBTI (emerging), Values (initial probes), Strengths (hidden via warm-up). Sessions 2-4 deepen each framework.

## Tech Leveraged

- Next.js 16 (App Router) + React 19 + TypeScript (already scaffolded)
- Tailwind CSS v4 (already installed)
- Framer Motion (card transitions, chart reveals, badge animations)
- Supabase (auth + persistence at checkpoints)
- CSS custom properties for theme system

---

## 1. RPG Theme System

### 3 Core Themes, 7 Class Identities — Gender-Unlocked

All 7 classes are available to any student regardless of gender. Presented in a single grid grouped by theme aesthetic, not gender.

Themes are driven by CSS custom properties on a `data-theme` attribute.

| Theme | Group Name | Classes | Primary | Accent | Glow | Border Radius |
|-------|-----------|---------|---------|--------|------|---------------|
| purple-teal | Shadow Court | Warrior ⚔️, Mage 🧙‍♂️, Ranger 🏹 | #8b5cf6 | #2dd4bf | rgba(139,92,246,0.5) | 6px (sharp) |
| magenta-violet | Crimson Order | Sorceress 🔮, Valkyrie 🛡️, Huntress 🌙 | #ec4899 | #f0abfc | rgba(236,72,153,0.4) | 16px (rounded) |
| blue-indigo | Azure Path | Wanderer ✨ | #3b82f6 | #38bdf8 | rgba(59,130,246,0.4) | 12px (balanced) |

### Tone Toggle: Quest Mode vs Explorer Mode

At the start (above avatar selection), offer a tone choice:

- **Quest Mode** (default): RPG naming, narration, badge language. Best for 13-16.
- **Explorer Mode**: Clean, professional naming. "Analyst" instead of "Mage", "Strategist" instead of "Warrior", "Pathfinder" instead of "Ranger", etc. Same assessment, same colours, different labels. Best for 17-18.

Stored as `tone: "quest" | "explorer"` on the student record. Affects: class display names, narration text, badge unlock text, block transition copy. Does NOT affect: colours, assessment logic, scoring.

Explorer Mode class name mapping:

| Quest Mode | Explorer Mode |
|-----------|--------------|
| Warrior | Strategist |
| Mage | Analyst |
| Ranger | Pathfinder |
| Sorceress | Visionary |
| Valkyrie | Defender |
| Huntress | Scout |
| Wanderer | Explorer |

### Class Definitions

```typescript
interface ClassDefinition {
  id: string;
  name: { quest: string; explorer: string };
  icon: string;
  theme: "purple-teal" | "magenta-violet" | "blue-indigo";
  tagline: { quest: string; explorer: string };
  narration: {
    warmup_intro: { quest: string; explorer: string };
    riasec_intro: { quest: string; explorer: string };
    mbti_intro: { quest: string; explorer: string };
    reveal_intro: { quest: string; explorer: string };
    badge_unlock: { quest: string; explorer: string };
  };
}
```

### Background

All screens use dark gradient backgrounds: `linear-gradient(180deg, #0f0a1e, #1a1035)` with subtle theme tint shifts.

### Accessibility

- `prefers-reduced-motion` media query disables all Framer Motion animations (instant transitions instead)
- WCAG AA contrast ratios on all text (min 4.5:1 for body, 3:1 for large text) — verified against dark backgrounds
- All tappable elements have keyboard focus styles and `tabIndex`
- `aria-label` on all interactive elements (sliders, option cards, chips)
- Slider inputs have tappable discrete-point fallback for students who can't use range inputs
- Min touch target: 44×44px on all interactive elements

---

## 2. Landing Page

### Returning vs New Student

On page load, check for existing Supabase auth session:
- **Session found + student record exists:** Show "Continue Quest" with student name, class icon, and current session. Skip animated intro.
- **Session found but no student record:** Treat as new (auth user exists from a previous abandoned attempt).
- **No session:** Show animated intro → "Start Your Quest" CTA.

### Story-Driven Intro

Brief animated sequence (3-4 cards, auto-advancing with manual skip):
1. "Every adventurer has a story waiting to be discovered..."
2. "Your quest will reveal hidden strengths, unlock your interests, and chart your path..."
3. "Answer honestly — there are no wrong answers, only discoveries..."
4. "Start Your Quest" button with class-selection glow

Animation: Framer Motion `AnimatePresence` with fade/slide transitions. Total duration: ~8 seconds with skip button visible from card 1. Respects `prefers-reduced-motion`.

---

## 3. Character Creation (Multi-Step Wizard)

Split into 3 steps after tone + avatar selection, presented as quest cards with transitions.

### Step 0: Tone Toggle + Avatar Selection (Own Screen)

1. Tone toggle at top: "Quest Mode 🗡️" / "Explorer Mode 🧭" — defaults to Quest Mode
2. All 7 classes in a single grid grouped by theme aesthetic:
   - Shadow Court: Warrior, Mage, Ranger
   - Crimson Order: Sorceress, Valkyrie, Huntress
   - Azure Path: Wanderer
3. Hover/tap shows glow effect in class theme colour
4. Selection triggers theme switch immediately

### Step 1: Identity (Name + Age + Education)

**Adventurer Name:** Text input. Required. Non-empty validation only.

**Level (Age):** Tappable chips for 13-18. Required. Single select.

**Realm (Education System):** Tappable country-flagged cards shown directly (no Oracle wrapper — removes unnecessary click):
- 🇬🇧 GCSEs & A-Levels (United Kingdom)
- 🇺🇸 High School + AP/SAT (United States)
- 🌍 International Baccalaureate (IB — Global)
- 🇦🇺 HSC / ATAR (Australia)
- 🇲🇾 SPM / STPM (Malaysia)
- 🇸🇬 O-Levels / A-Levels (Singapore)
- 🇭🇰 HKDSE (Hong Kong)
- 📝 Other (free text input)
- 🤷 Not sure (stores `"not_sure"`)

### Step 2: Destinations + Curiosities

**Study Destination (simplified):** Single question: "Any countries in mind for university?"
- Top 6 popular flags as tappable cards (UK, US, Australia, Singapore, Canada, Hong Kong)
- "Not sure yet" option
- "Other" with text input
- Multi-select allowed (tap to toggle, no ranking)
- Stored as `preferred_destinations: string[]` (simple array, no ranking at this stage)
- Ranking and university matching happens in Session 3 when making real programme decisions

**Career Curiosities** (kept from Self-Map — low friction, useful as pre-assessment signal):
- Pick up to 3 from pill tags:
  - 🏥 Health & Medicine, 💻 Technology & Engineering, 🎨 Creative Arts & Design, 💼 Business & Finance, 🔬 Science & Research, 📚 Education & Social Work, ⚖️ Law & Government, 📺 Media & Communication, 🌿 Environment & Nature, ⚽ Sports & Fitness, 🔨 Trades & Construction
  - 🤷 Don't know yet (mutually exclusive with others)
- Stored in `self_map.curiosities`

### Self-Map (Moved to After Session 1)

Direction Clarity, Interest Sources, and Perceived Strengths are moved to after Session 1 completion, when the student has framework scores and more self-awareness. They appear as a brief interstitial before the dashboard reveal:

1. "Before we show your results — how did you feel going in?"
2. Direction Clarity slider (1-5)
3. Interest Sources multi-select
4. Perceived Strengths (pick up to 3)
5. Then dashboard reveal with before/after comparison potential

This captures the same data but at a moment when it's more meaningful and less overwhelming.

### "Begin Quest" Action

On submit:
1. Create anonymous Supabase auth user (`supabase.auth.signInAnonymously()`)
2. If auth fails: show themed error "The quest portal is temporarily sealed... ⚔️ Try again" with retry button. Do not proceed.
3. Insert student row with: name, age, education_system, avatar_class, tone, preferred_destinations, self_map (partial — curiosities only). If insert fails: show same error with retry.
4. Insert empty assessment_scores row (all defaults). If fails: non-blocking — created at first checkpoint.
5. Unlock "Quest Started" badge (insert into achievements). If fails: non-blocking — badge shown from client state.
6. Navigate to `/quest/session/1`

---

## 4. Session 1: Discovery Quest

### Time Estimation

Show estimated time remaining at the top of each block: "~X minutes left" based on remaining questions × average 25 seconds. Under-promise (round up) to create a positive surprise on completion.

### Question Data Structure

```typescript
interface Question {
  id: string;                      // e.g. "s1-riasec-R-01"
  block: "warmup" | "riasec" | "mi" | "mbti" | "values" | "confirmatory";
  question_text: string;
  question_type: "multiple_choice" | "likert" | "forced_choice" | "ipsative" | "spectrum";
  options: QuestionOption[];
  reverse_scored: boolean;
  framework: "none" | "riasec" | "mi" | "mbti" | "values" | "multi";
  framework_target: string;        // e.g. "R", "EI", "linguistic", "security_adventure", "none"
  is_adaptive: boolean;
}

interface QuestionOption {
  label: string;
  value: string | number;
  emoji?: string;
  framework_signals?: Record<string, number>;  // for multi-framework questions (warmup, ipsative)
  strength_signal?: string;                     // hidden strength category mapping
}
```

**Files:**
- `data/questions/session-1-core.ts` — 35 core sequence questions + 1 engagement checkpoint card
- `data/questions/session-1-adaptive.ts` — 24 adaptive pool questions (12 RIASEC + 8 MBTI + 4 MI)

**Pre-implementation requirement:** All question content MUST be written and reviewed before implementation begins. Questions are the product — the UI is the delivery mechanism. Aim for input from someone with psychometric assessment experience.

### Block 1: Warm-Up (5 questions, ~2 min)

- Format: Multiple choice with tappable option cards (3-4 options each)
- Style: Fun, emoji-decorated, "Pick one — no wrong answers!"
- **Hidden scoring:** Each option carries framework_signals mapping to RIASEC + MI + Strengths categories. The student doesn't see scores changing. The system records signals silently.
  - Example: "What would you do with a free Saturday?" → "Build something" maps to {riasec_R: 2, mi_bodily: 1, strength: "Achiever"}
- This is standard practice in gamified assessments — engagement AND data collection.
- No back navigation, no skipping.

**Strength signals** map warm-up options to categories:
- "The leader" → Command
- "The ideas person" → Ideation
- "The one who gets things done" → Achiever
- "The helper" → Empathy
- "The creator" → Creativity

Stored in `assessment_scores.strengths` as accumulated strength signals.

### Discovery Mode Fallback

**Trigger:** If 3+ consecutive Likert responses in Block 2 are exactly 3 (neutral), show an interstitial:

"Tough to decide? Let's try a different approach, [class name]."

**Switch:** Remaining RIASEC questions convert to forced-choice format: "Which of these two activities appeals more?" — eliminates the neutral escape hatch. Two concrete options from different RIASEC types. The student must pick one.

This forces signal from students who otherwise produce flat profiles. Common for 13-14 year olds who haven't developed strong preferences yet.

### Block 2: RIASEC Interest Mapping (14 questions + 1 engagement card, ~4 min)

- **12 Likert questions:** 2 per RIASEC type, each mapping to exactly one type
  - Scale: 😒 Strongly Dislike (1) → 😐 Neutral (3) → 🤩 Strongly Like (5)
  - 4 reverse-scored items (1 per alternating type: R, A, E, C)
  - Questions describe concrete work activities, modeled on O*NET Interest Profiler approach
  - Skip allowed (scoring adjusts normalization denominator)

- **2 ipsative questions:** "Which of these 3 activities would you enjoy MOST?"
  - Each presents 3 options from different RIASEC types
  - Forces discrimination between types — eliminates "rate everything high" problem
  - Top pick gets +2 signal for its type, middle gets +1, bottom gets 0

- Engagement checkpoint card after question 7:
  - "Nice progress, [class name]! Halfway there..."
  - Tap to continue (no auto-advance).

- **One-step-back undo:** Student can undo their most recent answer (tap back arrow). Only the last question — earlier ones are locked. This catches fat-finger errors without enabling endless re-doing.

**Persistence checkpoint after Block 2:**
Lightweight — write `assessment_scores.riasec_scores` only (single upsert). Protects the most data-rich block. If fails: non-blocking, continue.

### Block 3: MI Learning Styles (5 questions, ~2 min)

- Format: Multiple choice (pick one)
- Style: "When you need to learn something new, what works best for you?"
- Each question presents 3-4 learning approaches, each mapping to 1-2 MI dimensions:
  - "Read about it and take notes" → linguistic
  - "Watch someone do it, then try" → bodily-kinesthetic
  - "Draw diagrams or mind-maps" → spatial
  - "Talk it through with someone" → interpersonal
  - "Figure it out on my own by experimenting" → logical-mathematical + intrapersonal
- Each response maps to 1-2 MI dimensions with weighted signals
- 5 questions covering all 8 MI dimensions at least once
- Produces preliminary MI scores — enough to flag major learning style preferences
- Full MI assessment deepens in Session 2

**Why MI matters here:** Without MI, Session 3's programme matching can't flag learning style mismatches. A bodily-kinesthetic learner recommended for a pure lecture/exam programme is a failure case.

### Block 4: MBTI Personality Indicators (8 questions, ~3 min)

- Format: Forced-choice spectrum slider
- "Which sounds more like you?" with two options and a slider between them
- Scale: -3 (strongly A) → 0 (neutral) → +3 (strongly B)
- 2 questions per dichotomy (E/I, S/N, T/F, J/P)
- Modeled on MMTIC forced-choice approach for teens
- No skipping (forced choice by design)
- One-step-back undo allowed

**Full persistence checkpoint after Block 4:**
1. Write all `session_responses` from Blocks 1-4
2. Write computed `assessment_scores` (RIASEC + MI + MBTI)
3. Update `students.current_session` to 1

**Error handling:**
- Retry with exponential backoff (3 attempts: 1s, 2s, 4s)
- If all fail: show inline warning "Your progress couldn't be saved to the cloud. Keep going — we'll try again at the end."
- Continue to Block 5 regardless — data is still in client state.
- Flag `persistence_failed: true` for retry later.

### Block 5: Values Probes (3 questions, ~1 min)

- Format: Spectrum slider
- Quick probes on 3 core value dimensions:
  1. Security ↔ Adventure: "Would you prefer a stable career with guaranteed income, or an exciting career with uncertain rewards?"
  2. Income ↔ Impact: "Would you rather earn the highest salary possible, or make the biggest positive difference?"
  3. Solo ↔ Team: "Would you rather work independently on your own projects, or collaborate closely with a team?"
- Scale: -3 (strongly left) → 0 (neutral) → +3 (strongly right)
- Same mechanics as MBTI forced-choice sliders
- Produces initial Values Compass readings — enough to distinguish students with identical RIASEC/MBTI profiles
- Full Values Compass (6 dimensions) assessed in Session 2

### Self-Map Capture (After Block 5, before Reveal)

Brief interstitial — 3 quick questions before showing results:

1. **"Before we reveal your results — how clear were you about your career direction going in?"** — Slider 1-5 (No idea → Very clear)
2. **"Where have your career ideas come from so far?"** — Multi-select pills (hobbies, family, friends, social media, school, mentor, haven't thought about it)
3. **"What do you think you're naturally good at?"** — Pick up to 3 from grid (Building/Fixing, Solving Puzzles, Creating/Designing, Helping/Teaching, Leading/Persuading, Organizing/Planning, Tech/Coding, Performing/Presenting)

Stored in `self_map`. The perceived strengths grid has hidden RIASEC mappings for before/after comparison in Session 3's AI analysis.

### Block Transitions

Between each block, a brief interstitial with class-flavored narration. 1.5 seconds, tap-to-skip on all.
- Warm-Up → RIASEC: "The [class name] enters the Arena of Interests..."
- RIASEC → MI: "Abilities revealed. Now, how does the [class name] learn?"
- MI → MBTI: "Skills mapped. Let's discover your nature..."
- MBTI → Values: "Personality taking shape. One last question about what drives you..."
- Values → Self-Map: "Almost there... one moment of reflection."
- Self-Map → Reveal: "The prophecy takes shape..."

Animation: Fade out → narration card slides up → fade in. Respects `prefers-reduced-motion`.

### Block 6: Reveal + Confirmatory (~4 min)

**Phase 1 — Chart Reveal:**
1. Transition card: "Let's see what we've discovered, [class name]!"
2. RIASEC stat bars animate in (bars grow from 0 to score, staggered 100ms apart)
3. CLASS label appears (e.g., "CLASS: INVESTIGATOR-CREATOR")
4. MI preview bars animate in (top 3 intelligences only — "Your strongest learning styles")
5. MBTI spectrum sliders animate in (dots slide from center to position)
6. Emerging type display: "I N _ J — The Strategic Visionary"
7. Values Compass preview: 3 positioned dots on their spectrums
8. Brief explanation cards: what each chart means (1-2 cards, tap to skip)

**Phase 2 — Confirmatory Round:**
1. Transition: "Want to sharpen your results? 5 quick questions."
2. 5 adaptive questions selected from pool of 24 (see algorithm below)
3. Charts visible and update live as each question is answered
4. Same format as original blocks (Likert for RIASEC, forced-choice for MBTI, multiple-choice for MI)

**Phase 3 — Final Reveal:**
1. Charts update with refined scores (smooth animation from snapshot to final)
2. "Self-Discoverer" badge unlock animation (scale bounce + glow pulse)
3. Final profile summary card
4. Perceived Strengths vs. actual RIASEC comparison hint: "You thought your strength was organizing, but your highest ability score is Investigative — interesting!"

**Phase 4 — Session Complete:**
1. "Quest progress saved" confirmation
2. "Session 2 coming soon" with lock icon
3. Dashboard link

**Email save prompt:** Moved to the start of Session 2 (when the student returns). Frame: "Welcome back! To make sure you never lose your progress, save your quest with your email." Conversion is higher because the student is now invested. In Session 1, anonymous auth persists via browser session.

### Adaptive Question Selection Algorithm

```
Input: riasec_scores, riasec_raw, mi_scores, mi_raw,
       mbti_scores, mbti_raw,
       riasec_pool (12), mbti_pool (8), mi_pool (4)

1. Calculate RIASEC ambiguity per type pair:
   - Sort types by score descending
   - For each adjacent pair: ambiguity = gap / sqrt(response_count_for_lower_type)
   - Lower = more ambiguous

2. Calculate MBTI ambiguity per dichotomy:
   - ambiguity = abs(score) / sqrt(response_count)
   - Lower = more ambiguous

3. Calculate MI ambiguity:
   - For top 3 MI types: ambiguity = gap between adjacent / sqrt(response_count)
   - Lower = more ambiguous

4. Rank ALL dimensions by ambiguity ascending

5. Select 5 questions:
   - Walk ranked list, pick 1 question per ambiguous dimension
   - Max 2 confirmatory per RIASEC type
   - Max 2 confirmatory per MBTI dichotomy
   - Max 1 confirmatory MI question
   - Fill remaining from next most ambiguous

Output: 5 Question objects from combined pool
```

### Final Persistence (After Block 6)

1. Write confirmatory `session_responses` (5 rows)
2. Write Self-Map data to `students.self_map`
3. Overwrite `assessment_scores` with refined scores (RIASEC + MI + MBTI + Values + Strengths)
4. Insert "Self-Discoverer" achievement
5. If `persistence_failed` from earlier: write ALL data (full recovery)
6. Update `students.current_session` to 1 (confirmed complete)

**Error handling:** Same retry strategy. If final fails: "Your results are displayed but couldn't be saved. We'll try again when you return."

---

## 5. Scoring Engine

### RIASEC Scoring

**Likert per-question processing:**
```
raw_score = reverse_scored ? (6 - response) : response
Append raw_score to riasec_raw[target_type]
```

**Ipsative per-question processing:**
```
For each option in ranked order (most enjoyed → least):
  rank 1 (top pick): append 5 to riasec_raw[option_type]
  rank 2 (middle): append 3 to riasec_raw[option_type]
  rank 3 (bottom): append 1 to riasec_raw[option_type]
```

**Per-type normalization:**
```
count = riasec_raw[type].length
sum = sum(riasec_raw[type])
normalized = count > 0 ? ((sum - count) / (count * 4)) * 100 : 0
```

Normalizes correctly regardless of question count.

**Acquiescence bias detection:**
```
if all 6 types > 80: acquiescence_flag = true
Surface during reveal: "Your answers suggest you enjoy everything equally —
the confirmatory questions will help sharpen your profile."
```

**Score snapshot:** Taken after Block 4 checkpoint, before Values + Self-Map + Reveal.

### MI Scoring

**Per-question processing:**
```
For each selected option:
  Append signal weight to mi_raw[target_dimension]
```

**Per-dimension normalization:**
```
count = mi_raw[dimension].length
sum = sum(mi_raw[dimension])
normalized = count > 0 ? (sum / (count * max_weight)) * 100 : 0
```

5 questions won't produce definitive MI profiles — stored as preliminary. Dashboard shows top 3 only, labeled "Your strongest learning styles (preliminary)".

### MBTI Scoring

**Per-question:**
```
Append slider_value (-3 to +3, integer, clamped) to mbti_raw[dichotomy]
```

**Per-dichotomy normalization:**
```
count = mbti_raw[dichotomy].length
sum = sum(mbti_raw[dichotomy])
normalized = count > 0 ? (sum / (count * 3)) * 100 : 0
Range: -100 to +100
```

**"Still emerging" threshold:** `abs(normalized) < 25` (with only 2 questions per dichotomy, this is appropriate)

### Values Scoring

**Per-question:**
```
Append slider_value (-3 to +3, integer, clamped) to values_raw[dimension]
```

**Per-dimension normalization:** Same as MBTI. Range: -100 to +100.

3 of 6 dimensions probed in Session 1. Remaining 3 (prestige↔fulfilment, routine↔variety, local↔global) assessed in Session 2.

### Strengths Scoring

Accumulated from warm-up hidden signals. Stored as `strengths: string[]` — list of detected strength categories, sorted by signal count descending.

No normalization — just frequency counts. "You showed signs of Ideation, Achiever, and Empathy."

### CLASS Label Derivation

```
Sort RIASEC types by normalized score descending.
gap_2_3 = score[1] - score[2]

if score[0] > 50 AND score[1] > 50 AND gap_2_3 > 10:
  CLASS = "TYPE1-TYPE2" (e.g., "INVESTIGATOR-CREATOR")
elif score[0] > 50:
  if score[0] - score[1] > 15:
    CLASS = "TYPE1" (single dominant)
  else:
    CLASS = "EXPLORER"
elif all scores < 40:
  CLASS = "SEEKER" (profile still forming)
else:
  CLASS = "EXPLORER"
```

RIASEC type display names: R = Maker, I = Investigator, A = Creator, S = Helper, E = Leader, C = Organizer

### Input Validation

- Likert: clamp to integer 1-5. Non-integer → round nearest.
- Spectrum/forced-choice: clamp to integer -3 to +3. Non-integer → round nearest.
- Unknown question IDs: skip, do not crash.
- Empty response arrays: return 0, no divide-by-zero.

### Client-Side State

```typescript
interface ScoreState {
  riasec: Record<string, number>;         // normalized 0-100
  riasec_raw: Record<string, number[]>;
  mi: Record<string, number>;             // normalized 0-100 (preliminary)
  mi_raw: Record<string, number[]>;
  mbti: Record<string, number>;           // normalized -100 to +100
  mbti_raw: Record<string, number[]>;
  values: Record<string, number>;         // normalized -100 to +100
  values_raw: Record<string, number[]>;
  strengths: string[];                    // detected strength categories
  acquiescence_flag: boolean;
  riasec_snapshot: Record<string, number> | null;
  class_label: string;
}

interface QuestState {
  current_block: "warmup" | "riasec" | "mi" | "mbti" | "values" | "selfmap" | "reveal" | "confirmatory" | "complete";
  current_question_index: number;
  questions_answered: number;
  responses: ClientResponse[];
  selected_adaptive_ids: string[];
  persistence_failed: boolean;
  discovery_mode_active: boolean;         // forced-choice fallback triggered
  last_response_undoable: boolean;        // one-step-back state
}

interface ClientResponse {
  question_id: string;
  response_value: number;
  response_label: string;
  framework: string;
  framework_target: string;
  answered_at: number;
}
```

### Scoring Functions (Pure, No Side Effects)

All in `lib/scoring/`:

- `riasec.ts`: `calculateRiasecType()`, `calculateAllRiasec()`, `detectAcquiescenceBias()`, `deriveClassLabel()`
- `mi.ts`: `calculateMiDimension()`, `calculateAllMi()`, `getTopMi(scores, n)`
- `mbti.ts`: `calculateMbtiDichotomy()`, `calculateAllMbti()`, `isStillEmerging()`, `deriveEmergingType()`
- `values.ts`: `calculateValuesDimension()`, `calculateAllValues()`
- `strengths.ts`: `accumulateStrengths()`, `getTopStrengths(signals, n)`
- `adaptive.ts`: `selectAdaptiveQuestions()`

---

## 6. XP System

XP is derived from progress, not stored separately. Computed client-side.

| Action | XP | Cumulative |
|--------|-----|-----------|
| Character creation | 100 | 100 |
| Warm-up complete | 50 | 150 |
| RIASEC complete | 100 | 250 |
| MI complete | 50 | 300 |
| MBTI complete | 100 | 400 |
| Values + Self-Map | 25 | 425 |
| Confirmatory complete | 25 | 450 |
| Session 2 (future) | 200 | 650 |
| Session 3 (future) | 200 | 850 |
| Session 4 (future) | 150 | 1000 |

Total quest: 1000 XP. Phase 1 max: 450 XP.

**Cosmetic unlocks at thresholds:**
- 150 XP: Unlock secondary background pattern for dashboard
- 300 XP: Unlock accent colour variant (slightly different shade)
- 450 XP: Unlock "gold trim" badge border style
- These are cosmetic only — no gameplay impact. Gives XP bar purpose.

---

## 7. Dashboard (RPG Stats View)

### Layout

- **Top bar:** Avatar icon + class name + "Level [age]" + XP progress bar
- **Inventory row:** Badge icons. Unlocked = class-coloured with icon. Locked = gray "🔒" with "???". Horizontal scroll on overflow.
- **Two-column grid (stacks on mobile < 640px):**
  - Left: Ability Scores (RIASEC stat bars) + CLASS label
  - Right: Character Traits (MBTI spectrum sliders) + Emerging Type
- **Second row:**
  - Left: Learning Styles (MI top 3 preview bars) — labeled "preliminary"
  - Right: Values Compass (3 positioned dots) — labeled "initial readings"
- **Locked panels:** Remaining MI dimensions + remaining Values dimensions — "Deepens in Session 2"
- **Strengths:** Small section showing detected strength categories from warm-up
- **Quest Log:** Session progress with completed/next/locked states
- **Action button:** "Begin Session 2" (disabled in Phase 1 — "Coming soon")

### RIASEC Stat Bars

- 6 horizontal bars, one per type
- Bar colour: scores > 50 use theme accent, ≤ 50 use gray
- Score number right-aligned
- Emoji prefix: 🔧 R, 🔬 I, 🎨 A, 🤝 S, 📢 E, 📋 C
- CLASS label badge below

### MBTI Spectrum Sliders

- 4 horizontal spectrums with labeled poles
- Dot position mapped from -100/+100 to 0%/100%
- Theme-coloured dot + label for clear tendencies
- Gray dot + "Still emerging..." for near-center
- Emerging type display: "I N _ J — The Strategic Visionary"

### MI Preview

- Top 3 MI dimensions as horizontal bars (similar to RIASEC but smaller)
- Labeled "Your strongest learning styles (preliminary)"
- Remaining 5 dimensions shown grayed: "More detail in Session 2"

### Values Preview

- 3 spectrum sliders (same as MBTI display but for values dimensions)
- Labeled "Initial value readings"
- Remaining 3 dimensions shown grayed: "More dimensions in Session 2"

### MBTI Type Descriptors

Full 16-type mapping in `data/mbti-descriptors.ts`. Partial types: use descriptor for known letters, underscore for emerging.

### Animations

- Stat bars: grow from 0 to score (Framer Motion spring, staggered 100-200ms)
- MBTI/Values dots: slide from center to position
- Badge unlock: scale 0 → 1.2 → 1.0 with glow pulse
- All respect `prefers-reduced-motion`

---

## 8. Data Model Changes

### New Migration: `00002_phase1_additions.sql`

```sql
ALTER TABLE public.students ADD COLUMN avatar_class text;
ALTER TABLE public.students ADD COLUMN tone text DEFAULT 'quest';
ALTER TABLE public.students ADD COLUMN self_map jsonb;
ALTER TABLE public.students DROP COLUMN IF EXISTS preferred_country;
ALTER TABLE public.students DROP COLUMN IF EXISTS preferred_universities;
ALTER TABLE public.students ADD COLUMN preferred_destinations jsonb;
```

### Updated TypeScript Types

```typescript
interface Student {
  // ... existing fields ...
  avatar_class: string;
  tone: "quest" | "explorer";
  self_map: SelfMap | null;             // null until captured after Session 1
  preferred_destinations: string[];      // simple country name array
  // removed: preferred_country, preferred_universities
}

interface SelfMap {
  clarity: number;                // 1-5
  sources: string[];
  perceived_strengths: string[];  // 0-3
  curiosities: string[];          // 0-3, captured in character creation
}
```

### Assessment Scores — Updated Fields

The existing `assessment_scores` table schema already handles all frameworks via JSONB columns:
- `riasec_scores` — populated in Session 1
- `mi_scores` — preliminary in Session 1, deepened in Session 2
- `mbti_indicators` — populated in Session 1
- `values_compass` — 3 of 6 dimensions in Session 1, completed in Session 2
- `strengths` — accumulated from warm-up signals in Session 1

No schema changes needed to `assessment_scores` — the JSONB columns are flexible.

---

## 9. Error Handling

### Auth Failure
Themed error card with retry. Do not proceed without valid auth.

### Persistence Failures
3-attempt exponential backoff (1s, 2s, 4s) at each checkpoint.
- Block 2 checkpoint (RIASEC only): non-blocking on failure
- Block 4 checkpoint (full): warning + `persistence_failed` flag
- Block 6 checkpoint (final): full recovery attempt if earlier failed. Last resort: push toward email linking.

### Network
Session 1 is client-side. Network only needed at: Begin Quest, 3 checkpoints, optional email linking.

---

## 10. Navigation Policies

- **One-step-back undo** in RIASEC, MI, MBTI, and Values blocks. Most recent answer only — earlier ones locked.
- **No skipping** in Warm-Up, MBTI (forced choice), Confirmatory.
- **Skip allowed** in RIASEC and MI. Scoring adjusts normalization denominator.
- **Block transitions** are one-way. Cannot return to completed block.
- **Discovery Mode override:** If triggered, remaining RIASEC questions switch to forced-choice format. Cannot switch back.
- **Dashboard** is view-only after completion. No re-taking Session 1.

---

## 11. Mobile Responsiveness

- Character creation wizard: single column, full-width cards
- Question cards: full viewport height, centred content
- Likert slider: full width, large touch targets (min 44px)
- Spectrum slider: full width, thumb 20px minimum
- Dashboard: two-column → single column below 640px
- Country cards: wrap to fit
- Badge row: horizontal scroll on overflow
- All interactive elements: min 44×44px touch target

---

## 12. File Map

### New Files

```
app/
  page.tsx                              # Landing page with intro + continue
  quest/
    character/page.tsx                  # Multi-step wizard
    session/[id]/page.tsx              # Session 1 flow engine
    dashboard/page.tsx                 # RPG stats dashboard

components/
  quest/
    question-card.tsx                  # Card shell for all question types
    likert-slider.tsx                  # 5-point Likert scale input
    spectrum-slider.tsx                # Forced-choice spectrum (-3 to +3)
    ipsative-picker.tsx                # Rank 3 options (most→least enjoyed)
    option-grid.tsx                    # Tappable multiple choice
    progress-bar.tsx                   # Block-aware progress + time estimate
    block-transition.tsx               # Interstitial narration card
    engagement-checkpoint.tsx          # Mid-block motivation card
    discovery-mode-prompt.tsx          # Neutral-response fallback trigger

  charts/
    riasec-bars.tsx                    # RIASEC ability score stat bars
    mi-preview-bars.tsx                # MI top 3 preview bars
    mbti-sliders.tsx                   # MBTI spectrum display
    values-sliders.tsx                 # Values Compass preview
    class-label.tsx                    # CLASS badge
    emerging-type.tsx                  # MBTI emerging type display

  badges/
    badge-row.tsx                      # Horizontal badge inventory
    badge-unlock.tsx                   # Badge unlock animation

  character/
    tone-toggle.tsx                    # Quest Mode vs Explorer Mode
    avatar-select.tsx                  # Class selection grid (ungrouped by gender)
    destination-picker.tsx             # Simple multi-select country cards
    curiosities-picker.tsx             # Career curiosity pill tags

  selfmap/
    self-map-capture.tsx               # Post-Session-1 Self-Map interstitial

  ui/
    theme-provider.tsx                 # CSS custom property injection
    xp-bar.tsx                         # XP progress bar with cosmetic unlocks

lib/
  scoring/
    riasec.ts
    mi.ts
    mbti.ts
    values.ts
    strengths.ts
    adaptive.ts

  theme.ts                             # Theme + class definitions config

hooks/
  use-quest-state.ts                   # Quest navigation + persistence
  use-scores.ts                        # Real-time score computation

providers/
  quest-provider.tsx                   # React context

data/
  questions/
    session-1-core.ts                  # 35 core questions + 1 engagement card
    session-1-adaptive.ts              # 24 adaptive pool questions
  badges.ts                            # Already exists
  classes.ts                           # 7 class definitions (quest + explorer names)
  education-systems.ts                 # Education system options
  destinations.ts                      # Country list with flags
  mbti-descriptors.ts                  # 16 type descriptors
  strength-categories.ts              # Strength category definitions

supabase/
  migrations/
    00002_phase1_additions.sql
```

---

## 13. Question Bank Source Methodology

All questions are original, created following validated psychometric approaches:

| Framework | Modeled After | Approach |
|-----------|---------------|----------|
| RIASEC | O*NET Interest Profiler (US DoL, public domain) | Likert activity-preference + ipsative forced-ranking |
| MI | MIDAS Teen approach (self-reported learning preferences) | Multiple-choice learning style items |
| MBTI | MMTIC forced-choice (Murphy & Meisgeier) | A/B spectrum pairs per dichotomy |
| Values | O*NET Work Importance Locator (US DoL, public domain) | Spectrum sliders on value dimensions |
| Strengths | VIA Youth Survey approach (activity-based strength detection) | Hidden signals in warm-up responses |
| Adaptive | Classical test theory item selection | Ambiguity-based targeting of weakest signals |

No copyrighted questions used. 4 of 12 RIASEC Likert items are reverse-scored for acquiescence bias detection. Ipsative questions force discrimination between types.

**Pre-implementation requirement:** All 59 questions (35 core + 24 adaptive) must be written and reviewed before UI implementation begins.

---

## What This Spec Does NOT Cover

- Session 2-4 implementation
- Claude API integration (Session 3+)
- Facilitator mode (Phase 5)
- PDF report generation (Phase 4)
- PWA/offline support (Phase 6)
- Actual question text content (written pre-implementation)
- Detailed animation timing/easing curves (refined during implementation)
- Full MI assessment (Session 2)
- Full Values Compass (Session 2)
- Programme matching logic (Session 3)
