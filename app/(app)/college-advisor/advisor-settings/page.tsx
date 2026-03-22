"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getMyAvailabilitySlots,
  addAvailabilitySlot,
  removeAvailabilitySlot,
} from "@/lib/college-advisor-scheduling";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Slot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export default function AdvisorSettingsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New slot form
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");

  useEffect(() => {
    getMyAvailabilitySlots().then(setSlots).catch(() => {});
  }, []);

  function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("dayOfWeek", dayOfWeek);
        formData.set("startTime", startTime);
        formData.set("endTime", endTime);
        await addAvailabilitySlot(formData);
        const updated = await getMyAvailabilitySlots();
        setSlots(updated);
        setSuccess("Availability slot added!");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add slot");
      }
    });
  }

  function handleRemoveSlot(slotId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        await removeAvailabilitySlot(slotId);
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
        setSuccess("Slot removed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove slot");
      }
    });
  }

  // Group slots by day
  const slotsByDay = DAY_NAMES.map((name, idx) => ({
    day: name,
    dayIdx: idx,
    slots: slots.filter((s) => s.dayOfWeek === idx),
  })).filter((d) => d.slots.length > 0);

  return (
    <div>
      <div className="topbar">
        <div>
          <p className="badge">College Advisor</p>
          <h1 className="page-title">Advisor Settings</h1>
          <p className="page-subtitle">Manage your availability for advisee meetings</p>
        </div>
        <button className="button ghost small" onClick={() => router.push("/advisor-dashboard")}>
          ← Dashboard
        </button>
      </div>

      <div className="grid two">
        {/* Add Slot */}
        <div className="card">
          <p style={{ fontWeight: 700, marginBottom: "1rem" }}>Add Availability Slot</p>
          <form onSubmit={handleAddSlot}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>Day</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} style={{ width: "100%" }}>
                {DAY_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: "0.3rem" }}>End</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: "100%" }} />
              </div>
            </div>
            <button className="button primary" type="submit" disabled={isPending} style={{ width: "100%" }}>
              {isPending ? "Adding..." : "Add Slot"}
            </button>
          </form>
        </div>

        {/* Current Slots */}
        <div className="card">
          <p style={{ fontWeight: 700, marginBottom: "1rem" }}>Current Availability</p>
          {slotsByDay.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              No availability slots set. Add your first slot.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {slotsByDay.map((day) => (
                <div key={day.dayIdx}>
                  <p style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.3rem" }}>
                    {day.day}
                  </p>
                  {day.slots.map((slot) => (
                    <div
                      key={slot.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.5rem 0.75rem",
                        background: "var(--surface-alt)",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <span style={{ fontSize: "0.88rem" }}>
                        {slot.startTime} — {slot.endTime}
                      </span>
                      <button
                        className="button ghost small"
                        style={{ color: "#dc2626", padding: "0.2rem 0.5rem" }}
                        onClick={() => handleRemoveSlot(slot.id)}
                        disabled={isPending}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p style={{ color: "var(--color-error)", fontWeight: 600, marginTop: "1rem" }}>{error}</p>}
      {success && <p style={{ color: "var(--color-success)", fontWeight: 600, marginTop: "1rem" }}>{success}</p>}
    </div>
  );
}
