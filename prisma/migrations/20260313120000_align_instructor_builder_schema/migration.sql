-- Align instructor-builder features that exist in schema.prisma but are missing
-- from older deployed databases.

-- ---------------------------------------------------------------------------
-- Required enum types
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TYPE "ProgramType" AS ENUM ('PASSION_LAB', 'COMPETITION_PREP', 'EXPERIENCE', 'SEQUENCE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CurriculumSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DeliveryMode" AS ENUM ('IN_PERSON', 'VIRTUAL', 'HYBRID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PathwayStepUnlockType" AS ENUM ('AUTO', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Base pathway tables used by Sequence Builder
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Pathway" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "interestArea" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pathway_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Pathway"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

CREATE TABLE IF NOT EXISTS "PathwayStep" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "unlockType" "PathwayStepUnlockType" NOT NULL DEFAULT 'AUTO',
    "courseId" TEXT,
    "classTemplateId" TEXT,
    "specialProgramId" TEXT,
    "title" TEXT,

    CONSTRAINT "PathwayStep_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PathwayStep"
  ADD COLUMN IF NOT EXISTS "unlockType" "PathwayStepUnlockType" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN IF NOT EXISTS "classTemplateId" TEXT,
  ADD COLUMN IF NOT EXISTS "specialProgramId" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT;

CREATE TABLE IF NOT EXISTS "PathwayStepUnlock" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayStepUnlock_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Passion Lab builder
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "SpecialProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "interestArea" TEXT NOT NULL,
    "type" "ProgramType" NOT NULL,
    "isVirtual" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "leaderId" TEXT,
    "drivingQuestion" TEXT,
    "targetAgeGroup" TEXT,
    "difficulty" TEXT,
    "deliveryMode" "DeliveryMode",
    "finalShowcase" TEXT,
    "sessionTopics" JSONB NOT NULL DEFAULT '[]',
    "submissionFormat" TEXT,
    "maxParticipants" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "chapterId" TEXT,
    "createdById" TEXT,
    "submissionStatus" "CurriculumSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialProgram_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SpecialProgram"
  ADD COLUMN IF NOT EXISTS "type" "ProgramType" NOT NULL DEFAULT 'EXPERIENCE',
  ADD COLUMN IF NOT EXISTS "isVirtual" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "leaderId" TEXT,
  ADD COLUMN IF NOT EXISTS "drivingQuestion" TEXT,
  ADD COLUMN IF NOT EXISTS "targetAgeGroup" TEXT,
  ADD COLUMN IF NOT EXISTS "difficulty" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryMode" "DeliveryMode",
  ADD COLUMN IF NOT EXISTS "finalShowcase" TEXT,
  ADD COLUMN IF NOT EXISTS "sessionTopics" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "submissionFormat" TEXT,
  ADD COLUMN IF NOT EXISTS "maxParticipants" INTEGER,
  ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "chapterId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionStatus" "CurriculumSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "ProgramSession" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SpecialProgramEnrollment" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialProgramEnrollment_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Pathway integration tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "PathwayCohort" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayCohort_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CohortMember" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PathwayReflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "visibleToMentor" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayReflection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PathwayEvent" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3),
    "locationOrLink" TEXT,
    "maxAttendees" INTEGER,
    "requiredStepOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PathwayEventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathwayEventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InstructorPathwaySpec" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorPathwaySpec_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChapterPathway" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterPathway_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Competition draft ownership
-- ---------------------------------------------------------------------------

