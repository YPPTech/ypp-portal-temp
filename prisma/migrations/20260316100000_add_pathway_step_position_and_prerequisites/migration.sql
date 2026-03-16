-- Add visual positioning columns and DAG prerequisites join table to PathwayStep.
-- These fields exist in schema.prisma but were never included in a migration.

ALTER TABLE "PathwayStep"
  ADD COLUMN IF NOT EXISTS "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Self-referential many-to-many join table for PathwayStep prerequisites
CREATE TABLE IF NOT EXISTS "_StepPrerequisites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_StepPrerequisites_AB_unique"
  ON "_StepPrerequisites"("A", "B");

CREATE INDEX IF NOT EXISTS "_StepPrerequisites_B_index"
  ON "_StepPrerequisites"("B");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_StepPrerequisites_A_fkey'
  ) THEN
    ALTER TABLE "_StepPrerequisites"
      ADD CONSTRAINT "_StepPrerequisites_A_fkey"
      FOREIGN KEY ("A") REFERENCES "PathwayStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_StepPrerequisites_B_fkey'
  ) THEN
    ALTER TABLE "_StepPrerequisites"
      ADD CONSTRAINT "_StepPrerequisites_B_fkey"
      FOREIGN KEY ("B") REFERENCES "PathwayStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
