import type { CurriculumDraftProgress } from "@/lib/curriculum-draft-progress";

export type LessonDesignStudioPhase =
  | "EMPTY"
  | "BUILDING"
  | "READY_TO_REVIEW"
  | "SUBMITTED"
  | "LAUNCH_READY";

export type LessonDesignStudioEntryContext =
  | "START"
  | "CONTINUE"
  | "SUBMIT"
  | "REVIEW"
  | "LAUNCH";

export type LessonDesignStudioBannerKind = "NONE" | "REVIEW" | "LAUNCH";

export type LessonDesignStudioSurfaceState = {
  phase: LessonDesignStudioPhase;
  entryContext: LessonDesignStudioEntryContext;
  bannerKind: LessonDesignStudioBannerKind;
  isSubmitted: boolean;
  isApproved: boolean;
  needsRevision: boolean;
  launchPackageAvailable: boolean;
};

export type LessonDesignStudioSurfaceInput = {
  status?: string | null;
  generatedTemplateId?: string | null;
  progress?: Pick<
    CurriculumDraftProgress,
    | "hasFirstWeekWithThreeActivities"
    | "hasAnyObjective"
    | "hasAnyAtHomeAssignment"
    | "readyForSubmission"
  > | null;
};

function hasDraftSignals(
  progress: LessonDesignStudioSurfaceInput["progress"]
) {
  return Boolean(
    progress?.hasFirstWeekWithThreeActivities ||
      progress?.hasAnyObjective ||
      progress?.hasAnyAtHomeAssignment ||
      progress?.readyForSubmission
  );
}

export function deriveLessonDesignStudioSurfaceState(
  input: LessonDesignStudioSurfaceInput
): LessonDesignStudioSurfaceState {
  const status = input.status ?? "IN_PROGRESS";
  const launchPackageAvailable = Boolean(input.generatedTemplateId);
  const isApproved = status === "APPROVED";
  const isSubmitted = status === "SUBMITTED" || isApproved;
  const needsRevision = status === "NEEDS_REVISION";
  const readyToReview = status === "COMPLETED" || Boolean(input.progress?.readyForSubmission);
  const hasContent = hasDraftSignals(input.progress);

  let phase: LessonDesignStudioPhase = "EMPTY";
  if (isApproved) {
    phase = "LAUNCH_READY";
  } else if (status === "SUBMITTED" || needsRevision) {
    phase = "SUBMITTED";
  } else if (readyToReview) {
    phase = "READY_TO_REVIEW";
  } else if (hasContent) {
    phase = "BUILDING";
  }

  let entryContext: LessonDesignStudioEntryContext = "START";
  if (isApproved) {
    entryContext = "LAUNCH";
  } else if (status === "SUBMITTED" || needsRevision) {
    entryContext = "REVIEW";
  } else if (readyToReview) {
    entryContext = "SUBMIT";
  } else if (hasContent) {
    entryContext = "CONTINUE";
  }

  const bannerKind: LessonDesignStudioBannerKind = isApproved
    ? "LAUNCH"
    : needsRevision || launchPackageAvailable
      ? "REVIEW"
      : "NONE";

  return {
    phase,
    entryContext,
    bannerKind,
    isSubmitted,
    isApproved,
    needsRevision,
    launchPackageAvailable,
  };
}
