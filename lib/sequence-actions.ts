"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  getClassTemplateCapabilities,
  getClassTemplateSelect,
} from "@/lib/class-template-compat";
import {
  hasAdvancedSequenceBuilderSchema,
  hasPathwayCohortTable,
} from "@/lib/schema-compat";
import { assertCanPublishInstructorContent } from "@/lib/instructor-readiness";
import {
  type SequenceBlueprint,
  type SequenceStepDetails,
  normalizeSequenceBlueprint,
  normalizeSequenceStepDetails,
} from "@/lib/instructor-builder-blueprints";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireInstructor() {
  const session = await getServerSession(authOptions);
  const roles = session?.user?.roles ?? [];
  if (
    !session?.user?.id ||
    (!roles.includes("ADMIN") &&
      !roles.includes("INSTRUCTOR") &&
      !roles.includes("CHAPTER_LEAD"))
  ) {
    throw new Error("Unauthorized – instructor role required");
  }
  return session;
}

function getString(formData: FormData, key: string, required = true): string {
  const value = formData.get(key);
  if (required && (!value || String(value).trim() === "")) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value ? String(value).trim() : "";
}

function parseSequenceBlueprint(formData: FormData): SequenceBlueprint | null {
  const raw = getString(formData, "sequenceBlueprint", false);
  if (!raw) return null;

  try {
    return normalizeSequenceBlueprint(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseStepDetails(formData: FormData): SequenceStepDetails | null {
  const raw = getString(formData, "stepDetails", false);
  if (!raw) return null;

  try {
    return normalizeSequenceStepDetails(JSON.parse(raw));
  } catch {
    return null;
  }
}

// ─── Sequence (Pathway) CRUD ──────────────────────────────────────────────────

export async function createSequence(formData: FormData) {
  const session = await requireInstructor();
  const supportsAdvancedSchema = await hasAdvancedSequenceBuilderSchema();

  const name = getString(formData, "name");
  const description = getString(formData, "description", false) || "Instructor-created sequence";
  const interestArea = getString(formData, "interestArea", false) || "General";
  const sequenceBlueprint = parseSequenceBlueprint(formData);

  const pathway = await prisma.pathway.create({
    data: {
      name,
      description,
      interestArea,
      ...(supportsAdvancedSchema && sequenceBlueprint
        ? { sequenceBlueprint: sequenceBlueprint as Prisma.InputJsonValue }
        : {}),
      isActive: false,
      createdById: session.user.id,
    },
  });

  revalidatePath("/instructor/sequence-builder");
  return { success: true, sequenceId: pathway.id };
}

export async function updateSequence(id: string, formData: FormData) {
  const session = await requireInstructor();
  const supportsAdvancedSchema = await hasAdvancedSequenceBuilderSchema();

  const pathway = await prisma.pathway.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!pathway) throw new Error("Sequence not found");
  if (
    pathway.createdById !== session.user.id &&
    !(session.user.roles ?? []).includes("ADMIN")
  ) {
    throw new Error("Not authorized to edit this sequence");
  }

  const name = getString(formData, "name");
  const description = getString(formData, "description", false);
  const interestArea = getString(formData, "interestArea", false);
  const sequenceBlueprint = parseSequenceBlueprint(formData);

  await prisma.pathway.update({
    where: { id },
    data: {
      name,
      description: description || undefined,
      ...(interestArea ? { interestArea } : {}),
      ...(supportsAdvancedSchema && sequenceBlueprint
        ? { sequenceBlueprint: sequenceBlueprint as Prisma.InputJsonValue }
        : {}),
    },
  });

  revalidatePath("/instructor/sequence-builder");
  return { success: true };
}

export async function deleteSequence(id: string) {
  const session = await requireInstructor();

  const pathway = await prisma.pathway.findUnique({
    where: { id },
    select: { createdById: true },
  });
  if (!pathway) throw new Error("Sequence not found");
  if (
    pathway.createdById !== session.user.id &&
    !(session.user.roles ?? []).includes("ADMIN")
  ) {
    throw new Error("Not authorized");
  }

  await prisma.pathway.delete({ where: { id } });
  revalidatePath("/instructor/sequence-builder");
  return { success: true };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function addSequenceStep(pathwayId: string, formData: FormData) {
  await requireInstructor();
  const supportsAdvancedSchema = await hasAdvancedSequenceBuilderSchema();

  // Exactly one content pointer should be set
  const classTemplateId = getString(formData, "classTemplateId", false) || null;
  const specialProgramId = getString(formData, "specialProgramId", false) || null;
  const title = getString(formData, "title", false) || null;
  const unlockTypeRaw = getString(formData, "unlockType", false) || "AUTO";
  const unlockType = unlockTypeRaw === "MANUAL" ? "MANUAL" : "AUTO";
  const stepDetails = parseStepDetails(formData);

  if (!classTemplateId && !specialProgramId && !title) {
    throw new Error("Step must have a ClassTemplate, PassionLab, or standalone title");
  }

  // Get current max stepOrder
  const last = await prisma.pathwayStep.findFirst({
    where: { pathwayId },
    orderBy: { stepOrder: "desc" },
    select: { stepOrder: true },
  });
  const stepOrder = (last?.stepOrder ?? -1) + 1;

  const step = await prisma.pathwayStep.create({
    data: {
      pathwayId,
      stepOrder,
      unlockType: unlockType as "AUTO" | "MANUAL",
      classTemplateId,
      specialProgramId,
      title,
      ...(supportsAdvancedSchema && stepDetails
        ? { stepDetails: stepDetails as Prisma.InputJsonValue }
        : {}),
      courseId: null,
    },
  });

  revalidatePath("/instructor/sequence-builder");
  return { success: true, stepId: step.id };
}

export async function deleteSequenceStep(stepId: string) {
  await requireInstructor();

  const step = await prisma.pathwayStep.findUnique({
    where: { id: stepId },
    select: { pathwayId: true },
  });
  if (!step) throw new Error("Step not found");

  await prisma.pathwayStep.delete({ where: { id: stepId } });

  // Renumber remaining steps
  const remaining = await prisma.pathwayStep.findMany({
    where: { pathwayId: step.pathwayId },
    orderBy: { stepOrder: "asc" },
    select: { id: true },
  });

  await prisma.$transaction(
    remaining.map((s, idx) =>
      prisma.pathwayStep.update({ where: { id: s.id }, data: { stepOrder: idx } })
    )
  );

  revalidatePath("/instructor/sequence-builder");
  return { success: true };
}

export async function reorderSequenceStep(stepId: string, direction: "up" | "down") {
  await requireInstructor();

  const step = await prisma.pathwayStep.findUnique({
    where: { id: stepId },
    select: { id: true, pathwayId: true, stepOrder: true },
  });
  if (!step) throw new Error("Step not found");

  const sibling = await prisma.pathwayStep.findFirst({
    where: {
      pathwayId: step.pathwayId,
      stepOrder: direction === "up" ? step.stepOrder - 1 : step.stepOrder + 1,
    },
    select: { id: true, stepOrder: true },
  });

  if (!sibling) return { success: true }; // Already at boundary

  await prisma.$transaction([
    prisma.pathwayStep.update({
      where: { id: step.id },
      data: { stepOrder: sibling.stepOrder },
    }),
    prisma.pathwayStep.update({
      where: { id: sibling.id },
      data: { stepOrder: step.stepOrder },
    }),
  ]);

  revalidatePath("/instructor/sequence-builder");
  return { success: true };
}

export async function setStepUnlockType(
  stepId: string,
  unlockType: "AUTO" | "MANUAL"
) {
  await requireInstructor();

  await prisma.pathwayStep.update({
    where: { id: stepId },
    data: { unlockType },
  });

  revalidatePath("/instructor/sequence-builder");
  return { success: true };
}

export async function publishSequence(pathwayId: string) {
  const session = await requireInstructor();

  const pathway = await prisma.pathway.findUnique({
    where: { id: pathwayId },
    select: { createdById: true },
  });
  if (!pathway) throw new Error("Sequence not found");
  if (
    pathway.createdById !== session.user.id &&
    !(session.user.roles ?? []).includes("ADMIN")
  ) {
    throw new Error("Not authorized");
  }

  const stepCount = await prisma.pathwayStep.count({ where: { pathwayId } });
  if (stepCount === 0) throw new Error("Add at least one step before publishing");

  await assertCanPublishInstructorContent(pathway.createdById ?? session.user.id);

  await prisma.pathway.update({ where: { id: pathwayId }, data: { isActive: true } });

  revalidatePath("/instructor/sequence-builder");
  return { success: true };
}

// ─── Student progression ──────────────────────────────────────────────────────

/**
 * Advance a student to the next step in a sequence.
 * For AUTO steps: always advances if previous step is complete.
 * For MANUAL steps: only advances if instructor has unlocked for this student.
 */
export async function advanceStudentInSequence(userId: string, pathwayId: string) {
  await requireInstructor();
  const capabilities = await getClassTemplateCapabilities();

  const steps = await prisma.pathwayStep.findMany({
    where: { pathwayId },
    orderBy: { stepOrder: "asc" },
    include: {
      classTemplate: {
        select: {
          ...getClassTemplateSelect({
            includeWorkflow: capabilities.hasReviewWorkflow,
          }),
          offerings: {
            where: { status: "PUBLISHED" },
            orderBy: { startDate: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  for (const step of steps) {
    // Check if user already enrolled in this step
    if (step.classTemplateId && step.classTemplate) {
      const offering = step.classTemplate.offerings[0];
      if (!offering) continue;

      const enrolled = await prisma.classEnrollment.findUnique({
        where: { studentId_offeringId: { studentId: userId, offeringId: offering.id } },
      });
      if (enrolled) continue; // already in this step

      // Check MANUAL unlock
      if (step.unlockType === "MANUAL") {
        const unlock = await prisma.pathwayStepUnlock.findUnique({
          where: { stepId_userId: { stepId: step.id, userId } },
        });
        if (!unlock) return { success: false, reason: "Step requires manual unlock" };
      }

      await prisma.classEnrollment.create({
        data: { studentId: userId, offeringId: offering.id, status: "ENROLLED" },
      });
      return { success: true, enrolledIn: "offering", offeringId: offering.id };
    }

    if (step.specialProgramId) {
      const enrolled = await prisma.specialProgramEnrollment.findUnique({
        where: { programId_userId: { programId: step.specialProgramId, userId } },
      });
      if (enrolled) continue;

      if (step.unlockType === "MANUAL") {
        const unlock = await prisma.pathwayStepUnlock.findUnique({
          where: { stepId_userId: { stepId: step.id, userId } },
        });
        if (!unlock) return { success: false, reason: "Step requires manual unlock" };
      }

      await prisma.specialProgramEnrollment.create({
        data: { programId: step.specialProgramId, userId },
      });
      return { success: true, enrolledIn: "program", programId: step.specialProgramId };
    }

    // Standalone title step — no enrollment, just mark as unlocked if MANUAL
    if (step.title && step.unlockType === "MANUAL") {
      const unlock = await prisma.pathwayStepUnlock.findUnique({
        where: { stepId_userId: { stepId: step.id, userId } },
      });
      if (!unlock) return { success: false, reason: "Step requires manual unlock" };
    }
  }

  return { success: true, enrolledIn: "none" };
}

export async function manuallyUnlockStep(stepId: string, userId: string) {
  await requireInstructor();

  await prisma.pathwayStepUnlock.upsert({
    where: { stepId_userId: { stepId, userId } },
    create: { stepId, userId },
    update: {},
  });

  return { success: true };
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getInstructorSequences() {
  const session = await requireInstructor();
  const capabilities = await getClassTemplateCapabilities();
  const [canCountCohorts, supportsAdvancedSchema] = await Promise.all([
    hasPathwayCohortTable(),
    hasAdvancedSequenceBuilderSchema(),
  ]);

  const sequences = await prisma.pathway.findMany({
    where: { createdById: session.user.id },
    select: {
      id: true,
      name: true,
      description: true,
      interestArea: true,
      isActive: true,
      createdAt: true,
      ...(supportsAdvancedSchema ? { sequenceBlueprint: true } : {}),
      steps: {
        orderBy: { stepOrder: "asc" },
        select: {
          id: true,
          stepOrder: true,
          unlockType: true,
          title: true,
          classTemplateId: true,
          specialProgramId: true,
          ...(supportsAdvancedSchema ? { stepDetails: true } : {}),
          classTemplate: {
            select: getClassTemplateSelect({
              includeWorkflow: capabilities.hasReviewWorkflow,
            }),
          },
          specialProgram: { select: { id: true, name: true, type: true } },
        },
      },
      ...(canCountCohorts ? { _count: { select: { cohorts: true } } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!supportsAdvancedSchema) {
    return sequences;
  }

  return sequences.map((sequence) => ({
    ...sequence,
    sequenceBlueprint: normalizeSequenceBlueprint(sequence.sequenceBlueprint),
    steps: sequence.steps.map((step) => ({
      ...step,
      stepDetails: normalizeSequenceStepDetails(step.stepDetails),
    })),
  }));
}
