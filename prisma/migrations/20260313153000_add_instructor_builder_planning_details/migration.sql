-- Add richer planning metadata for instructor builders without requiring
-- backfills for existing records.

ALTER TABLE "SpecialProgram"
  ADD COLUMN IF NOT EXISTS "labBlueprint" JSONB;

ALTER TABLE "SeasonalCompetition"
  ADD COLUMN IF NOT EXISTS "planningDetails" JSONB;

ALTER TABLE "Pathway"
  ADD COLUMN IF NOT EXISTS "sequenceBlueprint" JSONB;

ALTER TABLE "PathwayStep"
  ADD COLUMN IF NOT EXISTS "stepDetails" JSONB;
