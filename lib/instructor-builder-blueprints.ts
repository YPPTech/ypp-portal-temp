type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as UnknownRecord;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export type CurriculumLessonBlueprint = {
  topic: string;
  milestone: string;
  progressNote: string;
  activities: string;
  essentialQuestion: string;
  lessonGoal: string;
  studentArtifact: string;
  warmUpHook: string;
  miniLesson: string;
  instructorModel: string;
  guidedPractice: string;
  independentBuild: string;
  collaborationShare: string;
  checkForUnderstanding: string;
  differentiationSupport: string;
  extensionChallenge: string;
  exitTicket: string;
  materialsTools: string;
  assessmentEvidence: string;
  nextStepPreview: string;
};

export type CurriculumEngagementStrategy = {
  energyStyle: string;
  differentiationPlan: string;
  technologyTools: string;
  studentVoiceMoments: string;
  assessmentApproach: string;
  classCultureRituals: string;
  groupingPlan: string;
  accessibilitySupports: string;
  realWorldConnection: string;
  familyCommunityConnection: string;
  toolStack: string;
};

export type PassionLabBlueprint = {
  bigIdea: string;
  studentChoicePlan: string;
  mentorCommunityConnection: string;
  showcaseCriteria: string;
  supportPlan: string;
  riskSafetyNotes: string;
  resourcePlan: string;
};

export type PassionLabSessionTopic = {
  topic: string;
  objective: string;
  checkpointArtifact: string;
  miniLesson: string;
  handsOnBuild: string;
  collaboration: string;
  reflection: string;
  materialsTools: string;
  progressEvidence: string;
  extensionPrompt: string;
};

export type CompetitionPlanningDetails = {
  challengeBrief: string;
  idealParticipant: string;
  submissionPackage: string;
  milestoneTimeline: string;
  supportResources: string;
  reviewProcess: string;
  celebrationPlan: string;
  promotionPlan: string;
};

export type SequenceBlueprint = {
  targetLearner: string;
  entryPoint: string;
  endGoalCapstone: string;
  pacingGuidance: string;
  supportCheckpoints: string;
  completionSignals: string;
};

export type SequenceStepDetails = {
  purpose: string;
  expectedEvidence: string;
  estimatedDuration: string;
  coachSupportNote: string;
  unlockRationale: string;
};

export function emptyCurriculumLessonBlueprint(): CurriculumLessonBlueprint {
  return {
    topic: "",
    milestone: "",
    progressNote: "",
    activities: "",
    essentialQuestion: "",
    lessonGoal: "",
    studentArtifact: "",
    warmUpHook: "",
    miniLesson: "",
    instructorModel: "",
    guidedPractice: "",
    independentBuild: "",
    collaborationShare: "",
    checkForUnderstanding: "",
    differentiationSupport: "",
    extensionChallenge: "",
    exitTicket: "",
    materialsTools: "",
    assessmentEvidence: "",
    nextStepPreview: "",
  };
}

export function emptyCurriculumEngagementStrategy(): CurriculumEngagementStrategy {
  return {
    energyStyle: "",
    differentiationPlan: "",
    technologyTools: "",
    studentVoiceMoments: "",
    assessmentApproach: "",
    classCultureRituals: "",
    groupingPlan: "",
    accessibilitySupports: "",
    realWorldConnection: "",
    familyCommunityConnection: "",
    toolStack: "",
  };
}

export function emptyPassionLabBlueprint(): PassionLabBlueprint {
  return {
    bigIdea: "",
    studentChoicePlan: "",
    mentorCommunityConnection: "",
    showcaseCriteria: "",
    supportPlan: "",
    riskSafetyNotes: "",
    resourcePlan: "",
  };
}

export function emptyPassionLabSessionTopic(): PassionLabSessionTopic {
  return {
    topic: "",
    objective: "",
    checkpointArtifact: "",
    miniLesson: "",
    handsOnBuild: "",
    collaboration: "",
    reflection: "",
    materialsTools: "",
    progressEvidence: "",
    extensionPrompt: "",
  };
}

