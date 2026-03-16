-- CreateTable
CREATE TABLE "ClassAnnouncement" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassAnnouncement_offeringId_createdAt_idx" ON "ClassAnnouncement"("offeringId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassAnnouncement_authorId_idx" ON "ClassAnnouncement"("authorId");

-- AddForeignKey
ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ClassOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAnnouncement" ADD CONSTRAINT "ClassAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
