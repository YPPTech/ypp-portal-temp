-- Migration: restore_chapter_discovery_schema
-- Adds the chapter discovery/profile fields and chapter community tables
-- that are referenced in the Prisma schema but missing from the migration history.

-- ============================================================
-- ENUMS
-- ============================================================

DO $$
BEGIN
  CREATE TYPE "ChapterJoinPolicy" AS ENUM (
    'OPEN',
    'APPROVAL',
    'INVITE_ONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "JoinRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "GoalStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'PAUSED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- ============================================================
-- CHAPTER PROFILE FIELDS
-- ============================================================

ALTER TABLE "Chapter"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "tagline" TEXT,
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "joinPolicy" "ChapterJoinPolicy" NOT NULL DEFAULT 'OPEN';

CREATE INDEX IF NOT EXISTS "Chapter_isPublic_idx" ON "Chapter"("isPublic");

-- ============================================================
-- CHAPTER JOIN REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS "ChapterJoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "message" TEXT,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChapterJoinRequest_userId_chapterId_key"
  ON "ChapterJoinRequest"("userId", "chapterId");

CREATE INDEX IF NOT EXISTS "ChapterJoinRequest_chapterId_status_idx"
  ON "ChapterJoinRequest"("chapterId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterJoinRequest_userId_fkey'
  ) THEN
    ALTER TABLE "ChapterJoinRequest"
      ADD CONSTRAINT "ChapterJoinRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterJoinRequest_chapterId_fkey'
  ) THEN
    ALTER TABLE "ChapterJoinRequest"
      ADD CONSTRAINT "ChapterJoinRequest_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterJoinRequest_reviewedById_fkey'
  ) THEN
    ALTER TABLE "ChapterJoinRequest"
      ADD CONSTRAINT "ChapterJoinRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ============================================================
-- CHAPTER CHANNELS
-- ============================================================

CREATE TABLE IF NOT EXISTS "ChapterChannel" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChapterChannel_chapterId_name_key"
  ON "ChapterChannel"("chapterId", "name");

CREATE INDEX IF NOT EXISTS "ChapterChannel_chapterId_idx"
  ON "ChapterChannel"("chapterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterChannel_chapterId_fkey'
  ) THEN
    ALTER TABLE "ChapterChannel"
      ADD CONSTRAINT "ChapterChannel_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ChapterChannelMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterChannelMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChapterChannelMessage_channelId_createdAt_idx"
  ON "ChapterChannelMessage"("channelId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterChannelMessage_channelId_fkey'
  ) THEN
    ALTER TABLE "ChapterChannelMessage"
      ADD CONSTRAINT "ChapterChannelMessage_channelId_fkey"
      FOREIGN KEY ("channelId") REFERENCES "ChapterChannel"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterChannelMessage_authorId_fkey'
  ) THEN
    ALTER TABLE "ChapterChannelMessage"
      ADD CONSTRAINT "ChapterChannelMessage_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- ============================================================
-- CHAPTER GOALS & KPI SNAPSHOTS
-- ============================================================

CREATE TABLE IF NOT EXISTS "ChapterGoal" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChapterGoal_chapterId_status_idx"
  ON "ChapterGoal"("chapterId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterGoal_chapterId_fkey'
  ) THEN
    ALTER TABLE "ChapterGoal"
      ADD CONSTRAINT "ChapterGoal_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterGoal_createdById_fkey'
  ) THEN
    ALTER TABLE "ChapterGoal"
      ADD CONSTRAINT "ChapterGoal_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ChapterKpiSnapshot" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeStudents" INTEGER NOT NULL DEFAULT 0,
    "activeInstructors" INTEGER NOT NULL DEFAULT 0,
    "pendingApplications" INTEGER NOT NULL DEFAULT 0,
    "overdueQueues" INTEGER NOT NULL DEFAULT 0,
    "avgResponseHours" DOUBLE PRECISION,
    "classesRunningCount" INTEGER NOT NULL DEFAULT 0,
    "enrollmentFillPercent" DOUBLE PRECISION,
    "mentorshipPairCount" INTEGER NOT NULL DEFAULT 0,
    "retentionRate" DOUBLE PRECISION,
    "newMembersThisWeek" INTEGER NOT NULL DEFAULT 0,
    "eventsThisWeek" INTEGER NOT NULL DEFAULT 0,
    "postsThisWeek" INTEGER NOT NULL DEFAULT 0,
    "isAtRisk" BOOLEAN NOT NULL DEFAULT false,
    "riskFlags" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterKpiSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChapterKpiSnapshot_chapterId_snapshotDate_key"
  ON "ChapterKpiSnapshot"("chapterId", "snapshotDate");

CREATE INDEX IF NOT EXISTS "ChapterKpiSnapshot_chapterId_idx"
  ON "ChapterKpiSnapshot"("chapterId");

CREATE INDEX IF NOT EXISTS "ChapterKpiSnapshot_snapshotDate_idx"
  ON "ChapterKpiSnapshot"("snapshotDate");

CREATE INDEX IF NOT EXISTS "ChapterKpiSnapshot_isAtRisk_idx"
  ON "ChapterKpiSnapshot"("isAtRisk");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterKpiSnapshot_chapterId_fkey'
  ) THEN
    ALTER TABLE "ChapterKpiSnapshot"
      ADD CONSTRAINT "ChapterKpiSnapshot_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
