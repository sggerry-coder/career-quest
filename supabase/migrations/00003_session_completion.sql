-- Phase 2: Session completion flag and response dedup constraint

ALTER TABLE public.students
  ADD COLUMN has_completed_session1 boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.students.has_completed_session1
  IS 'True after student completes all Session 1 questions and reveal';

-- Prevent duplicate session_responses on retry (idempotent upsert safety)
ALTER TABLE public.session_responses
  ADD CONSTRAINT session_responses_student_question_session_unique
  UNIQUE (student_id, question_id, session_number);
