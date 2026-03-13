import { describe, expect, it } from "vitest";
import {
  emptyCompetitionPlanningDetails,
  emptyCurriculumEngagementStrategy,
  emptyCurriculumLessonBlueprint,
  normalizeCompetitionPlanningDetails,
  normalizeCurriculumEngagementStrategy,
  normalizeCurriculumLessonBlueprint,
  normalizePassionLabSessionTopic,
  normalizeSequenceBlueprint,
  normalizeSequenceStepDetails,
  serializeCurriculumLessonBlueprint,
  serializePassionLabSessionTopic,
} from "@/lib/instructor-builder-blueprints";

describe("instructor builder blueprint helpers", () => {
  it("maps legacy curriculum lesson keys into the richer lesson shape", () => {
    const lesson = normalizeCurriculumLessonBlueprint({
      topic: "Pitch Practice",
      socialStarter: "Quick confidence warm-up",
      conceptIntro: "Break down a strong opening",
      studentActivity: "Students practice their intros",
      sharingDiscussion: "Peer feedback circle",
      lessonMaterials: "Slides and rubric",
      nextPreview: "Next time we polish visuals",
    });

    expect(lesson.warmUpHook).toBe("Quick confidence warm-up");
    expect(lesson.miniLesson).toBe("Break down a strong opening");
    expect(lesson.independentBuild).toBe("Students practice their intros");
    expect(lesson.collaborationShare).toBe("Peer feedback circle");
    expect(lesson.materialsTools).toBe("Slides and rubric");
    expect(lesson.nextStepPreview).toBe("Next time we polish visuals");
  });

  it("serializes richer curriculum lessons with legacy aliases intact", () => {
    const base = emptyCurriculumLessonBlueprint();
    const serialized = serializeCurriculumLessonBlueprint(
      {
        ...base,
        topic: "Prototype Lab",
        warmUpHook: "Design sprint opener",
        miniLesson: "Show one good prototype",
        independentBuild: "Students build version one",
        collaborationShare: "Gallery walk",
        materialsTools: "Paper, markers, Figma",
        nextStepPreview: "User testing next class",
      },
      2
    );

    expect(serialized.week).toBe(2);
    expect(serialized.socialStarter).toBe("Design sprint opener");
    expect(serialized.studentActivity).toBe("Students build version one");
    expect(serialized.lessonMaterials).toBe("Paper, markers, Figma");
  });

  it("normalizes richer engagement strategy fields without losing the old ones", () => {
    const strategy = normalizeCurriculumEngagementStrategy({
      energyStyle: "Music + quick challenge",
      classCultureRituals: "Opening wins circle",
      groupingPlan: "Rotating pairs",
      toolStack: "Canva + Slides",
    });

    expect(strategy.energyStyle).toBe("Music + quick challenge");
    expect(strategy.classCultureRituals).toBe("Opening wins circle");
    expect(strategy.groupingPlan).toBe("Rotating pairs");
    expect(strategy.toolStack).toBe("Canva + Slides");
    expect(strategy.assessmentApproach).toBe("");
  });

  it("keeps legacy passion lab session fields readable in the new shape", () => {
    const topic = normalizePassionLabSessionTopic({
      topic: "Build Day",
      activities: "Students assemble the first prototype",
      materials: "Foam board and tape",
    });

    expect(topic.handsOnBuild).toBe("Students assemble the first prototype");
    expect(topic.materialsTools).toBe("Foam board and tape");
  });

  it("serializes passion lab sessions with legacy aliases for compatibility", () => {
    const serialized = serializePassionLabSessionTopic({
      topic: "Refine",
      objective: "Improve based on feedback",
      checkpointArtifact: "Revision screenshot",
      miniLesson: "Model revision choices",
      handsOnBuild: "Students refine their work",
      collaboration: "Partner critique",
      reflection: "What changed and why",
      materialsTools: "Laptop + rubric",
      progressEvidence: "Updated draft",
      extensionPrompt: "Optional stretch challenge",
    });

    expect(serialized.activities).toBe("Students refine their work");
    expect(serialized.materials).toBe("Laptop + rubric");
  });

  it("normalizes optional builder-wide planning blobs safely", () => {
    expect(normalizeCompetitionPlanningDetails(undefined)).toEqual(
      emptyCompetitionPlanningDetails()
    );
    expect(normalizeSequenceBlueprint({ targetLearner: "Beginners" }).targetLearner).toBe(
      "Beginners"
    );
    expect(normalizeSequenceStepDetails({ estimatedDuration: "2 weeks" }).estimatedDuration).toBe(
      "2 weeks"
    );
    expect(normalizeCurriculumEngagementStrategy(undefined)).toEqual(
      emptyCurriculumEngagementStrategy()
    );
  });
});
