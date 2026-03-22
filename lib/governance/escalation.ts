"use server";

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

/**
 * Evaluate all active OpsRules against the latest snapshots.
 * Creates violations and sends notifications for breaches.
 */
export async function evaluateOpsRules() {
  const rules = await prisma.opsRule.findMany({
    where: { status: "ACTIVE" },
    include: { chapter: { select: { id: true, name: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const violations: string[] = [];

  for (const rule of rules) {
    // Get chapters to evaluate
    const chapterIds = rule.chapterId
      ? [rule.chapterId]
      : (await prisma.chapter.findMany({ select: { id: true } })).map((c) => c.id);

    for (const chapterId of chapterIds) {
      const snapshot = await prisma.chapterKpiSnapshot.findFirst({
        where: { chapterId },
        orderBy: { snapshotDate: "desc" },
      });

      if (!snapshot) continue;

      const actualValue = getMetricValue(snapshot, rule.metricKey);
      if (actualValue === null) continue;

      const breached = evaluateThreshold(actualValue, rule.operator, rule.thresholdValue);
      if (!breached) continue;

      // Check if violation already exists for today
      const existing = await prisma.opsRuleViolation.findFirst({
        where: {
          ruleId: rule.id,
          chapterId,
          snapshotDate: today,
        },
      });

      if (existing) continue;

      await prisma.opsRuleViolation.create({
        data: {
          ruleId: rule.id,
          chapterId,
          actualValue,
          thresholdValue: rule.thresholdValue,
          snapshotDate: today,
        },
      });

      violations.push(`${rule.name} breached for chapter ${chapterId}`);

      // Send notifications to escalation roles
      if (rule.autoNotify && rule.escalateToRoles.length > 0) {
        const chapter = await prisma.chapter.findUnique({
          where: { id: chapterId },
          select: { name: true },
        });

        const users = await prisma.user.findMany({
          where: {
            OR: [
              { chapterId, roles: { some: { role: { in: rule.escalateToRoles as any } } } },
              { roles: { some: { role: "ADMIN" } } },
            ],
          },
          select: { id: true },
          take: 20,
        });

        const severityLabel = rule.severity === "CRITICAL" ? "CRITICAL" : "Warning";
        for (const user of users) {
          await createNotification({
            userId: user.id,
            type: "SYSTEM",
            title: `[${severityLabel}] ${rule.name}`,
            body: `${chapter?.name ?? "Unknown Chapter"}: ${rule.metricKey} is ${actualValue} (threshold: ${rule.operator} ${rule.thresholdValue})`,
            link: "/admin/governance",
          });
        }
      }
    }
  }

  return { evaluated: rules.length, violations };
}

function getMetricValue(
  snapshot: {
    activeStudents: number;
    activeInstructors: number;
    pendingApplications: number;
    overdueQueues: number;
    avgResponseHours: number | null;
    classesRunningCount: number;
    enrollmentFillPercent: number | null;
    mentorshipPairCount: number;
  },
  metricKey: string
): number | null {
  switch (metricKey) {
    case "active_students":
      return snapshot.activeStudents;
    case "active_instructors":
      return snapshot.activeInstructors;
    case "pending_applications":
      return snapshot.pendingApplications;
    case "overdue_queues":
      return snapshot.overdueQueues;
    case "avg_response_hours":
      return snapshot.avgResponseHours;
    case "classes_running":
      return snapshot.classesRunningCount;
    case "enrollment_fill_percent":
      return snapshot.enrollmentFillPercent;
    case "mentorship_pairs":
      return snapshot.mentorshipPairCount;
    default:
      return null;
  }
}

function evaluateThreshold(actual: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case "gt":
      return actual > threshold;
    case "gte":
      return actual >= threshold;
    case "lt":
      return actual < threshold;
    case "lte":
      return actual <= threshold;
    case "eq":
      return actual === threshold;
    default:
      return false;
  }
}
