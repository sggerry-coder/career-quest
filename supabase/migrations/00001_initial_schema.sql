-- Career Quest: Initial Schema
-- Run this in the Supabase SQL Editor

-- =============================================================================
-- TABLES
-- =============================================================================

-- Facilitators (created before students due to FK)
create table public.facilitators (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  organisation text,
  created_at timestamptz not null default now()
);

-- Students
create table public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  age smallint not null,
  education_system text not null,
  preferred_country text,
  preferred_universities jsonb,
  current_session smallint not null default 0,
  strong_subjects jsonb,
  weak_subjects jsonb,
  predicted_grades jsonb,
  study_confidence smallint check (study_confidence between 1 and 5),
  grades_reflect_effort boolean,
  facilitator_id uuid references public.facilitators(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_students_facilitator on public.students(facilitator_id);

-- Assessment Scores (1:1 with students)
create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  riasec_scores jsonb not null default '{"R":0,"I":0,"A":0,"S":0,"E":0,"C":0}',
  mi_scores jsonb not null default '{"linguistic":0,"logical":0,"spatial":0,"musical":0,"bodily":0,"interpersonal":0,"intrapersonal":0,"naturalistic":0}',
  mbti_indicators jsonb not null default '{"EI":0,"SN":0,"TF":0,"JP":0}',
  strengths jsonb not null default '[]',
  values_compass jsonb not null default '{"security_adventure":0,"income_impact":0,"prestige_fulfilment":0,"structure_flexibility":0,"solo_team":0}',
  updated_at timestamptz not null default now()
);

-- Session Responses
create table public.session_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_number smallint not null,
  question_id text not null,
  question_text text not null,
  response_text text not null,
  framework_signals jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_session_responses_student_session
  on public.session_responses(student_id, session_number);

-- Family Context (1:1 with students, separate for privacy)
create table public.family_context (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  family_career_expectations text,
  support_level text check (support_level in ('very_supportive', 'some_expectations', 'strong_expectations')),
  financial_constraints text,
  created_at timestamptz not null default now()
);

-- Career Directions
create table public.career_directions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  direction_name text not null,
  status text not null default 'candidate' check (status in ('candidate', 'selected', 'eliminated')),
  ai_analysis jsonb,
  programmes jsonb,
  created_at timestamptz not null default now()
);

create index idx_career_directions_student on public.career_directions(student_id);

-- Achievements
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  unique (student_id, badge_id)
);

create index idx_achievements_student on public.achievements(student_id);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger students_updated_at
  before update on public.students
  for each row execute function public.handle_updated_at();

create trigger assessment_scores_updated_at
  before update on public.assessment_scores
  for each row execute function public.handle_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.facilitators enable row level security;
alter table public.students enable row level security;
alter table public.assessment_scores enable row level security;
alter table public.session_responses enable row level security;
alter table public.family_context enable row level security;
alter table public.career_directions enable row level security;
alter table public.achievements enable row level security;

-- Facilitators: own data only
create policy "Facilitators can view own profile"
  on public.facilitators for select
  using (auth.uid() = id);

create policy "Facilitators can update own profile"
  on public.facilitators for update
  using (auth.uid() = id);

create policy "Facilitators can insert own profile"
  on public.facilitators for insert
  with check (auth.uid() = id);

-- Students: own data + facilitator can read linked students
create policy "Students can manage own profile"
  on public.students for all
  using (auth.uid() = id);

create policy "Facilitators can view linked students"
  on public.students for select
  using (facilitator_id = auth.uid());

-- Assessment Scores: own data + facilitator read
create policy "Students can manage own scores"
  on public.assessment_scores for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student scores"
  on public.assessment_scores for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Session Responses: own data + facilitator read
create policy "Students can manage own responses"
  on public.session_responses for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student responses"
  on public.session_responses for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Family Context: own data + facilitator read (only if linked)
create policy "Students can manage own family context"
  on public.family_context for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student family context"
  on public.family_context for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Career Directions: own data + facilitator read
create policy "Students can manage own career directions"
  on public.career_directions for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student career directions"
  on public.career_directions for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );

-- Achievements: own data + facilitator read
create policy "Students can manage own achievements"
  on public.achievements for all
  using (student_id = auth.uid());

create policy "Facilitators can view linked student achievements"
  on public.achievements for select
  using (
    student_id in (
      select id from public.students where facilitator_id = auth.uid()
    )
  );
