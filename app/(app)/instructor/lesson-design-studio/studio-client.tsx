"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  markLessonDesignStudioTourComplete,
  saveCurriculumDraft,
  submitCurriculumDraft,
} from "@/lib/curriculum-draft-actions";
import {
  normalizeCourseConfig,
  normalizeReviewRubric,
  normalizeUnderstandingChecks,
  syncSessionPlansToCourseConfig,
  type StudioCourseConfig,
  type StudioReviewRubric,
  type StudioUnderstandingChecks,
} from "@/lib/curriculum-draft-progress";
import { ExampleCurriculumPanel } from "./components/example-curriculum-panel";
import { CurriculumBuilderPanel } from "./components/curriculum-builder-panel";
import { ActivityDetailDrawer } from "./components/activity-detail-drawer";
import { ActivityTemplates } from "./components/activity-templates";
import type { ExampleWeek } from "./examples-data";
import { OnboardingTour } from "./components/onboarding-tour";

// ── Types ──────────────────────────────────────────────────

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
  // Enhanced fields
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
  // Enhanced fields
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
  };
}

function generateId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizeActivity(a: any): WeekActivity {
  return {
    id: a.id ?? generateId(),
    title: a.title ?? "",
    type: a.type ?? "WARM_UP",
    durationMin: a.durationMin ?? 10,
    description: a.description ?? null,
    resources: a.resources ?? null,
    notes: a.notes ?? null,
    sortOrder: a.sortOrder ?? 0,
    materials: a.materials ?? null,
    differentiationTips: a.differentiationTips ?? null,
    energyLevel: a.energyLevel ?? null,
    standardsTags: Array.isArray(a.standardsTags) ? a.standardsTags : [],
    rubric: a.rubric ?? null,
  };
}

function normalizeWeek(w: any): WeekPlan {
  return {
    id: w.id ?? generateId(),
    weekNumber: w.weekNumber ?? 1,
    sessionNumber: w.sessionNumber ?? 1,
    title: w.title ?? "",
    classDurationMin: w.classDurationMin ?? 60,
    activities: Array.isArray(w.activities) ? w.activities.map(normalizeActivity) : [],
    objective: w.objective ?? null,
    teacherPrepNotes: w.teacherPrepNotes ?? null,
    materialsChecklist: Array.isArray(w.materialsChecklist) ? w.materialsChecklist : [],
    atHomeAssignment: w.atHomeAssignment ?? null,
  };
}

// ── Component ──────────────────────────────────────────────

