/**
 * Status vocabulary normalization utility.
 *
 * Maps model-specific status values to unified display labels:
 * "Draft" | "Submitted" | "Published" | "Active" | "Closed"
 *
 * This is a UI-only layer — no schema changes.
 */

export type NormalizedStatus = "Draft" | "Submitted" | "Published" | "Active" | "Closed";

export type StatusModelType =
  | "template"    // ClassTemplate (submissionStatus + isPublished)
  | "offering"    // ClassOffering (status enum)
  | "program"     // SpecialProgram (isActive bool + submissionStatus)
  | "competition" // SeasonalCompetition (status enum + optional createdById)
  | "assignment"; // Assignment (isPublished bool)

/**
 * Normalize a raw status value to a unified display label.
 *
 * @param raw - The raw status string or boolean from the database
 * @param modelType - Which model the status belongs to
 * @param meta - Optional extra context (e.g. createdById for competitions)
 */
export function normalizeStatus(
  raw: string | boolean | null | undefined,
  modelType: StatusModelType,
  meta?: { createdById?: string | null; isPublished?: boolean }
): NormalizedStatus {
  if (raw === null || raw === undefined) return "Draft";

  switch (modelType) {
    case "template": {
      // ClassTemplate uses submissionStatus + isPublished
      if (meta?.isPublished) return "Published";
      if (raw === "APPROVED") return "Published";
      if (raw === "SUBMITTED") return "Submitted";
      if (raw === "NEEDS_REVISION") return "Draft";
      return "Draft"; // DRAFT
    }

    case "offering": {
      // ClassOffering: DRAFT | PUBLISHED | IN_PROGRESS | COMPLETED | CANCELLED
      switch (raw) {
        case "PUBLISHED":    return "Published";
        case "IN_PROGRESS":  return "Active";
        case "COMPLETED":    return "Closed";
        case "CANCELLED":    return "Closed";
        default:             return "Draft"; // DRAFT
      }
    }

    case "program": {
      // SpecialProgram: isActive bool + submissionStatus
      if (typeof raw === "boolean") {
        return raw ? "Active" : "Closed";
      }
      // submissionStatus field
      if (raw === "APPROVED") return (meta?.isPublished ? "Active" : "Published");
      if (raw === "SUBMITTED") return "Submitted";
      if (raw === "NEEDS_REVISION") return "Draft";
      return "Draft";
    }

    case "competition": {
      // SeasonalCompetition: UPCOMING | OPEN_FOR_SUBMISSIONS | JUDGING | VOTING | COMPLETED
      // UPCOMING with createdById = instructor draft
      if (raw === "UPCOMING") {
        return meta?.createdById ? "Draft" : "Published";
      }
      switch (raw) {
        case "OPEN_FOR_SUBMISSIONS": return "Active";
        case "JUDGING":              return "Active";
        case "VOTING":               return "Active";
        case "COMPLETED":            return "Closed";
        default:                     return "Draft";
      }
    }

    case "assignment": {
      // Assignment: isPublished bool
      if (typeof raw === "boolean") return raw ? "Published" : "Draft";
      return raw === "true" ? "Published" : "Draft";
    }

    default:
      return "Draft";
  }
}

/**
 * Returns inline style object for a status badge, using design-system CSS variables.
 */
export function getStatusBadgeStyle(normalized: NormalizedStatus): React.CSSProperties {
  switch (normalized) {
    case "Draft":
      return {
        background: "var(--gray-100)",
        color: "var(--gray-600)",
      };
    case "Submitted":
      return {
        background: "var(--ypp-purple-100)",
        color: "var(--ypp-purple-700)",
      };
    case "Published":
      return {
        background: "#e8f5e9",
        color: "#2e7d32",
      };
    case "Active":
      return {
        background: "#e3f2fd",
        color: "#1565c0",
      };
    case "Closed":
      return {
        background: "var(--gray-100)",
        color: "var(--gray-500)",
      };
  }
}

/**
 * Returns a human-readable label for a status badge.
 * For some statuses we want a more descriptive label.
 */
export function getStatusLabel(normalized: NormalizedStatus): string {
  return normalized;
}
