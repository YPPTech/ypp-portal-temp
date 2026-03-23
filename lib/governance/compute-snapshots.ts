"use server";

import { prisma } from "@/lib/prisma";

/**
 * Compute and store a KPI snapshot for every chapter.
 * Designed to run once per day (cron or manual trigger).
 */
export async function computeAllChapterSnapshots() {
  const chapters = await prisma.chapter.findMany({
    select: { id: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: { chapterId: string; isAtRisk: boolean; riskFlags: string[] }[] = [];

  for (const chapter of chapters) {
    const result = await computeChapterSnapshot(chapter.id, today);
    results.push(result);
  }

  return results;
}

export async function computeChapterSnapshot(chapterId: string, snapshotDate: Date) {
  const [
    activeStudents,
    activeInstructors,
    pendingApplications,
    overdueQueues,
    classesRunning,
    enrollmentStats,
    mentorshipPairCount,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        chapterId,
        roles: { some: { role: "STUDENT" } },
      },
    }),
    prisma.user.count({
      where: {
        chapterId,
        roles: { some: { role: "INSTRUCTOR" } },
      },
    }),
    prisma.application.count({
      where: {
        position: { chapterId },
        decision: null,
        status: { notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN"] },
      },
    }),
    // Count queue items older than 7 days without action
    prisma.application.count({
      where: {
        position: { chapterId },
        decision: null,
        status: { notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN"] },
        submittedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.classOffering
      .count({
        where: {
          chapterId,
          status: "PUBLISHED",
        },
      })
      .catch(() => 0),
    prisma.classOffering
      .findMany({
        where: {
          chapterId,
          status: "PUBLISHED",
        },
        select: {
          capacity: true,
          _count: { select: { enrollments: true } },
        },
      })
      .catch(() => [] as { capacity: number; _count: { enrollments: number } }[]),
    prisma.mentorshipTrack
      .count({
        where: {
          chapterId,
          isActive: true,
        },
      })
      .catch(() => 0),
  ]);

  // Calculate enrollment fill percent
  let enrollmentFillPercent: number | null = null;
  if (Array.isArray(enrollmentStats) && enrollmentStats.length > 0) {
    const totalCapacity = enrollmentStats.reduce((sum, o) => sum + (o.capacity || 0), 0);
    const totalEnrolled = enrollmentStats.reduce((sum, o) => sum + o._count.enrollments, 0);
    enrollmentFillPercent = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : null;
  }

  // Determine risk flags
  const riskFlags: string[] = [];
  if (activeInstructors === 0 && activeStudents > 0) riskFlags.push("no_active_instructors");
  if (overdueQueues >= 5) riskFlags.push("overdue_queues_high");
  if (pendingApplications >= 15) riskFlags.push("pending_applications_backlog");
  if (classesRunning === 0 && activeStudents > 3) riskFlags.push("no_running_classes");
  if (enrollmentFillPercent !== null && enrollmentFillPercent < 25) riskFlags.push("low_enrollment");
  if (mentorshipPairCount === 0 && activeStudents > 5) riskFlags.push("no_mentorship_pairs");

  const isAtRisk = riskFlags.length > 0;

  const snapshot = await prisma.chapterKpiSnapshot.upsert({
    where: {
      chapterId_snapshotDate: { chapterId, snapshotDate },
    },
    update: {
      activeStudents,
      activeInstructors,
      pendingApplications,
      overdueQueues,
      classesRunningCount: classesRunning,
      enrollmentFillPercent,
      mentorshipPairCount,
      isAtRisk,
      riskFlags,
    },
    create: {
      chapterId,
      snapshotDate,
      activeStudents,
      activeInstructors,
      pendingApplications,
      overdueQueues,
      classesRunningCount: classesRunning,
      enrollmentFillPercent,
      mentorshipPairCount,
      isAtRisk,
      riskFlags,
    },
  });

  return { chapterId: snapshot.chapterId, isAtRisk, riskFlags };
}