export function StudioClient({ userId, userName, draft }: StudioClientProps) {
  // ── State ────────────────────────────────────────────────
  const router = useRouter();
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [interestArea, setInterestArea] = useState(draft.interestArea);
  const [outcomes, setOutcomes] = useState<string[]>(draft.outcomes);
  const [courseConfig, setCourseConfig] = useState<StudioCourseConfig>(() =>
    normalizeCourseConfig(draft.courseConfig)
  );
  const [weeklyPlans, setWeeklyPlans] = useState<WeekPlan[]>(() => {
    return syncSessionPlansToCourseConfig(
      draft.weeklyPlans,
      draft.courseConfig
    ).map(normalizeWeek);
  });
  const [understandingChecks, setUnderstandingChecks] =
    useState<StudioUnderstandingChecks>(() =>
      normalizeUnderstandingChecks(draft.understandingChecks)
    );

  const [activeExampleTab, setActiveExampleTab] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSubmitted, setIsSubmitted] = useState(
    draft.status === "SUBMITTED" || draft.status === "APPROVED"
  );
  const reviewRubric: StudioReviewRubric = normalizeReviewRubric(draft.reviewRubric);
  const isApproved = draft.status === "APPROVED";
  const needsRevision = draft.status === "NEEDS_REVISION";

  // Activity drawer state (kept for mobile fallback)
  const [drawerWeekId, setDrawerWeekId] = useState<string | null>(null);
  const [drawerActivityId, setDrawerActivityId] = useState<string | null>(null);

  // Templates modal state
  const [templatesWeekId, setTemplatesWeekId] = useState<string | null>(null);

  // Mobile tab state
  const [mobileView, setMobileView] = useState<"examples" | "builder">("builder");

  // Onboarding tour state
  const [tourKey, setTourKey] = useState(0);

  // Version history state
  const [showHistory, setShowHistory] = useState(false);
  const [historyVersions, setHistoryVersions] = useState<HistoryVersion[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(`lds_history_${draft.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // ── Auto-save ────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

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
        },
      };
      setHistoryVersions((prev) => {
        const next = [version, ...prev].slice(0, 10);
        try {
          localStorage.setItem(`lds_history_${draft.id}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [draft.id]
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

  const triggerAutoSave = useCallback(
    (snapshot: DraftSnapshot) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!isMountedRef.current) return;
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
          if (isMountedRef.current) {
            setSaveStatus("saved");
            pushToHistory(snapshot);
          }
          setTimeout(() => {
            if (isMountedRef.current) setSaveStatus("idle");
          }, 2000);
        } catch {
          if (isMountedRef.current) setSaveStatus("error");
        }
      }, 1500);
    },
    [draft.id, pushToHistory]
  );

  // ── Field update handlers ────────────────────────────────

  const handleUpdate = useCallback(
    (field: string, value: unknown) => {
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
    [buildSnapshot, normalizePlansForConfig, triggerAutoSave, weeklyPlans]
  );

  const handleUpdateWeek = useCallback(
    (weekId: string, field: string, value: unknown) => {
      setWeeklyPlans((prev) => {
        const next = prev.map((w) =>
          w.id === weekId ? { ...w, [field]: value } : w
        );
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  const handleAddWeek = useCallback(() => {
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
  }, [buildSnapshot, courseConfig, normalizePlansForConfig, triggerAutoSave, weeklyPlans]);

  const handleRemoveWeek = useCallback(
    (weekId: string) => {
      setWeeklyPlans((prev) => {
        const next = prev.map((w) =>
          w.id === weekId
            ? {
                ...w,
                title: "",
                activities: [],
                objective: null,
                teacherPrepNotes: null,
                materialsChecklist: [],
                atHomeAssignment: null,
              }
            : w
        );
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  const handleDuplicateWeek = useCallback(
    (weekId: string) => {
      setWeeklyPlans((prev) => {
        const sourceIndex = prev.findIndex((w) => w.id === weekId);
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
    [buildSnapshot, triggerAutoSave]
  );

  const handleAddActivity = useCallback(
    (weekId: string, activity: Omit<WeekActivity, "id" | "sortOrder">) => {
      setWeeklyPlans((prev) => {
        const next = prev.map((w) => {
          if (w.id !== weekId) return w;
          const newActivity: WeekActivity = {
            ...activity,
            id: generateId(),
            sortOrder: w.activities.length,
          };
          return { ...w, activities: [...w.activities, newActivity] };
        });
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  const handleRemoveActivity = useCallback(
    (weekId: string, activityId: string) => {
      setWeeklyPlans((prev) => {
        const next = prev.map((w) => {
          if (w.id !== weekId) return w;
          return {
            ...w,
            activities: w.activities
              .filter((a) => a.id !== activityId)
              .map((a, i) => ({ ...a, sortOrder: i })),
          };
        });
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
      if (drawerActivityId === activityId) {
        setDrawerWeekId(null);
        setDrawerActivityId(null);
      }
    },
    [buildSnapshot, triggerAutoSave, drawerActivityId]
  );

  const handleUpdateActivity = useCallback(
    (weekId: string, activityId: string, fields: Partial<WeekActivity>) => {
      setWeeklyPlans((prev) => {
        const next = prev.map((w) => {
          if (w.id !== weekId) return w;
          return {
            ...w,
            activities: w.activities.map((a) =>
              a.id === activityId ? { ...a, ...fields } : a
            ),
          };
        });
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  const handleReorderActivities = useCallback(
    (weekId: string, activeId: string, overId: string) => {
      setWeeklyPlans((prev) => {
        const next = prev.map((w) => {
          if (w.id !== weekId) return w;
          const oldIndex = w.activities.findIndex((a) => a.id === activeId);
          const newIndex = w.activities.findIndex((a) => a.id === overId);
          if (oldIndex === -1 || newIndex === -1) return w;
          const items = [...w.activities];
          const [moved] = items.splice(oldIndex, 1);
          items.splice(newIndex, 0, moved);
          return { ...w, activities: items.map((a, i) => ({ ...a, sortOrder: i })) };
        });
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  const handleMoveActivityToWeek = useCallback(
    (fromWeekId: string, activityId: string, toWeekId: string) => {
      setWeeklyPlans((prev) => {
        const fromWeek = prev.find((w) => w.id === fromWeekId);
        const activity = fromWeek?.activities.find((a) => a.id === activityId);
        if (!activity) return prev;
        const next = prev.map((w) => {
          if (w.id === fromWeekId) {
            return {
              ...w,
              activities: w.activities
                .filter((a) => a.id !== activityId)
                .map((a, i) => ({ ...a, sortOrder: i })),
            };
          }
          if (w.id === toWeekId) {
            return {
              ...w,
              activities: [...w.activities, { ...activity, sortOrder: w.activities.length }],
            };
          }
          return w;
        });
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  const handleImportWeek = useCallback(
    (week: ExampleWeek) => {
      setWeeklyPlans((prev) => {
        const targetIndex = prev.findIndex(
          (plan) => !plan.title.trim() && plan.activities.length === 0
        );
        const resolvedIndex = targetIndex >= 0 ? targetIndex : prev.length - 1;
        const newWeek: WeekPlan = {
          ...prev[resolvedIndex],
          id: prev[resolvedIndex]?.id ?? generateId(),
          weekNumber: prev[resolvedIndex]?.weekNumber ?? 1,
          sessionNumber: prev[resolvedIndex]?.sessionNumber ?? 1,
          title: week.title,
          classDurationMin: courseConfig.classDurationMin,
          activities: week.activities.map((a, i) => ({
            id: generateId(),
            title: a.title,
            type: a.type,
            durationMin: a.durationMin,
            description: a.description,
            resources: null,
            notes: null,
            sortOrder: i,
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
          index === resolvedIndex ? newWeek : plan
        );
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, courseConfig.classDurationMin, triggerAutoSave]
  );

  // ── Tour seed handlers ─────────────────────────────────────

  const handleTourSeedHeader = useCallback(
    (info: { title: string; description: string; interestArea: string; outcomes: string[] }) => {
      setTitle(info.title);
      setDescription(info.description);
      setInterestArea(info.interestArea);
      setOutcomes(info.outcomes);
      triggerAutoSave(
        buildSnapshot({
          title: info.title,
          description: info.description,
          interestArea: info.interestArea,
          outcomes: info.outcomes,
        })
      );
    },
    [buildSnapshot, triggerAutoSave]
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
      setWeeklyPlans((prev) => {
        let cursor = 0;
        const next = prev.map((plan) => {
          if (
            cursor >= weeks.length ||
            (plan.title.trim().length > 0 && plan.activities.length > 0)
          ) {
            return plan;
          }

          const source = weeks[cursor];
          cursor += 1;
          return {
            ...plan,
            title: source.title,
            classDurationMin: source.classDurationMin,
            activities: source.activities.map((a, ai) => ({
              id: generateId(),
              title: a.title,
              type: a.type as ActivityType,
              durationMin: a.durationMin,
              description: a.description,
              resources: null,
              notes: null,
              sortOrder: ai,
              materials: null,
              differentiationTips: null,
              energyLevel: null,
              standardsTags: [],
              rubric: null,
            })),
            objective: source.objective,
            teacherPrepNotes: source.teacherPrepNotes,
            materialsChecklist: [],
            atHomeAssignment: {
              type: source.atHomeAssignment.type as AtHomeAssignmentType,
              title: source.atHomeAssignment.title,
              description: source.atHomeAssignment.description,
            },
          };
        });
        triggerAutoSave(buildSnapshot({ weeklyPlans: next }));
        return next;
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  // ── Drawer ───────────────────────────────────────────────

  const handleOpenDrawer = useCallback((weekId: string, activityId: string) => {
    setDrawerWeekId(weekId);
    setDrawerActivityId(activityId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerWeekId(null);
    setDrawerActivityId(null);
  }, []);

  const drawerActivity = (() => {
    if (!drawerWeekId || !drawerActivityId) return null;
    const week = weeklyPlans.find((w) => w.id === drawerWeekId);
    return week?.activities.find((a) => a.id === drawerActivityId) ?? null;
  })();

  // ── Templates modal ──────────────────────────────────────

  const handleOpenTemplates = useCallback((weekId: string) => {
    setTemplatesWeekId(weekId);
  }, []);

  const handleInsertTemplate = useCallback(
    (template: { title: string; type: ActivityType; durationMin: number; description: string }) => {
      if (!templatesWeekId) return;
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
    },
    [templatesWeekId, handleAddActivity]
  );

  // ── PDF export ───────────────────────────────────────────

  const handleExportPdf = useCallback((type: "student" | "instructor") => {
    window.open(
      `/instructor/lesson-design-studio/print?draftId=${draft.id}&type=${type}`,
      "_blank"
    );
  }, [draft.id]);

  // ── Submit ───────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    try {
      await submitCurriculumDraft(draft.id);
      setIsSubmitted(true);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit");
    }
  }, [draft.id, router]);

  // ── Version history restore ──────────────────────────────

  const handleRestoreVersion = useCallback(
    (version: HistoryVersion) => {
      const { snapshot } = version;
      setTitle(snapshot.title);
      setDescription(snapshot.description);
      setInterestArea(snapshot.interestArea);
      setOutcomes(snapshot.outcomes);
      setCourseConfig(snapshot.courseConfig);
      setWeeklyPlans(snapshot.weeklyPlans);
      setShowHistory(false);
      triggerAutoSave({
        ...buildSnapshot(),
        title: snapshot.title,
        description: snapshot.description,
        interestArea: snapshot.interestArea,
        outcomes: snapshot.outcomes,
        courseConfig: snapshot.courseConfig,
        weeklyPlans: snapshot.weeklyPlans,
      });
    },
    [buildSnapshot, triggerAutoSave]
  );

  const handleTourComplete = useCallback(() => {
    void markLessonDesignStudioTourComplete().catch(() => {});
  }, []);

  useEffect(() => {
    const normalized = normalizePlansForConfig(weeklyPlans, courseConfig);
    const changed = JSON.stringify(normalized) !== JSON.stringify(weeklyPlans);
    if (changed) {
      setWeeklyPlans(normalized);
    }
  }, [courseConfig, normalizePlansForConfig, weeklyPlans]);

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="cbs-studio">
      {/* Menu bar */}
      <div className="cbs-menubar">
        <div className="cbs-menubar-logo">
          <span className="cbs-menubar-icon">📚</span>
          <strong>Curriculum Builder Studio</strong>
        </div>
        <div className="cbs-menubar-spacer" />
        <div className="cbs-menubar-status">
          {saveStatus === "saving" && <span className="cbs-status-saving">Saving...</span>}
          {saveStatus === "saved" && <span className="cbs-status-saved">✓ Auto-saved</span>}
          {saveStatus === "error" && <span className="cbs-status-error">Save failed</span>}
          {isSubmitted && <span className="cbs-status-submitted">✓ Submitted</span>}
          {isApproved && <span className="cbs-status-submitted">Launch Ready</span>}
          {needsRevision && <span className="cbs-status-error">Revision Requested</span>}
          <button
            className="cbs-menubar-tour-btn"
            onClick={() => {
              try { localStorage.removeItem("lds_onboarding_done"); } catch {}
              setTourKey((k) => k + 1);
            }}
            type="button"
          >
            ? Tour
          </button>
          {historyVersions.length > 0 && (
            <button
              className="cbs-menubar-history-btn"
              onClick={() => setShowHistory(true)}
              type="button"
            >
              History
            </button>
          )}
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="cbs-mobile-tabs">
        <button
          className={`cbs-mobile-tab ${mobileView === "examples" ? "active" : ""}`}
          onClick={() => setMobileView("examples")}
          type="button"
        >
          Examples
        </button>
        <button
          className={`cbs-mobile-tab ${mobileView === "builder" ? "active" : ""}`}
          onClick={() => setMobileView("builder")}
          type="button"
        >
          My Curriculum
        </button>
      </div>

      {/* Split screen */}
      {(needsRevision || isApproved || draft.generatedTemplateId) && (
        <div
          className="card"
          style={{
            margin: "16px 0 12px",
            background: isApproved ? "#ecfdf5" : "#fff7ed",
            border: `1px solid ${isApproved ? "#86efac" : "#fdba74"}`,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>
            {isApproved ? "Teaching Launch Hub" : "Reviewer Feedback"}
          </h3>
          <p style={{ marginTop: 0, fontSize: 14, color: "var(--muted)" }}>
            {isApproved
              ? "Your first curriculum has been approved. The launch package below is now the stable version that feeds the rest of the instructor workflow."
              : draft.reviewNotes || "A reviewer asked for revisions. Use the notes below to tighten the curriculum before resubmitting."}
          </p>

          {reviewRubric.summary ? (
            <p style={{ marginTop: 0, fontSize: 14 }}>{reviewRubric.summary}</p>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {draft.generatedTemplateId ? (
              <>
                <a
                  href={`/instructor/curriculum-builder#edit-${draft.generatedTemplateId}`}
                  className="button secondary"
                  style={{ textDecoration: "none" }}
                >
                  Open Curriculum Template
                </a>
                <a
                  href={`/lesson-plans?templateId=${draft.generatedTemplateId}`}
                  className="button secondary"
                  style={{ textDecoration: "none" }}
                >
                  Open Generated Lesson Plans
                </a>
                <a
                  href={`/instructor/class-settings?template=${draft.generatedTemplateId}`}
                  className="button primary"
                  style={{ textDecoration: "none" }}
                >
                  Create First Offering
                </a>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="cbs-split">
        <div className={`cbs-split-left ${mobileView === "examples" ? "cbs-mobile-visible" : "cbs-mobile-hidden"}`}>
          <ExampleCurriculumPanel
            activeTab={activeExampleTab}
            interestArea={interestArea}
            onTabChange={setActiveExampleTab}
            onImportWeek={handleImportWeek}
          />
        </div>

        <div className={`cbs-split-right ${mobileView === "builder" ? "cbs-mobile-visible" : "cbs-mobile-hidden"}`}>
          <CurriculumBuilderPanel
            title={title}
            description={description}
            interestArea={interestArea}
            outcomes={outcomes}
            courseConfig={courseConfig}
            weeklyPlans={weeklyPlans}
            understandingChecks={understandingChecks}
            reviewRubric={reviewRubric}
            reviewStatus={draft.status}
            reviewNotes={draft.reviewNotes}
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
            onOpenDrawer={handleOpenDrawer}
            onOpenTemplates={handleOpenTemplates}
            saveStatus={saveStatus}
            onExportPdf={handleExportPdf}
            onSubmit={handleSubmit}
            isSubmitted={isSubmitted}
            generatedTemplateId={draft.generatedTemplateId}
          />
        </div>
      </div>

      {/* Activity detail drawer (mobile fallback) */}
      <ActivityDetailDrawer
        activity={drawerActivity}
        onUpdate={(id, fields) => {
          if (drawerWeekId) handleUpdateActivity(drawerWeekId, id, fields);
        }}
        onClose={handleCloseDrawer}
      />

      {/* Activity templates modal */}
      <ActivityTemplates
        open={templatesWeekId !== null}
        onClose={() => setTemplatesWeekId(null)}
        onInsert={handleInsertTemplate}
      />

      {/* Onboarding tour */}
      <OnboardingTour
        key={tourKey}
        onSeedHeader={handleTourSeedHeader}
        onSeedWeeks={handleTourSeedWeeks}
        onComplete={handleTourComplete}
      />

      {/* Version history modal */}
      {showHistory && (
        <div className="cbs-modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="cbs-history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cbs-history-header">
              <h3 className="cbs-history-title">Version History</h3>
              <button className="cbs-modal-close" onClick={() => setShowHistory(false)}>×</button>
            </div>
            <div className="cbs-history-body">
              {historyVersions.length === 0 ? (
                <p className="cbs-history-empty">No saved versions yet. Versions are saved automatically as you work.</p>
              ) : (
                historyVersions.map((v, i) => (
                  <div key={i} className="cbs-history-item">
                    <div className="cbs-history-item-info">
                      <span className="cbs-history-item-title">{v.snapshot.title || "Untitled"}</span>
                      <span className="cbs-history-item-time">
                        {new Date(v.savedAt).toLocaleString()}
                      </span>
                      <span className="cbs-history-item-meta">
                        {v.snapshot.weeklyPlans.length} session{v.snapshot.weeklyPlans.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <button
                      className="cbs-btn cbs-btn-secondary"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      onClick={() => handleRestoreVersion(v)}
                      type="button"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
