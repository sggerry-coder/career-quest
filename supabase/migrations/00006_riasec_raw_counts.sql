-- Persist raw per-type interest response counts so the dashboard can tell a
-- type nobody was asked about from one the student rated at the bottom. Both
-- merge to 0 in riasec_scores, and the bars drew both the same way: a labelled
-- row, an empty bar, and a hard 0. That is absence rendered as a result, and
-- it matters more here than on the other charts -- the CLASS badge sits
-- directly under these six rows and is derived from them, so a student could
-- read a class off evidence the chart was misrepresenting.
--
-- Counts both instruments, as buildRiasecEvidence does: a rating item and a
-- place in a forced ranking each say something about one type. The two
-- rankings cover three types each, so a student who skips one ranking has
-- three types whose only evidence is their rating items.
--
-- Deliberately nullable with NO default backfill, exactly as 00004 and 00005
-- did: rows written before this migration have unknown counts, and NULL lets
-- hasRiasecReading fall back to "assume asked" instead of blanking six rows of
-- a finished profile.
--
-- UNAPPLIED AND UNWIRED as of this commit. Nothing writes this column and
-- nothing reads it; the reveal fixes itself from the raw answers it still
-- holds in scope and needs no column at all. Apply this SQL against the live
-- database FIRST. Writing an unknown column fails the entire upsert -- for
-- every student, not just skippers -- which is a failure this project has
-- already shipped once. Wiring final-persist and the dashboard lands only
-- after this has been applied.

ALTER TABLE public.assessment_scores
  ADD COLUMN riasec_raw_counts jsonb;

COMMENT ON COLUMN public.assessment_scores.riasec_raw_counts IS
  'Count of raw interest responses per RIASEC type across both instruments (rating items + forced rankings), e.g. {"R":3,"I":3,"A":2,"S":0,"E":2,"C":0}. 0 means the student was never asked, which is not the same as a low score. NULL for legacy rows written before this column existed.';