export function emptyCompetitionPlanningDetails(): CompetitionPlanningDetails {
  return {
    challengeBrief: "",
    idealParticipant: "",
    submissionPackage: "",
    milestoneTimeline: "",
    supportResources: "",
    reviewProcess: "",
    celebrationPlan: "",
    promotionPlan: "",
  };
}

export function emptySequenceBlueprint(): SequenceBlueprint {
  return {
    targetLearner: "",
    entryPoint: "",
    endGoalCapstone: "",
    pacingGuidance: "",
    supportCheckpoints: "",
    completionSignals: "",
  };
}

export function emptySequenceStepDetails(): SequenceStepDetails {
  return {
    purpose: "",
    expectedEvidence: "",
    estimatedDuration: "",
    coachSupportNote: "",
    unlockRationale: "",
  };
}

export function normalizeCurriculumLessonBlueprint(value: unknown): CurriculumLessonBlueprint {
  const record = asRecord(value);
  return {
    topic: readString(record.topic),
    milestone: readString(record.milestone),
    progressNote: readString(record.progressNote),
    activities: readString(record.activities),
    essentialQuestion: readString(record.essentialQuestion),
    lessonGoal: readString(record.lessonGoal),
    studentArtifact: readString(record.studentArtifact),
    warmUpHook: readString(record.warmUpHook || record.socialStarter),
    miniLesson: readString(record.miniLesson || record.conceptIntro),
    instructorModel: readString(record.instructorModel),
    guidedPractice: readString(record.guidedPractice),
    independentBuild: readString(record.independentBuild || record.studentActivity),
    collaborationShare: readString(record.collaborationShare || record.sharingDiscussion),
    checkForUnderstanding: readString(record.checkForUnderstanding),
    differentiationSupport: readString(record.differentiationSupport),
    extensionChallenge: readString(record.extensionChallenge),
    exitTicket: readString(record.exitTicket),
    materialsTools: readString(
      record.materialsTools || record.lessonMaterials || record.materials
    ),
    assessmentEvidence: readString(record.assessmentEvidence),
    nextStepPreview: readString(record.nextStepPreview || record.nextPreview),
  };
}

export function serializeCurriculumLessonBlueprint(
  lesson: CurriculumLessonBlueprint,
  week: number
): UnknownRecord {
  return {
    week,
    topic: lesson.topic,
    milestone: lesson.milestone,
    progressNote: lesson.progressNote,
    activities: lesson.activities,
    essentialQuestion: lesson.essentialQuestion,
    lessonGoal: lesson.lessonGoal,
    studentArtifact: lesson.studentArtifact,
    warmUpHook: lesson.warmUpHook,
    miniLesson: lesson.miniLesson,
    instructorModel: lesson.instructorModel,
    guidedPractice: lesson.guidedPractice,
    independentBuild: lesson.independentBuild,
    collaborationShare: lesson.collaborationShare,
    checkForUnderstanding: lesson.checkForUnderstanding,
    differentiationSupport: lesson.differentiationSupport,
    extensionChallenge: lesson.extensionChallenge,
    exitTicket: lesson.exitTicket,
    materialsTools: lesson.materialsTools,
    assessmentEvidence: lesson.assessmentEvidence,
    nextStepPreview: lesson.nextStepPreview,
    socialStarter: lesson.warmUpHook,
    conceptIntro: lesson.miniLesson,
    studentActivity: lesson.independentBuild,
    sharingDiscussion: lesson.collaborationShare,
    lessonMaterials: lesson.materialsTools,
    materials: lesson.materialsTools,
    nextPreview: lesson.nextStepPreview,
  };
}

