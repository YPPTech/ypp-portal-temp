import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitInfoResponse } from "@/lib/instructor-application-actions";
import { InstructorApplicationStatus } from "@prisma/client";
import InfoResponseForm from "./info-response-form";

function statusLabel(status: InstructorApplicationStatus): string {
  switch (status) {
    case "SUBMITTED": return "Submitted";
    case "UNDER_REVIEW": return "Under Review";
    case "INFO_REQUESTED": return "More Info Requested";
    case "INTERVIEW_SCHEDULED": return "Interview Scheduled";
    case "INTERVIEW_COMPLETED": return "Interview Completed";
    case "APPROVED": return "Approved";
    case "REJECTED": return "Not Accepted";
  }
}

function statusColor(status: InstructorApplicationStatus): string {
  if (status === "APPROVED") return "#16a34a";
  if (status === "REJECTED") return "#dc2626";
  if (status === "INFO_REQUESTED") return "#d97706";
  return "#7c3aed";
}

const STAGES = [
  { key: "submitted", label: "Submitted" },
  { key: "review", label: "Under Review" },
  { key: "interview", label: "Interview" },
  { key: "decision", label: "Decision" },
] as const;

function currentStageIndex(status: InstructorApplicationStatus): number {
  if (status === "SUBMITTED") return 0;
  if (status === "UNDER_REVIEW" || status === "INFO_REQUESTED") return 1;
  if (status === "INTERVIEW_SCHEDULED" || status === "INTERVIEW_COMPLETED") return 2;
  return 3; // APPROVED or REJECTED
}

export default async function ApplicationStatusPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const roles = session.user.roles ?? [];
  const primaryRole = session.user.primaryRole;

  // Only APPLICANT users or users with an application can see this page
  if (!roles.includes("APPLICANT") && primaryRole !== "APPLICANT") {
    redirect("/");
  }

  const application = await prisma.instructorApplication.findUnique({
    where: { applicantId: session.user.id },
    include: { reviewer: { select: { name: true } } },
  });

  if (!application) {
    redirect("/");
  }

  const stageIdx = currentStageIndex(application.status);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <span className="badge" style={{ background: statusColor(application.status), color: "white", marginBottom: 6 }}>
            {statusLabel(application.status)}
          </span>
          <h1 className="page-title">Your Instructor Application</h1>
          <p className="page-subtitle">
            Applied {new Date(application.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {STAGES.map((stage, i) => (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", flex: i < STAGES.length - 1 ? 1 : "initial" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: i <= stageIdx ? "#7c3aed" : "var(--border)",
                  color: i <= stageIdx ? "white" : "var(--muted)",
                  fontWeight: 700, fontSize: 14,
                }}>
                  {i < stageIdx ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 11, color: i <= stageIdx ? "#7c3aed" : "var(--muted)", marginTop: 4, textAlign: "center" }}>
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < stageIdx ? "#7c3aed" : "var(--border)", margin: "0 4px", marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status-specific content */}
      <div className="card" style={{ marginBottom: 24 }}>
        {application.status === "SUBMITTED" && (
          <>
            <h2 className="section-title">Application Received</h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Your application is in the queue. An admin or chapter lead will review it and reach out within a few business days.
            </p>
          </>
        )}

        {application.status === "UNDER_REVIEW" && (
          <>
            <h2 className="section-title">Under Review</h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              {application.reviewer ? `${application.reviewer.name} is` : "A reviewer is"} currently evaluating your application.
              You will be notified when there is an update.
            </p>
          </>
        )}

        {application.status === "INFO_REQUESTED" && (
          <>
            <h2 className="section-title">Additional Information Needed</h2>
            {application.infoRequest && (
              <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}>
                  <strong>Message from {application.reviewer?.name ?? "reviewer"}:</strong>
                </p>
                <p style={{ fontSize: 14, margin: 0 }}>{application.infoRequest}</p>
              </div>
            )}
            {application.applicantResponse && (
              <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}><strong>Your previous response:</strong></p>
                <p style={{ fontSize: 14, margin: 0 }}>{application.applicantResponse}</p>
              </div>
            )}
            <InfoResponseForm />
          </>
        )}

        {application.status === "INTERVIEW_SCHEDULED" && (
          <>
            <h2 className="section-title">Interview Scheduled</h2>
            {application.interviewScheduledAt && (
              <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  {new Date(application.interviewScheduledAt).toLocaleString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Your interview has been scheduled. Please be ready at the specified time. Check your email for any additional details.
            </p>
          </>
        )}

        {application.status === "INTERVIEW_COMPLETED" && (
          <>
            <h2 className="section-title">Interview Completed</h2>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>
              Your interview has been completed. A final decision is pending. You will be notified by email when a decision has been made.
            </p>
          </>
        )}

        {application.status === "APPROVED" && (
          <>
            <h2 className="section-title" style={{ color: "#16a34a" }}>Congratulations — You&apos;re Approved!</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 16 }}>
              Your instructor application has been approved. You can now access instructor training. Once you complete training and your interview, you will be fully certified to teach.
            </p>
            <a href="/instructor-training" className="button" style={{ display: "inline-block" }}>
              Start Instructor Training
            </a>
          </>
        )}

        {application.status === "REJECTED" && (
          <>
            <h2 className="section-title">Application Not Accepted</h2>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 12 }}>
              Thank you for your interest in becoming an instructor at Youth Passion Project. After careful consideration, we are unfortunately not moving forward with your application at this time.
            </p>
            {application.rejectionReason && (
              <div style={{ background: "var(--surface-2)", borderRadius: 8, padding: "12px 16px" }}>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}><strong>Reviewer notes:</strong></p>
                <p style={{ fontSize: 14, margin: 0 }}>{application.rejectionReason}</p>
              </div>
            )}
          </>
        )}

        {/* Reviewer feedback (when not rejection) */}
        {application.reviewerNotes && application.status !== "REJECTED" && (
          <div style={{ marginTop: 16, background: "var(--surface-2)", borderRadius: 8, padding: "12px 16px" }}>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}><strong>Feedback from reviewer:</strong></p>
            <p style={{ fontSize: 14, margin: 0 }}>{application.reviewerNotes}</p>
          </div>
        )}
      </div>

      {/* Application details collapsible */}
      <details className="card">
        <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, padding: "4px 0" }}>
          Your Application Details
        </summary>
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}><strong>Why you want to teach:</strong></p>
            <p style={{ fontSize: 14, margin: 0, whiteSpace: "pre-wrap" }}>{application.motivation}</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}><strong>Teaching experience:</strong></p>
            <p style={{ fontSize: 14, margin: 0, whiteSpace: "pre-wrap" }}>{application.teachingExperience}</p>
          </div>
          <div>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 4px" }}><strong>Interview availability:</strong></p>
            <p style={{ fontSize: 14, margin: 0 }}>{application.availability}</p>
          </div>
        </div>
      </details>
    </div>
  );
}
