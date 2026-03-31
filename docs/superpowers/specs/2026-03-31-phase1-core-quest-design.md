# Phase 1: Core Quest MVP — Design Spec

## Overview

Phase 1 builds the core quest experience: landing page, RPG-styled character creation, Session 1 assessment flow (RIASEC + MBTI), real-time scoring, and an RPG stats dashboard. All client-side except two Supabase persistence checkpoints. No Claude API calls.

## Tech Leveraged

- Next.js 16 (App Router) + React 19 + TypeScript (already scaffolded)
- Tailwind CSS v4 (already installed)
- Framer Motion (card transitions, chart reveals, badge animations)
- Recharts (RIASEC radar chart — considered but replaced with custom SVG for RPG styling)
- Supabase (auth + persistence at checkpoints)
- CSS custom properties for theme system

---

## 1. RPG Theme System

### 3 Core Themes, 7 Class Identities

Themes are driven by CSS custom properties on a `data-theme` attribute. Classes share themes but have unique identities.

| Theme | Classes | Primary | Accent | Glow | Border Radius |
|-------|---------|---------|--------|------|---------------|
| purple-teal | Warrior, Mage, Ranger | #8b5cf6 | #2dd4bf | rgba(139,92,246,0.5) | 6px (sharp) |
| magenta-violet | Sorceress, Valkyrie, Huntress | #ec4899 | #f0abfc | rgba(236,72,153,0.4) | 16px (rounded) |
| blue-indigo | Wanderer | #3b82f6 | #38bdf8 | rgba(59,130,246,0.4) | 12px (balanced) |

Each class has unique: icon (emoji), display name, narration text for transitions, badge unlock text, and XP bar accent color.

**Implementation:** A single `theme.ts` config file exports theme + class definitions. Root layout applies `data-theme` attribute. All components use `var(--primary)`, `var(--accent)`, etc.

### Class Definitions

```typescript
interface ClassDefinition {
  id: string;
  name: string;
  icon: string;
  gender: "male" | "female" | "neutral";
  theme: "purple-teal" | "magenta-violet" | "blue-indigo";
  tagline: string;
  narration: {
    warmup_intro: string;
    riasec_intro: string;
    mbti_intro: string;
    reveal_intro: string;
    badge_unlock: string;
  };
}
```

| Class | Icon | Gender | Theme | Tagline |
|-------|------|--------|-------|---------|
| Warrior | ⚔️ | male | purple-teal | Bold & Action-driven |
| Mage | 🧙‍♂️ | male | purple-teal | Wise & Knowledge-seeker |
| Ranger | 🏹 | male | purple-teal | Independent & Explorer |
| Sorceress | 🔮 | female | magenta-violet | Wise & Visionary |
| Valkyrie | 🛡️ | female | magenta-violet | Bold & Courageous |
| Huntress | 🌙 | female | magenta-violet | Independent & Resourceful |
| Wanderer | ✨ | neutral | blue-indigo | Curious & Open-minded |

### Background

All screens use dark gradient backgrounds: `linear-gradient(180deg, #0f0a1e, #1a1035)` with subtle theme tint shifts.

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

Animation: Framer Motion `AnimatePresence` with fade/slide transitions. Total duration: ~8 seconds with skip button visible from card 1.

---

## 3. Character Creation (Multi-Step Wizard)

Split into 3 steps after avatar selection, presented as quest cards with transitions.

### Step 0: Avatar Selection (Own Screen)

Full-screen character selection:
- He/Him row: Warrior, Mage, Ranger
- She/Her row: Sorceress, Valkyrie, Huntress
- Neutral row: Wanderer
- Hover/tap shows glow effect in class theme color
- Selection triggers theme switch immediately (all subsequent screens use chosen theme)

### Step 1: Identity (Name + Age + Education)

**Adventurer Name:** Text input. Required. No validation beyond non-empty.

**Level (Age):** Tappable chips for 13-18. Required. Single select.

