"use server";

/**
 * Curriculum Draft Actions — server actions for the Curriculum Builder Studio.
 * Handles creating, auto-saving, and submitting curriculum drafts.
 * Allows APPLICANT role so instructor applicants can build curricula during training.
 */

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { TrainingModuleType } from "@prisma/client";
import {
  DEFAULT_COURSE_CONFIG,
  buildUnderstandingChecksState,
  emptyReviewRubric,
  getCurriculumDraftProgress,
  normalizeCourseConfig,
  normalizeUnderstandingChecks,
} from "@/lib/curriculum-draft-progress";
import { syncTrainingAssignmentFromArtifacts } from "@/lib/training-actions";

const LESSON_DESIGN_STUDIO_MODULE_KEY = "academy_lesson_studio_006";
const LESSON_DESIGN_STUDIO_TOUR_KEY = "studio_onboarding_tour";

async function requireStudioAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = session.user.roles ?? [];
  const allowed =
    roles.includes("INSTRUCTOR") ||
    roles.includes("ADMIN") ||
    roles.includes("CHAPTER_LEAD") ||
    roles.includes("APPLICANT");
  if (!allowed) throw new Error("Studio access requires Instructor or Applicant role");
  return session;
}

function revalidateStudioAndTrainingSurfaces(moduleIds: string[] = []) {
  revalidatePath("/instructor/lesson-design-studio");
  revalidatePath("/instructor-training");
  revalidatePath("/student-training");
  revalidatePath("/instructor/training-progress");
  revalidatePath("/instructor/workspace");
  for (const moduleId of moduleIds) {
    revalidatePath(`/training/${moduleId}`);
  }
}

async function getLessonDesignStudioModules() {
  return prisma.trainingModule.findMany({
    where: {
      OR: [
        { contentKey: LESSON_DESIGN_STUDIO_MODULE_KEY },
        { type: TrainingModuleType.CURRICULUM_REVIEW },
      ],
    },
    select: {
      id: true,
      checkpoints: {
        select: {
          id: true,
          contentKey: true,
        },
      },
    },
  });
}

async function upsertCheckpointCompletion(checkpointId: string, userId: string, notes?: string) {
  await prisma.trainingCheckpointCompletion.upsert({
    where: {
      checkpointId_userId: { checkpointId, userId },
    },
    create: {
      checkpointId,
      userId,
      notes: notes || null,
    },
    update: {
      notes: notes || undefined,
      completedAt: new Date(),
    },
  });
}

async function deleteCheckpointCompletion(checkpointId: string, userId: string) {
  await prisma.trainingCheckpointCompletion.deleteMany({
    where: {
      checkpointId,
      userId,
    },
  });
}

async function ensureLessonDesignStudioEvidenceSubmission(
  userId: string,
  moduleId: string,
  draft: {
    id: string;
    title: string;
    status: string;
  }
) {
  if (draft.status !== "SUBMITTED") return;

  const fileUrl = `/instructor/lesson-design-studio/print?draftId=${draft.id}&type=instructor`;
  const existing = await prisma.trainingEvidenceSubmission.findFirst({
    where: {
      userId,
      moduleId,
      fileUrl,
    },
    select: { id: true },
  });

  if (existing) return;

  await prisma.trainingEvidenceSubmission.create({
    data: {
      moduleId,
      userId,
      fileUrl,
      notes: draft.title
        ? `Submitted automatically from Lesson Design Studio: ${draft.title}`
        : "Submitted automatically from Lesson Design Studio",
      status: "PENDING_REVIEW",
    },
  });
}

async function syncLessonDesignStudioTrainingArtifacts(
  userId: string,
  draft: {
    id: string;
    title: string;
    interestArea: string;
    outcomes: string[];
    courseConfig?: unknown;
    weeklyPlans: unknown;
    understandingChecks?: unknown;
    status: string;
  },
  options?: {
    tourCompleted?: boolean;
  }
) {
  const modules = await getLessonDesignStudioModules();
  if (modules.length === 0) return;

  const progress = getCurriculumDraftProgress({
    title: draft.title,
    interestArea: draft.interestArea,
    outcomes: draft.outcomes,
    courseConfig: draft.courseConfig,
    weeklyPlans: draft.weeklyPlans,
    understandingChecks: draft.understandingChecks,
  });

  for (const trainingModule of modules) {
    const checkpointByKey = new Map(
      trainingModule.checkpoints
        .filter((checkpoint) => checkpoint.contentKey)
        .map((checkpoint) => [checkpoint.contentKey as string, checkpoint.id])
    );

    const syncCheckpoint = async (contentKey: string, completed: boolean) => {
      const checkpointId = checkpointByKey.get(contentKey);
      if (!checkpointId) return;

      if (completed) {
        await upsertCheckpointCompletion(checkpointId, userId);
      } else {
        await deleteCheckpointCompletion(checkpointId, userId);
      }
    };

    if (options?.tourCompleted) {
      const checkpointId = checkpointByKey.get(LESSON_DESIGN_STUDIO_TOUR_KEY);
      if (checkpointId) {
        await upsertCheckpointCompletion(checkpointId, userId, "Completed from the Lesson Design Studio onboarding tour.");
      }
    }

    await syncCheckpoint("studio_first_week", progress.hasFirstWeekWithThreeActivities);
    await syncCheckpoint("studio_week_objective", progress.hasAnyObjective);
    await syncCheckpoint("studio_at_home_assignment", progress.hasAnyAtHomeAssignment);
    await ensureLessonDesignStudioEvidenceSubmission(
      userId,
      trainingModule.id,
      draft
    );
    await syncTrainingAssignmentFromArtifacts(userId, trainingModule.id);
  }

  revalidateStudioAndTrainingSurfaces(modules.map((module) => module.id));
}

