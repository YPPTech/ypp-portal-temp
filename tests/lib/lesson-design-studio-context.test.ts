import { describe, expect, it } from "vitest";
import {
  deriveLessonDesignStudioSurfaceState,
  type LessonDesignStudioSurfaceInput,
} from "@/lib/lesson-design-studio-context";

function buildState(overrides: Partial<LessonDesignStudioSurfaceInput> = {}) {
  return deriveLessonDesignStudioSurfaceState({
    status: "IN_PROGRESS",
    generatedTemplateId: null,
    progress: {
      hasFirstWeekWithThreeActivities: false,
      hasAnyObjective: false,
      hasAnyAtHomeAssignment: false,
      readyForSubmission: false,
    },
    ...overrides,
  });
}

describe("lesson design studio context helpers", () => {
  it("keeps a blank draft in the start state", () => {
    const state = buildState({
      progress: {
        hasFirstWeekWithThreeActivities: false,
        hasAnyObjective: false,
        hasAnyAtHomeAssignment: false,
        readyForSubmission: false,
      },
    });

    expect(state).toEqual({
      phase: "EMPTY",
      entryContext: "START",
      bannerKind: "NONE",
      isSubmitted: false,
      isApproved: false,
      needsRevision: false,
      launchPackageAvailable: false,
    });
  });

  it("treats an active draft with content as a resume state", () => {
    const state = buildState({
      progress: {
        hasFirstWeekWithThreeActivities: true,
        hasAnyObjective: true,
        hasAnyAtHomeAssignment: true,
        readyForSubmission: false,
      },
    });

    expect(state.phase).toBe("BUILDING");
    expect(state.entryContext).toBe("CONTINUE");
    expect(state.bannerKind).toBe("NONE");
  });

  it("moves a completed draft into the submit context", () => {
    const state = buildState({
      status: "COMPLETED",
      progress: {
        hasFirstWeekWithThreeActivities: true,
        hasAnyObjective: true,
        hasAnyAtHomeAssignment: true,
        readyForSubmission: true,
      },
    });

    expect(state.phase).toBe("READY_TO_REVIEW");
    expect(state.entryContext).toBe("SUBMIT");
    expect(state.isSubmitted).toBe(false);
  });

  it("keeps submitted drafts in the review context", () => {
    const state = buildState({
      status: "SUBMITTED",
      generatedTemplateId: "tmpl_123",
    });

    expect(state.phase).toBe("SUBMITTED");
    expect(state.entryContext).toBe("REVIEW");
    expect(state.bannerKind).toBe("REVIEW");
    expect(state.isSubmitted).toBe(true);
    expect(state.launchPackageAvailable).toBe(true);
  });

  it("promotes approved drafts into the launch context", () => {
    const state = buildState({
      status: "APPROVED",
      generatedTemplateId: "tmpl_456",
    });

    expect(state.phase).toBe("LAUNCH_READY");
    expect(state.entryContext).toBe("LAUNCH");
    expect(state.bannerKind).toBe("LAUNCH");
    expect(state.isApproved).toBe(true);
    expect(state.isSubmitted).toBe(true);
  });

  it("keeps revision requests in the review context even when launch links exist", () => {
    const state = buildState({
      status: "NEEDS_REVISION",
      generatedTemplateId: "tmpl_789",
    });

    expect(state.phase).toBe("SUBMITTED");
    expect(state.entryContext).toBe("REVIEW");
    expect(state.bannerKind).toBe("REVIEW");
    expect(state.needsRevision).toBe(true);
  });
});
