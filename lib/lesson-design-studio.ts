import {
  MIN_CURRICULUM_OUTCOMES,
  getCurriculumDraftProgress,
  type CurriculumDraftProgress,
} from "@/lib/curriculum-draft-progress";

export type StudioPhase =
  | "START"
  | "COURSE_MAP"
  | "SESSIONS"
  | "READINESS"
  | "REVIEW_LAUNCH";

export type StudioEntryContext =
  | "DIRECT"
  | "NAV"
  | "TRAINING"
  | "APPLICATION_STATUS"
  | "REVIEW";

export const STUDIO_PHASES: Array<{
  id: StudioPhase;
  label: string;
  shortLabel: string;
}> = [
  { id: "START", label: "Start", shortLabel: "Start" },
  { id: "COURSE_MAP", label: "Course Map", shortLabel: "Map" },
  { id: "SESSIONS", label: "Sessions", shortLabel: "Sessions" },
  { id: "READINESS", label: "Readiness", shortLabel: "Ready" },
  { id: "REVIEW_LAUNCH", label: "Review & Launch", shortLabel: "Launch" },
];

type SearchParamValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamValue>;

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeStudioEntryContext(value: unknown): StudioEntryContext {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "nav":
      return "NAV";
    case "training":
      return "TRAINING";
    case "application-status":
    case "application_status":
    case "application":
      return "APPLICATION_STATUS";
    case "review":
      return "REVIEW";
    default:
      return "DIRECT";
  }
}

export function serializeStudioEntryContext(value: StudioEntryContext) {
  switch (value) {
    case "NAV":
      return "nav";
    case "TRAINING":
      return "training";
    case "APPLICATION_STATUS":
      return "application-status";
    case "REVIEW":
      return "review";
    default:
      return "direct";
  }
}

export function getStudioEntryContextFromSearchParams(
  searchParams: SearchParamsRecord
) {
  return normalizeStudioEntryContext(firstValue(searchParams.entry));
}

export function getCanonicalStudioHref(searchParams: SearchParamsRecord) {
  const entryContext = getStudioEntryContextFromSearchParams(searchParams);
  const hasLegacyTemplateId = Boolean(firstValue(searchParams.templateId));
  const hasEntryParam = typeof firstValue(searchParams.entry) === "string";

  if (!hasLegacyTemplateId && (!hasEntryParam || entryContext === "DIRECT")) {
    return null;
  }

  const next = new URLSearchParams();
  if (entryContext !== "DIRECT") {
    next.set("entry", serializeStudioEntryContext(entryContext));
  }

  const query = next.toString();
  return query
    ? `/instructor/lesson-design-studio?${query}`
    : "/instructor/lesson-design-studio";
}

export function deriveStudioPhase(input: {
  status?: string | null;
  title?: string;
  interestArea?: string;
  outcomes?: string[];
  weeklyPlans?: unknown;
  courseConfig?: unknown;
  understandingChecks?: unknown;
  progress?: CurriculumDraftProgress;
}): StudioPhase {
  const progress =
    input.progress ??
    getCurriculumDraftProgress({
      title: input.title,
      interestArea: input.interestArea,
      outcomes: input.outcomes,
      weeklyPlans: input.weeklyPlans,
      courseConfig: input.courseConfig,
      understandingChecks: input.understandingChecks,
    });

  const status = String(input.status ?? "").trim().toUpperCase();
  const nonEmptyOutcomes = Array.isArray(input.outcomes)
    ? input.outcomes.filter((outcome) => outcome.trim().length > 0)
    : [];

  const hasOverviewStarted =
    (input.title ?? "").trim().length > 0 ||
    (input.interestArea ?? "").trim().length > 0 ||
    nonEmptyOutcomes.length > 0;

  const hasBuiltAnySession =
    progress.sessionsWithTitles > 0 ||
    progress.sessionsWithObjectives > 0 ||
    progress.sessionsWithThreeActivities > 0 ||
    progress.sessionsWithAtHomeAssignments > 0;

  const hasCourseMapReady =
    (input.title ?? "").trim().length > 0 &&
    (input.interestArea ?? "").trim().length > 0 &&
    nonEmptyOutcomes.length >= MIN_CURRICULUM_OUTCOMES;

  const sessionBuildComplete =
    progress.sessionsWithTitles === progress.totalSessionsExpected &&
    progress.sessionsWithObjectives === progress.totalSessionsExpected &&
    progress.sessionsWithThreeActivities === progress.totalSessionsExpected &&
    progress.sessionsWithAtHomeAssignments === progress.totalSessionsExpected &&
    progress.sessionsWithinTimeBudget === progress.totalSessionsExpected;

  if (
    status === "COMPLETED" ||
    status === "SUBMITTED" ||
    status === "NEEDS_REVISION" ||
    status === "APPROVED" ||
    status === "REJECTED"
  ) {
    return "REVIEW_LAUNCH";
  }

  if (!hasOverviewStarted && !hasBuiltAnySession) {
    return "START";
  }

  if (!hasCourseMapReady) {
    return "COURSE_MAP";
  }

  if (!sessionBuildComplete) {
    return "SESSIONS";
  }

  if (!progress.readyForSubmission) {
    return "READINESS";
  }

  return "REVIEW_LAUNCH";
}

export function getStudioPhaseIndex(phase: StudioPhase) {
  return STUDIO_PHASES.findIndex((step) => step.id === phase);
}