**Realm (Education System):** Dropdown/select with "Consult the Oracle 🔮" button.
- Oracle panel expands with country-flagged education system cards:
  - 🇬🇧 GCSEs & A-Levels (United Kingdom)
  - 🇺🇸 High School + AP/SAT (United States)
  - 🌍 International Baccalaureate (IB — Global)
  - 🇦🇺 HSC / ATAR (Australia)
  - 🇲🇾 SPM / STPM (Malaysia)
  - 🇸🇬 O-Levels / A-Levels (Singapore)
  - 🇭🇰 HKDSE (Hong Kong)
  - 📝 Other (free text input)
  - 🤷 Not sure (stores "not_sure" as valid value)
- Tapping a card selects it and collapses the panel.

### Step 2: Quest Destinations

**Ranked multi-destination selector (up to 3):**

Ranked list at top:
- #1 Primary (teal accent) — "Primary destination"
- #2 Backup (purple accent) — "Backup destination"
- #3 Safety (gray accent) — "Safety destination"
- Each has drag handle to reorder and ✕ to remove
- Only #1 required, #2 and #3 optional

Country browser below:
- Search bar for filtering
- Region filter tabs: Popular, Europe, Asia, Americas, Oceania
- Country grid with flag + name. Tap to add to next open slot.
- Already-selected countries grayed out with "✓ Selected #N"

"Open to anywhere" option:
- Mutually exclusive with specific selections
- Selecting it clears the ranked list
- Selecting a country clears "Open to anywhere"
- Stores as `[{ country: "open", rank: 1 }]`

### Step 3: Self-Map

Intro text: *"Before the quest reveals your path, mark where you stand now."*

**Direction Clarity:** Spectrum slider 1-5 (No idea → Very clear). Required.

**Interest Sources:** Multi-select pill tags. Pick all that apply. Options:
- 🎮 My hobbies and experiences
- 👨‍👩‍👧 Family suggestions or expectations
- 👥 Friends or peers
- 📱 Social media / YouTube / TikTok
- 📚 School subjects I enjoy
- 👩‍🏫 A teacher or mentor
- 🤷 Haven't thought about it yet

**Perceived Strengths:** Pick up to 3 (0-3, optional) from visual grid:

| Option | Hidden RIASEC Mapping |
|--------|-----------------------|
| 🔧 Building / Fixing things | R |
| 🧩 Solving Puzzles / Analyzing | I |
| 🎨 Creating / Designing / Writing | A |
| 🤝 Helping / Teaching people | S |
| 📢 Leading / Persuading / Selling | E |
| 📋 Organizing / Planning / Detail work | C |
| 💻 Technology / Coding | I + R |
| 🎭 Performing / Presenting | A + E |

**Career Curiosities:** Pick up to 3 (optional) from pill tags:
- 🏥 Health & Medicine
- 💻 Technology & Engineering
- 🎨 Creative Arts & Design
- 💼 Business & Finance
- 🔬 Science & Research
- 📚 Education & Social Work
- ⚖️ Law & Government
- 📺 Media & Communication
- 🌿 Environment & Nature
- ⚽ Sports & Fitness
- 🔨 Trades & Construction
- 🤷 Don't know yet (mutually exclusive — selecting clears others, selecting others clears this)

### "Begin Quest" Action

On submit:
1. Create anonymous Supabase auth user (`supabase.auth.signInAnonymously()`)
2. If auth fails: show themed error "The quest portal is temporarily sealed... ⚔️ Try again" with retry button. Do not proceed.
3. Insert student row with: name, age, education_system, avatar_class, self_map, preferred_destinations. If insert fails: show same themed error with retry.
4. Insert empty assessment_scores row (all defaults). If fails: non-blocking — will be created at first checkpoint.
5. Unlock "Quest Started" badge (insert into achievements). If fails: non-blocking — badge shown in UI from client state.
6. Navigate to `/quest/session/1`

---

## 4. Session 1: Discovery Quest

### Question Data Structure

