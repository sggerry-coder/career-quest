# Career Quest — Project Scope & Architecture

## Vision

A gamified, visual career exploration web app for high school students (13–18).
Students work through a multi-session "quest" that progressively discovers their
personality, strengths, values, and interests — visualised in real-time with animated
charts and cards — then uses Claude AI for deep career analysis and personalised
university recommendations.

Works both self-serve (student alone) and facilitated (teacher/mentor guiding).

---

## Architecture: Hybrid Approach

### What the UI handles (no API cost):
- All Session 1 & 2 question flows (branching logic, follow-ups)
- RIASEC, MI, MBTI, Strengths, Values Compass scoring & real-time visualisation
- Discovery Mode (elimination questions, curiosity test, forced-choice)
- Academic Reality Check form
- Family/Cultural Context capture
- Progress tracking, badges, session state
- Profile dashboard with animated charts
- Day-in-the-life scenario cards (pre-built content)
- Session summaries and shareable profile cards

### What Claude API handles (cost per use, high-value moments):
- Career deep-dives (Session 3) — personalised analysis based on full profile
- University programme matching — web-search-powered, specific to student's country/unis
- Salary, job market, AI risk data — current via web search
- Pre-university preparation roadmap — personalised recommendations
- FutureLearn course matching
- Scholarship identification
- Personal statement strategy
- Final report generation
- "Ask me anything" freeform career questions
- Adaptive follow-up questions when the structured flow detects ambiguity

### Cost Estimate:
- Sessions 1–2: Zero API cost (all client-side logic)
- Session 3 deep-dive: ~1-2 Claude Sonnet calls with web search (~$0.05–0.15)
- Session 4 roadmap: ~1-2 calls (~$0.05–0.15)
- Report generation: ~1 call (~$0.05–0.10)
- Total per student: ~$0.15–0.40 for a complete journey

---

## Tech Stack

### Option A: Standalone (simpler, deploy anywhere)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v3
- **Backend**: Minimal — Claude API calls via serverless functions (Vercel Edge Functions)
- **Database**: Supabase (student profiles, session state, progress)
- **Auth**: Supabase Auth (email or anonymous sessions)
- **Deploy**: Vercel
- **Rationale**: Matches Gerry's existing Auxano stack exactly

### Option B: Add to Auxano (shared infrastructure)
- Integrate as a module within the existing Auxano PWA
- Shared auth, database, and deployment
- Could be offered to mentoring groups as a tool
- **Rationale**: Lower overhead, leverages existing infrastructure

### Recommendation: Option A first (standalone), with a clear migration path to Auxano later

---

## App Structure

### Screen Flow

```
[Landing Page] → [Start Quest / Continue Quest]
       ↓
[Character Creation] — name, age, education system, country/uni preferences
       ↓
[Session 1: Discovery Quest]
  ├── Warm-Up Round (5 cards, animated responses)
  ├── Interest Mapping (7 cards with real-time chart updates)
  └── Profile Reveal (animated dashboard showing emerging profile)
       ↓
[Session 2: Deep Dive Quest]
  ├── Academic Check-In (form-based)
  ├── Family Context (sensitive, optional)
  ├── Day-in-the-Life Scenarios (interactive story cards)
  ├── Elimination Round (swipe-style: yes/no/maybe)
  └── Narrowed Profile Reveal (updated dashboard, 2-3 directions highlighted)
       ↓
[Session 3: Career Explorer] ← Claude API kicks in here
  ├── Career Deep-Dive Cards (AI-generated per direction)
  ├── Programme Matcher (AI-powered, web-search backed)
  ├── Wellbeing Check (career stress/balance info)
  └── Direction Selector (student picks top 1-2)
       ↓
[Session 4: Game Plan] ← Claude API
  ├── Subject Strategy
  ├── Preparation Roadmap (interactive checklist)
  ├── Scholarship Finder
  ├── Personal Statement Strategy
  └── Timeline Builder
       ↓
[Final Report] ← Claude API generates, downloadable as PDF
       ↓
[Share / Export] — shareable profile card, full PDF report
```

### Key UI Components

**1. Question Cards**
- Full-screen cards with one question each
- Animated transitions between cards
- Multiple choice presented as tappable option cards (not radio buttons)
- Free-text input for open questions
- Progress bar showing session completion

**2. Live Profile Dashboard**
- RIASEC hexagon/radar chart (animates as scores update)
- MI bar chart (grows in real-time)
- MBTI spectrum sliders (shift as answers come in)
- Values Compass (visual compass that rotates/adjusts)
- Strengths badges that "unlock" as identified
- Overall "career direction" cards that appear/disappear as profile sharpens

**3. Day-in-the-Life Scenario Cards**
- Story-style cards with illustrated scenarios
- "Energising / Tolerable / Draining" response buttons
- Animations that show the student's reaction feeding back into their profile

**4. Career Deep-Dive Panels** (Claude-powered)
- Expandable cards per career direction
- Progression timeline visualisation
- Salary trajectory chart
- Prospect indicators (growth arrows, risk meters)
- Wellbeing rating (stress level, work-life balance meter)
- "Why this fits YOU" section with personalised reasoning

**5. Achievement / Badge System**
- "Quest Started" — completed character creation
- "Self-Discoverer" — finished Session 1
- "Direction Finder" — narrowed to 2-3 fields
- "Career Explorer" — completed deep-dives
- "Game Plan Ready" — completed preparation roadmap
- "Report Card" — generated final report
- Visual badge gallery on profile page

