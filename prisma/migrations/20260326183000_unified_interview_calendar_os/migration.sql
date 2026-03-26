-- CreateEnum
CREATE TYPE "InterviewDomain" AS ENUM ('HIRING', 'READINESS');

-- CreateEnum
CREATE TYPE "InterviewSchedulingRequestStatus" AS ENUM (
  'REQUESTED',
  'BOOKED',
  'RESCHEDULE_REQUESTED',
  'COMPLETED',
  'CANCELLED',
  'DECLINED'
);

-- CreateEnum
CREATE TYPE "InterviewAvailabilityScope" AS ENUM ('ALL', 'HIRING', 'READINESS');

-- CreateEnum
CREATE TYPE "InterviewAvailabilityOverrideType" AS ENUM ('OPEN', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ConversationContextType" AS ENUM ('INTERVIEW');

-- AlterTable
ALTER TABLE "Conversation"
ADD COLUMN "contextType" "ConversationContextType",
ADD COLUMN "interviewDomain" "InterviewDomain",
ADD COLUMN "interviewEntityId" TEXT;

-- CreateTable
CREATE TABLE "InterviewAvailabilityRule" (
    "id" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "chapterId" TEXT,
    "scope" "InterviewAvailabilityScope" NOT NULL DEFAULT 'ALL',
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "meetingLink" TEXT,
    "locationLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewAvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAvailabilityOverride" (
    "id" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "chapterId" TEXT,
    "ruleId" TEXT,
    "scope" "InterviewAvailabilityScope" NOT NULL DEFAULT 'ALL',
    "type" "InterviewAvailabilityOverrideType" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "slotDuration" INTEGER,
    "bufferMinutes" INTEGER,
    "meetingLink" TEXT,
    "locationLabel" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewAvailabilityOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSchedulingRequest" (
    "id" TEXT NOT NULL,
    "domain" "InterviewDomain" NOT NULL,
    "status" "InterviewSchedulingRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "chapterId" TEXT,
    "applicationId" TEXT,
    "gateId" TEXT,
    "intervieweeId" TEXT NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedStartAt" TIMESTAMP(3) NOT NULL,
    "requestedEndAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 30,
    "meetingLink" TEXT,
    "sourceTimezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "note" TEXT,
    "conversationId" TEXT,
    "bookedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "rescheduleRequestedAt" TIMESTAMP(3),
    "chapterEscalatedAt" TIMESTAMP(3),
    "adminEscalatedAt" TIMESTAMP(3),
    "reminder24SentAt" TIMESTAMP(3),
    "reminder2SentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSchedulingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_interviewDomain_interviewEntityId_key"
ON "Conversation"("interviewDomain", "interviewEntityId");

-- CreateIndex
CREATE INDEX "InterviewAvailabilityRule_interviewerId_isActive_idx"
ON "InterviewAvailabilityRule"("interviewerId", "isActive");

-- CreateIndex
CREATE INDEX "InterviewAvailabilityRule_chapterId_isActive_idx"
ON "InterviewAvailabilityRule"("chapterId", "isActive");

-- CreateIndex
CREATE INDEX "InterviewAvailabilityRule_scope_isActive_idx"
ON "InterviewAvailabilityRule"("scope", "isActive");

-- CreateIndex
CREATE INDEX "InterviewAvailabilityOverride_interviewerId_isActive_startsAt_idx"
ON "InterviewAvailabilityOverride"("interviewerId", "isActive", "startsAt");

-- CreateIndex
CREATE INDEX "InterviewAvailabilityOverride_chapterId_isActive_startsAt_idx"
ON "InterviewAvailabilityOverride"("chapterId", "isActive", "startsAt");

-- CreateIndex
CREATE INDEX "InterviewAvailabilityOverride_ruleId_idx"
ON "InterviewAvailabilityOverride"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSchedulingRequest_conversationId_key"
ON "InterviewSchedulingRequest"("conversationId");

-- CreateIndex
CREATE INDEX "InterviewSchedulingRequest_domain_status_idx"
ON "InterviewSchedulingRequest"("domain", "status");

-- CreateIndex
CREATE INDEX "InterviewSchedulingRequest_chapterId_status_createdAt_idx"
ON "InterviewSchedulingRequest"("chapterId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewSchedulingRequest_intervieweeId_status_idx"
ON "InterviewSchedulingRequest"("intervieweeId", "status");

-- CreateIndex
CREATE INDEX "InterviewSchedulingRequest_interviewerId_status_idx"
ON "InterviewSchedulingRequest"("interviewerId", "status");

-- CreateIndex
CREATE INDEX "InterviewSchedulingRequest_applicationId_status_idx"
ON "InterviewSchedulingRequest"("applicationId", "status");

-- CreateIndex
CREATE INDEX "InterviewSchedulingRequest_gateId_status_idx"
ON "InterviewSchedulingRequest"("gateId", "status");

-- AddForeignKey
ALTER TABLE "InterviewAvailabilityRule"
ADD CONSTRAINT "InterviewAvailabilityRule_interviewerId_fkey"
FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAvailabilityRule"
ADD CONSTRAINT "InterviewAvailabilityRule_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAvailabilityOverride"
ADD CONSTRAINT "InterviewAvailabilityOverride_interviewerId_fkey"
FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAvailabilityOverride"
ADD CONSTRAINT "InterviewAvailabilityOverride_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAvailabilityOverride"
ADD CONSTRAINT "InterviewAvailabilityOverride_ruleId_fkey"
FOREIGN KEY ("ruleId") REFERENCES "InterviewAvailabilityRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedulingRequest"
ADD CONSTRAINT "InterviewSchedulingRequest_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedulingRequest"
ADD CONSTRAINT "InterviewSchedulingRequest_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedulingRequest"
ADD CONSTRAINT "InterviewSchedulingRequest_gateId_fkey"
FOREIGN KEY ("gateId") REFERENCES "InstructorInterviewGate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedulingRequest"
ADD CONSTRAINT "InterviewSchedulingRequest_intervieweeId_fkey"
FOREIGN KEY ("intervieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedulingRequest"
ADD CONSTRAINT "InterviewSchedulingRequest_interviewerId_fkey"
FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedulingRequest"
ADD CONSTRAINT "InterviewSchedulingRequest_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSchedulingRequest"
ADD CONSTRAINT "InterviewSchedulingRequest_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