```typescript
interface Question {
  id: string;                    // e.g. "s1-riasec-R-01"
  block: "warmup" | "riasec" | "mbti" | "confirmatory";
  question_text: string;
  question_type: "multiple_choice" | "likert" | "forced_choice";
  options: QuestionOption[];
  reverse_scored: boolean;       // for acquiescence bias detection
  framework: "none" | "riasec" | "mbti";
  framework_target: string;      // e.g. "R", "EI", "none"
  is_adaptive: boolean;          // true = in adaptive pool, not core sequence
}

interface QuestionOption {
  label: string;
  value: string | number;
  emoji?: string;
  framework_signals?: Record<string, number>;  // only for warmup multi-choice
}
```

**Files:**
- `data/questions/session-1-core.ts` — 35 core sequence questions + 2 engagement checkpoint cards
- `data/questions/session-1-adaptive.ts` — 30 adaptive pool questions (18 RIASEC + 12 MBTI)

### Block 1: Warm-Up (5 questions, ~2 min)

- Format: Multiple choice with tappable option cards (3-4 options each)
- Style: Fun, emoji-decorated, "Pick one — no wrong answers!"
- Scoring: Zero framework signals. Purely engagement.
- Purpose: Build comfort with the card UI before real assessment begins.
- No back navigation, no skipping.

### Block 2: RIASEC Interest Mapping (18 questions + 2 engagement cards, ~6 min)

- Format: 5-point Likert slider per question
- Scale: 😒 Strongly Dislike (1) → 😐 Neutral (3) → 🤩 Strongly Like (5)
- 3 questions per RIASEC type (R, I, A, S, E, C), each mapping to exactly one type
- 2 reverse-scored items included (marked in question data)
- Questions describe concrete work activities, modeled on O*NET Interest Profiler approach
- No back navigation. Skip allowed (scoring adjusts normalization denominator).
- Engagement checkpoint cards after questions 6 and 12:
  - "Nice progress! Your profile is starting to take shape... ⚔️"
  - "Almost there, [class name]! 6 more to go..."
  - Non-interactive, auto-advance after 2 seconds or tap to continue.

### Block 3: MBTI Personality Indicators (12 questions, ~4 min)

- Format: Forced-choice spectrum slider
- "Which sounds more like you?" with two options and a slider between them
- Scale: -3 (strongly A) → 0 (neutral) → +3 (strongly B)
- 3 questions per dichotomy (E/I, S/N, T/F, J/P)
- Modeled on MMTIC forced-choice approach for teens
- No back navigation, no skipping (forced choice by design).

### Block Transitions

Between each block, an interstitial card with class-flavored narration:
- Warm-Up → RIASEC: "The [class name] enters the Arena of Interests..."
- RIASEC → MBTI: "Your abilities are revealed. Now let's discover your nature..."
- MBTI → Reveal: "The prophecy takes shape..."

Animation: Fade out current block → narration card slides up → fade into next block. ~2 seconds.

### Persistence Checkpoint (After Block 3)

Before the reveal, persist to Supabase:
1. Write all `session_responses` from Blocks 1-3 (35 rows)
2. Write computed `assessment_scores` (RIASEC + MBTI)
3. Update `students.current_session` to 1

**Error handling:**
- Retry with exponential backoff (3 attempts: 1s, 2s, 4s)
- If all fail: show inline warning "Your progress couldn't be saved to the cloud. Keep going — we'll try again at the end."
- Continue to reveal regardless — data is still in client state.
- Flag `persistence_failed: true` in quest state for retry at Block 4 checkpoint.

### Block 4: Reveal + Confirmatory (~5 min)

**Phase 1 — Chart Reveal:**
1. Transition card: "Let's see what we've discovered, [class name]!"
2. RIASEC stat bars animate in (bars grow from 0 to score, staggered 100ms apart)
3. CLASS label appears: "CLASS: INVESTIGATOR-ARTIST" (or appropriate label)
4. MBTI spectrum sliders animate in (dots slide from center to position)
5. Emerging type display: "I N _ J — The Strategic Visionary" (with underscore for "still emerging" dichotomies)
6. Brief explanation cards: what each chart means (1-2 cards, skippable)

**Phase 2 — Confirmatory Round:**
1. Transition: "Want to sharpen your results? 5 quick questions, [class name]."
2. 5 adaptive questions selected from pool of 30 (see selection algorithm below)
3. Charts are visible and update live as each question is answered
4. Same Likert (RIASEC) or forced-choice (MBTI) format as original blocks

