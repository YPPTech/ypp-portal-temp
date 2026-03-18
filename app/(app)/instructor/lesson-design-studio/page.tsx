import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrCreateCurriculumDraft } from "@/lib/curriculum-draft-actions";
import { getCurriculumDraftProgress } from "@/lib/curriculum-draft-progress";
import {
  deriveStudioPhase,
  getCanonicalStudioHref,
  getStudioEntryContextFromSearchParams,
} from "@/lib/lesson-design-studio";
import { StudioClient } from "./studio-client";
import "./studio.css";

export default async function CurriculumBuilderStudioPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const roles = session.user.roles ?? [];
  const hasAccess =
    roles.includes("INSTRUCTOR") ||
    roles.includes("ADMIN") ||
    roles.includes("CHAPTER_LEAD") ||
    roles.includes("APPLICANT");

  if (!hasAccess) redirect("/");

  const params = (await searchParams) ?? {};
  const canonicalHref = getCanonicalStudioHref(params);
  if (canonicalHref) {
    redirect(canonicalHref);
  }

  const draft = await getOrCreateCurriculumDraft();
  const progress = getCurriculumDraftProgress({
    title: draft.title,
    interestArea: draft.interestArea,
    outcomes: draft.outcomes,
    courseConfig: draft.courseConfig,
    weeklyPlans: draft.weeklyPlans,
    understandingChecks: draft.understandingChecks,
  });
  const entryContext = getStudioEntryContextFromSearchParams(params);
  const currentPhase = deriveStudioPhase({
    status: draft.status,
    title: draft.title,
    interestArea: draft.interestArea,
    outcomes: draft.outcomes,
    courseConfig: draft.courseConfig,
    weeklyPlans: draft.weeklyPlans,
    understandingChecks: draft.understandingChecks,
    progress,
  });

  return (
    <StudioClient
      userId={session.user.id}
      userName={session.user.name ?? "Instructor"}
      entryContext={entryContext}
      currentPhase={currentPhase}
      progress={progress}
      draft={{
        id: draft.id,
        title: draft.title,
        description: draft.description ?? "",
        interestArea: draft.interestArea,
        outcomes: draft.outcomes,
        courseConfig: draft.courseConfig,
        weeklyPlans: (draft.weeklyPlans as unknown[]) ?? [],
        understandingChecks: draft.understandingChecks,
        reviewRubric: draft.reviewRubric,
        reviewNotes: draft.reviewNotes ?? "",
        reviewedAt: draft.reviewedAt?.toISOString() ?? null,
        submittedAt: draft.submittedAt?.toISOString() ?? null,
        approvedAt: draft.approvedAt?.toISOString() ?? null,
        generatedTemplateId: draft.generatedTemplateId ?? null,
        status: draft.status,
        updatedAt: draft.updatedAt.toISOString(),
      }}
    />
  );
}
