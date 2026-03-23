import Link from "next/link";

interface AtRiskChapter {
  chapterId: string;
  chapterName: string;
  riskFlags: string[];
  activeStudents: number;
  activeInstructors: number;
  overdueQueues: number;
}

const RISK_FLAG_LABELS: Record<string, string> = {
  no_active_instructors: "No Instructors",
  overdue_queues_high: "Overdue Queues",
  pending_applications_backlog: "App Backlog",
  no_running_classes: "No Classes",
  low_enrollment: "Low Enrollment",
  no_mentorship_pairs: "No Mentors",
};

export default function AtRiskPanel({ chapters }: { chapters: AtRiskChapter[] }) {
  if (chapters.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: "1rem", borderLeft: "4px solid #dc2626" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <p style={{ fontWeight: 700, margin: 0 }}>
          At-Risk Chapters ({chapters.length})
        </p>
        <Link href="/admin/governance" className="button ghost small" style={{ fontSize: "0.78rem" }}>
          View All
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {chapters.slice(0, 5).map((ch) => (
          <div
            key={ch.chapterId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.5rem 0.75rem",
              background: "#fef2f2",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <div>
              <p style={{ fontWeight: 600, margin: 0, fontSize: "0.85rem" }}>{ch.chapterName}</p>
              <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                {ch.riskFlags.slice(0, 3).map((flag) => (
                  <span
                    key={flag}
                    style={{
                      fontSize: "0.68rem",
                      color: "#dc2626",
                      background: "#fee2e2",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "4px",
                    }}
                  >
                    {RISK_FLAG_LABELS[flag] ?? flag}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "right" }}>
              <div>{ch.activeStudents}S / {ch.activeInstructors}I</div>
              {ch.overdueQueues > 0 && (
                <div style={{ color: "#dc2626" }}>{ch.overdueQueues} overdue</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