**Phase 3 — Final Reveal:**
1. Charts update with refined scores (smooth animation from snapshot to final)
2. "Self-Discoverer" badge unlock animation (scale bounce + glow pulse)
3. Final profile summary card

**Phase 4 — Save Progress Nudge:**
1. Inline card (not modal): "Save your quest progress?"
2. Email input field + "Save" button
3. "Skip for now" link
4. If saved: calls `supabase.auth.updateUser({ email })` to convert anonymous → email user

### Adaptive Question Selection Algorithm

```
Input: riasec_scores (normalized 0-100), riasec_raw (response arrays),
       mbti_scores (-100 to +100), mbti_raw (response arrays),
       riasec_pool (18 questions), mbti_pool (12 questions)

1. Calculate RIASEC ambiguity per type pair:
   - Sort types by score descending
   - For each adjacent pair (1st-2nd, 2nd-3rd, etc.):
     ambiguity = gap / sqrt(response_count_for_lower_type)
   - Lower ambiguity score = more ambiguous

2. Calculate MBTI ambiguity per dichotomy:
   - ambiguity = abs(score) / sqrt(response_count)
   - Lower ambiguity score = more ambiguous

3. Rank all dimensions (6 RIASEC type pairs + 4 MBTI dichotomies) by ambiguity ascending

4. Select 5 questions:
   - Walk down the ranked list
   - For each ambiguous dimension, pick 1 question from that dimension's pool
   - Ensure no RIASEC type gets more than 2 confirmatory questions
   - Ensure no MBTI dichotomy gets more than 2 confirmatory questions
   - Fill remaining slots from next most ambiguous dimensions

Output: 5 Question objects from the combined pool
```

### Final Persistence (After Block 4)

1. Write confirmatory `session_responses` (5 rows)
2. Overwrite `assessment_scores` with refined scores
3. Insert "Self-Discoverer" achievement
4. If `persistence_failed` from Block 3 checkpoint: write ALL session responses and scores (full recovery)
5. Update `students.current_session` to 1 (confirmed complete)

**Error handling:** Same retry strategy as Block 3 checkpoint. If final persistence fails after retries, show: "Your results are displayed but couldn't be saved. Save your email to secure your quest." (pushes toward email linking as recovery path).

---

## 5. Scoring Engine

### RIASEC Scoring

**Per-question processing:**
```
raw_score = reverse_scored ? (6 - response) : response
Append raw_score to riasec_raw[target_type]
```

**Per-type normalization (called after each response):**
```
count = riasec_raw[type].length
sum = sum(riasec_raw[type])
normalized = count > 0 ? ((sum - count) / (count * 4)) * 100 : 0
```

This normalizes correctly regardless of question count (3, 4, or 5).

**Acquiescence bias detection:**
```
if all 6 types > 80 after normalization:
  acquiescence_flag = true
  Surface message during reveal: "Your answers suggest you enjoy everything equally —
  the confirmatory questions will help sharpen your profile."
```

**Score snapshot:** Taken after Block 3, before confirmatory round. Stored in client state for before/after reveal animation.

### MBTI Scoring

**Per-question processing:**
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

**"Still emerging" threshold:** `abs(normalized) < 17` (equivalent to net sum between -1 and +1 with 3 questions)

### CLASS Label Derivation

```
Sort RIASEC types by normalized score descending.
gap_2_3 = score[1] - score[2]  (gap between 2nd and 3rd type)

if score[0] > 50 AND score[1] > 50 AND gap_2_3 > 10:
  CLASS = "TYPE1-TYPE2" (e.g., "INVESTIGATOR-ARTIST")
elif score[0] > 50 AND (score[1] <= 50 OR gap_2_3 <= 10):
  if score[0] - score[1] > 15:
    CLASS = "TYPE1" (single dominant type)
  else:
    CLASS = "EXPLORER" (too close to call)
elif all scores < 40:
  CLASS = "SEEKER" (profile still forming)
else:
  CLASS = "EXPLORER"
```

