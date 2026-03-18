"use client";

import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LESSON_DESIGN_UNDERSTANDING_QUESTIONS,
  MIN_ACTIVITIES_PER_SESSION,
  MIN_CURRICULUM_OUTCOMES,
  UNDERSTANDING_PASS_SCORE_PCT,
  buildSessionLabel,
  buildUnderstandingChecksState,
  getCurriculumDraftProgress,
  type CurriculumDraftProgress,
  type StudioCourseConfig,
  type StudioReviewRubric,
  type StudioUnderstandingChecks,
} from "@/lib/curriculum-draft-progress";
import type { StudioEntryContext, StudioPhase } from "@/lib/lesson-design-studio";
import type { SeedCurriculum } from "../curriculum-seeds";

/* ── Types ─────────────────────────────────────────────────── */

type ActivityType =
  | "WARM_UP"
  | "INSTRUCTION"
  | "PRACTICE"
  | "DISCUSSION"
  | "ASSESSMENT"
  | "BREAK"
  | "REFLECTION"
  | "GROUP_WORK";

type EnergyLevel = "HIGH" | "MEDIUM" | "LOW";

type AtHomeAssignmentType =
  | "REFLECTION_PROMPT"
  | "PRACTICE_TASK"
  | "QUIZ"
  | "PRE_READING";

interface AtHomeAssignment {
  type: AtHomeAssignmentType;
  title: string;
  description: string;
}

interface WeekActivity {
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

interface WeekPlan {
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

interface CurriculumBuilderPanelProps {
  userName: string;
  activePhase: StudioPhase;
  entryContext: StudioEntryContext;
  title: string;
  description: string;
  interestArea: string;
  outcomes: string[];
  courseConfig: StudioCourseConfig;
  weeklyPlans: WeekPlan[];
  understandingChecks: StudioUnderstandingChecks;
  reviewRubric: StudioReviewRubric;
  reviewStatus: string;
  reviewNotes: string;
  progress: CurriculumDraftProgress;
  starterScaffolds: SeedCurriculum[];
  recommendedScaffoldId: string;
  onUpdate: (field: string, value: any) => void;
  onUpdateWeek: (weekId: string, field: string, value: any) => void;
  onAddWeek: () => void;
  onRemoveWeek: (weekId: string) => void;
  onDuplicateWeek: (weekId: string) => void;
  onAddActivity: (weekId: string, activity: Omit<WeekActivity, "id" | "sortOrder">) => void;
  onRemoveActivity: (weekId: string, activityId: string) => void;
  onUpdateActivity: (weekId: string, activityId: string, fields: Partial<WeekActivity>) => void;
  onReorderActivities: (weekId: string, activeId: string, overId: string) => void;
  onMoveActivityToWeek: (fromWeekId: string, activityId: string, toWeekId: string) => void;
  onOpenTemplates: (weekId: string) => void;
  onOpenExamplesLibrary: (targetPlanId?: string | null) => void;
  onApplyStarterScaffold: (seed: SeedCurriculum) => void;
  onPhaseChange: (phase: StudioPhase) => void;
  onExportPdf: (type: "student" | "instructor") => void;
  onSubmit: () => void;
  isSubmitted: boolean;
  generatedTemplateId: string | null;
  launchActionsReady: boolean;
  hasCourseMap: boolean;
  nonEmptyOutcomeCount: number;
  needsRevision: boolean;
  isApproved: boolean;
}

/* ── Constants ─────────────────────────────────────────────── */

const ACTIVITY_TYPES: Array<{
  value: ActivityType;
  label: string;
  color: string;
  icon: string;
  defaultDuration: number;
}> = [
  { value: "WARM_UP",     label: "Warm Up",     color: "#f59e0b", icon: "☀",  defaultDuration: 8  },
  { value: "INSTRUCTION", label: "Instruction", color: "#3b82f6", icon: "📚", defaultDuration: 15 },
  { value: "PRACTICE",    label: "Practice",    color: "#22c55e", icon: "✍",  defaultDuration: 12 },
  { value: "DISCUSSION",  label: "Discussion",  color: "#8b5cf6", icon: "💬", defaultDuration: 10 },
  { value: "ASSESSMENT",  label: "Assessment",  color: "#ef4444", icon: "📋", defaultDuration: 8  },
  { value: "BREAK",       label: "Break",       color: "#6b7280", icon: "☕", defaultDuration: 5  },
  { value: "REFLECTION",  label: "Reflection",  color: "#ec4899", icon: "💭", defaultDuration: 6  },
  { value: "GROUP_WORK",  label: "Group Work",  color: "#14b8a6", icon: "👥", defaultDuration: 12 },
];

const AT_HOME_TYPES: Array<{
  value: AtHomeAssignmentType;
  label: string;
  icon: string;
}> = [
  { value: "REFLECTION_PROMPT", label: "Reflection Prompt",     icon: "✍" },
  { value: "PRACTICE_TASK",     label: "Practice Task",         icon: "🎯" },
  { value: "QUIZ",              label: "Quiz / Knowledge Check", icon: "📝" },
  { value: "PRE_READING",       label: "Pre-Reading / Video",   icon: "📖" },
];

const ENERGY_LEVELS: Array<{
  value: EnergyLevel;
  label: string;
  icon: string;
  color: string;
}> = [
  { value: "LOW",    label: "Low Energy",    icon: "🧘", color: "#3b82f6" },
  { value: "MEDIUM", label: "Medium Energy", icon: "🎯", color: "#f59e0b" },
  { value: "HIGH",   label: "High Energy",   icon: "⚡", color: "#ef4444" },
];

const FINANCIAL_TAGS = [
  "Budgeting", "Saving", "Credit", "Investing",
  "Banking", "Spending", "Insurance", "Taxes",
];

const SEL_TAGS = [
  "Self-Awareness", "Self-Management", "Social Awareness",
  "Relationship Skills", "Decision Making",
];

const DELIVERY_MODE_OPTIONS = [
  { value: "VIRTUAL", label: "Virtual" },
  { value: "IN_PERSON", label: "In Person" },
  { value: "HYBRID", label: "Hybrid" },
] as const;

const DIFFICULTY_LEVEL_OPTIONS = [
  { value: "LEVEL_101", label: "Level 101" },
  { value: "LEVEL_201", label: "Level 201" },
  { value: "LEVEL_301", label: "Level 301" },
  { value: "LEVEL_401", label: "Level 401" },
] as const;

/* ── Helpers ───────────────────────────────────────────────── */

function getActivityConfig(type: ActivityType) {
  return ACTIVITY_TYPES.find((t) => t.value === type) ?? ACTIVITY_TYPES[0];
}

/* ── HelpTooltip ───────────────────────────────────────────── */

function HelpTooltip({ tip }: { tip: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="cbs-help-tooltip-wrapper" style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="cbs-help-tooltip-btn"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-label="Help"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1px solid #cbd5e1",
          background: "transparent",
          color: "#64748b",
          fontSize: 10,
          fontWeight: 700,
          cursor: "pointer",
          lineHeight: 1,
          marginLeft: 4,
          padding: 0,
          verticalAlign: "middle",
        }}
      >
        ?
      </button>
      {open && (
        <span
          className="cbs-help-tooltip-popover"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fffdf8",
            color: "#334155",
            fontSize: 12,
            borderRadius: 6,
            padding: "6px 10px",
            whiteSpace: "normal",
            width: 220,
            zIndex: 9999,
            border: "1px solid #e2e8f0",
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
            pointerEvents: "none",
          }}
        >
          {tip}
        </span>
      )}
    </span>
  );
}