**6. Facilitator Mode**
- Toggle: "I'm a student" / "I'm helping a student"
- Facilitator view shows framework scores, suggested follow-up questions,
  and notes panel for the mentor to add observations
- Can manage multiple student profiles
- Dashboard showing all students' progress

---

## Data Model (Supabase)

### Tables

**students**
- id, name, age, education_system, created_at
- preferred_country, preferred_universities (jsonb)
- current_session (1-5)
- facilitator_id (nullable, FK to facilitators)

**assessment_scores**
- student_id (FK)
- riasec_scores (jsonb: {R: 0, I: 0, A: 0, S: 0, E: 0, C: 0})
- mi_scores (jsonb: {linguistic: 0, logical: 0, spatial: 0, ...})
- mbti_indicators (jsonb: {EI: 0, SN: 0, TF: 0, JP: 0}) — spectrum values
- strengths (jsonb array)
- values_compass (jsonb: {security_adventure: 0, income_impact: 0, ...})
- updated_at

**session_responses**
- id, student_id, session_number, question_id
- question_text, response_text
- framework_signals (jsonb: which frameworks this answer informed)
- created_at

**academic_profile**
- student_id
- strong_subjects, weak_subjects (jsonb arrays)
- predicted_grades (jsonb)
- study_confidence (1-5 scale)
- grades_reflect_effort (boolean)

**family_context**
- student_id
- family_career_expectations (text, nullable)
- support_level (enum: very_supportive, some_expectations, strong_expectations)
- financial_constraints (text, nullable)

**career_directions**
- id, student_id
- direction_name, status (candidate/selected/eliminated)
- ai_analysis (jsonb — cached Claude response)
- programmes (jsonb array — cached recommendations)
- created_at

**achievements**
- student_id, badge_id, unlocked_at

**facilitators**
- id, name, email, organisation

### Question Bank (seeded data)

**question_bank**
- id, session_number, phase, question_text
- question_type (multiple_choice / free_text / scenario / spectrum)
- options (jsonb, nullable)
- framework_mapping (jsonb: which frameworks this question probes)
- age_range (13-14 / 15-16 / 17-18 / all)
- follow_up_triggers (jsonb: conditions for adaptive follow-up)

**scenario_bank**
- id, career_field, title, description
- morning_activities, afternoon_activities (text)
- riasec_mapping (which RIASEC types this scenario represents)

---

## Build Phases

### Phase 1: Core Quest (MVP) — ~2-3 weeks
- Landing page, character creation
- Session 1 complete question flow with card UI
- Real-time RIASEC + MI + MBTI scoring and dashboard
- Session state persistence (Supabase)
- Mobile-responsive design

### Phase 2: Deep Exploration — ~2 weeks
- Session 2 (academic check, family context, scenarios, elimination)
- Values Compass assessment and visualisation
- Discovery Mode fallback for blank students
- Contradiction detection and UI handling
- Badge/achievement system

### Phase 3: AI Integration — ~2 weeks
- Claude API integration (Vercel Edge Functions)
- Session 3 career deep-dives (AI-generated)
- Programme matching with web search
- Career cards UI (progression, salary, prospects, wellbeing)

### Phase 4: Game Plan & Report — ~1-2 weeks
- Session 4 preparation roadmap
- FutureLearn integration (search + display)
- Scholarship finder
- Personal statement strategy
- PDF report generation
- Share/export functionality

### Phase 5: Facilitator Mode — ~1 week
- Facilitator registration and dashboard
- Multi-student management
- Framework scores view
- Notes and observations panel

### Phase 6: Polish — ~1 week
- Animations and transitions
- Onboarding tutorial
- Edge case handling
- Performance optimisation
- PWA setup (offline support for Sessions 1-2)

**Total estimated: 9-11 weeks for full build**
**MVP (Phase 1 alone): 2-3 weeks**

---

## Feasibility Assessment

### Highly Feasible:
- React + Supabase + Vercel stack (Gerry's exact stack)
- Client-side scoring logic (straightforward maths)
- Card-based UI with animations (Framer Motion or CSS transitions)
- Chart visualisations (Recharts or Chart.js)
- Claude API integration (standard fetch calls)
- PDF generation (jsPDF or server-side with docx skill)

### Moderate Complexity:
- Adaptive branching logic (question flow engine)
- Real-time chart updates synced to scoring
- Facilitator mode with multi-student dashboard
- Caching Claude responses to avoid redundant API calls

### Potential Challenges:
- Day-in-the-life scenarios need good written content (50+ scenarios)
- Question bank needs careful calibration for age-appropriateness
- Web search in Claude API for programme matching may need prompt tuning
- PDF report formatting to look professional

### Risk Mitigation:
- Start with Phase 1 MVP, validate with a few students, iterate
- Pre-write scenario content before building the UI
- Claude API calls can be tested in isolation before UI integration
- Use the existing skill's frameworks.md as the scoring reference

---

## Key Decision Points

1. **Standalone vs Auxano module** — recommend standalone first
2. **Auth strategy** — anonymous sessions (easier for students) vs email auth (needed for persistence)
   → Suggestion: anonymous with optional "save my progress" email link
3. **Hosting** — Vercel free tier likely sufficient for initial use
4. **Claude API key** — Gerry's own API key via env variable
5. **Question bank** — seed from the skill's existing questions, expand over time
6. **Illustrations** — use simple SVG illustrations or emoji-style icons (avoid expensive assets)
