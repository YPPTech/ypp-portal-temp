"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestMeeting } from "@/lib/college-advisor-scheduling";

export default function ScheduleMeetingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("30");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      setError("Please select a date and time.");
      return;
    }

    setError(null);
    const scheduledAt = new Date(`${date}T${time}`);

    startTransition(async () => {
      try {
        // Get advisorship ID from search params or fetch it
        const res = await fetch("/api/my-advisorship-id");
        const data = await res.json();
        if (!data.advisorshipId) {
          setError("No active advisorship found. Please request an advisor first.");
          return;
        }

        const formData = new FormData();
        formData.set("advisorshipId", data.advisorshipId);
        formData.set("scheduledAt", scheduledAt.toISOString());
        formData.set("topic", topic);
        formData.set("durationMinutes", duration);

        await requestMeeting(formData);
        setSuccess(true);
        setTimeout(() => router.push("/college-advisor"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to request meeting");
      }
    });
  }

  if (success) {
    return (
      <div>
        <div className="topbar">
          <div>
            <p className="badge">College Advisor</p>
            <h1 className="page-title">Meeting Requested!</h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "3rem", maxWidth: "500px", margin: "2rem auto" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <p style={{ fontWeight: 600 }}>Your meeting request has been sent to your advisor.</p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            You&apos;ll be notified once they confirm the meeting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <p className="badge">College Advisor</p>
          <h1 className="page-title">Schedule a Meeting</h1>
          <p className="page-subtitle">Request a meeting with your college advisor</p>
        </div>
        <button className="button ghost small" onClick={() => router.back()}>
          ← Back
        </button>
      </div>

      <div className="card" style={{ maxWidth: "600px" }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", display: "block", marginBottom: "0.3rem" }}>
              Preferred Date <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              style={{ width: "100%" }}
              required
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", display: "block", marginBottom: "0.3rem" }}>
              Preferred Time <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ width: "100%" }}
              required
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", display: "block", marginBottom: "0.3rem" }}>
              Duration
            </label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ width: "100%" }}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontWeight: 600, fontSize: "0.88rem", display: "block", marginBottom: "0.3rem" }}>
              Topic (optional)
            </label>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
              What would you like to discuss? This helps your advisor prepare.
            </p>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="e.g., College application essays, financial aid options, choosing a major..."
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {error && (
            <p style={{ color: "var(--color-error)", fontWeight: 600, marginBottom: "1rem" }}>{error}</p>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="button primary" type="submit" disabled={isPending}>
              {isPending ? "Requesting..." : "Request Meeting"}
            </button>
            <button className="button ghost" type="button" onClick={() => router.back()} disabled={isPending}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