export function normalizeCurriculumEngagementStrategy(
  value: unknown
): CurriculumEngagementStrategy {
  const record = asRecord(value);
  return {
    energyStyle: readString(record.energyStyle),
    differentiationPlan: readString(record.differentiationPlan),
    technologyTools: readString(record.technologyTools),
    studentVoiceMoments: readString(record.studentVoiceMoments),
    assessmentApproach: readString(record.assessmentApproach),
    classCultureRituals: readString(record.classCultureRituals),
    groupingPlan: readString(record.groupingPlan),
    accessibilitySupports: readString(record.accessibilitySupports),
    realWorldConnection: readString(record.realWorldConnection),
    familyCommunityConnection: readString(record.familyCommunityConnection),
    toolStack: readString(record.toolStack),
  };
}

export function normalizePassionLabBlueprint(value: unknown): PassionLabBlueprint {
  const record = asRecord(value);
  return {
    bigIdea: readString(record.bigIdea),
    studentChoicePlan: readString(record.studentChoicePlan),
    mentorCommunityConnection: readString(record.mentorCommunityConnection),
    showcaseCriteria: readString(record.showcaseCriteria),
    supportPlan: readString(record.supportPlan),
    riskSafetyNotes: readString(record.riskSafetyNotes),
    resourcePlan: readString(record.resourcePlan),
  };
}

export function normalizePassionLabSessionTopic(value: unknown): PassionLabSessionTopic {
  const record = asRecord(value);
  return {
    topic: readString(record.topic),
    objective: readString(record.objective),
    checkpointArtifact: readString(record.checkpointArtifact),
    miniLesson: readString(record.miniLesson),
    handsOnBuild: readString(record.handsOnBuild || record.activities),
    collaboration: readString(record.collaboration),
    reflection: readString(record.reflection),
    materialsTools: readString(record.materialsTools || record.materials),
    progressEvidence: readString(record.progressEvidence),
    extensionPrompt: readString(record.extensionPrompt),
  };
}

export function serializePassionLabSessionTopic(topic: PassionLabSessionTopic): UnknownRecord {
  return {
    topic: topic.topic,
    objective: topic.objective,
    checkpointArtifact: topic.checkpointArtifact,
    miniLesson: topic.miniLesson,
    handsOnBuild: topic.handsOnBuild,
    collaboration: topic.collaboration,
    reflection: topic.reflection,
    materialsTools: topic.materialsTools,
    progressEvidence: topic.progressEvidence,
    extensionPrompt: topic.extensionPrompt,
    activities: topic.handsOnBuild,
    materials: topic.materialsTools,
  };
}

export function normalizeCompetitionPlanningDetails(
  value: unknown
): CompetitionPlanningDetails {
  const record = asRecord(value);
  return {
    challengeBrief: readString(record.challengeBrief),
    idealParticipant: readString(record.idealParticipant),
    submissionPackage: readString(record.submissionPackage),
    milestoneTimeline: readString(record.milestoneTimeline),
    supportResources: readString(record.supportResources),
    reviewProcess: readString(record.reviewProcess),
    celebrationPlan: readString(record.celebrationPlan),
    promotionPlan: readString(record.promotionPlan),
  };
}

export function normalizeSequenceBlueprint(value: unknown): SequenceBlueprint {
  const record = asRecord(value);
  return {
    targetLearner: readString(record.targetLearner),
    entryPoint: readString(record.entryPoint),
    endGoalCapstone: readString(record.endGoalCapstone),
    pacingGuidance: readString(record.pacingGuidance),
    supportCheckpoints: readString(record.supportCheckpoints),
    completionSignals: readString(record.completionSignals),
  };
}

export function normalizeSequenceStepDetails(value: unknown): SequenceStepDetails {
  const record = asRecord(value);
  return {
    purpose: readString(record.purpose),
    expectedEvidence: readString(record.expectedEvidence),
    estimatedDuration: readString(record.estimatedDuration),
    coachSupportNote: readString(record.coachSupportNote),
    unlockRationale: readString(record.unlockRationale),
  };
}
