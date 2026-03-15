-- Migration: add_instructor_applicant_flow
-- Adds APPLICANT role, InstructorApplicationStatus enum, and InstructorApplication table
-- to support the new pre-training applicant gate before becoming an INSTRUCTOR.

-- Add APPLICANT to RoleType enum
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'APPLICANT';

-- Add InstructorApplicationStatus enum
CREATE TYPE "InstructorApplicationStatus" AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'INFO_REQUESTED',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_COMPLETED',
  'APPROVED',
  'REJECTED'
);

-- Create InstructorApplication table
CREATE TABLE "InstructorApplication" (
    "id"                   TEXT NOT NULL,
    "applicantId"          TEXT NOT NULL,
    "status"               "InstructorApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "motivation"           TEXT NOT NULL,
    "teachingExperience"   TEXT NOT NULL,
    "availability"         TEXT NOT NULL,
    "reviewerId"           TEXT,
    "reviewerNotes"        TEXT,
    "infoRequest"          TEXT,
    "applicantResponse"    TEXT,
    "rejectionReason"      TEXT,
    "interviewScheduledAt" TIMESTAMP(3),
    "approvedAt"           TIMESTAMP(3),
    "rejectedAt"           TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorApplication_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one application per user
CREATE UNIQUE INDEX "InstructorApplication_applicantId_key" ON "InstructorApplication"("applicantId");

-- Indexes for common queries
CREATE INDEX "InstructorApplication_status_idx" ON "InstructorApplication"("status");
CREATE INDEX "InstructorApplication_reviewerId_idx" ON "InstructorApplication"("reviewerId");

-- Foreign key: applicant
ALTER TABLE "InstructorApplication"
    ADD CONSTRAINT "InstructorApplication_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign key: reviewer (nullable)
ALTER TABLE "InstructorApplication"
    ADD CONSTRAINT "InstructorApplication_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