ALTER TABLE "SeasonalCompetition"
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- ---------------------------------------------------------------------------
-- Instructor cohort tools
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "InstructorCohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorCohort_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InstructorCohort"
  ADD COLUMN IF NOT EXISTS "chapterId" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "InstructorCohortMember" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorCohortMember_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "PathwayStep_pathwayId_stepOrder_idx"
  ON "PathwayStep"("pathwayId", "stepOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayStepUnlock_stepId_userId_key"
  ON "PathwayStepUnlock"("stepId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "SpecialProgramEnrollment_programId_userId_key"
  ON "SpecialProgramEnrollment"("programId", "userId");

CREATE INDEX IF NOT EXISTS "PathwayCohort_pathwayId_idx"
  ON "PathwayCohort"("pathwayId");

CREATE INDEX IF NOT EXISTS "CohortMember_userId_idx"
  ON "CohortMember"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "CohortMember_cohortId_userId_key"
  ON "CohortMember"("cohortId", "userId");

CREATE INDEX IF NOT EXISTS "PathwayReflection_userId_pathwayId_idx"
  ON "PathwayReflection"("userId", "pathwayId");

CREATE INDEX IF NOT EXISTS "PathwayEvent_pathwayId_idx"
  ON "PathwayEvent"("pathwayId");

CREATE INDEX IF NOT EXISTS "PathwayEventRegistration_userId_idx"
  ON "PathwayEventRegistration"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "PathwayEventRegistration_eventId_userId_key"
  ON "PathwayEventRegistration"("eventId", "userId");

CREATE INDEX IF NOT EXISTS "InstructorPathwaySpec_pathwayId_idx"
  ON "InstructorPathwaySpec"("pathwayId");

CREATE UNIQUE INDEX IF NOT EXISTS "InstructorPathwaySpec_userId_pathwayId_key"
  ON "InstructorPathwaySpec"("userId", "pathwayId");

CREATE INDEX IF NOT EXISTS "ChapterPathway_chapterId_idx"
  ON "ChapterPathway"("chapterId");

CREATE UNIQUE INDEX IF NOT EXISTS "ChapterPathway_chapterId_pathwayId_key"
  ON "ChapterPathway"("chapterId", "pathwayId");

CREATE INDEX IF NOT EXISTS "InstructorCohort_chapterId_idx"
  ON "InstructorCohort"("chapterId");

CREATE INDEX IF NOT EXISTS "InstructorCohort_createdById_idx"
  ON "InstructorCohort"("createdById");

CREATE INDEX IF NOT EXISTS "InstructorCohortMember_userId_idx"
  ON "InstructorCohortMember"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "InstructorCohortMember_cohortId_userId_key"
  ON "InstructorCohortMember"("cohortId", "userId");

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Pathway_createdById_fkey') THEN
    ALTER TABLE "Pathway"
      ADD CONSTRAINT "Pathway_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayStep_pathwayId_fkey') THEN
    ALTER TABLE "PathwayStep"
      ADD CONSTRAINT "PathwayStep_pathwayId_fkey"
      FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayStep_courseId_fkey') THEN
    ALTER TABLE "PathwayStep"
      ADD CONSTRAINT "PathwayStep_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayStep_classTemplateId_fkey') THEN
    ALTER TABLE "PathwayStep"
      ADD CONSTRAINT "PathwayStep_classTemplateId_fkey"
      FOREIGN KEY ("classTemplateId") REFERENCES "ClassTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayStep_specialProgramId_fkey') THEN
    ALTER TABLE "PathwayStep"
      ADD CONSTRAINT "PathwayStep_specialProgramId_fkey"
      FOREIGN KEY ("specialProgramId") REFERENCES "SpecialProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayStepUnlock_stepId_fkey') THEN
    ALTER TABLE "PathwayStepUnlock"
      ADD CONSTRAINT "PathwayStepUnlock_stepId_fkey"
      FOREIGN KEY ("stepId") REFERENCES "PathwayStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayStepUnlock_userId_fkey') THEN
    ALTER TABLE "PathwayStepUnlock"
      ADD CONSTRAINT "PathwayStepUnlock_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SpecialProgram_leaderId_fkey') THEN
    ALTER TABLE "SpecialProgram"
      ADD CONSTRAINT "SpecialProgram_leaderId_fkey"
      FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SpecialProgram_chapterId_fkey') THEN
    ALTER TABLE "SpecialProgram"
      ADD CONSTRAINT "SpecialProgram_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SpecialProgram_createdById_fkey') THEN
    ALTER TABLE "SpecialProgram"
      ADD CONSTRAINT "SpecialProgram_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgramSession_programId_fkey') THEN
    ALTER TABLE "ProgramSession"
      ADD CONSTRAINT "ProgramSession_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "SpecialProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SpecialProgramEnrollment_programId_fkey') THEN
    ALTER TABLE "SpecialProgramEnrollment"
      ADD CONSTRAINT "SpecialProgramEnrollment_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "SpecialProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SpecialProgramEnrollment_userId_fkey') THEN
    ALTER TABLE "SpecialProgramEnrollment"
      ADD CONSTRAINT "SpecialProgramEnrollment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayCohort_pathwayId_fkey') THEN
    ALTER TABLE "PathwayCohort"
      ADD CONSTRAINT "PathwayCohort_pathwayId_fkey"
      FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CohortMember_cohortId_fkey') THEN
    ALTER TABLE "CohortMember"
      ADD CONSTRAINT "CohortMember_cohortId_fkey"
      FOREIGN KEY ("cohortId") REFERENCES "PathwayCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CohortMember_userId_fkey') THEN
    ALTER TABLE "CohortMember"
      ADD CONSTRAINT "CohortMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayReflection_userId_fkey') THEN
    ALTER TABLE "PathwayReflection"
      ADD CONSTRAINT "PathwayReflection_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayReflection_pathwayId_fkey') THEN
    ALTER TABLE "PathwayReflection"
      ADD CONSTRAINT "PathwayReflection_pathwayId_fkey"
      FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayEvent_pathwayId_fkey') THEN
    ALTER TABLE "PathwayEvent"
      ADD CONSTRAINT "PathwayEvent_pathwayId_fkey"
      FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathwayEventRegistration_eventId_fkey') THEN
    ALTER TABLE "PathwayEventRegistration"
      ADD CONSTRAINT "PathwayEventRegistration_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "PathwayEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorPathwaySpec_userId_fkey') THEN
    ALTER TABLE "InstructorPathwaySpec"
      ADD CONSTRAINT "InstructorPathwaySpec_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorPathwaySpec_pathwayId_fkey') THEN
    ALTER TABLE "InstructorPathwaySpec"
      ADD CONSTRAINT "InstructorPathwaySpec_pathwayId_fkey"
      FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChapterPathway_chapterId_fkey') THEN
    ALTER TABLE "ChapterPathway"
      ADD CONSTRAINT "ChapterPathway_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChapterPathway_pathwayId_fkey') THEN
    ALTER TABLE "ChapterPathway"
      ADD CONSTRAINT "ChapterPathway_pathwayId_fkey"
      FOREIGN KEY ("pathwayId") REFERENCES "Pathway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SeasonalCompetition_createdById_fkey') THEN
    ALTER TABLE "SeasonalCompetition"
      ADD CONSTRAINT "SeasonalCompetition_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorCohort_chapterId_fkey') THEN
    ALTER TABLE "InstructorCohort"
      ADD CONSTRAINT "InstructorCohort_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorCohort_createdById_fkey') THEN
    ALTER TABLE "InstructorCohort"
      ADD CONSTRAINT "InstructorCohort_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorCohortMember_cohortId_fkey') THEN
    ALTER TABLE "InstructorCohortMember"
      ADD CONSTRAINT "InstructorCohortMember_cohortId_fkey"
      FOREIGN KEY ("cohortId") REFERENCES "InstructorCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorCohortMember_userId_fkey') THEN
    ALTER TABLE "InstructorCohortMember"
      ADD CONSTRAINT "InstructorCohortMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
