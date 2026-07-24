-- SCORE-01 fix: persist raw per-dichotomy MBTI response counts so the
-- dashboard can apply deriveEmergingType's minimum-response rule
-- (<3 answered questions per dichotomy => still emerging) for returning
-- students.
--
-- Deliberately nullable with NO default backfill: rows written before this
-- migration have unknown counts, and NULL lets the dashboard fall back to
-- score-only emerging detection instead of falsely forcing "_ _ _ _".

ALTER TABLE public.assessment_scores
  ADD COLUMN mbti_raw_counts jsonb;

COMMENT ON COLUMN public.assessment_scores.mbti_raw_counts IS
  'Count of raw responses per MBTI dichotomy, e.g. {"EI":3,"SN":2,"TF":3,"JP":2}. NULL for legacy rows written before this column existed.';
