import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { FieldLabel } from "@/components/field-help";
import { MentorshipGuideCard } from "@/components/mentorship-guide-card";
import { ProgressBar } from "@/components/progress-bar";
import {
  approveMonthlyGoalReview,
  getPendingChairReviews,
  returnMonthlyGoalReview,
} from "@/lib/mentorship-program-actions";

const CHAIR_QUEUE_GUIDE_ITEMS = [
  {
    label: "Queue Overview",
    meaning:
      "Each card is one monthly review waiting for a chair-level decision before it becomes final.",
    howToUse:
      "Read the mentee, mentor, month, and progress summary first so you know what case you are about to review.",
  },
  {
    label: "Mentor Summary and Committee Notes",
    meaning:
      "These sections explain the mentor's reasoning, what the mentee did well, and what internal reviewers should know.",
    howToUse:
      "Use them to judge whether the review is clear, fair, and complete enough to release.",
  },
  {
    label: "Goal Ratings and Linked Reflection",
    meaning:
      "This is the supporting evidence for the decision. Goal ratings show scored progress and the reflection shows the mentee's own voice.",
    howToUse:
      "Compare these two areas when you want to see whether the review matches the evidence from the month.",
  },
  {
    label: "Approve or Return",
    meaning:
      "The last forms decide whether the review moves forward or goes back for edits.",
    howToUse:
      "Approve when the review is ready to stand on its own. Return it when the mentor needs to clarify ratings, evidence, or next steps.",
  },
] as const;

export default async function ChairReviewQueuePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const roles = session.user.roles ?? [];
  if (
    !roles.includes("ADMIN") &&
    !roles.includes("CHAPTER_LEAD") &&
    !roles.includes("MENTOR")
  ) {
    redirect("/mentorship");
  }

  const reviews = await getPendingChairReviews();

  return (
    <div>
      <div className="topbar">
        <div>
          <Link href="/mentorship" style={{ color: "var(--muted)", fontSize: 13 }}>
            &larr; Mentorship
          </Link>
          <p className="badge">Chair Workflow</p>
          <h1 className="page-title">Monthly Goal Review Queue</h1>
          <p style={{ marginTop: 4, color: "var(--muted)", fontSize: 14 }}>
            Approve or return mentor reviews before they are released to mentees.
          </p>
        </div>
      </div>

      <MentorshipGuideCard
        title="How To Work The Chair Review Queue"
        intro="This page is the quality-control step for monthly reviews that require chair approval."
        items={CHAIR_QUEUE_GUIDE_ITEMS}
      />

      {reviews.length === 0 ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>No reviews waiting on approval</h3>
          <p style={{ marginBottom: 0, color: "var(--muted)" }}>
            New monthly goal reviews will appear here once mentors submit them.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {reviews.map((review) => (
            <div key={review.id} className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div className="section-title" style={{ marginBottom: 6 }}>
                    {review.mentee.name}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Mentor: {review.mentor.name} · {review.mentee.primaryRole.replace("_", " ")}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                    Month:{" "}
                    {new Date(review.month).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                    {review.mentorship.track && ` · Track: ${review.mentorship.track.name}`}
                  </div>
                </div>
                <div style={{ minWidth: 240 }}>
                  {review.overallStatus ? (
                    <ProgressBar status={review.overallStatus} label="Overall Progress" />
                  ) : (
                    <p style={{ margin: 0, color: "var(--muted)" }}>
                      No overall progress selected.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid two" style={{ marginBottom: 16 }}>
                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>
                    Mentor Summary
                  </strong>
                  <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13 }}>
                    {review.overallComments || "No overall summary provided."}
                  </p>
                  <p style={{ marginTop: 12, fontSize: 13 }}>
                    <strong>Strengths:</strong>{" "}
                    {review.strengths || "No strengths recorded."}
                  </p>
                  <p style={{ marginTop: 12, fontSize: 13 }}>
                    <strong>Focus Areas:</strong>{" "}
                    {review.focusAreas || "No focus areas recorded."}
                  </p>
                  <p style={{ marginTop: 12, fontSize: 13 }}>
                    <strong>Next Month Plan:</strong>{" "}
                    {review.nextMonthPlan || "No next-month plan recorded."}
                  </p>
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: 6 }}>
                    Committee Notes
                  </strong>
                  <p style={{ marginTop: 0, fontSize: 13 }}>
                    <strong>Collaboration:</strong>{" "}
                    {review.collaborationNotes || "No collaboration notes provided."}
                  </p>
                  <p style={{ marginTop: 12, fontSize: 13 }}>
                    <strong>Promotion Readiness:</strong>{" "}
                    {review.promotionReadiness || "No promotion readiness note provided."}
                  </p>
                  <p style={{ marginTop: 12, fontSize: 13 }}>
                    <strong>Character & Culture Points:</strong>{" "}
                    {review.characterCulturePoints}
                  </p>
                  <p style={{ marginTop: 12, fontSize: 13 }}>
                    <strong>Internal Mentor Notes:</strong>{" "}
                    {review.mentorInternalNotes || "No internal notes provided."}
                  </p>
                </div>
              </div>

              {review.goalRatings.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ display: "block", marginBottom: 10 }}>
                    Goal Ratings
                  </strong>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {review.goalRatings.map((rating) => (
                      <div
                        key={rating.id}
                        style={{
                          padding: 12,
                          background: "var(--surface-alt)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{rating.goal.template.title}</div>
                        <div style={{ marginTop: 8 }}>
                          <ProgressBar status={rating.status} />
                        </div>
                        {rating.comments && (
                          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
                            {rating.comments}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.reflectionSubmission && (
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ display: "block", marginBottom: 10 }}>
                    Linked Monthly Self-Reflection
                  </strong>
                  <div
                    style={{
                      padding: 12,
                      background: "var(--surface-alt)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {review.reflectionSubmission.responses.slice(0, 3).map((response) => (
                      <div key={response.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {response.question.sectionTitle || "Reflection"}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {response.question.question}
                        </div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>{response.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid two">
                <form action={approveMonthlyGoalReview}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <div style={{ marginBottom: 6 }}>
                    <FieldLabel
                      label="Approval Note"
                      help={{
                        title: "Approval Note",
                        guidance:
                          "This optional note is the final message you want attached to the approved review.",
                        example:
                          "Approved as written. Strong evidence and clear next-month plan.",
                      }}
                    />
                  </div>
                  <textarea
                    id={`${review.id}-approve-note`}
                    name="chairDecisionNotes"
                    className="input"
                    rows={3}
                    placeholder="Optional note shared with the approved review."
                    style={{ marginBottom: 10 }}
                  />
                  <button type="submit" className="button">
                    Approve Review
                  </button>
                </form>

                <form action={returnMonthlyGoalReview}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <div style={{ marginBottom: 6 }}>
                    <FieldLabel
                      label="Return For Edits Note"
                      help={{
                        title: "Return For Edits Note",
                        guidance:
                          "Use this required note to explain exactly what the mentor needs to fix before the review can be approved.",
                        example:
                          "Please explain the yellow rating on Goal 2 and add a clearer next-month plan with measurable steps.",
                      }}
                    />
                  </div>
                  <textarea
                    id={`${review.id}-return-note`}
                    name="chairDecisionNotes"
                    className="input"
                    rows={3}
                    placeholder="Explain what needs to be updated before approval."
                    style={{ marginBottom: 10 }}
                    required
                  />
                  <button type="submit" className="button secondary">
                    Return Review
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