RIASEC type display names for CLASS label:
- R = Maker, I = Investigator, A = Creator, S = Helper, E = Leader, C = Organizer

### Input Validation

- Likert responses: clamp to integer 1-5. Non-integer → round to nearest.
- Spectrum responses: clamp to integer -3 to +3. Non-integer → round to nearest.
- Unknown question IDs: skip, do not crash.
- Empty response arrays: return 0 for normalization, do not divide by zero.

### Client-Side State

```typescript
interface ScoreState {
  riasec: Record<string, number>;       // normalized 0-100 per type
  riasec_raw: Record<string, number[]>; // raw responses per type
  mbti: Record<string, number>;         // normalized -100 to +100 per dichotomy
  mbti_raw: Record<string, number[]>;   // raw responses per dichotomy
  acquiescence_flag: boolean;
  riasec_snapshot: Record<string, number> | null;  // pre-confirmatory
  class_label: string;
}

interface QuestState {
  current_block: "warmup" | "riasec" | "mbti" | "reveal" | "confirmatory" | "complete";
  current_question_index: number;
  questions_answered: number;
  responses: ClientResponse[];
  selected_adaptive_ids: string[];
  persistence_failed: boolean;
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

- `riasec.ts`:
  - `calculateRiasecType(responses: number[], reverseFlags: boolean[]): number` — returns normalized 0-100
  - `calculateAllRiasec(raw: Record<string, number[]>, reverseMap: Record<string, boolean[]>): Record<string, number>`
  - `detectAcquiescenceBias(scores: Record<string, number>): boolean`
  - `deriveClassLabel(scores: Record<string, number>): string`

- `mbti.ts`:
  - `calculateMbtiDichotomy(responses: number[]): number` — returns -100 to +100
  - `calculateAllMbti(raw: Record<string, number[]>): Record<string, number>`
  - `isStillEmerging(score: number): boolean`
  - `deriveEmergingType(scores: Record<string, number>): string` — returns e.g. "I N _ J"

- `adaptive.ts`:
  - `selectAdaptiveQuestions(riasec: Record<string, number>, riasecRaw: Record<string, number[]>, mbti: Record<string, number>, mbtiRaw: Record<string, number[]>, riasecPool: Question[], mbtiPool: Question[]): Question[]` — returns 5 questions

---

## 6. XP System

XP is derived from progress, not stored as a separate field. Computed client-side from quest completion state.

| Action | XP Award | Cumulative |
|--------|----------|------------|
| Character creation complete | 100 | 100 |
| Warm-up block complete | 50 | 150 |
| RIASEC block complete | 150 | 300 |
| MBTI block complete | 100 | 400 |
| Confirmatory round complete | 50 | 450 |
| Session 2 complete (future) | 200 | 650 |
| Session 3 complete (future) | 200 | 850 |
| Session 4 complete (future) | 150 | 1000 |

Total quest: 1000 XP. Phase 1 max: 450 XP.

---

## 7. Dashboard (RPG Stats View)

### Layout

- **Top bar:** Avatar icon + class name + "Level [age]" + XP progress bar
- **Inventory row:** Badge icons. Unlocked = class-colored with icon. Locked = gray with "🔒" and "???". Max 6 badges visible.
- **Two-column grid (stacks on mobile):**
  - Left: Ability Scores (RIASEC stat bars)
  - Right: Character Traits (MBTI spectrum sliders)
- **Locked panels row:** Skill Tree (MI) + Alignment Compass (Values) — grayed, "Complete Session 2 to unlock"
- **Quest Log:** Session progress with completed/next/locked states
- **Action button:** "Begin Session 2" (disabled in Phase 1 with "Coming soon" tooltip)

### RIASEC Stat Bars

- 6 horizontal bars, one per type
- Bar color: scores > 50 use theme accent color, scores ≤ 50 use gray
- Score number displayed right-aligned
- Emoji prefix per type: 🔧 R, 🔬 I, 🎨 A, 🤝 S, 📢 E, 📋 C
- CLASS label badge below: theme-colored pill with derived class name

### MBTI Spectrum Sliders

- 4 horizontal spectrums with labeled poles
- Dot position = score mapped from -100/+100 to 0%/100% on the bar
- Purple dot + label (e.g., "Leaning Introvert") for clear tendencies
- Gray dot + "Still emerging..." for near-center scores
- Emerging type display below: "I N _ J — The Strategic Visionary"

### MBTI Type Descriptors

Map the emerging 4-letter type to a short descriptor:
- INTJ → The Strategic Visionary
- ENFP → The Enthusiastic Idealist
- (Full 16-type mapping defined in `data/mbti-descriptors.ts`)
- Partial types (with underscores): use the most common descriptor for known letters

### Animations

- Stat bars: grow from 0 to score width (Framer Motion `animate={{ width }}` with spring)
- MBTI dots: slide from center (50%) to final position
- Badge unlock: scale from 0 → 1.2 → 1.0 with glow pulse
- All animations staggered 100-200ms for cascading reveal effect

---

## 8. Data Model Changes

### New Migration: `00002_phase1_additions.sql`

```sql
-- Add avatar_class to students
ALTER TABLE public.students ADD COLUMN avatar_class text;

