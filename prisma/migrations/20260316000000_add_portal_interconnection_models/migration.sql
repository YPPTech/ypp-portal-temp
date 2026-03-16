-- CreateTable
CREATE TABLE "PortalUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedBy" TEXT,
    "unlockerUserId" TEXT,

    CONSTRAINT "PortalUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockRecommendation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "UnlockRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nudge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "context" JSONB,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nudge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyMilestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestoneKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "reachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalUnlock_userId_sectionKey_key" ON "PortalUnlock"("userId", "sectionKey");

-- CreateIndex
CREATE INDEX "PortalUnlock_userId_idx" ON "PortalUnlock"("userId");

-- CreateIndex
CREATE INDEX "UnlockRecommendation_studentId_status_idx" ON "UnlockRecommendation"("studentId", "status");

-- CreateIndex
CREATE INDEX "UnlockRecommendation_mentorId_idx" ON "UnlockRecommendation"("mentorId");

-- CreateIndex
CREATE INDEX "Nudge_userId_isDismissed_createdAt_idx" ON "Nudge"("userId", "isDismissed", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JourneyMilestone_userId_milestoneKey_key" ON "JourneyMilestone"("userId", "milestoneKey");

-- CreateIndex
CREATE INDEX "JourneyMilestone_userId_idx" ON "JourneyMilestone"("userId");

-- AddForeignKey
ALTER TABLE "PortalUnlock" ADD CONSTRAINT "PortalUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockRecommendation" ADD CONSTRAINT "UnlockRecommendation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockRecommendation" ADD CONSTRAINT "UnlockRecommendation_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nudge" ADD CONSTRAINT "Nudge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyMilestone" ADD CONSTRAINT "JourneyMilestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
