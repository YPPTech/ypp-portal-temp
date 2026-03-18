ALTER TYPE "CurriculumDraftStatus" ADD VALUE IF NOT EXISTS 'NEEDS_REVISION';
ALTER TYPE "CurriculumDraftStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "CurriculumDraftStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "CurriculumDraft"
  ADD COLUMN IF NOT EXISTS "courseConfig" JSONB NOT NULL DEFAULT '{"durationWeeks":8,"sessionsPerWeek":1,"classDurationMin":60,"targetAgeGroup":"","deliveryModes":["VIRTUAL"],"difficultyLevel":"LEVEL_101","minStudents":3,"maxStudents":25,"idealSize":12,"estimatedHours":8}'::jsonb,
  ADD COLUMN IF NOT EXISTS "understandingChecks" JSONB NOT NULL DEFAULT '{"answers":{},"lastScorePct":null,"passed":false,"completedAt":null}'::jsonb,
  ADD COLUMN IF NOT EXISTS "reviewRubric" JSONB,
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "generatedTemplateId" TEXT;

CREATE INDEX IF NOT EXISTS "CurriculumDraft_status_idx" ON "CurriculumDraft"("status");
CREATE INDEX IF NOT EXISTS "CurriculumDraft_generatedTemplateId_idx" ON "CurriculumDraft"("generatedTemplateId");