-- Add self_map to students
ALTER TABLE public.students ADD COLUMN self_map jsonb;

-- Replace preferred_country with preferred_destinations
ALTER TABLE public.students DROP COLUMN IF EXISTS preferred_country;
ALTER TABLE public.students ADD COLUMN preferred_destinations jsonb;

-- Drop preferred_universities (merged into preferred_destinations)
ALTER TABLE public.students DROP COLUMN IF EXISTS preferred_universities;

-- Make education_system nullable (for "not_sure" we store the string, but just in case)
-- Actually keep NOT NULL — "not_sure" is stored as the text value "not_sure"
```

### Updated TypeScript Types

```typescript
// Addition to Student interface
interface Student {
  // ... existing fields ...
  avatar_class: string;
  self_map: SelfMap;
  preferred_destinations: PreferredDestination[];
  // removed: preferred_country, preferred_universities
}

interface SelfMap {
  clarity: number;                // 1-5
  sources: string[];              // multi-select values
  perceived_strengths: string[];  // 0-3, from predefined list
  curiosities: string[];          // 0-3, from career clusters
}

interface PreferredDestination {
  country: string;    // ISO-ish name or "open"
  rank: number;       // 1, 2, or 3
  universities?: string[];  // added later in Session 3/4
}
```

---

## 9. Error Handling

### Auth Failure (Begin Quest)

If `supabase.auth.signInAnonymously()` fails:
- Show themed error card: "The quest portal is temporarily sealed... ⚔️"
- Retry button
- Do not proceed to Session 1 without valid auth

### Persistence Failure (Checkpoints)

Strategy: retry with exponential backoff (3 attempts: 1s, 2s, 4s).

**Block 3 checkpoint failure:**
- Show inline warning: "Your progress couldn't be saved to the cloud. Keep going — we'll try again at the end."
- Set `persistence_failed: true`
- Continue to reveal

**Block 4 checkpoint failure:**
- If Block 3 also failed: attempt full write of all data
- If still failing: "Your results are displayed but couldn't be saved. Save your email to secure your quest."
- Push toward email linking as recovery path

### Network During Session

Session 1 runs entirely client-side (no network needed during questions). Network is only needed at:
1. Begin Quest (auth + student row creation)
2. Block 3 checkpoint
3. Block 4 final persistence
4. Email linking (optional)

---

## 10. Navigation Policies

- **No back navigation** within question blocks. Once answered, locked. "Trust your gut" message on each card.
- **No skipping** in Warm-Up (engagement), MBTI (forced choice by design), or Confirmatory blocks.
- **Skipping allowed** in RIASEC block only. Scoring adjusts normalization denominator for types with fewer responses.
- **Block transitions** are one-way. Cannot return to a completed block.
- **Dashboard** is view-only after Session 1 complete. No re-taking Session 1.

---

## 11. Mobile Responsiveness

- **Character creation wizard:** Single column, full-width cards on mobile
- **Question cards:** Full viewport height, centered content
- **Likert slider:** Full width, large touch targets (min 44px)
- **Spectrum slider:** Full width, thumb size 20px minimum
- **Dashboard:** Two-column grid → single column below 640px
- **Destination browser:** Country grid → single column on mobile
- **Oracle panel:** Full width, scrollable if needed
- **Badge row:** Horizontal scroll on overflow

---

## 12. File Map

### New Files

```
app/
  page.tsx                              # Rewrite: landing page with intro + continue
  quest/
    character/page.tsx                  # Rewrite: multi-step wizard
    session/[id]/page.tsx              # Rewrite: full Session 1 flow engine
    dashboard/page.tsx                 # Rewrite: RPG stats dashboard

