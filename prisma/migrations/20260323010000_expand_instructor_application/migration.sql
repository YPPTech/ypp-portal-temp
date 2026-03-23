-- Migration: expand_instructor_application
-- Adds comprehensive fields to InstructorApplication for full Google Form parity
-- plus academic info, essays, referral, availability details, and reviewer scoring rubric.

-- Personal Information
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "legalName"          TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "preferredFirstName" TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "phoneNumber"        TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "dateOfBirth"        TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "hearAboutYPP"       TEXT;

-- Location (from Google Form)
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "city"              TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "stateProvince"     TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "zipCode"           TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "country"           TEXT;

-- Academic Background
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "schoolName"          TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "graduationYear"      INTEGER;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "gpa"                TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "classRank"           TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "subjectsOfInterest" TEXT;

-- Essays & Background
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "whyYPP"          TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "extracurriculars" TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "priorLeadership"  TEXT;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "specialSkills"    TEXT;

-- Referral
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "referralEmails" TEXT;

-- Availability details
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "hoursPerWeek"       INTEGER;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "preferredStartDate" TEXT;

-- Optional demographics
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "ethnicity" TEXT;

-- Reviewer scoring rubric (1-5 scale per dimension)
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "scoreAcademic"      INTEGER;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "scoreCommunication" INTEGER;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "scoreLeadership"    INTEGER;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "scoreMotivation"    INTEGER;
ALTER TABLE "InstructorApplication" ADD COLUMN IF NOT EXISTS "scoreFit"           INTEGER;

-- Indexes for new filterable columns
CREATE INDEX IF NOT EXISTS "InstructorApplication_graduationYear_idx" ON "InstructorApplication"("graduationYear");
CREATE INDEX IF NOT EXISTS "InstructorApplication_stateProvince_idx"  ON "InstructorApplication"("stateProvince");
