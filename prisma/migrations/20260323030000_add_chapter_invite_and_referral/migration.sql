-- Migration: add_chapter_invite_and_referral
-- Adds the ChapterInvite table and joinedViaInviteId/referredById columns on User
-- that are referenced in the Prisma schema but missing from the migration history.

-- ============================================================
-- CHAPTER INVITES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "ChapterInvite" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChapterInvite_code_key" ON "ChapterInvite"("code");

CREATE INDEX IF NOT EXISTS "ChapterInvite_chapterId_idx" ON "ChapterInvite"("chapterId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterInvite_chapterId_fkey'
  ) THEN
    ALTER TABLE "ChapterInvite"
      ADD CONSTRAINT "ChapterInvite_chapterId_fkey"
      FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ChapterInvite_createdById_fkey'
  ) THEN
    ALTER TABLE "ChapterInvite"
      ADD CONSTRAINT "ChapterInvite_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- ============================================================
-- USER: joinedViaInviteId and referredById columns
-- ============================================================

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "joinedViaInviteId" TEXT,
  ADD COLUMN IF NOT EXISTS "referredById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_joinedViaInviteId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_joinedViaInviteId_fkey"
      FOREIGN KEY ("joinedViaInviteId") REFERENCES "ChapterInvite"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_referredById_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_referredById_fkey"
      FOREIGN KEY ("referredById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
