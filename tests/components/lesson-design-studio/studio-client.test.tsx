import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudioClient } from "@/app/(app)/instructor/lesson-design-studio/studio-client";

const actionMocks = vi.hoisted(() => ({
  saveCurriculumDraft: vi.fn(),
  submitCurriculumDraft: vi.fn(),
  markLessonDesignStudioTourComplete: vi.fn(),
  createWorkingCopyFromCurriculumDraft: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

const exampleWeek = {
  weekNumber: 1,
  title: "Imported Week",
  goal: "Practice a real skill",
  teachingTips: "Keep the pacing tight.",
  atHomeAssignment: {
    type: "REFLECTION_PROMPT",
    title: "Reflect",
    description: "Write down one takeaway.",
  },
  activities: [
    {
      title: "Warm Up",
      type: "WARM_UP",
      durationMin: 10,
      description: "Start strong.",
    },
    {
      title: "Mini Lesson",
      type: "INSTRUCTION",
      durationMin: 15,
      description: "Teach the core idea.",
    },
    {
      title: "Practice",
      type: "PRACTICE",
      durationMin: 20,
      description: "Try it out.",
    },
  ],
} as const;

vi.mock("@/lib/curriculum-draft-actions", () => actionMocks);
vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

vi.mock(
  "@/app/(app)/instructor/lesson-design-studio/components/curriculum-builder-panel",
  () => ({
    CurriculumBuilderPanel: (props: any) => (
      <div>
        <div data-testid="panel-title">{props.title}</div>
        <div data-testid="panel-score">
          {String(props.understandingChecks.lastScorePct ?? "none")}
        </div>
        <button type="button" onClick={() => props.onUpdate("title", "Updated Title")}>
          Update Title
        </button>
        <button type="button" onClick={() => void props.onExportPdf("student")}>
          Export Student
        </button>
        <button type="button" onClick={() => void props.onSubmit()}>
          Submit Draft
        </button>
        <button type="button" onClick={() => props.onOpenExamplesLibrary("missing-week")}>
          Open Targeted Library
        </button>
      </div>
    ),
  })
);

vi.mock(
  "@/app/(app)/instructor/lesson-design-studio/components/examples-library",
  () => ({
    ExamplesLibrary: (props: any) =>
      props.open ? (
        <div>
          <div data-testid="examples-error">{props.errorMessage ?? ""}</div>
          <button type="button" onClick={() => props.onImportWeek(exampleWeek)}>
            Import Example
          </button>
        </div>
      ) : null,
  })
);

vi.mock(
  "@/app/(app)/instructor/lesson-design-studio/components/activity-templates",
  () => ({
    ActivityTemplates: () => null,
  })
);

vi.mock(
  "@/app/(app)/instructor/lesson-design-studio/components/onboarding-tour",
  () => ({
    OnboardingTour: (props: any) => (
      <div data-testid="tour">
        <button type="button" onClick={() => void props.onComplete?.()}>
          Finish Tour
        </button>
      </div>
    ),
  })
);

function buildDraft(overrides: Partial<any> = {}) {
  return {
    id: "draft-1",
    title: "",
    description: "",
    interestArea: "",
    outcomes: [],
    courseConfig: {
      durationWeeks: 2,
      sessionsPerWeek: 1,
      classDurationMin: 60,
      targetAgeGroup: "",
      deliveryModes: ["VIRTUAL"],
      difficultyLevel: "LEVEL_101",
      minStudents: 3,
      maxStudents: 25,
      idealSize: 12,
      estimatedHours: 2,
    },
    weeklyPlans: [
      {
        id: "session-1",
        weekNumber: 1,
        sessionNumber: 1,
        title: "",
        classDurationMin: 60,
        activities: [],
        objective: null,
        teacherPrepNotes: null,
        materialsChecklist: [],
        atHomeAssignment: null,
      },
      {
        id: "session-2",
        weekNumber: 2,
        sessionNumber: 1,
        title: "",
        classDurationMin: 60,
        activities: [],
        objective: null,
        teacherPrepNotes: null,
        materialsChecklist: [],
        atHomeAssignment: null,
      },
    ],
    understandingChecks: {
      answers: {},
      lastScorePct: null,
      passed: false,
      completedAt: null,
    },
    reviewRubric: {
      scores: {
        clarity: 0,
        sequencing: 0,
        studentExperience: 0,
        launchReadiness: 0,
      },
      sectionNotes: {
        overview: "",
        courseStructure: "",
        sessionPlans: "",
        studentAssignments: "",
      },
      summary: "",
    },
    reviewNotes: "",
    reviewedAt: null,
    submittedAt: null,
    approvedAt: null,
    generatedTemplateId: null,
    status: "IN_PROGRESS",
    updatedAt: "2026-03-18T14:00:00.000Z",
    ...overrides,
  };
}

function buildReadyDraft(overrides: Partial<any> = {}) {
  return buildDraft({
    title: "Ready Draft",
    interestArea: "Finance",
    outcomes: ["Outcome one", "Outcome two", "Outcome three"],
    weeklyPlans: [
      {
        id: "session-1",
        weekNumber: 1,
        sessionNumber: 1,
        title: "Week 1",
        classDurationMin: 60,
        activities: [
          { id: "a1", title: "Warm Up", type: "WARM_UP", durationMin: 10, description: null, resources: null, notes: null, sortOrder: 0, materials: null, differentiationTips: null, energyLevel: null, standardsTags: [], rubric: null },
          { id: "a2", title: "Teach", type: "INSTRUCTION", durationMin: 20, description: null, resources: null, notes: null, sortOrder: 1, materials: null, differentiationTips: null, energyLevel: null, standardsTags: [], rubric: null },
          { id: "a3", title: "Practice", type: "PRACTICE", durationMin: 20, description: null, resources: null, notes: null, sortOrder: 2, materials: null, differentiationTips: null, energyLevel: null, standardsTags: [], rubric: null },
        ],
        objective: "Learn skill one",
        teacherPrepNotes: null,
        materialsChecklist: [],
        atHomeAssignment: {
          type: "REFLECTION_PROMPT",
          title: "Reflect",
          description: "Reflect on today.",
        },
      },
      {
        id: "session-2",
        weekNumber: 2,
        sessionNumber: 1,
        title: "Week 2",
        classDurationMin: 60,
        activities: [
          { id: "b1", title: "Warm Up", type: "WARM_UP", durationMin: 10, description: null, resources: null, notes: null, sortOrder: 0, materials: null, differentiationTips: null, energyLevel: null, standardsTags: [], rubric: null },
          { id: "b2", title: "Teach", type: "INSTRUCTION", durationMin: 20, description: null, resources: null, notes: null, sortOrder: 1, materials: null, differentiationTips: null, energyLevel: null, standardsTags: [], rubric: null },
          { id: "b3", title: "Practice", type: "PRACTICE", durationMin: 20, description: null, resources: null, notes: null, sortOrder: 2, materials: null, differentiationTips: null, energyLevel: null, standardsTags: [], rubric: null },
        ],
        objective: "Learn skill two",
        teacherPrepNotes: null,
        materialsChecklist: [],
        atHomeAssignment: {
          type: "REFLECTION_PROMPT",
          title: "Reflect",
          description: "Reflect again.",
        },
      },
    ],
    understandingChecks: {
      answers: {
        objective_alignment:
          "It names what students will be able to do by the end of the session.",
        session_pacing:
          "A realistic plan protects flow, transitions, and student energy in real teaching.",
        activity_sequence:
          "Students learn better when the session builds from entry, to understanding, to application, to closure.",
        homework_purpose:
          "Extend or reinforce the learning from the session in a manageable way.",
        example_usage:
          "Study why they work, then adapt the moves to fit their own curriculum and students.",
        course_outcomes:
          "Outcomes clarify what students should leave able to do, which helps the whole sequence stay coherent.",
        differentiation_use:
          "They help the instructor plan how the same activity can still work for students who need more support or more challenge.",
        capstone_goal:
          "A full curriculum package that is ready for review and close to ready to teach, not just a rough outline.",
      },
      lastScorePct: 100,
      passed: true,
      completedAt: "2026-03-18T14:00:00.000Z",
    },
    status: "COMPLETED",
    ...overrides,
  });
}

describe("StudioClient", () => {
  beforeEach(() => {
    actionMocks.saveCurriculumDraft.mockReset().mockResolvedValue({ success: true });
    actionMocks.submitCurriculumDraft.mockReset().mockResolvedValue({ success: true });
    actionMocks.markLessonDesignStudioTourComplete
      .mockReset()
      .mockResolvedValue({ success: true });
    actionMocks.createWorkingCopyFromCurriculumDraft
      .mockReset()
      .mockResolvedValue({ draftId: "draft-2", reusedExisting: false });
    routerMocks.push.mockReset();
    routerMocks.refresh.mockReset();
    localStorage.clear();
  });

  it("flushes the latest draft before exporting", async () => {
    const user = userEvent.setup();
    const exportWindow = {
      close: vi.fn(),
      location: { href: "" },
    } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(exportWindow);

    render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildReadyDraft()}
        currentPhase="READINESS"
      />
    );

    await user.click(screen.getByRole("button", { name: "Update Title" }));
    await user.click(screen.getByRole("button", { name: "Export Student" }));

    await waitFor(() => {
      expect(actionMocks.saveCurriculumDraft).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Updated Title" })
      );
      expect(exportWindow.location.href).toContain("type=student");
    });

    openSpy.mockRestore();
  });

  it("flushes the latest draft before submitting", async () => {
    const user = userEvent.setup();
    const callOrder: string[] = [];

    actionMocks.saveCurriculumDraft.mockImplementation(async () => {
      callOrder.push("save");
      return { success: true };
    });
    actionMocks.submitCurriculumDraft.mockImplementation(async () => {
      callOrder.push("submit");
      return { success: true };
    });

    render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildReadyDraft()}
        currentPhase="READINESS"
      />
    );

    await user.click(screen.getByRole("button", { name: "Update Title" }));
    await user.click(screen.getByRole("button", { name: "Submit Draft" }));

    await waitFor(() => {
      expect(callOrder).toEqual(["save", "submit"]);
    });
  });

  it("restores understanding checks from version history", async () => {
    const user = userEvent.setup();

    localStorage.setItem(
      "lds_history_draft-1",
      JSON.stringify([
        {
          savedAt: "2026-03-18T15:00:00.000Z",
          snapshot: {
            title: "Saved Version",
            description: "",
            interestArea: "Finance",
            outcomes: ["One", "Two", "Three"],
            courseConfig: buildDraft().courseConfig,
            weeklyPlans: buildDraft().weeklyPlans,
            understandingChecks: {
              answers: {},
              lastScorePct: 100,
              passed: true,
              completedAt: "2026-03-18T15:00:00.000Z",
            },
          },
        },
      ])
    );

    render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildDraft()}
        currentPhase="COURSE_MAP"
      />
    );

    expect(screen.getByTestId("panel-score")).toHaveTextContent("none");

    await user.click(screen.getByRole("button", { name: "View Version History" }));
    await user.click(screen.getByRole("button", { name: /saved version/i }));

    await waitFor(() => {
      expect(screen.getByTestId("panel-score")).toHaveTextContent("100");
    });
  });

  it("shows the onboarding tour only for eligible editable drafts and marks completion", async () => {
    const user = userEvent.setup();

    const firstRender = render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildDraft()}
        currentPhase="START"
      />
    );

    expect(screen.getByTestId("tour")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Finish Tour" }));

    await waitFor(() => {
      expect(actionMocks.markLessonDesignStudioTourComplete).toHaveBeenCalledTimes(1);
      expect(actionMocks.markLessonDesignStudioTourComplete).toHaveBeenCalledWith(
        "draft-1"
      );
      expect(actionMocks.saveCurriculumDraft).toHaveBeenCalledTimes(1);
    });

    firstRender.unmount();

    render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildDraft({ status: "SUBMITTED" })}
        currentPhase="REVIEW_LAUNCH"
      />
    );

    expect(screen.queryByTestId("tour")).not.toBeInTheDocument();
  });

  it("refuses to import into a stale targeted session and shows a helpful error", async () => {
    const user = userEvent.setup();

    render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildReadyDraft()}
        currentPhase="SESSIONS"
      />
    );

    await user.click(screen.getByRole("button", { name: "Open Targeted Library" }));
    await user.click(screen.getByRole("button", { name: "Import Example" }));

    expect(screen.getByTestId("examples-error")).toHaveTextContent(
      "That session changed while the library was open. Pick a session again before importing."
    );
    expect(actionMocks.saveCurriculumDraft).not.toHaveBeenCalled();
  });

  it("opens a working copy from a read-only submitted draft", async () => {
    const user = userEvent.setup();

    render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildReadyDraft({ status: "SUBMITTED" })}
        currentPhase="REVIEW_LAUNCH"
      />
    );

    await user.click(screen.getByRole("button", { name: "Use as starting point" }));

    await waitFor(() => {
      expect(actionMocks.createWorkingCopyFromCurriculumDraft).toHaveBeenCalledWith(
        "draft-1"
      );
      expect(routerMocks.push).toHaveBeenCalledWith(
        "/instructor/lesson-design-studio?draftId=draft-2"
      );
    });
  });

  it("does not save when a read-only draft receives an edit event", async () => {
    const user = userEvent.setup();

    render(
      <StudioClient
        userId="user-1"
        userName="Instructor"
        draft={buildReadyDraft({ status: "SUBMITTED" })}
        currentPhase="REVIEW_LAUNCH"
      />
    );

    await user.click(screen.getByRole("button", { name: "Update Title" }));

    expect(actionMocks.saveCurriculumDraft).not.toHaveBeenCalled();
  });
});
