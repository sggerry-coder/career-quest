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