/**
 * Get the user's existing curriculum draft, or create a new one if none exists.
 */
export async function getOrCreateCurriculumDraft() {
  const session = await requireStudioAccess();

  let draft = await prisma.curriculumDraft.findFirst({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  if (!draft) {
    draft = await prisma.curriculumDraft.create({
      data: {
        authorId: session.user.id,
        title: "",
        description: null,
        interestArea: "",
        outcomes: [],
        courseConfig: DEFAULT_COURSE_CONFIG as any,
        weeklyPlans: JSON.parse("[]"),
        understandingChecks: buildUnderstandingChecksState({}) as any,
        reviewRubric: emptyReviewRubric() as any,
        status: "IN_PROGRESS",
      },
    });
  }

  await syncLessonDesignStudioTrainingArtifacts(session.user.id, draft);
  return draft;
}

/**
 * Auto-save the curriculum draft. Called on a debounce from the client.
 */
export async function saveCurriculumDraft(data: {
  draftId: string;
  title: string;
  description: string;
  interestArea: string;
  outcomes: string[];
  courseConfig: unknown;
  weeklyPlans: unknown[];
  understandingChecks: unknown;
}) {
  const session = await requireStudioAccess();

  const existing = await prisma.curriculumDraft.findUnique({
    where: { id: data.draftId },
    select: { authorId: true, status: true },
  });

  if (!existing || existing.authorId !== session.user.id) {
    throw new Error("Draft not found or unauthorized");
  }

  const progress = getCurriculumDraftProgress({
    title: data.title,
    interestArea: data.interestArea,
    outcomes: data.outcomes,
    courseConfig: data.courseConfig,
    weeklyPlans: data.weeklyPlans,
    understandingChecks: data.understandingChecks,
  });

  const nextStatus =
    existing.status === "APPROVED" ||
    existing.status === "REJECTED" ||
    existing.status === "SUBMITTED" ||
    existing.status === "NEEDS_REVISION"
      ? existing.status
      : progress.readyForSubmission
        ? "COMPLETED"
        : "IN_PROGRESS";

  const draft = await prisma.curriculumDraft.update({
    where: { id: data.draftId },
    data: {
      title: data.title,
      description: data.description || null,
      interestArea: data.interestArea,
      outcomes: data.outcomes,
      courseConfig: normalizeCourseConfig(data.courseConfig) as any,
      weeklyPlans: data.weeklyPlans as any,
      understandingChecks: normalizeUnderstandingChecks(
        data.understandingChecks
      ) as any,
      status: nextStatus,
      completedAt: nextStatus === "IN_PROGRESS" ? null : new Date(),
      updatedAt: new Date(),
    },
  });

  await syncLessonDesignStudioTrainingArtifacts(session.user.id, draft);
  return { success: true };
}

/**
 * Mark the curriculum draft as completed/submitted.
 */
export async function submitCurriculumDraft(draftId: string) {
  const session = await requireStudioAccess();

  const existing = await prisma.curriculumDraft.findUnique({
    where: { id: draftId },
    select: {
      authorId: true,
      title: true,
      interestArea: true,
      outcomes: true,
      courseConfig: true,
      weeklyPlans: true,
      understandingChecks: true,
      status: true,
    },
  });

  if (!existing || existing.authorId !== session.user.id) {
    throw new Error("Draft not found or unauthorized");
  }

  if (existing.status === "APPROVED") {
    throw new Error("This curriculum has already been approved and moved into launch.");
  }

  const progress = getCurriculumDraftProgress({
    title: existing.title,
    interestArea: existing.interestArea,
    outcomes: existing.outcomes,
    courseConfig: existing.courseConfig,
    weeklyPlans: existing.weeklyPlans,
    understandingChecks: existing.understandingChecks,
  });

  if (!progress.readyForSubmission) {
    throw new Error(`Before submitting, finish these items: ${progress.submissionIssues.join(" ")}`);
  }

  const draft = await prisma.curriculumDraft.update({
    where: { id: draftId },
    data: {
      status: "SUBMITTED",
      completedAt: new Date(),
      submittedAt: new Date(),
    },
  });

  await syncLessonDesignStudioTrainingArtifacts(session.user.id, draft);
  return { success: true };
}

export async function markLessonDesignStudioTourComplete() {
  const session = await requireStudioAccess();
  const draft = await getOrCreateCurriculumDraft();
  await syncLessonDesignStudioTrainingArtifacts(session.user.id, draft, {
    tourCompleted: true,
  });
  return { success: true };
}

/**
 * Load a curriculum draft by ID (for the print page).
 */
export async function getCurriculumDraftById(draftId: string) {
  const session = await requireStudioAccess();

  const draft = await prisma.curriculumDraft.findUnique({
    where: { id: draftId },
    include: {
      author: { select: { name: true } },
    },
  });

  if (!draft) return null;

  const roles = session.user.roles ?? [];
  if (draft.authorId !== session.user.id && !roles.includes("ADMIN")) {
    return null;
  }

  return draft;
}