/* ── SortableActivity ──────────────────────────────────────── */

interface SortableActivityProps {
  activity: WeekActivity;
  weekId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateActivity: (weekId: string, activityId: string, fields: Partial<WeekActivity>) => void;
  onRemoveActivity: (weekId: string, activityId: string) => void;
  allWeeks: WeekPlan[];
  onMoveToWeek: (toWeekId: string) => void;
}

function SortableActivity({
  activity,
  weekId,
  isExpanded,
  onToggle,
  onUpdateActivity,
  onRemoveActivity,
  allWeeks,
  onMoveToWeek,
}: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = getActivityConfig(activity.type);

  const [customTagInput, setCustomTagInput] = useState("");

  function update(fields: Partial<WeekActivity>) {
    onUpdateActivity(weekId, activity.id, fields);
  }

  function toggleTag(tag: string) {
    const current = activity.standardsTags ?? [];
    if (current.includes(tag)) {
      update({ standardsTags: current.filter((t) => t !== tag) });
    } else {
      update({ standardsTags: [...current, tag] });
    }
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    const current = activity.standardsTags ?? [];
    if (!current.includes(trimmed)) {
      update({ standardsTags: [...current, trimmed] });
    }
    setCustomTagInput("");
  }

  const otherWeeks = allWeeks.filter((w) => w.id !== weekId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cbs-activity-item${isExpanded ? " cbs-activity-expanded" : ""}`}
    >
      {/* Row */}
      <div className="cbs-activity-row">
        <span
          className="cbs-activity-drag-handle"
          {...attributes}
          {...listeners}
          style={{ cursor: "grab", color: "#94a3b8", fontSize: 16, lineHeight: 1, padding: "0 4px" }}
        >
          ⠿
        </span>

        <button
          type="button"
          className="cbs-activity-expand-btn"
          onClick={onToggle}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: 12,
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          {isExpanded ? "▼" : "▶"}
        </button>

        <span
          className="cbs-activity-type-badge"
          style={{
            background: `${config.color}22`,
            color: config.color,
            border: `1px solid ${config.color}44`,
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {config.icon} {config.label}
        </span>

        <span
          className="cbs-activity-title"
          title={activity.title}
          style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}
        >
          {activity.title}
        </span>

        {/* Duration trio */}
        <span className="cbs-activity-duration-trio" style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button
            type="button"
            onClick={() => update({ durationMin: Math.max(1, activity.durationMin - 1) })}
            style={{ background: "none", border: "1px solid #334155", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 12, lineHeight: 1, color: "#94a3b8", padding: 0 }}
            aria-label="Decrease duration"
          >
            −
          </button>
          <span style={{ minWidth: 36, textAlign: "center", fontSize: 12, color: "#e2e8f0" }}>
            {activity.durationMin}m
          </span>
          <button
            type="button"
            onClick={() => update({ durationMin: activity.durationMin + 1 })}
            style={{ background: "none", border: "1px solid #334155", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 12, lineHeight: 1, color: "#94a3b8", padding: 0 }}
            aria-label="Increase duration"
          >
            +
          </button>
        </span>

        <button
          className="cbs-activity-delete-btn"
          onClick={() => onRemoveActivity(weekId, activity.id)}
          type="button"
          aria-label="Remove activity"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16, lineHeight: 1, padding: "0 4px" }}
        >
          ×
        </button>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="cbs-activity-detail" style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #1e293b" }}>

          {/* Title input */}
          <input
            className="cbs-expand-title-input"
            value={activity.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Activity title..."
            style={{ fontSize: 15, fontWeight: 600, padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", width: "100%", boxSizing: "border-box" }}
          />

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
              What will students do? Describe the activity in detail.
            </label>
            <textarea
              rows={4}
              value={activity.description ?? ""}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe what students will do during this activity..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Materials */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
              Materials Needed
            </label>
            <textarea
              rows={2}
              value={activity.materials ?? ""}
              onChange={(e) => update({ materials: e.target.value })}
              placeholder="e.g., printed worksheets, markers, index cards..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Energy Level */}
          <div>
            <label style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
              Energy Level
              <HelpTooltip tip="How much movement and engagement does this activity require?" />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {ENERGY_LEVELS.map((el) => {
                const isSelected = activity.energyLevel === el.value;
                return (
                  <button
                    key={el.value}
                    type="button"
                    onClick={() => update({ energyLevel: isSelected ? null : el.value })}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 16,
                      border: `1px solid ${isSelected ? el.color : "#334155"}`,
                      background: isSelected ? `${el.color}22` : "transparent",
                      color: isSelected ? el.color : "#94a3b8",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {el.icon} {el.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Differentiation Tips */}
          <div>
            <label style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
              Differentiation Tips
              <HelpTooltip tip="Strategies to support struggling students or challenge advanced learners in the same activity." />
            </label>
            <textarea
              rows={2}
              value={activity.differentiationTips ?? ""}
              onChange={(e) => update({ differentiationTips: e.target.value })}
              placeholder="How to support struggling students or challenge advanced ones..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Standards Tags */}
          <div>
            <label style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
              Standards Alignment
              <HelpTooltip tip="Tag competencies this activity aligns to." />
            </label>

            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Financial Literacy</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {FINANCIAL_TAGS.map((tag) => {
                  const selected = (activity.standardsTags ?? []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 12,
                        border: `1px solid ${selected ? "#3b82f6" : "#334155"}`,
                        background: selected ? "#3b82f622" : "transparent",
                        color: selected ? "#3b82f6" : "#94a3b8",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>SEL Competencies</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {SEL_TAGS.map((tag) => {
                  const selected = (activity.standardsTags ?? []).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: "2px 8px",
                        borderRadius: 12,
                        border: `1px solid ${selected ? "#8b5cf6" : "#334155"}`,
                        background: selected ? "#8b5cf622" : "transparent",
                        color: selected ? "#8b5cf6" : "#94a3b8",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom tag input */}
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                placeholder="Add custom tag..."
                style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 12 }}
              />
              <button
                type="button"
                onClick={addCustomTag}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
              >
                Add
              </button>
            </div>

            {/* Selected tags */}
            {(activity.standardsTags ?? []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(activity.standardsTags ?? []).map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "#1e293b",
                      border: "1px solid #334155",
                      color: "#e2e8f0",
                      fontSize: 11,
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 12, lineHeight: 1, padding: 0 }}
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Rubric (Assessment only) */}
          {activity.type === "ASSESSMENT" && (
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
                Rubric / Grading Criteria
              </label>
              <textarea
                rows={3}
                value={activity.rubric ?? ""}
                onChange={(e) => update({ rubric: e.target.value })}
                placeholder="Describe how this will be graded or evaluated..."
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* Resources */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
              Resources (links, handouts, tools)
            </label>
            <textarea
              rows={2}
              value={activity.resources ?? ""}
              onChange={(e) => update({ resources: e.target.value })}
              placeholder="Links, handouts, or tools for this activity..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
              Instructor Notes
            </label>
            <textarea
              rows={2}
              value={activity.notes ?? ""}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Private notes for you as the instructor..."
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Move to Another Week */}
          {otherWeeks.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>
                Move to Session:
              </label>
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onMoveToWeek(e.target.value);
                  }
                }}
                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: 12 }}
              >
                <option value="" disabled>Select week...</option>
                {otherWeeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    Week {w.weekNumber}: {w.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── WeekDetailSection ─────────────────────────────────────── */

interface WeekDetailSectionProps {
  week: WeekPlan;
  onUpdateWeek: (weekId: string, field: string, value: any) => void;
}

function WeekDetailSection({ week, onUpdateWeek }: WeekDetailSectionProps) {
  const [atHomeEnabled, setAtHomeEnabled] = useState(!!week.atHomeAssignment);

  function handleAtHomeToggle(enabled: boolean) {
    setAtHomeEnabled(enabled);
    if (!enabled) {
      onUpdateWeek(week.id, "atHomeAssignment", null);
    } else {
      onUpdateWeek(week.id, "atHomeAssignment", {
        type: "REFLECTION_PROMPT",
        title: "",
        description: "",
      });
    }
  }

  function handleChecklist(index: number, value: string) {
    const next = [...(week.materialsChecklist ?? [])];
    next[index] = value;
    onUpdateWeek(week.id, "materialsChecklist", next);
  }

  function handleAddChecklistItem() {
    onUpdateWeek(week.id, "materialsChecklist", [...(week.materialsChecklist ?? []), ""]);
  }

  function handleRemoveChecklistItem(index: number) {
    onUpdateWeek(week.id, "materialsChecklist", (week.materialsChecklist ?? []).filter((_, i) => i !== index));
  }

  return (
    <div
      className="cbs-week-detail-section"
      style={{
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        borderTop: "1px solid #e5e7eb",
        background: "#fffaf5",
      }}
    >

      {/* Session Objective */}
      <div>
        <label style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
          Session Objective
          <HelpTooltip tip="A specific, measurable goal for this single class session" />
        </label>
        <input
          value={week.objective ?? ""}
          onChange={(e) => onUpdateWeek(week.id, "objective", e.target.value)}
          placeholder="What will students be able to do after this class?"
          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #d6d3d1", background: "#ffffff", color: "#111827", fontSize: 13, boxSizing: "border-box" }}
        />
      </div>

      {/* Teacher Prep Notes */}
      <div>
        <label style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
          Teacher Prep Notes
          <HelpTooltip tip="Things you need to prepare before class — copies to print, room arrangement, supplies to gather, etc." />
        </label>
        <textarea
          rows={3}
          value={week.teacherPrepNotes ?? ""}
          onChange={(e) => onUpdateWeek(week.id, "teacherPrepNotes", e.target.value)}
          placeholder="What do you need to prepare before class? e.g., print 30 copies of worksheet, set up group tables..."
          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #d6d3d1", background: "#ffffff", color: "#111827", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
        />
      </div>

      {/* Materials Checklist */}
      <div>
        <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          Materials Checklist
        </label>
        {(week.materialsChecklist ?? []).map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <input
              value={item}
              onChange={(e) => handleChecklist(i, e.target.value)}
              placeholder={`Item ${i + 1}...`}
              style={{ flex: 1, padding: "4px 8px", borderRadius: 6, border: "1px solid #d6d3d1", background: "#ffffff", color: "#111827", fontSize: 12 }}
            />
            <button
              type="button"
              onClick={() => handleRemoveChecklistItem(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 16, lineHeight: 1, padding: "0 4px" }}
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddChecklistItem}
          style={{ fontSize: 12, color: "#b45309", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}
        >
          + Add Item
        </button>
      </div>

      {/* At-Home Assignment */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: atHomeEnabled ? 10 : 0 }}>
          <label style={{ fontSize: 12, color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={atHomeEnabled}
              onChange={(e) => handleAtHomeToggle(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            At-Home Assignment
          </label>
        </div>

        {atHomeEnabled && week.atHomeAssignment && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4 }}>
            <select
              value={week.atHomeAssignment.type}
              onChange={(e) =>
                onUpdateWeek(week.id, "atHomeAssignment", {
                  ...week.atHomeAssignment,
                  type: e.target.value as AtHomeAssignmentType,
                })
              }
              style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #d6d3d1", background: "#ffffff", color: "#111827", fontSize: 13 }}
            >
              {AT_HOME_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
            <input
              value={week.atHomeAssignment.title}
              onChange={(e) =>
                onUpdateWeek(week.id, "atHomeAssignment", {
                  ...week.atHomeAssignment,
                  title: e.target.value,
                })
              }
              placeholder="Assignment title..."
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d6d3d1", background: "#ffffff", color: "#111827", fontSize: 13 }}
            />
            <textarea
              rows={3}
              value={week.atHomeAssignment.description}
              onChange={(e) =>
                onUpdateWeek(week.id, "atHomeAssignment", {
                  ...week.atHomeAssignment,
                  description: e.target.value,
                })
              }
              placeholder="Describe the assignment..."
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d6d3d1", background: "#ffffff", color: "#111827", fontSize: 13, resize: "vertical" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Progress + Teaching Support ───────────────────────────── */

function SectionNote({ label, note }: { label: string; note: string }) {
  if (!note.trim()) return null;

  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        fontSize: 12,
        color: "#7c2d12",
      }}
    >
      <strong style={{ color: "#9a3412" }}>{label}:</strong> {note}
    </div>
  );
}

interface ProgressBarProps {
  title: string;
  interestArea: string;
  outcomes: string[];
  courseConfig: StudioCourseConfig;
  weeklyPlans: WeekPlan[];
  understandingChecks: StudioUnderstandingChecks;
}

function ProgressBar({
  title,
  interestArea,
  outcomes,
  courseConfig,
  weeklyPlans,
  understandingChecks,
}: ProgressBarProps) {
  const progress = getCurriculumDraftProgress({
    title,
    interestArea,
    outcomes,
    courseConfig,
    weeklyPlans,
    understandingChecks,
  });

  const checks = [
    {
      label: "Overview is filled out",
      pass: title.trim().length > 0 && interestArea.trim().length > 0,
    },
    {
      label: `At least ${MIN_CURRICULUM_OUTCOMES} learning outcomes`,
      pass: outcomes.filter((o) => o.trim()).length >= MIN_CURRICULUM_OUTCOMES,
    },
    {
      label: "Every session has a title",
      pass: progress.sessionsWithTitles === progress.totalSessionsExpected,
    },
    {
      label: "Every session has an objective",
      pass: progress.sessionsWithObjectives === progress.totalSessionsExpected,
    },
    {
      label: `Every session has ${MIN_ACTIVITIES_PER_SESSION}+ activities`,
      pass:
        progress.sessionsWithThreeActivities === progress.totalSessionsExpected,
    },
    {
      label: "Every session includes at-home work",
      pass:
        progress.sessionsWithAtHomeAssignments ===
        progress.totalSessionsExpected,
    },
    {
      label: "Every session fits the time budget",
      pass:
        progress.sessionsWithinTimeBudget === progress.totalSessionsExpected,
    },
    {
      label: `Understanding check passed (${UNDERSTANDING_PASS_SCORE_PCT}%+)`,
      pass: progress.understandingChecksPassed,
    },
  ];

  const passCount = checks.filter((check) => check.pass).length;
  const pct = Math.round((passCount / checks.length) * 100);

  return (
    <div className="cbs-progress-section" style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            Ready-to-teach progress
          </div>
          <div style={{ fontSize: 13, color: "#f8fafc", fontWeight: 600 }}>
            {progress.fullyBuiltSessions}/{progress.totalSessionsExpected} session
            {progress.totalSessionsExpected === 1 ? "" : "s"} fully built
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            color: progress.readyForSubmission ? "#22c55e" : "#f59e0b",
            fontWeight: 700,
          }}
        >
          {progress.readyForSubmission ? "Ready to submit" : `${pct}% complete`}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: "#1e293b",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: progress.readyForSubmission ? "#22c55e" : "#38bdf8",
            borderRadius: 999,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {checks.map((check) => (
          <span
            key={check.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 999,
              border: `1px solid ${check.pass ? "#22c55e44" : "#334155"}`,
              background: check.pass ? "#22c55e11" : "transparent",
              color: check.pass ? "#22c55e" : "#94a3b8",
            }}
          >
            {check.pass ? "✓" : "○"} {check.label}
          </span>
        ))}
      </div>
      {!progress.readyForSubmission && progress.submissionIssues.length > 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#172554",
            border: "1px solid #1d4ed8",
            fontSize: 12,
            color: "#bfdbfe",
          }}
        >
          This studio is meant to leave applicants with a full curriculum they
          can really teach. Keep going until every session is complete and the
          understanding check is passed.
        </div>
      ) : null}
    </div>
  );
}

interface UnderstandingCheckSectionProps {
  understandingChecks: StudioUnderstandingChecks;
  onUpdate: (field: string, value: unknown) => void;
}

function UnderstandingCheckSection({
  understandingChecks,
  onUpdate,
}: UnderstandingCheckSectionProps) {
  const answeredCount = Object.keys(understandingChecks.answers).length;
  const scoreLabel =
    typeof understandingChecks.lastScorePct === "number"
      ? `${understandingChecks.lastScorePct}%`
      : "Not graded yet";

  function handleAnswer(questionId: string, answer: string) {
    const nextAnswers = {
      ...understandingChecks.answers,
      [questionId]: answer,
    };
    onUpdate("understandingChecks", buildUnderstandingChecksState(nextAnswers));
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        border: "1px solid #334155",
        background: "#0f172a",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "start",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: "#f8fafc" }}>Why this works check</h3>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
            These quick questions make sure the builder is teaching curriculum
            design, not just collecting fields.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            {answeredCount}/{LESSON_DESIGN_UNDERSTANDING_QUESTIONS.length} answered
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: understandingChecks.passed ? "#22c55e" : "#f59e0b",
            }}
          >
            {understandingChecks.passed
              ? `Passed at ${scoreLabel}`
              : `Current score: ${scoreLabel}`}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {LESSON_DESIGN_UNDERSTANDING_QUESTIONS.map((question, questionIndex) => {
          const selected = understandingChecks.answers[question.id] ?? "";
          const answered = selected.length > 0;
          const correct = answered && selected === question.correctAnswer;

          return (
            <div
              key={question.id}
              style={{
                border: "1px solid #1e293b",
                borderRadius: 10,
                padding: 14,
                background: "#111827",
              }}
            >
              <p style={{ margin: "0 0 10px", color: "#f8fafc", fontWeight: 600 }}>
                {questionIndex + 1}. {question.prompt}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                {question.options.map((option) => (
                  <label
                    key={option}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "start",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#cbd5e1",
                    }}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={selected === option}
                      onChange={() => handleAnswer(question.id, option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              {answered ? (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: correct ? "#052e16" : "#3f1d1d",
                    border: `1px solid ${correct ? "#166534" : "#7f1d1d"}`,
                    color: correct ? "#bbf7d0" : "#fecaca",
                    fontSize: 12,
                  }}
                >
                  <strong>{correct ? "Right idea." : "Not quite yet."}</strong>{" "}
                  {question.explanation}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!understandingChecks.passed ? (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#fbbf24" }}>
          Submission unlocks after this check is passed at {UNDERSTANDING_PASS_SCORE_PCT}% or higher.
        </p>
      ) : null}
    </div>
  );
}

/* ── SubmitModal ───────────────────────────────────────────── */

interface SubmitModalProps {
  title: string;
  interestArea: string;
  outcomes: string[];
  courseConfig: StudioCourseConfig;
  weeklyPlans: WeekPlan[];
  understandingChecks: StudioUnderstandingChecks;
  onClose: () => void;
  onSubmit: () => void;
}

function SubmitModal({
  title,
  interestArea,
  outcomes,
  courseConfig,
  weeklyPlans,
  understandingChecks,
  onClose,
  onSubmit,
}: SubmitModalProps) {
  const progress = getCurriculumDraftProgress({
    title,
    interestArea,
    outcomes,
    courseConfig,
    weeklyPlans,
    understandingChecks,
  });

  return (
    <div
      className="cbs-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.28)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="cbs-modal"
        style={{
          background: "#fffdf8",
          border: "1px solid #e7dccb",
          borderRadius: 12,
          padding: 28,
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.18)",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "#1f2937", fontWeight: 700 }}>
          Submit full curriculum
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>
          The goal here is not just finishing a form. It is leaving with a full,
          teachable curriculum package.
        </p>

        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 8,
            background: progress.readyForSubmission ? "#052e16" : "#172554",
            border: `1px solid ${progress.readyForSubmission ? "#166534" : "#1d4ed8"}`,
            color: progress.readyForSubmission ? "#bbf7d0" : "#bfdbfe",
            fontSize: 13,
          }}
        >
          {progress.readyForSubmission
            ? `Everything is ready. ${progress.fullyBuiltSessions} of ${progress.totalSessionsExpected} sessions are fully built.`
            : `${progress.fullyBuiltSessions} of ${progress.totalSessionsExpected} sessions are fully built so far.`}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {progress.submissionIssues.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: "#22c55e11",
                border: "1px solid #22c55e33",
                color: "#86efac",
                fontSize: 13,
              }}
            >
              <span style={{ fontSize: 16 }}>✓</span>
              Ready for curriculum review.
            </div>
          ) : (
            progress.submissionIssues.map((issue) => (
              <div
                key={issue}
                style={{
                  display: "flex",
                  alignItems: "start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#ef444411",
                  border: "1px solid #ef444433",
                  color: "#fecaca",
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>✗</span>
                <span>{issue}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #d6d3d1",
              background: "#ffffff",
              color: "#475569",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {progress.readyForSubmission ? "Cancel" : "Keep building"}
          </button>
          {progress.readyForSubmission ? (
            <button
              type="button"
              onClick={() => {
                onSubmit();
                onClose();
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#22c55e",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Submit curriculum for review
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── ExportPdfDropdown ─────────────────────────────────────── */

interface ExportPdfDropdownProps {
  onExportPdf: (type: "student" | "instructor") => void;
}

function ExportPdfDropdown({ onExportPdf }: ExportPdfDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="cbs-btn cbs-btn-secondary"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{ display: "flex", alignItems: "center", gap: 4 }}
      >
        Export PDF <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            background: "#fffdf8",
            border: "1px solid #e7dccb",
            borderRadius: 8,
            boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
            minWidth: 200,
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          <button
            type="button"
            onClick={() => { onExportPdf("student"); setOpen(false); }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "10px 14px",
              background: "none",
              border: "none",
              color: "#1f2937",
              fontSize: 13,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Student View (clean schedule)
          </button>
          <button
            type="button"
            onClick={() => { onExportPdf("instructor"); setOpen(false); }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "10px 14px",
              background: "none",
              border: "none",
              color: "#1f2937",
              fontSize: 13,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Instructor Guide (full details)
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */

export function CurriculumBuilderPanel({
  userName,
  activePhase,
  entryContext,
  title,
  description,
  interestArea,
  outcomes,
  courseConfig,
  weeklyPlans,
  understandingChecks,
  reviewRubric,
  reviewStatus,
  reviewNotes,
  progress,
  starterScaffolds,
  recommendedScaffoldId,
  onUpdate,
  onUpdateWeek,
  onAddWeek,
  onRemoveWeek,
  onDuplicateWeek,
  onAddActivity,
  onRemoveActivity,
  onUpdateActivity,
  onReorderActivities,
  onMoveActivityToWeek,
  onOpenTemplates,
  onOpenExamplesLibrary,
  onApplyStarterScaffold,
  onPhaseChange,
  onExportPdf,
  onSubmit,
  isSubmitted,
  generatedTemplateId,
  launchActionsReady,
  hasCourseMap,
  nonEmptyOutcomeCount,
  needsRevision,
  isApproved,
}: CurriculumBuilderPanelProps) {
  /* ── Local state ───────────────────────────────────────────── */
  const [expandedActivityIds, setExpandedActivityIds] = useState<Set<string>>(new Set());
  const [expandedWeekIds, setExpandedWeekIds] = useState<Set<string>>(new Set());
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  /* ── Helpers ───────────────────────────────────────────────── */

  function handleDragEnd(weekId: string) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        onReorderActivities(weekId, active.id as string, over.id as string);
      }
    };
  }

  function handleOutcomeChange(index: number, value: string) {
    const next = [...outcomes];
    next[index] = value;
    onUpdate("outcomes", next);
  }

  function handleRemoveOutcome(index: number) {
    onUpdate("outcomes", outcomes.filter((_, i) => i !== index));
  }

  function handleAddOutcome() {
    onUpdate("outcomes", [...outcomes, ""]);
  }

  function updateCourseConfig(patch: Partial<StudioCourseConfig>) {
    const nextCourseConfig = {
      ...courseConfig,
      ...patch,
    };
    const recomputeEstimatedHours =
      patch.durationWeeks !== undefined ||
      patch.sessionsPerWeek !== undefined ||
      patch.classDurationMin !== undefined;

    const estimatedHours = recomputeEstimatedHours
      ? Math.max(
          1,
          Math.round(
            (nextCourseConfig.durationWeeks *
              nextCourseConfig.sessionsPerWeek *
              nextCourseConfig.classDurationMin) /
              60
          )
        )
      : nextCourseConfig.estimatedHours;

    onUpdate("courseConfig", {
      ...nextCourseConfig,
      estimatedHours,
    });
  }

  function handleQuickAddActivity(weekId: string, type: ActivityType) {
    const config = getActivityConfig(type);
    onAddActivity(weekId, {
      title: config.label,
      type,
      durationMin: config.defaultDuration,
      description: null,
      resources: null,
      notes: null,
      materials: null,
      differentiationTips: null,
      energyLevel: null,
      standardsTags: [],
      rubric: null,
    });
  }

  function toggleActivityExpand(activityId: string) {
    setExpandedActivityIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  }

  function toggleWeekExpand(weekId: string) {
    setExpandedWeekIds((prev) => {
      const next = new Set(prev);
      if (next.has(weekId)) {
        next.delete(weekId);
      } else {
        next.add(weekId);
      }
      return next;
    });
  }

  const deliveryModeSet = new Set(courseConfig.deliveryModes);
  const rubricScores = reviewRubric.scores;
  const showReviewSummary =
    needsRevision ||
    isApproved ||
    reviewStatus === "REJECTED" ||
    reviewRubric.summary.trim().length > 0 ||
    reviewNotes.trim().length > 0;
  const courseMapReady =
    title.trim().length > 0 &&
    interestArea.trim().length > 0 &&
    nonEmptyOutcomeCount >= MIN_CURRICULUM_OUTCOMES;
  const sessionBuildComplete =
    progress.sessionsWithTitles === progress.totalSessionsExpected &&
    progress.sessionsWithObjectives === progress.totalSessionsExpected &&
    progress.sessionsWithThreeActivities === progress.totalSessionsExpected &&
    progress.sessionsWithAtHomeAssignments === progress.totalSessionsExpected &&
    progress.sessionsWithinTimeBudget === progress.totalSessionsExpected;

  const startContextCopy =
    entryContext === "TRAINING"
      ? "You are in the capstone stretch now. Start with a scaffold if you want momentum, then shape the course into something you would feel proud to teach."
      : entryContext === "APPLICATION_STATUS"
        ? "This studio is the curriculum part of your applicant journey. The goal is not a rough concept. The goal is a real first course."
        : needsRevision
          ? "A reviewer has asked for revision. Use the scaffold and examples only if they help you rebuild weak spots without losing your own voice."
          : "Use this studio like a mentor-guided workspace. You can start from a scaffold, shape the promise of the course, and then build every session with intention.";

  const reviewHeadline = isApproved
    ? "Your curriculum is approved and ready for launch"
    : needsRevision
      ? "A reviewer asked you to tighten this curriculum"
      : reviewStatus === "SUBMITTED"
        ? "Your curriculum is with a reviewer now"
        : reviewStatus === "COMPLETED"
          ? "You are ready to submit this curriculum for review"
          : "Keep building toward a full review-ready curriculum";

  const reviewCopy = isApproved
    ? "This draft has crossed the line from capstone project to stable launch package. Use the next actions below to keep the instructor journey moving."
    : needsRevision
      ? reviewRubric.summary || reviewNotes || "Use the notes below to revise the right parts of the draft, then resubmit."
      : reviewStatus === "SUBMITTED"
        ? "Your submission is waiting for reviewer feedback. You can still export the curriculum and review the structure while you wait."
        : progress.readyForSubmission
          ? "Everything needed for submission is in place. When you are ready, submit this curriculum for review."
          : "This phase becomes the review and launch hub once the draft is ready.";

  let phaseContent: JSX.Element;

  if (activePhase === "START") {
    phaseContent = (
      <div className="lds-phase-stack">
        <div className="card lds-phase-card">
          <div className="lds-phase-card-header">
            <div>
              <p className="lds-phase-eyebrow">Start</p>
              <h2 className="lds-phase-title">Choose a strong starting point</h2>
              <p className="lds-phase-copy">{startContextCopy}</p>
            </div>
            <div className="lds-phase-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => onOpenExamplesLibrary(null)}
              >
                Browse Examples Library
              </button>
              <button
                type="button"
                className="button"
                onClick={() => onPhaseChange(hasCourseMap ? "SESSIONS" : "COURSE_MAP")}
              >
                {hasCourseMap ? "Continue building" : "Shape the course map"}
              </button>
            </div>
          </div>

          <div className="lds-start-grid">
            <div className="lds-start-summary">
              <h3>Hello, {userName}</h3>
              <p>
                A strong applicant draft usually has a clear topic, a teachable
                course promise, and a session arc that feels connected from week
                one to the final session.
              </p>
              <div className="lds-start-checklist">
                <div className="lds-start-check">
                  <span>{hasCourseMap ? "✓" : "1"}</span>
                  <div>
                    <strong>Shape the course promise</strong>
                    <p>
                      {hasCourseMap
                        ? `${nonEmptyOutcomeCount} learning outcomes are in place.`
                        : "Set the title, interest area, and learning outcomes that give the whole course direction."}
                    </p>
                  </div>
                </div>
                <div className="lds-start-check">
                  <span>{progress.sessionsWithTitles > 0 ? "✓" : "2"}</span>
                  <div>
                    <strong>Build the sessions</strong>
                    <p>
                      {progress.sessionsWithTitles > 0
                        ? `${progress.sessionsWithTitles} of ${progress.totalSessionsExpected} sessions have titles.`
                        : "Turn the course promise into concrete sessions with objectives, pacing, and at-home work."}
                    </p>
                  </div>
                </div>
                <div className="lds-start-check">
                  <span>{progress.readyForSubmission ? "✓" : "3"}</span>
                  <div>
                    <strong>Finish readiness and review</strong>
                    <p>
                      {progress.readyForSubmission
                        ? "This draft is ready to move into review."
                        : "Use the readiness phase to clear blockers, pass the understanding check, and submit with confidence."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lds-start-recommended">
              <span className="badge">Recommended Starter</span>
              {starterScaffolds
                .filter((seed) => seed.id === recommendedScaffoldId)
                .map((seed) => (
                  <div key={seed.id} className="lds-starter-card lds-starter-card-featured">
                    <div className="lds-starter-card-top">
                      <strong>{seed.icon} {seed.label}</strong>
                      <span className="pill pill-purple">Best fit</span>
                    </div>
                    <h3>{seed.title}</h3>
                    <p>{seed.description}</p>
                    <div className="lds-starter-meta">
                      <span>{seed.weeks.length} sessions</span>
                      <span>{seed.classDurationMin} min</span>
                      <span>{seed.outcomes.length} outcomes</span>
                    </div>
                    <button
                      type="button"
                      className="button"
                      onClick={() => onApplyStarterScaffold(seed)}
                    >
                      Apply full starter scaffold
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="card lds-phase-card">
          <div className="lds-phase-card-header">
            <div>
              <p className="lds-phase-eyebrow">Starter Scaffolds</p>
              <h2 className="lds-phase-title">Pick a scaffold that gives you momentum</h2>
              <p className="lds-phase-copy">
                These starter curricula fill the draft with a full teachable arc.
                You can replace the language, pacing, and assignments afterward.
              </p>
            </div>
          </div>
          <div className="lds-starter-grid">
            {starterScaffolds.map((seed) => (
              <div
                key={seed.id}
                className={`lds-starter-card${
                  seed.id === recommendedScaffoldId ? " featured" : ""
                }`}
              >
                <div className="lds-starter-card-top">
                  <strong>{seed.icon} {seed.label}</strong>
                  {seed.id === recommendedScaffoldId ? (
                    <span className="pill pill-purple">Recommended</span>
                  ) : null}
                </div>
                <h3>{seed.title}</h3>
                <p>{seed.description}</p>
                <div className="lds-starter-meta">
                  <span>{seed.weeks.length} sessions</span>
                  <span>{seed.classDurationMin} min</span>
                  <span>{seed.outcomes.length} outcomes</span>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onApplyStarterScaffold(seed)}
                >
                  Apply starter scaffold
                </button>
              </div>
            ))}
          </div>

          <SectionNote
            label="Reviewer note on overview"
            note={reviewRubric.sectionNotes.overview}
          />
        </div>
      </div>
    );
  } else if (activePhase === "COURSE_MAP") {
    phaseContent = (
      <div className="lds-phase-stack">
        <div className="card lds-phase-card">
          <div className="lds-phase-card-header">
            <div>
              <p className="lds-phase-eyebrow">Course Map</p>
              <h2 className="lds-phase-title">Give the course a clear promise</h2>
              <p className="lds-phase-copy">
                Name what this course is, who it serves, and what students should leave able to do.
              </p>
            </div>
            <div className="lds-phase-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => onPhaseChange("START")}
              >
                Back to start
              </button>
              <button
                type="button"
                className="button"
                onClick={() => onPhaseChange("SESSIONS")}
              >
                Continue to sessions
              </button>
            </div>
          </div>

          <div className="lds-form-grid">
            <label className="form-row">
              Curriculum title
              <input
                className="input"
                value={title}
                onChange={(e) => onUpdate("title", e.target.value)}
                placeholder="Name your curriculum"
              />
            </label>
            <label className="form-row">
              Interest area
              <input
                className="input"
                value={interestArea}
                onChange={(e) => onUpdate("interestArea", e.target.value)}
                placeholder="e.g. Finance, Technology, Music"
              />
            </label>
          </div>

          <label className="form-row" style={{ marginTop: 16 }}>
            Why this course matters
            <textarea
              className="input"
              value={description}
              onChange={(e) => onUpdate("description", e.target.value)}
              placeholder="What will students learn, and why is this course worth teaching?"
              rows={4}
            />
          </label>

          <div className="lds-course-shape-card">
            <div className="lds-course-shape-header">
              <div>
                <h3>Course shape</h3>
                <p>Decide what the real teaching container looks like before polishing individual sessions.</p>
              </div>
              <div className="lds-course-shape-meta">
                <span>{courseConfig.durationWeeks} week{courseConfig.durationWeeks === 1 ? "" : "s"}</span>
                <span>{courseConfig.sessionsPerWeek} session{courseConfig.sessionsPerWeek === 1 ? "" : "s"}/week</span>
                <span>{courseConfig.classDurationMin} min/session</span>
              </div>
            </div>

            <div className="grid three">
              <label className="form-row">
                Weeks
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={courseConfig.durationWeeks}
                  onChange={(e) =>
                    updateCourseConfig({
                      durationWeeks: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label className="form-row">
                Sessions per week
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={courseConfig.sessionsPerWeek}
                  onChange={(e) =>
                    updateCourseConfig({
                      sessionsPerWeek: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label className="form-row">
                Minutes per session
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={courseConfig.classDurationMin}
                  onChange={(e) =>
                    updateCourseConfig({
                      classDurationMin: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label className="form-row">
                Target age group
                <input
                  className="input"
                  value={courseConfig.targetAgeGroup}
                  onChange={(e) =>
                    updateCourseConfig({ targetAgeGroup: e.target.value })
                  }
                  placeholder="e.g. 12-14 or adults"
                />
              </label>
              <label className="form-row">
                Difficulty level
                <select
                  className="input"
                  value={courseConfig.difficultyLevel}
                  onChange={(e) =>
                    updateCourseConfig({
                      difficultyLevel: e.target.value as StudioCourseConfig["difficultyLevel"],
                    })
                  }
                >
                  {DIFFICULTY_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-row">
                Estimated learning hours
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={courseConfig.estimatedHours}
                  onChange={(e) =>
                    updateCourseConfig({
                      estimatedHours: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label className="form-row">
                Minimum students
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={courseConfig.minStudents}
                  onChange={(e) =>
                    updateCourseConfig({
                      minStudents: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label className="form-row">
                Ideal students
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={courseConfig.idealSize}
                  onChange={(e) =>
                    updateCourseConfig({
                      idealSize: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label className="form-row">
                Maximum students
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={courseConfig.maxStudents}
                  onChange={(e) =>
                    updateCourseConfig({
                      maxStudents: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="lds-delivery-label">Delivery modes</div>
              <div className="lds-delivery-options">
                {DELIVERY_MODE_OPTIONS.map((option) => {
                  const selected = deliveryModeSet.has(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`lds-delivery-chip${selected ? " active" : ""}`}
                      onClick={() => {
                        const nextModes = selected
                          ? courseConfig.deliveryModes.filter(
                              (mode) => mode !== option.value
                            )
                          : [...courseConfig.deliveryModes, option.value];
                        updateCourseConfig({
                          deliveryModes:
                            nextModes.length > 0 ? nextModes : [option.value],
                        });
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <SectionNote
              label="Reviewer note on course shape"
              note={reviewRubric.sectionNotes.courseStructure}
            />
          </div>

          <div className="cbs-outcomes-section" style={{ marginTop: 18 }}>
            <div className="cbs-outcomes-label">Learning outcomes</div>
            <p style={{ margin: "4px 0 10px", color: "var(--muted)", fontSize: 12 }}>
              Name the important things students should be able to do by the end of the course.
            </p>
            {outcomes.map((outcome, index) => (
              <div key={index} className="cbs-outcome-item">
                <input
                  className="cbs-outcome-input"
                  value={outcome}
                  onChange={(e) => handleOutcomeChange(index, e.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                />
                <button
                  className="cbs-outcome-remove-btn"
                  onClick={() => handleRemoveOutcome(index)}
                  type="button"
                  aria-label="Remove outcome"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="cbs-add-outcome-btn"
              onClick={handleAddOutcome}
              type="button"
            >
              + Add outcome
            </button>
          </div>

          <SectionNote
            label="Reviewer note on overview"
            note={reviewRubric.sectionNotes.overview}
          />
        </div>
      </div>
    );
  } else if (activePhase === "SESSIONS") {
    phaseContent = (
      <div className="lds-phase-stack">
        <div className="card lds-phase-card">
          <div className="lds-phase-card-header">
            <div>
              <p className="lds-phase-eyebrow">Sessions</p>
              <h2 className="lds-phase-title">Build the session-by-session experience</h2>
              <p className="lds-phase-copy">
                Give every session a clear goal, a realistic activity arc, and at-home work that extends the learning.
              </p>
            </div>
            <div className="lds-phase-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => onOpenExamplesLibrary(null)}
              >
                Open Examples Library
              </button>
              <button
                type="button"
                className="button"
                onClick={() => onPhaseChange("READINESS")}
              >
                Review readiness
              </button>
            </div>
          </div>

          <div className="lds-session-support">
            <span className="pill pill-info">
              {progress.sessionsWithTitles}/{progress.totalSessionsExpected} titles
            </span>
            <span className="pill pill-info">
              {progress.sessionsWithObjectives}/{progress.totalSessionsExpected} objectives
            </span>
            <span className="pill pill-info">
              {progress.sessionsWithThreeActivities}/{progress.totalSessionsExpected} with 3+ activities
            </span>
            <span className="pill pill-info">
              {progress.sessionsWithAtHomeAssignments}/{progress.totalSessionsExpected} with at-home work
            </span>
          </div>

          <SectionNote
            label="Reviewer note on session plans"
            note={reviewRubric.sectionNotes.sessionPlans}
          />
          <SectionNote
            label="Reviewer note on student assignments"
            note={reviewRubric.sectionNotes.studentAssignments}
          />
        </div>

        <div className="cbs-builder-layout" style={{ display: "grid", gridTemplateColumns: "56px 1fr" }}>
          <div
            className="cbs-week-sidebar"
            style={{
              position: "sticky",
              top: 16,
              alignSelf: "start",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              paddingTop: 8,
            }}
          >
            {weeklyPlans.map((week) => (
              <button
                key={week.id}
                type="button"
                onClick={() =>
                  document
                    .getElementById(`cbs-week-${week.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-secondary)",
                  fontSize: courseConfig.sessionsPerWeek > 1 ? 9 : 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  boxShadow: "var(--shadow-xs)",
                }}
                title={buildSessionLabel(week, courseConfig)}
              >
                {courseConfig.sessionsPerWeek > 1
                  ? `W${week.weekNumber}.${week.sessionNumber}`
                  : `W${week.weekNumber}`}
              </button>
            ))}
          </div>

          <div className="cbs-builder-panel" style={{ paddingTop: 0 }}>
            {weeklyPlans.map((week) => {
              const totalMin = week.activities.reduce((sum, activity) => sum + activity.durationMin, 0);
              const isOverTime = totalMin > week.classDurationMin;
              const isWeekDetailExpanded = expandedWeekIds.has(week.id);
              const sessionLabel = buildSessionLabel(week, courseConfig);

              return (
                <div key={week.id} id={`cbs-week-${week.id}`} className="cbs-week-section">
                  <div className="cbs-week-header">
                    <span className="cbs-week-label">{sessionLabel}</span>

                    <input
                      className="cbs-week-title-input"
                      value={week.title}
                      onChange={(e) => onUpdateWeek(week.id, "title", e.target.value)}
                      placeholder="Session title..."
                    />

                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)" }}>
                      <input
                        type="number"
                        min={1}
                        value={week.classDurationMin}
                        onChange={(e) =>
                          onUpdateWeek(week.id, "classDurationMin", Math.max(1, Number(e.target.value)))
                        }
                        style={{
                          width: 56,
                          padding: "4px 8px",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text)",
                          fontSize: 12,
                          textAlign: "center",
                        }}
                        aria-label="Session duration in minutes"
                      />
                      <span>min</span>
                    </span>

                    <span
                      className={`cbs-week-time-stat${isOverTime ? " cbs-time-warning" : ""}`}
                      style={{ color: isOverTime ? "#d97706" : "#16a34a", fontSize: 12 }}
                    >
                      {isOverTime && "⚠ "}
                      {totalMin}m / {week.classDurationMin}m
                    </span>

                    <button
                      type="button"
                      className="cbs-week-detail-toggle"
                      onClick={() => toggleWeekExpand(week.id)}
                      style={{
                        background: "var(--surface-alt)",
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        padding: "5px 10px",
                      }}
                    >
                      {isWeekDetailExpanded ? "Hide details" : "Show details"}
                    </button>

                    <button
                      type="button"
                      className="cbs-week-dup-btn"
                      onClick={() => onDuplicateWeek(week.id)}
                      style={{
                        background: "var(--surface-alt)",
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        fontSize: 11,
                        padding: "5px 10px",
                      }}
                    >
                      Copy forward
                    </button>

                    <button
                      className="cbs-week-delete-btn"
                      onClick={() => onRemoveWeek(week.id)}
                      type="button"
                      aria-label="Clear session"
                    >
                      ×
                    </button>
                  </div>

                  {isWeekDetailExpanded ? (
                    <WeekDetailSection week={week} onUpdateWeek={onUpdateWeek} />
                  ) : null}

                  <div
                    className="cbs-time-bar"
                    style={{
                      display: "flex",
                      height: 8,
                      background: "var(--surface-alt)",
                      overflow: "hidden",
                      margin: "0 16px",
                      borderRadius: 999,
                    }}
                  >
                    {week.activities.map((activity) => {
                      const config = getActivityConfig(activity.type);
                      const pct =
                        week.classDurationMin > 0
                          ? (activity.durationMin / week.classDurationMin) * 100
                          : 0;
                      return (
                        <div
                          key={activity.id}
                          className="cbs-time-bar-segment"
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            backgroundColor: config.color,
                            transition: "width 0.2s ease",
                          }}
                          title={`${activity.title} (${activity.durationMin}m)`}
                        />
                      );
                    })}
                  </div>

                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd(week.id)}
                  >
                    <SortableContext
                      items={week.activities.map((activity) => activity.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div
                        className="cbs-activities-list"
                        style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 4 }}
                      >
                        {week.activities.map((activity) => (
                          <SortableActivity
                            key={activity.id}
                            activity={activity}
                            weekId={week.id}
                            isExpanded={expandedActivityIds.has(activity.id)}
                            onToggle={() => toggleActivityExpand(activity.id)}
                            onUpdateActivity={onUpdateActivity}
                            onRemoveActivity={onRemoveActivity}
                            allWeeks={weeklyPlans}
                            onMoveToWeek={(toWeekId) => {
                              onMoveActivityToWeek(week.id, activity.id, toWeekId);
                              setExpandedActivityIds((prev) => {
                                const next = new Set(prev);
                                next.delete(activity.id);
                                return next;
                              });
                            }}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <div
                    className="cbs-add-activity-row"
                    style={{ padding: "8px 16px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}
                  >
                    {ACTIVITY_TYPES.map((activityType) => (
                      <button
                        key={activityType.value}
                        className="cbs-add-activity-chip"
                        onClick={() => handleQuickAddActivity(week.id, activityType.value)}
                        type="button"
                        style={{ borderColor: `${activityType.color}44`, color: activityType.color }}
                      >
                        {activityType.icon} + {activityType.label}
                      </button>
                    ))}
                    <button
                      className="cbs-templates-btn"
                      onClick={() => onOpenTemplates(week.id)}
                      type="button"
                    >
                      Templates
                    </button>
                    <button
                      className="cbs-templates-btn"
                      onClick={() => onOpenExamplesLibrary(week.id)}
                      type="button"
                    >
                      Import from library
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="cbs-builder-footer">
              <div className="cbs-footer-left">
                <button
                  className="cbs-btn cbs-btn-secondary"
                  onClick={onAddWeek}
                  type="button"
                >
                  + Add another week
                </button>
              </div>

              <div className="cbs-footer-right">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onPhaseChange("READINESS")}
                >
                  Continue to readiness
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (activePhase === "READINESS") {
    phaseContent = (
      <div className="lds-phase-stack">
        <div className="card lds-phase-card">
          <div className="lds-phase-card-header">
            <div>
              <p className="lds-phase-eyebrow">Readiness</p>
              <h2 className="lds-phase-title">Check the draft like a real teaching package</h2>
              <p className="lds-phase-copy">
                This phase makes sure the course is more than a set of boxes with text inside them. It should feel teachable, paced, and review-ready.
              </p>
            </div>
            <div className="lds-phase-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => onPhaseChange("SESSIONS")}
              >
                Back to sessions
              </button>
              <button
                type="button"
                className="button"
                onClick={() => onPhaseChange("REVIEW_LAUNCH")}
              >
                Open review hub
              </button>
            </div>
          </div>

          <ProgressBar
            title={title}
            interestArea={interestArea}
            outcomes={outcomes}
            courseConfig={courseConfig}
            weeklyPlans={weeklyPlans}
            understandingChecks={understandingChecks}
          />

          <UnderstandingCheckSection
            understandingChecks={understandingChecks}
            onUpdate={onUpdate}
          />

          {!progress.readyForSubmission ? (
            <div className="lds-readiness-blockers">
              <h3>What still needs attention</h3>
              <ul>
                {progress.submissionIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="lds-readiness-actions">
            <ExportPdfDropdown onExportPdf={onExportPdf} />
            {isSubmitted ? (
              <span className="cbs-submitted-badge">
                {isApproved ? "✓ Approved" : "✓ Submitted"}
              </span>
            ) : (
              <button
                className="cbs-btn cbs-btn-primary"
                onClick={() => setShowSubmitModal(true)}
                type="button"
                title={
                  progress.readyForSubmission
                    ? "Submit curriculum"
                    : "Finish the requirements above to unlock submission"
                }
              >
                Submit curriculum
              </button>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    phaseContent = (
      <div className="lds-phase-stack">
        <div className="card lds-phase-card">
          <div className="lds-phase-card-header">
            <div>
              <p className="lds-phase-eyebrow">Review & Launch</p>
              <h2 className="lds-phase-title">{reviewHeadline}</h2>
              <p className="lds-phase-copy">{reviewCopy}</p>
            </div>
            <div className="lds-phase-actions">
              {!courseMapReady ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onPhaseChange("COURSE_MAP")}
                >
                  Finish course map
                </button>
              ) : null}
              {!sessionBuildComplete ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onPhaseChange("SESSIONS")}
                >
                  Tighten sessions
                </button>
              ) : null}
              {!progress.readyForSubmission ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => onPhaseChange("READINESS")}
                >
                  Clear blockers
                </button>
              ) : null}
            </div>
          </div>

          <div className="lds-review-status-row">
            <span className={`pill ${isApproved ? "pill-success" : needsRevision ? "pill-pending" : "pill-info"}`}>
              {reviewStatus.replace(/_/g, " ")}
            </span>
            {showReviewSummary ? (
              <>
                <span className="pill pill-info">Clarity {rubricScores.clarity}/4</span>
                <span className="pill pill-info">Sequencing {rubricScores.sequencing}/4</span>
                <span className="pill pill-info">Student experience {rubricScores.studentExperience}/4</span>
                <span className="pill pill-info">Launch readiness {rubricScores.launchReadiness}/4</span>
              </>
            ) : null}
          </div>

          {showReviewSummary ? (
            <div className="lds-review-summary-card">
              <h3>Reviewer summary</h3>
              <p>{reviewRubric.summary || reviewNotes || "No reviewer summary yet."}</p>
            </div>
          ) : null}

          {reviewRubric.sectionNotes.overview ? (
            <SectionNote
              label="Overview note"
              note={reviewRubric.sectionNotes.overview}
            />
          ) : null}
          {reviewRubric.sectionNotes.courseStructure ? (
            <SectionNote
              label="Course map note"
              note={reviewRubric.sectionNotes.courseStructure}
            />
          ) : null}
          {reviewRubric.sectionNotes.sessionPlans ? (
            <SectionNote
              label="Session note"
              note={reviewRubric.sectionNotes.sessionPlans}
            />
          ) : null}
          {reviewRubric.sectionNotes.studentAssignments ? (
            <SectionNote
              label="Assignment note"
              note={reviewRubric.sectionNotes.studentAssignments}
            />
          ) : null}

          {reviewStatus === "COMPLETED" && !isSubmitted ? (
            <div className="lds-review-actions">
              <ExportPdfDropdown onExportPdf={onExportPdf} />
              <button
                className="cbs-btn cbs-btn-primary"
                onClick={() => setShowSubmitModal(true)}
                type="button"
              >
                Submit curriculum for review
              </button>
            </div>
          ) : null}

          {reviewStatus === "SUBMITTED" ? (
            <div className="lds-review-summary-card">
              <h3>What happens now</h3>
              <p>
                Your curriculum is waiting in the reviewer queue. Use the exports if you need to revisit the structure while you wait for feedback.
              </p>
            </div>
          ) : null}

          {needsRevision ? (
            <div className="lds-review-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => onPhaseChange("COURSE_MAP")}
              >
                Revise course map
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => onPhaseChange("SESSIONS")}
              >
                Revise sessions
              </button>
              <button
                type="button"
                className="button"
                onClick={() => onPhaseChange("READINESS")}
              >
                Recheck readiness
              </button>
            </div>
          ) : null}

          {isApproved && launchActionsReady && generatedTemplateId ? (
            <div className="lds-launch-grid">
              <a
                href={`/instructor/curriculum-builder#edit-${generatedTemplateId}`}
                className="dashboard-action-card"
              >
                <span className="dashboard-action-label">Open Curriculum Template</span>
                <span className="dashboard-action-desc">
                  Review the stable launch version that was generated from this studio.
                </span>
              </a>
              <a
                href="/lesson-plans"
                className="dashboard-action-card"
              >
                <span className="dashboard-action-label">Open Lesson Plans</span>
                <span className="dashboard-action-desc">
                  Move from the approved curriculum into session-by-session teaching plans.
                </span>
              </a>
              <a
                href={`/instructor/class-settings?template=${generatedTemplateId}`}
                className="dashboard-action-card"
              >
                <span className="dashboard-action-label">Create First Offering</span>
                <span className="dashboard-action-desc">
                  Turn the approved curriculum into a real class offering and launch it.
                </span>
              </a>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────── */

  return (
    <>
      {showSubmitModal && (
        <SubmitModal
          title={title}
          interestArea={interestArea}
          outcomes={outcomes}
          courseConfig={courseConfig}
          weeklyPlans={weeklyPlans}
          understandingChecks={understandingChecks}
          onClose={() => setShowSubmitModal(false)}
          onSubmit={onSubmit}
        />
      )}
      {phaseContent}
    </>
  );
}
