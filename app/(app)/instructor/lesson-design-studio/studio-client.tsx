"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkingCopyFromCurriculumDraft,
  markLessonDesignStudioTourComplete,
  saveCurriculumDraft,
  submitCurriculumDraft,
} from "@/lib/curriculum-draft-actions";
import { isEditableCurriculumDraftStatus, isReadOnlyCurriculumDraftStatus } from "@/lib/curriculum-draft-lifecycle";
import {
  MIN_CURRICULUM_OUTCOMES,
  buildSessionLabel,
  getCurriculumDraftProgress,
  normalizeCourseConfig,
  normalizeReviewRubric,
  normalizeUnderstandingChecks,
  syncSessionPlansToCourseConfig,
  type CurriculumDraftProgress,
  type StudioCourseConfig,
  type StudioReviewRubric,
  type StudioUnderstandingChecks,
} from "@/lib/curriculum-draft-progress";
import {
  STUDIO_PHASES,
  buildLessonDesignStudioHref,
  deriveStudioPhase,
  getStudioPhaseIndex,
  type StudioEntryContext,
  type StudioPhase,
} from "@/lib/lesson-design-studio";
import { CurriculumBuilderPanel } from "./components/curriculum-builder-panel";
import { ActivityTemplates } from "./components/activity-templates";
import { ExamplesLibrary } from "./components/examples-library";
import { OnboardingTour } from "./components/onboarding-tour";
import { SEED_CURRICULA, type SeedCurriculum } from "./curriculum-seeds";
import type { ExampleWeek } from "./examples-data";

export type ActivityType =
  | "WARM_UP"
  | "INSTRUCTION"
  | "PRACTICE"
  | "DISCUSSION"
  | "ASSESSMENT"
  | "BREAK"
  | "REFLECTION"
  | "GROUP_WORK";

export type EnergyLevel = "HIGH" | "MEDIUM" | "LOW";

export type AtHomeAssignmentType =
  | "REFLECTION_PROMPT"
  | "PRACTICE_TASK"
  | "QUIZ"
  | "PRE_READING";

export interface AtHomeAssignment {
  type: AtHomeAssignmentType;
  title: string;
  description: string;
}

export interface WeekActivity {
  id: string;
  title: string;
  type: ActivityType;
  durationMin: number;
  description: string | null;
  resources: string | null;
  notes: string | null;
  sortOrder: number;
  materials: string | null;
  differentiationTips: string | null;
  energyLevel: EnergyLevel | null;
  standardsTags: string[];
  rubric: string | null;
}

export interface WeekPlan {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  title: string;
  classDurationMin: number;
  activities: WeekActivity[];
  objective: string | null;
  teacherPrepNotes: string | null;
  materialsChecklist: string[];
  atHomeAssignment: AtHomeAssignment | null;
}

interface DraftData {
  id: string;
  title: string;
  description: string;
  interestArea: string;
  outcomes: string[];
  courseConfig: unknown;
  weeklyPlans: unknown[];
  understandingChecks: unknown;
  reviewRubric: unknown;
  reviewNotes: string;
  reviewedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  generatedTemplateId: string | null;
  status: string;
  updatedAt: string;
}

interface StudioClientProps {
  userId: string;
  userName: string;
  draft: DraftData;
  entryContext?: StudioEntryContext;
  notice?: string | null;
  currentPhase?: StudioPhase;
  progress?: CurriculumDraftProgress;
}

interface HistoryVersion {
  savedAt: string;
  snapshot: {
    title: string;
    description: string;
    interestArea: string;
    outcomes: string[];
    courseConfig: StudioCourseConfig;
    weeklyPlans: WeekPlan[];
    understandingChecks: StudioUnderstandingChecks;
  };
}

function generateId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizeActivity(activity: any): WeekActivity {
  return {
    id: activity.id ?? generateId(),
    title: activity.title ?? "",
    type: activity.type ?? "WARM_UP",
    durationMin: activity.durationMin ?? 10,
    description: activity.description ?? null,
    resources: activity.resources ?? null,
    notes: activity.notes ?? null,
    sortOrder: activity.sortOrder ?? 0,
    materials: activity.materials ?? null,
    differentiationTips: activity.differentiationTips ?? null,
    energyLevel: activity.energyLevel ?? null,
    standardsTags: Array.isArray(activity.standardsTags)
      ? activity.standardsTags
      : [],
    rubric: activity.rubric ?? null,
  };
}

function normalizeWeek(week: any): WeekPlan {
  return {
    id: week.id ?? generateId(),
    weekNumber: week.weekNumber ?? 1,
    sessionNumber: week.sessionNumber ?? 1,
    title: week.title ?? "",
    classDurationMin: week.classDurationMin ?? 60,
    activities: Array.isArray(week.activities)
      ? week.activities.map(normalizeActivity)
      : [],
    objective: week.objective ?? null,
    teacherPrepNotes: week.teacherPrepNotes ?? null,
    materialsChecklist: Array.isArray(week.materialsChecklist)
      ? week.materialsChecklist
      : [],
    atHomeAssignment: week.atHomeAssignment ?? null,
  };
}

