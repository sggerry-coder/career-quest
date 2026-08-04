-- Persist raw per-dimension values response counts so the dashboard can tell
-- an unanswered values dimension from a genuinely balanced one. On a spectrum
-- 0 is the exact centre -- the most confident thing the scale can say about
-- balance -- so the score alone cannot distinguish the two, and the compass
-- printed "Balanced for now" over both. The reveal has the raw answers in
-- scope and is already fixed; the dashboard reads back persisted scores and
-- has nothing to read.
--
-- Deliberately nullable with NO default backfill, exactly as 00004 did for
-- mbti_raw_counts: rows written before this migration have unknown counts,
-- and NULL lets hasValuesReading fall back to "assume answered" instead of
-- silently blanking every dimension of a finished profile.
--
-- Nothing writes or reads this column yet. final-persist must not be changed
-- to write it until this migration has been applied to the live database --
-- writing an unknown column fails the whole save, for every student.

ALTER TABLE public.assessment_scores
  ADD COLUMN values_raw_counts jsonb;

COMMENT ON COLUMN public.assessment_scores.values_raw_counts IS
  'Count of raw responses per values dimension, e.g. {"security_adventure":1,"income_impact":1,"prestige_fulfilment":0,"structure_flexibility":0,"solo_team":1}. NULL for legacy rows written before this column existed.';
