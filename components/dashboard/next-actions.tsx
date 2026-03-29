import Link from "next/link";
import type { DashboardNextAction } from "@/lib/dashboard/types";

type ActionTone = "urgent" | "warning" | "info" | "accent";

function inferTone(action: DashboardNextAction, index: number): ActionTone {
  const t = `${action.title} ${action.detail}`.toLowerCase();
  if (t.includes("urgent") || t.includes("overdue") || t.includes("blocker")) return "urgent";
  if (t.includes("healthy") || t.includes("steady")) return "accent";
  if (t.includes("waiting") || t.includes("pending") || t.includes("review")) return "warning";
  if (t.includes("interview") || t.includes("train") || t.includes("message")) return "info";
  const cycle: ActionTone[] = ["urgent", "warning", "info", "accent"];
  return cycle[index % cycle.length];
}

function inferIcon(action: DashboardNextAction, index: number): string {
  const t = `${action.title} ${action.detail}`.toLowerCase();
  if (t.includes("train") || t.includes("readiness")) return "🎓";
  if (t.includes("hire") || t.includes("interview") || t.includes("application")) return "📋";
  if (t.includes("parent") || t.includes("approv")) return "💜";
  if (t.includes("waitlist") || t.includes("queue")) return "⏱️";
  if (t.includes("health")) return "✨";
  const fallbacks = ["📌", "📋", "💼", "🎯"];
  return fallbacks[index % fallbacks.length];
}

export default function NextActions({
  actions,
}: {
  actions: DashboardNextAction[];
}) {
  if (actions.length === 0) return null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="dashboard-section-head">
        <h3 className="dashboard-section-kicker" style={{ margin: 0 }}>
          Next actions
        </h3>
        <Link href={actions[0]?.href ?? "#"} className="dashboard-section-link">
          View all →
        </Link>
      </div>
      <div className="dashboard-next-actions">
        {actions.map((action, index) => {
          const tone = inferTone(action, index);
          return (
            <Link key={action.id} href={action.href} className="dashboard-action-link">
              <span className={`dashboard-action-stripe tone-${tone}`} aria-hidden />
              <div className="dashboard-action-body">
                <span className="dashboard-action-icon" aria-hidden>
                  {inferIcon(action, index)}
                </span>
                <div className="dashboard-action-text">
                  <p className="dashboard-action-title">{action.title}</p>
                  <p className="dashboard-action-detail">{action.detail}</p>
                  <div className="dashboard-action-meta">
                    {tone === "urgent" ? (
                      <span className="dashboard-action-pill pill-urgent">Needs attention</span>
                    ) : null}
                    <span className="dashboard-action-pill pill-muted">Dashboard</span>
                  </div>
                </div>
                <span className="dashboard-action-chevron" aria-hidden>
                  ›
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