function normalizeTopic(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isBlankWeekPlan(week: WeekPlan) {
  return (
    !week.title.trim() &&
    week.activities.length === 0 &&
    !(week.objective ?? "").trim() &&
    !(week.teacherPrepNotes ?? "").trim() &&
    week.materialsChecklist.length === 0 &&
    week.atHomeAssignment === null
  );
}

function scoreSeedMatch(seed: SeedCurriculum, topic: string) {
  const draft = normalizeTopic(topic);
  const seedTopic = normalizeTopic(seed.interestArea);
  if (!draft) return 0;
  if (seedTopic === draft) return 100;
  if (seedTopic.includes(draft) || draft.includes(seedTopic)) return 80;

  const draftWords = new Set(draft.split(" ").filter(Boolean));
  return seedTopic
    .split(" ")
    .filter((word) => draftWords.has(word)).length * 20;
}

function getEntrySummary(
  entryContext: StudioEntryContext,
  status: string,
  userName: string
) {
  if (status === "NEEDS_REVISION") {
    return {
      eyebrow: "Revision Journey",
      title: "Tighten the draft and move back toward launch",
      body:
        "A reviewer has sent this curriculum back with guidance. Use the notes in each phase to strengthen the parts that still need work.",
    };
  }

  switch (entryContext) {
    case "TRAINING":
      return {
        eyebrow: "Capstone Studio",
        title: "Leave training with a curriculum you can really teach",
        body:
          "This studio is now the main capstone workspace. Shape the course, build each session, and finish with something that feels ready for a real classroom.",
      };
    case "APPLICATION_STATUS":
      return {
        eyebrow: "Application Journey",
        title: "Build the curriculum that carries your application forward",
        body:
          "Your next big step is a full, teachable first curriculum. Use this studio to turn your idea into a complete capstone submission.",
      };
    case "REVIEW":
      return {
        eyebrow: "Review Follow-Up",
        title: "Review feedback, revise with purpose, and relaunch",
        body:
          "Keep the reviewer’s guidance close, update the right parts of the draft, and then return to review with a stronger curriculum package.",
      };
    case "NAV":
      return {
        eyebrow: "Studio Journey",
        title: `Welcome back, ${userName}`,
        body:
          "This is your step-by-step teaching studio. Start with a scaffold if you need momentum, then shape the course and build the sessions that make it real.",
      };
    default:
      return {
        eyebrow: "Lesson Design Studio",
        title: "Build a first curriculum that feels connected from start to launch",
        body:
          "Move through the phases one at a time, use examples when you need them, and keep the whole teaching journey visible in one place.",
      };
  }
}

function getStatusPill(status: string) {
  switch (status) {
    case "APPROVED":
      return { label: "Launch Ready", className: "pill pill-success" };
    case "NEEDS_REVISION":
      return { label: "Revision Requested", className: "pill pill-pending" };
    case "SUBMITTED":
      return { label: "Submitted", className: "pill pill-info" };
    case "COMPLETED":
      return { label: "Ready to Submit", className: "pill pill-purple" };
    case "REJECTED":
      return { label: "Decision Returned", className: "pill" };
    default:
      return { label: "In Progress", className: "pill" };
  }
}

function getPhaseCompletionState(args: {
  phase: StudioPhase;
  title: string;
  interestArea: string;
  outcomes: string[];
  progress: CurriculumDraftProgress;
  status: string;
}) {
  const nonEmptyOutcomes = args.outcomes.filter((item) => item.trim().length > 0);
  const sessionBuildComplete =
    args.progress.sessionsWithTitles === args.progress.totalSessionsExpected &&
    args.progress.sessionsWithObjectives === args.progress.totalSessionsExpected &&
    args.progress.sessionsWithThreeActivities === args.progress.totalSessionsExpected &&
    args.progress.sessionsWithAtHomeAssignments === args.progress.totalSessionsExpected &&
    args.progress.sessionsWithinTimeBudget === args.progress.totalSessionsExpected;

  switch (args.phase) {
    case "START":
      return (
        args.title.trim().length > 0 ||
        args.interestArea.trim().length > 0 ||
        nonEmptyOutcomes.length > 0
      );
    case "COURSE_MAP":
      return (
        args.title.trim().length > 0 &&
        args.interestArea.trim().length > 0 &&
        nonEmptyOutcomes.length >= MIN_CURRICULUM_OUTCOMES
      );
    case "SESSIONS":
      return sessionBuildComplete;
    case "READINESS":
      return args.progress.readyForSubmission;
    case "REVIEW_LAUNCH":
      return (
        args.status === "COMPLETED" ||
        args.status === "SUBMITTED" ||
        args.status === "NEEDS_REVISION" ||
        args.status === "APPROVED" ||
        args.status === "REJECTED"
      );
  }
}

export function StudioClient({
  userId,
  userName,
  draft,
  entryContext = "DIRECT",
  notice = null,
  currentPhase,
  progress: initialProgress,
}: StudioClientProps) {
  const router = useRouter();
  const historyStorageKey = `lds_history_${draft.id}`;
  const onboardingStorageKey = `lds_onboarding_done_${userId}_${draft.id}`;

  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [interestArea, setInterestArea] = useState(draft.interestArea);
  const [outcomes, setOutcomes] = useState<string[]>(draft.outcomes);
  const [courseConfig, setCourseConfig] = useState<StudioCourseConfig>(() =>
    normalizeCourseConfig(draft.courseConfig)
  );
  const [weeklyPlans, setWeeklyPlans] = useState<WeekPlan[]>(() =>
    syncSessionPlansToCourseConfig(draft.weeklyPlans, draft.courseConfig).map(
      normalizeWeek
    )
  );
  const [understandingChecks, setUnderstandingChecks] =
    useState<StudioUnderstandingChecks>(() =>
      normalizeUnderstandingChecks(draft.understandingChecks)
    );
  const [activeExampleTab, setActiveExampleTab] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(draft.status);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isFlushing, setIsFlushing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [templatesWeekId, setTemplatesWeekId] = useState<string | null>(null);
  const [showExamplesLibrary, setShowExamplesLibrary] = useState(false);
  const [examplesLibraryError, setExamplesLibraryError] = useState<string | null>(
    null
  );
  const [hasManuallySelectedExampleTab, setHasManuallySelectedExampleTab] =
    useState(false);
  const [libraryTargetPlanId, setLibraryTargetPlanId] = useState<string | null>(
    null
  );
  const [manuallyRequestedTour, setManuallyRequestedTour] = useState(false);
  const [tourInstanceKey, setTourInstanceKey] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState(draft.updatedAt);
  const [historyVersions, setHistoryVersions] = useState<HistoryVersion[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(historyStorageKey);
      if (!stored) return [];

      const parsed = JSON.parse(stored) as Array<{
        savedAt?: string;
        snapshot?: Partial<HistoryVersion["snapshot"]>;
      }>;

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((version) => version && typeof version === "object")
        .map((version) => ({
          savedAt: String(version.savedAt ?? new Date().toISOString()),
          snapshot: {
            title: String(version.snapshot?.title ?? ""),
            description: String(version.snapshot?.description ?? ""),
            interestArea: String(version.snapshot?.interestArea ?? ""),
            outcomes: Array.isArray(version.snapshot?.outcomes)
              ? version.snapshot.outcomes.filter(
                  (item): item is string => typeof item === "string"
                )
              : [],
            courseConfig: normalizeCourseConfig(version.snapshot?.courseConfig),
            weeklyPlans: Array.isArray(version.snapshot?.weeklyPlans)
              ? version.snapshot.weeklyPlans.map(normalizeWeek)
              : [],
            understandingChecks: normalizeUnderstandingChecks(
              version.snapshot?.understandingChecks
            ),
          },
        }));
    } catch {
      return [];
    }
  });

  const reviewRubric: StudioReviewRubric = normalizeReviewRubric(
    draft.reviewRubric
  );
  const reviewStatus = currentStatus;
  const isDraftEditable = isEditableCurriculumDraftStatus(reviewStatus);
  const isDraftReadOnly = isReadOnlyCurriculumDraftStatus(reviewStatus);
  const isApproved = reviewStatus === "APPROVED";
  const needsRevision = reviewStatus === "NEEDS_REVISION";
  const isReviewControlledStatus =
    reviewStatus === "SUBMITTED" ||
    reviewStatus === "APPROVED" ||
    reviewStatus === "NEEDS_REVISION" ||
    reviewStatus === "REJECTED";
  const isWorkflowActionPending = isFlushing || isSubmitting || isExporting;
  const workflowNotice =
    notice === "active-draft-reused"
      ? "You already had one editable curriculum open, so the studio reopened that working draft instead of creating a second one."
      : notice === "draft-unavailable"
        ? "That draft changed while you were working. We moved you back to the draft list so you can choose the next step safely."
        : null;

  const progress = useMemo(
    () =>
      getCurriculumDraftProgress({
        title,
        interestArea,
        outcomes,
        courseConfig,
        weeklyPlans,
        understandingChecks,
      }),
    [title, interestArea, outcomes, courseConfig, weeklyPlans, understandingChecks]
  );

  const initialDerivedPhase =
    currentPhase ??
    deriveStudioPhase({
      status: draft.status,
      title: draft.title,
      interestArea: draft.interestArea,
      outcomes: draft.outcomes,
      courseConfig: draft.courseConfig,
      weeklyPlans: draft.weeklyPlans,
      understandingChecks: draft.understandingChecks,
      progress: initialProgress,
    });

  const [activePhase, setActivePhase] = useState<StudioPhase>(initialDerivedPhase);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const lastSavedSnapshotSignatureRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const derivedPhase = deriveStudioPhase({
      status: currentStatus,
      title,
      interestArea,
      outcomes,
      courseConfig,
      weeklyPlans,
      understandingChecks,
      progress,
    });

    if (getStudioPhaseIndex(derivedPhase) > getStudioPhaseIndex(activePhase)) {
      setActivePhase(derivedPhase);
    }
  }, [
    activePhase,
    courseConfig,
    currentStatus,
    interestArea,
    outcomes,
    progress,
    title,
    understandingChecks,
    weeklyPlans,
  ]);

  const normalizePlansForConfig = useCallback(
    (plans: unknown, config: StudioCourseConfig) =>
      syncSessionPlansToCourseConfig(plans, config).map(normalizeWeek),
    []
  );

  type DraftSnapshot = {
    title: string;
    description: string;
    interestArea: string;
    outcomes: string[];
    courseConfig: StudioCourseConfig;
    weeklyPlans: WeekPlan[];
    understandingChecks: StudioUnderstandingChecks;
  };

  const getSnapshotSignature = useCallback((snapshot: DraftSnapshot) => {
    return JSON.stringify(snapshot);
  }, []);

  const pushToHistory = useCallback(
    (snapshot: DraftSnapshot) => {
      const version: HistoryVersion = {
        savedAt: new Date().toISOString(),
        snapshot: {
          title: snapshot.title,
          description: snapshot.description,
          interestArea: snapshot.interestArea,
          outcomes: snapshot.outcomes,
          courseConfig: snapshot.courseConfig,
          weeklyPlans: snapshot.weeklyPlans,
          understandingChecks: snapshot.understandingChecks,
        },
      };

      setHistoryVersions((prev) => {
        const next = [version, ...prev].slice(0, 10);
        try {
          localStorage.setItem(historyStorageKey, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [historyStorageKey]
  );

  const buildSnapshot = useCallback(
    (overrides: Partial<DraftSnapshot> = {}): DraftSnapshot => ({
      title,
      description,
      interestArea,
      outcomes,
      courseConfig,
      weeklyPlans,
      understandingChecks,
      ...overrides,
    }),
    [title, description, interestArea, outcomes, courseConfig, weeklyPlans, understandingChecks]
  );

  useEffect(() => {
    if (lastSavedSnapshotSignatureRef.current !== null) return;
    lastSavedSnapshotSignatureRef.current = getSnapshotSignature(buildSnapshot());
  }, [buildSnapshot, getSnapshotSignature]);

  const queueSaveSnapshot = useCallback(
    async (snapshot: DraftSnapshot) => {
      const runSave = async () => {
        if (!isMountedRef.current) return false;
        if (!isEditableCurriculumDraftStatus(currentStatus)) return true;
        setSaveStatus("saving");

        try {
          await saveCurriculumDraft({
            draftId: draft.id,
            title: snapshot.title,
            description: snapshot.description,
            interestArea: snapshot.interestArea,
            outcomes: snapshot.outcomes,
            courseConfig: snapshot.courseConfig,
            weeklyPlans: snapshot.weeklyPlans,
            understandingChecks: snapshot.understandingChecks,
          });

          if (!isMountedRef.current) return true;

          const signature = getSnapshotSignature(snapshot);
          if (lastSavedSnapshotSignatureRef.current !== signature) {
            pushToHistory(snapshot);
            lastSavedSnapshotSignatureRef.current = signature;
          }

          setSaveStatus("saved");
          setLastSavedAt(new Date().toISOString());
          setCurrentStatus((previousStatus) => {
            if (
              previousStatus === "SUBMITTED" ||
              previousStatus === "NEEDS_REVISION" ||
              previousStatus === "APPROVED" ||
              previousStatus === "REJECTED"
            ) {
              return previousStatus;
            }

            return getCurriculumDraftProgress({
              title: snapshot.title,
              interestArea: snapshot.interestArea,
              outcomes: snapshot.outcomes,
              courseConfig: snapshot.courseConfig,
              weeklyPlans: snapshot.weeklyPlans,
              understandingChecks: snapshot.understandingChecks,
            }).readyForSubmission
              ? "COMPLETED"
              : "IN_PROGRESS";
          });

          if (saveStatusTimerRef.current) {
            clearTimeout(saveStatusTimerRef.current);
          }

          saveStatusTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) setSaveStatus("idle");
          }, 2000);

          return true;
        } catch (error) {
          if (isMountedRef.current) {
            setSaveStatus("error");
          }

          const message =
            error instanceof Error ? error.message : "Failed to save draft";
          if (
            message.includes("Draft not found or unauthorized") ||
            message.includes("locked for review history")
          ) {
            router.push(
              buildLessonDesignStudioHref({
                entryContext,
                notice: "draft-unavailable",
              })
            );
          }
          return false;
        }
      };

      const queuedSave = saveChainRef.current.catch(() => true).then(runSave);
      saveChainRef.current = queuedSave;
      return queuedSave;
    },
    [
      currentStatus,
      draft.id,
      entryContext,
      getSnapshotSignature,
      pushToHistory,
      router,
    ]
  );

  const triggerAutoSave = useCallback(
    (snapshot: DraftSnapshot) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        void queueSaveSnapshot(snapshot);
      }, 1500);
    },
    [queueSaveSnapshot]
  );

  const flushDraftNow = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setIsFlushing(true);
    const didSave = await queueSaveSnapshot(buildSnapshot());
    if (isMountedRef.current) {
      setIsFlushing(false);
    }
    return didSave;
  }, [buildSnapshot, queueSaveSnapshot]);

  const handleUpdate = useCallback(
    (field: string, value: unknown) => {
      if (!isDraftEditable) return;
      let nextSnapshot = buildSnapshot();

      switch (field) {
        case "title":
          nextSnapshot = { ...nextSnapshot, title: value as string };
          setTitle(nextSnapshot.title);
          break;
        case "description":
          nextSnapshot = { ...nextSnapshot, description: value as string };
          setDescription(nextSnapshot.description);
          break;
        case "interestArea":
          nextSnapshot = { ...nextSnapshot, interestArea: value as string };
          setInterestArea(nextSnapshot.interestArea);
          break;
        case "outcomes":
          nextSnapshot = { ...nextSnapshot, outcomes: value as string[] };
          setOutcomes(nextSnapshot.outcomes);
          break;
        case "courseConfig": {
          const normalizedCourseConfig = normalizeCourseConfig(value);
          const syncedPlans = normalizePlansForConfig(
            weeklyPlans,
            normalizedCourseConfig
          );
          nextSnapshot = {
            ...nextSnapshot,
            courseConfig: normalizedCourseConfig,
            weeklyPlans: syncedPlans,
          };
          setCourseConfig(normalizedCourseConfig);
          setWeeklyPlans(syncedPlans);
          break;
        }
        case "understandingChecks":
          nextSnapshot = {
            ...nextSnapshot,
            understandingChecks: normalizeUnderstandingChecks(value),
          };
          setUnderstandingChecks(nextSnapshot.understandingChecks);
          break;
      }

      triggerAutoSave(nextSnapshot);
    },
    [buildSnapshot, isDraftEditable, normalizePlansForConfig, triggerAutoSave, weeklyPlans]
  );

  const handleUpdateWeek = useCallback(
    (weekId: string, field: string, value: unknown) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const next = prev.map((week) =>
          week.id === weekId ? { ...week, [field]: value } : week
        );
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleAddWeek = useCallback(() => {
    if (!isDraftEditable) return;
    const nextCourseConfig = normalizeCourseConfig({
      ...courseConfig,
      durationWeeks: courseConfig.durationWeeks + 1,
    });
    const nextPlans = normalizePlansForConfig(weeklyPlans, nextCourseConfig);
    setCourseConfig(nextCourseConfig);
    setWeeklyPlans(nextPlans);
    triggerAutoSave(
      buildSnapshot({
        courseConfig: nextCourseConfig,
        weeklyPlans: nextPlans,
      })
    );
  }, [
    buildSnapshot,
    courseConfig,
    isDraftEditable,
    normalizePlansForConfig,
    triggerAutoSave,
    weeklyPlans,
  ]);

  const handleRemoveWeek = useCallback(
    (weekId: string) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const next = prev.map((week) =>
          week.id === weekId
            ? {
                ...week,
                title: "",
                activities: [],
                objective: null,
                teacherPrepNotes: null,
                materialsChecklist: [],
                atHomeAssignment: null,
              }
            : week
        );
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleDuplicateWeek = useCallback(
    (weekId: string) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const sourceIndex = prev.findIndex((week) => week.id === weekId);
        if (sourceIndex === -1) return prev;

        const targetIndex =
          sourceIndex + 1 < prev.length ? sourceIndex + 1 : sourceIndex;
        const source = prev[sourceIndex];
        const next = prev.map((plan, index) =>
          index === targetIndex
            ? {
                ...plan,
                title: source.title ? `${source.title} (Copy)` : "Copy",
                activities: source.activities.map((activity) => ({
                  ...activity,
                  id: generateId(),
                })),
                objective: source.objective,
                teacherPrepNotes: source.teacherPrepNotes,
                materialsChecklist: [...source.materialsChecklist],
                atHomeAssignment: source.atHomeAssignment
                  ? { ...source.atHomeAssignment }
                  : null,
              }
            : plan
        );

        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleAddActivity = useCallback(
    (weekId: string, activity: Omit<WeekActivity, "id" | "sortOrder">) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const next = prev.map((week) => {
          if (week.id !== weekId) return week;
          return {
            ...week,
            activities: [
              ...week.activities,
              {
                ...activity,
                id: generateId(),
                sortOrder: week.activities.length,
              },
            ],
          };
        });

        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleRemoveActivity = useCallback(
    (weekId: string, activityId: string) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const next = prev.map((week) => {
          if (week.id !== weekId) return week;
          return {
            ...week,
            activities: week.activities
              .filter((activity) => activity.id !== activityId)
              .map((activity, index) => ({ ...activity, sortOrder: index })),
          };
        });

        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleUpdateActivity = useCallback(
    (weekId: string, activityId: string, fields: Partial<WeekActivity>) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const next = prev.map((week) => {
          if (week.id !== weekId) return week;
          return {
            ...week,
            activities: week.activities.map((activity) =>
              activity.id === activityId ? { ...activity, ...fields } : activity
            ),
          };
        });

        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleReorderActivities = useCallback(
    (weekId: string, activeId: string, overId: string) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const next = prev.map((week) => {
          if (week.id !== weekId) return week;
          const oldIndex = week.activities.findIndex((item) => item.id === activeId);
          const newIndex = week.activities.findIndex((item) => item.id === overId);
          if (oldIndex === -1 || newIndex === -1) return week;

          const items = [...week.activities];
          const [moved] = items.splice(oldIndex, 1);
          items.splice(newIndex, 0, moved);

          return {
            ...week,
            activities: items.map((item, index) => ({
              ...item,
              sortOrder: index,
            })),
          };
        });

        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleMoveActivityToWeek = useCallback(
    (fromWeekId: string, activityId: string, toWeekId: string) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const fromWeek = prev.find((week) => week.id === fromWeekId);
        const activity = fromWeek?.activities.find((item) => item.id === activityId);
        if (!activity) return prev;

        const next = prev.map((week) => {
          if (week.id === fromWeekId) {
            return {
              ...week,
              activities: week.activities
                .filter((item) => item.id !== activityId)
                .map((item, index) => ({ ...item, sortOrder: index })),
            };
          }

          if (week.id === toWeekId) {
            return {
              ...week,
              activities: [
                ...week.activities,
                { ...activity, sortOrder: week.activities.length },
              ],
            };
          }

          return week;
        });

        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleImportWeek = useCallback(
    (week: ExampleWeek, targetPlanId?: string | null) => {
      if (!isDraftEditable) {
        return false;
      }

      let imported = false;

      setWeeklyPlans((prev) => {
        const explicitTargetIndex =
          targetPlanId != null
            ? prev.findIndex((plan) => plan.id === targetPlanId)
            : -1;

        if (targetPlanId != null && explicitTargetIndex === -1) {
          setExamplesLibraryError(
            "That session changed while the library was open. Pick a session again before importing."
          );
          return prev;
        }

        const blankTargetIndex =
          targetPlanId == null
            ? prev.findIndex((plan) => isBlankWeekPlan(plan))
            : -1;

        if (targetPlanId == null && blankTargetIndex === -1) {
          setExamplesLibraryError(
            "There is no empty session left to import into. Use a session-level import button so you can choose the exact destination."
          );
          return prev;
        }

        const resolvedIndex =
          explicitTargetIndex >= 0 ? explicitTargetIndex : blankTargetIndex;
        const target = resolvedIndex >= 0 ? prev[resolvedIndex] : null;
        if (!target) return prev;

        const nextWeek: WeekPlan = {
          ...target,
          title: week.title,
          classDurationMin: courseConfig.classDurationMin,
          activities: week.activities.map((activity, index) => ({
            id: generateId(),
            title: activity.title,
            type: activity.type,
            durationMin: activity.durationMin,
            description: activity.description,
            resources: null,
            notes: null,
            sortOrder: index,
            materials: null,
            differentiationTips: null,
            energyLevel: null,
            standardsTags: [],
            rubric: null,
          })),
          objective: week.goal,
          teacherPrepNotes: week.teachingTips ?? null,
          materialsChecklist: [],
          atHomeAssignment: week.atHomeAssignment
            ? {
                type: week.atHomeAssignment.type,
                title: week.atHomeAssignment.title,
                description: week.atHomeAssignment.description,
              }
            : null,
        };

        const next = prev.map((plan, index) =>
          index === resolvedIndex ? nextWeek : plan
        );
        imported = true;
        setExamplesLibraryError(null);
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });

      if (!imported) {
        return false;
      }

      setShowExamplesLibrary(false);
      setLibraryTargetPlanId(null);
      setActivePhase("SESSIONS");
      return true;
    },
    [buildSnapshot, courseConfig.classDurationMin, isDraftEditable, triggerAutoSave]
  );

  const handleApplyStarterScaffold = useCallback(
    (seed: SeedCurriculum) => {
      if (!isDraftEditable) return;
      pushToHistory(buildSnapshot());

      const nextCourseConfig = normalizeCourseConfig({
        ...courseConfig,
        durationWeeks: seed.weeks.length,
        sessionsPerWeek: 1,
        classDurationMin: seed.classDurationMin,
      });
      const seededPlans = syncSessionPlansToCourseConfig([], nextCourseConfig).map(
        (plan, index) => {
          const sourceWeek = seed.weeks[index];
          if (!sourceWeek) return normalizeWeek(plan);

          return {
            ...normalizeWeek(plan),
            title: sourceWeek.title,
            classDurationMin: seed.classDurationMin,
            objective: sourceWeek.objective,
            teacherPrepNotes: sourceWeek.teacherPrepNotes,
            materialsChecklist: [],
            atHomeAssignment: sourceWeek.atHomeAssignment
              ? {
                  type: sourceWeek.atHomeAssignment.type,
                  title: sourceWeek.atHomeAssignment.title,
                  description: sourceWeek.atHomeAssignment.description,
                }
              : null,
            activities: sourceWeek.activities.map((activity, activityIndex) => ({
              id: generateId(),
              title: activity.title,
              type: activity.type,
              durationMin: activity.durationMin,
              description: activity.description,
              resources: null,
              notes: null,
              sortOrder: activityIndex,
              materials: null,
              differentiationTips: null,
              energyLevel: null,
              standardsTags: [],
              rubric: null,
            })),
          };
        }
      );

      const nextSnapshot = buildSnapshot({
        title: seed.title,
        description: seed.description,
        interestArea: seed.interestArea,
        outcomes: seed.outcomes,
        courseConfig: nextCourseConfig,
        weeklyPlans: seededPlans,
      });

      setTitle(seed.title);
      setDescription(seed.description);
      setInterestArea(seed.interestArea);
      setOutcomes(seed.outcomes);
      setCourseConfig(nextCourseConfig);
      setWeeklyPlans(seededPlans);
      setActivePhase("COURSE_MAP");
      triggerAutoSave(nextSnapshot);
    },
    [buildSnapshot, courseConfig, isDraftEditable, pushToHistory, triggerAutoSave]
  );

  const handleExportPdf = useCallback(
    async (type: "student" | "instructor") => {
      if (isExporting || isSubmitting || isFlushing) return false;

      const exportWindow = window.open("", "_blank", "noopener,noreferrer");
      if (!exportWindow) {
        alert("Allow pop-ups to open the PDF export.");
        return false;
      }

      setIsExporting(true);

      try {
        if (isEditableCurriculumDraftStatus(currentStatus)) {
          const didSave = await flushDraftNow();
          if (!didSave) {
            exportWindow.close();
            alert("Please fix the save error before exporting.");
            return false;
          }
        }

        exportWindow.location.href = `/instructor/lesson-design-studio/print?draftId=${draft.id}&type=${type}`;
        return true;
      } finally {
        if (isMountedRef.current) {
          setIsExporting(false);
        }
      }
    },
    [currentStatus, draft.id, flushDraftNow, isExporting, isFlushing, isSubmitting]
  );

  const handleSubmit = useCallback(async () => {
    if (!isDraftEditable) return false;
    if (isSubmitting || isExporting || isFlushing) return false;

    setIsSubmitting(true);

    try {
      const didSave = await flushDraftNow();
      if (!didSave) {
        alert("Please fix the save error before submitting.");
        return false;
      }

      await submitCurriculumDraft(draft.id);
      setCurrentStatus("SUBMITTED");
      setLastSavedAt(new Date().toISOString());
      setActivePhase("REVIEW_LAUNCH");
      router.refresh();
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to submit");
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  }, [draft.id, flushDraftNow, isDraftEditable, isExporting, isFlushing, isSubmitting, router]);

  const handleRestoreVersion = useCallback(
    (version: HistoryVersion) => {
      if (!isDraftEditable) return;
      const { snapshot } = version;
      const nextUnderstandingChecks = normalizeUnderstandingChecks(
        snapshot.understandingChecks
      );
      setTitle(snapshot.title);
      setDescription(snapshot.description);
      setInterestArea(snapshot.interestArea);
      setOutcomes(snapshot.outcomes);
      setCourseConfig(snapshot.courseConfig);
      setWeeklyPlans(snapshot.weeklyPlans);
      setUnderstandingChecks(nextUnderstandingChecks);
      setShowHistory(false);

      triggerAutoSave({
        ...buildSnapshot(),
        title: snapshot.title,
        description: snapshot.description,
        interestArea: snapshot.interestArea,
        outcomes: snapshot.outcomes,
        courseConfig: snapshot.courseConfig,
        weeklyPlans: snapshot.weeklyPlans,
        understandingChecks: nextUnderstandingChecks,
      });
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const openExamplesLibrary = useCallback((targetPlanId?: string | null) => {
    if (!isDraftEditable) return;
    setExamplesLibraryError(null);
    setHasManuallySelectedExampleTab(false);
    setLibraryTargetPlanId(targetPlanId ?? null);
    setShowExamplesLibrary(true);
  }, [isDraftEditable]);

  const handleExamplesTabChange = useCallback(
    (index: number, source?: "auto" | "user") => {
      if (source === "auto" && hasManuallySelectedExampleTab) {
        return;
      }

      if (source === "user") {
        setHasManuallySelectedExampleTab(true);
      }

      setActiveExampleTab(index);
    },
    [hasManuallySelectedExampleTab]
  );

  const handleTourSeedHeader = useCallback(
    (info: {
      title: string;
      description: string;
      interestArea: string;
      outcomes: string[];
      durationWeeks: number;
      classDurationMin: number;
    }) => {
      if (!isDraftEditable) return;
      pushToHistory(buildSnapshot());

      const nextCourseConfig = normalizeCourseConfig({
        ...courseConfig,
        durationWeeks: info.durationWeeks,
        sessionsPerWeek: 1,
        classDurationMin: info.classDurationMin,
      });
      const nextPlans = normalizePlansForConfig(weeklyPlans, nextCourseConfig);
      const nextSnapshot = buildSnapshot({
        title: info.title,
        description: info.description,
        interestArea: info.interestArea,
        outcomes: info.outcomes,
        courseConfig: nextCourseConfig,
        weeklyPlans: nextPlans,
      });

      setTitle(info.title);
      setDescription(info.description);
      setInterestArea(info.interestArea);
      setOutcomes(info.outcomes);
      setCourseConfig(nextCourseConfig);
      setWeeklyPlans(nextPlans);
      setActivePhase("COURSE_MAP");
      triggerAutoSave(nextSnapshot);
    },
    [
      buildSnapshot,
      courseConfig,
      isDraftEditable,
      normalizePlansForConfig,
      pushToHistory,
      triggerAutoSave,
      weeklyPlans,
    ]
  );

  const handleTourSeedWeeks = useCallback(
    (
      weeks: Array<{
        title: string;
        objective: string;
        teacherPrepNotes: string;
        classDurationMin: number;
        activities: Array<{
          title: string;
          type: string;
          durationMin: number;
          description: string;
        }>;
        atHomeAssignment: {
          type: string;
          title: string;
          description: string;
        };
      }>
    ) => {
      if (!isDraftEditable) return;
      setWeeklyPlans((prev) => {
        const next = [...prev];
        let cursor = 0;

        for (const seededWeek of weeks) {
          while (cursor < next.length && !isBlankWeekPlan(next[cursor])) {
            cursor += 1;
          }

          if (cursor >= next.length) break;

          const target = next[cursor];
          next[cursor] = {
            ...target,
            title: seededWeek.title,
            classDurationMin: seededWeek.classDurationMin,
            objective: seededWeek.objective,
            teacherPrepNotes: seededWeek.teacherPrepNotes,
            materialsChecklist: [],
            atHomeAssignment: seededWeek.atHomeAssignment
              ? {
                  type: seededWeek.atHomeAssignment.type as AtHomeAssignmentType,
                  title: seededWeek.atHomeAssignment.title,
                  description: seededWeek.atHomeAssignment.description,
                }
              : null,
            activities: seededWeek.activities.map((activity, activityIndex) => ({
              id: generateId(),
              title: activity.title,
              type: activity.type as ActivityType,
              durationMin: activity.durationMin,
              description: activity.description,
              resources: null,
              notes: null,
              sortOrder: activityIndex,
              materials: null,
              differentiationTips: null,
              energyLevel: null,
              standardsTags: [],
              rubric: null,
            })),
          };
          cursor += 1;
        }

        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
      setActivePhase("SESSIONS");
    },
    [buildSnapshot, isDraftEditable, triggerAutoSave]
  );

  const handleTourComplete = useCallback(async () => {
    const didSave = await flushDraftNow();
    if (!didSave) {
      alert("Please fix the save error before finishing the tour.");
      return;
    }

    try {
      await markLessonDesignStudioTourComplete(draft.id);
      setManuallyRequestedTour(false);
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save tour completion"
      );
    }
  }, [draft.id, flushDraftNow, router]);

  const handleCreateWorkingCopy = useCallback(async () => {
    if (isWorkflowActionPending) return;

    try {
      const result = await createWorkingCopyFromCurriculumDraft(draft.id);
      router.push(
        buildLessonDesignStudioHref({
          entryContext,
          draftId: result.draftId,
          notice: result.reusedExisting ? "active-draft-reused" : null,
        })
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to open a working copy."
      );
    }
  }, [draft.id, entryContext, isWorkflowActionPending, router]);

  const restartOnboardingTour = useCallback(() => {
    try {
      localStorage.removeItem(onboardingStorageKey);
    } catch {}

    setManuallyRequestedTour(true);
    setTourInstanceKey((current) => current + 1);
  }, [onboardingStorageKey]);

  useEffect(() => {
    const normalized = normalizePlansForConfig(weeklyPlans, courseConfig);
    const changed = JSON.stringify(normalized) !== JSON.stringify(weeklyPlans);
    if (changed) {
      setWeeklyPlans(normalized);
    }
  }, [courseConfig, normalizePlansForConfig, weeklyPlans]);

  useEffect(() => {
    if (!showHistory) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowHistory(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showHistory]);

  const nonEmptyOutcomes = outcomes.filter((outcome) => outcome.trim().length > 0);
  const isDraftBlank =
    title.trim().length === 0 &&
    description.trim().length === 0 &&
    interestArea.trim().length === 0 &&
    nonEmptyOutcomes.length === 0 &&
    weeklyPlans.every((plan) => isBlankWeekPlan(plan));
  const shouldRenderOnboardingTour =
    !isReviewControlledStatus && (isDraftBlank || manuallyRequestedTour);
  const entrySummary = getEntrySummary(entryContext, reviewStatus, userName);
  const statusPill = getStatusPill(reviewStatus);
  const recommendedSeed =
    SEED_CURRICULA.reduce<{ seed: SeedCurriculum; score: number } | null>(
      (best, seed) => {
        const score = scoreSeedMatch(seed, interestArea);
        if (!best || score > best.score) {
          return { seed, score };
        }
        return best;
      },
      null
    )?.seed ?? SEED_CURRICULA[0];
  const launchActionsReady = Boolean(draft.generatedTemplateId);
  const blockerCount = progress.submissionIssues.length;
  const targetPlanLabel = libraryTargetPlanId
    ? (() => {
        const targetPlan = weeklyPlans.find((plan) => plan.id === libraryTargetPlanId);
        return targetPlan
          ? buildSessionLabel(targetPlan, courseConfig)
          : null;
      })()
    : null;

  return (
    <div className={`cbs-studio lds-shell${isDraftReadOnly ? " lds-shell-readonly" : ""}`}>
      <section className="card lds-hero-card">
        <div className="lds-hero-top">
          <div>
            <span className="badge">Lesson Design Studio</span>
            <p className="lds-hero-eyebrow">{entrySummary.eyebrow}</p>
            <h1 className="lds-hero-title">{entrySummary.title}</h1>
            <p className="lds-hero-copy">{entrySummary.body}</p>
          </div>

          <div className="lds-hero-statuses">
            <span className={statusPill.className}>{statusPill.label}</span>
            {isDraftEditable && saveStatus === "saving" ? (
              <span className="pill">Saving</span>
            ) : null}
            {isDraftEditable && saveStatus === "saved" ? (
              <span className="pill pill-success">Auto-saved</span>
            ) : null}
            {isDraftEditable && saveStatus === "error" ? (
              <span className="pill pill-pending">Save failed</span>
            ) : null}
          </div>
        </div>

        <div className="lds-hero-grid">
          <div className="lds-stat-card">
            <span className="lds-stat-label">Current phase</span>
            <strong className="lds-stat-value">
              {STUDIO_PHASES.find((phase) => phase.id === activePhase)?.label}
            </strong>
          </div>
          <div className="lds-stat-card">
            <span className="lds-stat-label">Sessions fully built</span>
            <strong className="lds-stat-value">
              {progress.fullyBuiltSessions}/{progress.totalSessionsExpected}
            </strong>
          </div>
          <div className="lds-stat-card">
            <span className="lds-stat-label">Understanding check</span>
            <strong className="lds-stat-value">
              {progress.understandingChecksPassed ? "Passed" : "In progress"}
            </strong>
          </div>
          <div className="lds-stat-card">
            <span className="lds-stat-label">Current blockers</span>
            <strong className="lds-stat-value">
              {blockerCount === 0 ? "None" : blockerCount}
            </strong>
          </div>
        </div>

        <div className="lds-hero-actions">
          {isDraftEditable ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                openExamplesLibrary(null);
              }}
            >
              Open Examples Library
            </button>
          ) : null}
          {isDraftReadOnly ? (
            <button
              type="button"
              className="button"
              onClick={() => void handleCreateWorkingCopy()}
              disabled={isWorkflowActionPending}
            >
              {isApproved
                ? "Build another from this"
                : reviewStatus === "REJECTED"
                  ? "Start over from this draft"
                  : "Use as starting point"}
            </button>
          ) : null}
          {isDraftEditable ? (
            <button
              type="button"
              className="button secondary"
              onClick={restartOnboardingTour}
            >
              Restart Tour
            </button>
          ) : null}
          {isDraftEditable && historyVersions.length > 0 ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowHistory(true)}
            >
              View Version History
            </button>
          ) : null}
          <span className="lds-updated-at">
            Last updated {new Date(lastSavedAt).toLocaleString()}
          </span>
        </div>
      </section>

      {workflowNotice ? (
        <section className="card lds-readonly-banner" role="status">
          <strong>Studio update</strong>
          <p>{workflowNotice}</p>
        </section>
      ) : null}

      {isDraftReadOnly ? (
        <section className="card lds-readonly-banner">
          <strong>
            {reviewStatus === "SUBMITTED"
              ? "This curriculum is under review."
              : reviewStatus === "APPROVED"
                ? "This curriculum is approved."
                : "This curriculum is preserved as review history."}
          </strong>
          <p>
            You can review the course, switch phases, and export PDFs here. To keep editing,
            start a new working draft from this curriculum so the submitted history stays stable.
          </p>
        </section>
      ) : null}

      <div className="lds-phase-strip" role="tablist" aria-label="Studio phases">
        {STUDIO_PHASES.map((phase) => {
          const isActive = phase.id === activePhase;
          const isComplete = getPhaseCompletionState({
            phase: phase.id,
            title,
            interestArea,
            outcomes,
            progress,
            status: reviewStatus,
          });

          return (
            <button
              key={phase.id}
              type="button"
              className={`lds-phase-pill${isActive ? " active" : ""}`}
              onClick={() => setActivePhase(phase.id)}
              role="tab"
              aria-selected={isActive}
            >
              <span className="lds-phase-pill-index">
                {isComplete ? "✓" : getStudioPhaseIndex(phase.id) + 1}
              </span>
              <span>{phase.label}</span>
            </button>
          );
        })}
      </div>

      <CurriculumBuilderPanel
        userName={userName}
        activePhase={activePhase}
        entryContext={entryContext}
        title={title}
        description={description}
        interestArea={interestArea}
        outcomes={outcomes}
        courseConfig={courseConfig}
        weeklyPlans={weeklyPlans}
        understandingChecks={understandingChecks}
        reviewRubric={reviewRubric}
        reviewStatus={reviewStatus}
        reviewNotes={draft.reviewNotes}
        progress={progress}
        starterScaffolds={SEED_CURRICULA}
        recommendedScaffoldId={recommendedSeed.id}
        onUpdate={handleUpdate}
        onUpdateWeek={handleUpdateWeek}
        onAddWeek={handleAddWeek}
        onRemoveWeek={handleRemoveWeek}
        onDuplicateWeek={handleDuplicateWeek}
        onAddActivity={handleAddActivity}
        onRemoveActivity={handleRemoveActivity}
        onUpdateActivity={handleUpdateActivity}
        onReorderActivities={handleReorderActivities}
        onMoveActivityToWeek={handleMoveActivityToWeek}
        onOpenTemplates={setTemplatesWeekId}
        onOpenExamplesLibrary={openExamplesLibrary}
        onApplyStarterScaffold={handleApplyStarterScaffold}
        onPhaseChange={setActivePhase}
        onExportPdf={handleExportPdf}
        onSubmit={handleSubmit}
        isActionPending={isWorkflowActionPending}
        isReadOnly={isDraftReadOnly}
        isSubmitted={reviewStatus === "SUBMITTED" || reviewStatus === "APPROVED"}
        generatedTemplateId={draft.generatedTemplateId}
        launchActionsReady={launchActionsReady}
        hasCourseMap={
          title.trim().length > 0 &&
          interestArea.trim().length > 0 &&
          nonEmptyOutcomes.length >= MIN_CURRICULUM_OUTCOMES
        }
        nonEmptyOutcomeCount={nonEmptyOutcomes.length}
        needsRevision={needsRevision}
        isApproved={isApproved}
      />

      <ExamplesLibrary
        open={showExamplesLibrary}
        activeTab={activeExampleTab}
        interestArea={interestArea}
        targetLabel={targetPlanLabel}
        errorMessage={examplesLibraryError}
        autoRecommendEnabled={!hasManuallySelectedExampleTab}
        onClose={() => {
          setShowExamplesLibrary(false);
          setLibraryTargetPlanId(null);
          setExamplesLibraryError(null);
        }}
        onTabChange={handleExamplesTabChange}
        onImportWeek={(week) => handleImportWeek(week, libraryTargetPlanId)}
      />

      <ActivityTemplates
        open={templatesWeekId !== null}
        onClose={() => setTemplatesWeekId(null)}
        onInsert={(template) => {
          if (!templatesWeekId) return;
          setTemplatesWeekId(null);
          handleAddActivity(templatesWeekId, {
            title: template.title,
            type: template.type,
            durationMin: template.durationMin,
            description: template.description,
            resources: null,
            notes: null,
            materials: null,
            differentiationTips: null,
            energyLevel: null,
            standardsTags: [],
            rubric: null,
          });
        }}
      />

      {shouldRenderOnboardingTour ? (
        <OnboardingTour
          key={`${onboardingStorageKey}_${tourInstanceKey}`}
          storageKey={onboardingStorageKey}
          onSeedHeader={handleTourSeedHeader}
          onSeedWeeks={handleTourSeedWeeks}
          onComplete={handleTourComplete}
        />
      ) : null}

      {showHistory ? (
        <div className="cbs-modal-overlay" onClick={() => setShowHistory(false)}>
          <div
            className="cbs-history-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cbs-history-header">
              <h3 className="cbs-history-title">Version History</h3>
              <button
                type="button"
                className="lds-library-close"
                onClick={() => setShowHistory(false)}
                aria-label="Close version history"
              >
                ×
              </button>
            </div>
            <div className="cbs-history-body">
              {historyVersions.length === 0 ? (
                <p className="cbs-history-empty">
                  Your saved versions will appear here after auto-save runs.
                </p>
              ) : (
                historyVersions.map((version) => (
                  <button
                    key={version.savedAt}
                    type="button"
                    className="cbs-history-item"
                    onClick={() => handleRestoreVersion(version)}
                  >
                    <div className="cbs-history-item-info">
                      <span className="cbs-history-item-title">
                        {version.snapshot.title || "Untitled curriculum"}
                      </span>
                      <span className="cbs-history-item-time">
                        {new Date(version.savedAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="cbs-history-item-meta">
                      {version.snapshot.weeklyPlans.filter((plan) => plan.title.trim()).length}{" "}
                      session titles
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
