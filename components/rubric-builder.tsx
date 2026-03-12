"use client";

import { useState, useTransition } from "react";
import {
  addCriterion,
  updateCriterion,
  deleteCriterion,
  createRubric,
  updateRubric,
} from "@/lib/rubric-actions";

type Criterion = {
  id: string;
  name: string;
  description: string | null;
  pointValue: number;
  sortOrder: number;
};

type RubricBuilderProps = {
  /** Existing rubric id — if provided, we're editing; otherwise creating */
  rubricId?: string;
  rubricTitle?: string;
  initialCriteria?: Criterion[];
  chapterId?: string;
  /** Called with rubricId after save. Useful to wire into parent form. */
  onSave?: (rubricId: string) => void;
  /** Compact mode — hide rubric title field (used when embedding in a form) */
  compact?: boolean;
};

type LocalCriterion = {
  /** cuid if persisted, "new-<n>" if local-only */
  id: string;
  name: string;
  description: string;
  pointValue: number;
  sortOrder: number;
  isPersisted: boolean;
};

export function RubricBuilder({
  rubricId,
  rubricTitle = "",
  initialCriteria = [],
  chapterId,
  onSave,
  compact = false,
}: RubricBuilderProps) {
  const [title, setTitle] = useState(rubricTitle);
  const [criteria, setCriteria] = useState<LocalCriterion[]>(
    initialCriteria.map((c) => ({ ...c, description: c.description ?? "", isPersisted: true }))
  );
  const [savedRubricId, setSavedRubricId] = useState<string | undefined>(rubricId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPoints = criteria.reduce((sum, c) => sum + c.pointValue, 0);

  function addRow() {
    setCriteria((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        description: "",
        pointValue: 10,
        sortOrder: prev.length,
        isPersisted: false,
      },
    ]);
  }

  function updateRow(id: string, field: keyof LocalCriterion, value: string | number) {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function removeRow(id: string) {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
    if (savedRubricId) {
      const crit = criteria.find((c) => c.id === id);
      if (crit?.isPersisted) {
        startTransition(async () => {
          await deleteCriterion(id);
        });
      }
    }
  }

  async function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError("Rubric title is required");
      return;
    }

    startTransition(async () => {
      try {
        let currentRubricId = savedRubricId;

        // Create or update rubric header
        const fd = new FormData();
        fd.set("title", title);
        fd.set("description", "");
        if (chapterId) fd.set("chapterId", chapterId);

        if (!currentRubricId) {
          const res = await createRubric(fd);
          if (!res.success) throw new Error("Failed to create rubric");
          currentRubricId = res.rubricId;
          setSavedRubricId(currentRubricId);
        } else {
          await updateRubric(currentRubricId, fd);
        }

        // Upsert criteria
        const updatedCriteria: LocalCriterion[] = [];
        for (const c of criteria) {
          const cfd = new FormData();
          cfd.set("name", c.name);
          cfd.set("description", c.description);
          cfd.set("pointValue", String(c.pointValue));

          if (c.isPersisted) {
            await updateCriterion(c.id, cfd);
            updatedCriteria.push(c);
          } else {
            cfd.set("rubricId", currentRubricId!);
            const res = await addCriterion(currentRubricId!, cfd);
            updatedCriteria.push({ ...c, id: res.criterionId, isPersisted: true });
          }
        }
        setCriteria(updatedCriteria);

        onSave?.(currentRubricId!);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save rubric");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!compact && (
        <div className="form-row">
          <label>Rubric Title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Project Presentation Rubric"
          />
        </div>
      )}

      {/* Criteria table */}
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 80px 36px",
            gap: 6,
            marginBottom: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--muted)",
            padding: "0 4px",
          }}
        >
          <span>Criterion Name *</span>
          <span>Description</span>
          <span>Points</span>
          <span />
        </div>

        {criteria.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "8px 4px" }}>
            No criteria yet. Add at least one below.
          </p>
        )}

        {criteria.map((c, idx) => (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 80px 36px",
              gap: 6,
              marginBottom: 6,
              alignItems: "center",
            }}
          >
            <input
              className="input"
              value={c.name}
              onChange={(e) => updateRow(c.id, "name", e.target.value)}
              placeholder={`Criterion ${idx + 1}`}
            />
            <input
              className="input"
              value={c.description}
              onChange={(e) => updateRow(c.id, "description", e.target.value)}
              placeholder="Optional description"
            />
            <input
              className="input"
              type="number"
              min={0}
              max={1000}
              value={c.pointValue}
              onChange={(e) => updateRow(c.id, "pointValue", parseInt(e.target.value) || 0)}
            />
            <button
              type="button"
              className="button danger small"
              onClick={() => removeRow(c.id)}
              title="Remove criterion"
              style={{ padding: "6px 8px" }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" className="button outline small" onClick={addRow}>
          + Add Criterion
        </button>
        {criteria.length > 0 && (
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Total: <strong>{totalPoints} pts</strong>
          </span>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--error, #d32f2f)", margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="button primary small"
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending ? "Saving..." : savedRubricId ? "Update Rubric" : "Save Rubric"}
      </button>
    </div>
  );
}

// ─── Compact read-only rubric display (shown to students before submission) ──

type RubricDisplayProps = {
  title: string;
  criteria: Array<{
    name: string;
    description: string | null;
    pointValue: number;
  }>;
};

export function RubricDisplay({ title, criteria }: RubricDisplayProps) {
  const total = criteria.reduce((sum, c) => sum + c.pointValue, 0);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          background: "var(--ypp-purple-50, #f3f0ff)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{total} pts total</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--surface-alt)" }}>
            <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
              Criterion
            </th>
            <th style={{ padding: "8px 16px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
              Description
            </th>
            <th style={{ padding: "8px 16px", textAlign: "right", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, idx) => (
            <tr
              key={idx}
              style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "var(--surface-alt)" }}
            >
              <td style={{ padding: "8px 16px", fontWeight: 500 }}>{c.name}</td>
              <td style={{ padding: "8px 16px", color: "var(--muted)" }}>{c.description ?? "—"}</td>
              <td style={{ padding: "8px 16px", textAlign: "right", fontWeight: 600 }}>
                {c.pointValue}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
