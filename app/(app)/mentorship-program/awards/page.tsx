import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getEligibleMentees, getNominationQueue } from "@/lib/award-nomination-actions";
import { TIER_CONFIG } from "@/lib/award-tier-config";
import NominationsPanel from "./nominations-panel";
import Link from "next/link";

export const metadata = { title: "Achievement Awards — Mentorship Program" };

const TIER_ORDER = ["BRONZE", "SILVER", "GOLD", "LIFETIME"] as const;

export default async function AwardsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const roles = session.user.roles ?? [];
  if (!roles.includes("ADMIN") && !roles.includes("MENTOR") && !roles.includes("CHAPTER_LEAD")) {
    redirect("/");
  }

  const isAdmin = roles.includes("ADMIN");

  const [eligibleMentees, nominations] = await Promise.all([
    getEligibleMentees(),
    getNominationQueue(),
  ]);

  const mentees = eligibleMentees ?? [];
  const allNominations = nominations ?? [];

  const approvedCount = allNominations.filter((n) => n.status === "APPROVED").length;
  const pendingCount = allNominations.filter(
    (n) => n.status === "PENDING_CHAIR" || n.status === "PENDING_BOARD"
  ).length;

  return (
    <div>
      <div className="topbar">
        <div>
          <p className="badge">Mentorship Program</p>
          <h1 className="page-title">Achievement Awards</h1>
          <p className="page-subtitle">
            Nominate and approve mentees for Bronze, Silver, Gold, and Lifetime awards
          </p>
        </div>
        <Link href="/mentorship-program/chair" className="button ghost small">
          ← Chair Queue
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid four" style={{ marginBottom: "1.75rem" }}>
        <div className="card">
          <p className="kpi" style={{ color: approvedCount > 0 ? "#16a34a" : "inherit" }}>
            {approvedCount}
          </p>
          <p className="kpi-label">Approved Awards</p>
        </div>
        <div className="card">
          <p className="kpi" style={{ color: pendingCount > 0 ? "#d97706" : "inherit" }}>
            {pendingCount}
          </p>
          <p className="kpi-label">Pending Review</p>
        </div>
        <div className="card">
          <p className="kpi" style={{ color: mentees.length > 0 ? "var(--ypp-purple-700)" : "inherit" }}>
            {mentees.length}
          </p>
          <p className="kpi-label">Eligible for Nomination</p>
        </div>
        <div className="card">
          <p className="kpi">{allNominations.length}</p>
          <p className="kpi-label">Total Nominations</p>
        </div>
      </div>

      {/* Tier legend */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "0.9rem 1.1rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.75rem" }}>Award Tiers</p>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {TIER_ORDER.map((tier) => {
            const cfg = TIER_CONFIG[tier];
            return (
              <div key={tier} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span
                  className="pill"
                  style={{ background: cfg.bg, color: cfg.color, fontSize: "0.78rem" }}
                >
                  {cfg.emoji} {cfg.label}
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                  {cfg.min}+ pts{cfg.requiresBoard ? " · Board approval" : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <NominationsPanel
        eligibleMentees={mentees}
        nominations={allNominations}
        isAdmin={isAdmin}
      />
    </div>
  );
}