components/
  quest/
    question-card.tsx                  # Card shell (all question types render inside)
    likert-slider.tsx                  # 5-point Likert scale input
    spectrum-slider.tsx                # Forced-choice spectrum input (-3 to +3)
    option-grid.tsx                    # Tappable multiple choice options
    progress-bar.tsx                   # Block-aware progress indicator
    block-transition.tsx               # Interstitial narration card
    engagement-checkpoint.tsx          # Mid-block motivation card

  charts/
    riasec-bars.tsx                    # RIASEC ability score stat bars
    mbti-sliders.tsx                   # MBTI spectrum display sliders
    class-label.tsx                    # CLASS badge (derived from RIASEC)
    emerging-type.tsx                  # MBTI emerging type display

  badges/
    badge-row.tsx                      # Horizontal badge inventory
    badge-unlock.tsx                   # Badge unlock animation

  character/
    avatar-select.tsx                  # Avatar class selection grid
    oracle-panel.tsx                   # "Consult the Oracle" education helper
    destination-selector.tsx           # Ranked multi-destination picker
    self-map-form.tsx                  # Self-Map capture (4 subsections)

  ui/
    theme-provider.tsx                 # CSS custom property injection
    xp-bar.tsx                         # XP progress bar

lib/
  scoring/
    riasec.ts                          # RIASEC scoring functions
    mbti.ts                            # MBTI scoring functions
    adaptive.ts                        # Adaptive question selection algorithm

  theme.ts                             # Theme + class definitions config

hooks/
  use-quest-state.ts                   # Quest navigation state + persistence
  use-scores.ts                        # Real-time score computation

providers/
  quest-provider.tsx                   # React context wrapping quest + score state

data/
  questions/
    session-1-core.ts                  # 35 core questions + 2 engagement cards
    session-1-adaptive.ts              # 30 adaptive pool questions
  badges.ts                            # Already exists — no changes
  classes.ts                           # 7 class definitions
  education-systems.ts                 # Education system options for Oracle
  destinations.ts                      # Country list with flags and regions
  mbti-descriptors.ts                  # 16 type descriptors

supabase/
  migrations/
    00002_phase1_additions.sql         # avatar_class, self_map, preferred_destinations
```

---

## 13. Question Bank Source Methodology

All questions are original, created following validated psychometric approaches:

| Framework | Modeled After | Approach Used |
|-----------|---------------|---------------|
| RIASEC | O*NET Interest Profiler (US Dept of Labor, public domain) | Activity-preference Likert items, one type per question |
| MBTI | MMTIC (Murphy & Meisgeier) forced-choice approach | A/B spectrum pairs per dichotomy |
| Adaptive | Standard item-selection from classical test theory | Ambiguity-based selection targeting weakest signal dimensions |

No copyrighted questions are used. Questions describe concrete activities, skills, or preferences that map to the same constructs validated instruments measure.

Reverse-scored items follow standard practice: 2 of 18 RIASEC items are reverse-scored to detect acquiescence bias (tendency to rate everything highly).

---

## What This Spec Does NOT Cover

- Session 2-4 implementation
- Claude API integration (Session 3+)
- Facilitator mode (Phase 5)
- PDF report generation (Phase 4)
- PWA/offline support (Phase 6)
- Actual question content (question text written during implementation)
- Detailed animation timing/easing (refined during implementation)
