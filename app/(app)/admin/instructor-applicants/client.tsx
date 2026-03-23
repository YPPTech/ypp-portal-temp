"use client";

import { useState } from "react";
import { exportInstructorApplicationsCsv } from "@/lib/export-actions";

type Application = {
  id: string;
  status: string;
  [key: string]: unknown;
};

export default function InstructorApplicantsClient({ applications }: { applications: Application[] }) {
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportInstructorApplicationsCsv();
      if ("error" in result) {
        alert(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="button secondary"
      style={{ fontSize: 13 }}
    >
      {exporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}
