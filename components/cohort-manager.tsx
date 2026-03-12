"use client";

import { useState, useTransition, useEffect } from "react";
import {
  createInstructorCohort,
  addMembersToCohort,
  removeMemberFromCohort,
  enrollCohortInOffering,
  enrollCohortInProgram,
  getInstructorCohorts,
} from "@/lib/instructor-cohort-actions";

type Member = {
  userId: string;
  user: { id: string; name: string; email: string };
};

type Cohort = {
  id: string;
  name: string;
  members: Member[];
};

type ChapterUser = {
  id: string;
  name: string;
  email: string;
};

type CohortManagerProps = {
  /** If set, "Enroll" will enroll into a ClassOffering */
  offeringId?: string;
  /** If set, "Enroll" will enroll into a SpecialProgram */
  programId?: string;
  chapterId: string;
  /** Available students in this chapter to add to cohorts */
  chapterStudents?: ChapterUser[];
};

export function CohortManager({
  offeringId,
  programId,
  chapterId,
  chapterStudents = [],
}: CohortManagerProps) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Create cohort form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCohortName, setNewCohortName] = useState("");

  // Add member state
  const [expandedCohortId, setExpandedCohortId] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // Enrollment feedback
  const [enrollFeedback, setEnrollFeedback] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);

  // Load cohorts on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await getInstructorCohorts(chapterId);
        setCohorts(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            members: c.members as Member[],
          }))
        );
      } catch {
        setError("Failed to load cohorts");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [chapterId]);

  async function handleCreateCohort() {
    if (!newCohortName.trim()) return;
    setError(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", newCohortName);
        fd.set("chapterId", chapterId);
        const res = await createInstructorCohort(fd);
        setCohorts((prev) => [
          { id: res.cohortId, name: newCohortName, members: [] },
          ...prev,
        ]);
        setNewCohortName("");
        setShowCreateForm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create cohort");
      }
    });
  }

  async function handleAddMember(cohortId: string, userId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await addMembersToCohort(cohortId, [userId]);
        const student = chapterStudents.find((s) => s.id === userId);
        if (!student) return;
        setCohorts((prev) =>
          prev.map((c) =>
            c.id === cohortId
              ? {
                  ...c,
                  members: [...c.members, { userId, user: student }],
                }
              : c
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add member");
      }
    });
  }

  async function handleRemoveMember(cohortId: string, userId: string) {
    startTransition(async () => {
      try {
        await removeMemberFromCohort(cohortId, userId);
        setCohorts((prev) =>
          prev.map((c) =>
            c.id === cohortId
              ? { ...c, members: c.members.filter((m) => m.userId !== userId) }
              : c
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove member");
      }
    });
  }

  async function handleEnrollCohort(cohortId: string) {
    setError(null);
    setEnrollFeedback((prev) => ({ ...prev, [cohortId]: "Enrolling..." }));

    startTransition(async () => {
      try {
        let result;
        if (offeringId) {
          result = await enrollCohortInOffering(cohortId, offeringId);
        } else if (programId) {
          result = await enrollCohortInProgram(cohortId, programId);
        } else {
          return;
        }

        setEnrollFeedback((prev) => ({
          ...prev,
          [cohortId]: `✓ Enrolled ${result.enrolled} student${result.enrolled !== 1 ? "s" : ""}${result.skipped > 0 ? ` (${result.skipped} already enrolled)` : ""}${result.failed > 0 ? ` — ${result.failed} failed` : ""}`,
        }));
      } catch (e) {
        setEnrollFeedback((prev) => ({
          ...prev,
          [cohortId]: `✗ ${e instanceof Error ? e.message : "Enrollment failed"}`,
        }));
      }
    });
  }

  const filteredStudents = chapterStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  if (loading) {
    return <p style={{ fontSize: 13, color: "var(--muted)" }}>Loading cohorts…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Cohort Enrollment</span>
        <button
          type="button"
          className="button outline small"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          {showCreateForm ? "Cancel" : "+ New Cohort"}
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            value={newCohortName}
            onChange={(e) => setNewCohortName(e.target.value)}
            placeholder="Cohort name (e.g. Spring 2026 Group A)"
            onKeyDown={(e) => e.key === "Enter" && handleCreateCohort()}
          />
          <button
            type="button"
            className="button primary small"
            onClick={handleCreateCohort}
            disabled={isPending || !newCohortName.trim()}
            style={{ whiteSpace: "nowrap" }}
          >
            Create
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--error, #d32f2f)", margin: 0 }}>{error}</p>
      )}

      {/* Cohort list */}
      {cohorts.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)" }}>
          No cohorts yet. Create one to enroll a group of students at once.
        </p>
      ) : (
        cohorts.map((cohort) => {
          const isExpanded = expandedCohortId === cohort.id;
          const feedback = enrollFeedback[cohort.id];

          return (
            <div
              key={cohort.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              {/* Cohort header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--surface-alt)",
                }}
              >
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cohort.name}</span>
                  <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>
                    {cohort.members.length} member{cohort.members.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {(offeringId || programId) && cohort.members.length > 0 && (
                    <button
                      type="button"
                      className="button primary small"
                      onClick={() => handleEnrollCohort(cohort.id)}
                      disabled={isPending}
                    >
                      Enroll All
                    </button>
                  )}
                  <button
                    type="button"
                    className="button outline small"
                    onClick={() =>
                      setExpandedCohortId(isExpanded ? null : cohort.id)
                    }
                  >
                    {isExpanded ? "Collapse" : "Manage"}
                  </button>
                </div>
              </div>

              {/* Enrollment feedback */}
              {feedback && (
                <div
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    background: feedback.startsWith("✓") ? "#e8f5e9" : "#fff3e0",
                    color: feedback.startsWith("✓") ? "#2e7d32" : "#e65100",
                  }}
                >
                  {feedback}
                </div>
              )}

              {/* Expanded member management */}
              {isExpanded && (
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Current members */}
                  {cohort.members.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", margin: "0 0 6px" }}>
                        MEMBERS
                      </p>
                      {cohort.members.map((m) => (
                        <div
                          key={m.userId}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "4px 0",
                            borderBottom: "1px solid var(--border)",
                            fontSize: 13,
                          }}
                        >
                          <span>{m.user.name} <span style={{ color: "var(--muted)" }}>({m.user.email})</span></span>
                          <button
                            type="button"
                            className="button ghost small"
                            onClick={() => handleRemoveMember(cohort.id, m.userId)}
                            style={{ fontSize: 11, color: "var(--muted)" }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add student picker */}
                  {chapterStudents.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", margin: "0 0 6px" }}>
                        ADD STUDENTS
                      </p>
                      <input
                        className="input"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search by name or email…"
                        style={{ marginBottom: 6 }}
                      />
                      <div style={{ maxHeight: 180, overflowY: "auto" }}>
                        {filteredStudents
                          .filter((s) => !cohort.members.some((m) => m.userId === s.id))
                          .map((s) => (
                            <div
                              key={s.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "4px 0",
                                fontSize: 13,
                              }}
                            >
                              <span>{s.name} <span style={{ color: "var(--muted)" }}>({s.email})</span></span>
                              <button
                                type="button"
                                className="button outline small"
                                onClick={() => handleAddMember(cohort.id, s.id)}
                                disabled={isPending}
                                style={{ fontSize: 11 }}
                              >
                                + Add
                              </button>
                            </div>
                          ))}
                        {filteredStudents.filter((s) => !cohort.members.some((m) => m.userId === s.id)).length === 0 && (
                          <p style={{ fontSize: 12, color: "var(--muted)" }}>
                            {memberSearchQuery ? "No students match your search" : "All chapter students are in this cohort"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
